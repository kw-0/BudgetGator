const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");
const User = require("../models/User");

// Configure Plaid client
const config = new Configuration({
  basePath: PlaidEnvironments.sandbox, 
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});
const plaidClient = new PlaidApi(config);

// Create link token
router.post("/create_link_token", auth, async (req, res) => {
  try {
    const userId = req.user.id; // assuming JWT middleware sets req.user

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId.toString() },
      client_name: "BudgetGator",
      products: ["auth", "transactions"],
      country_codes: ["US"],
      language: "en",
      redirect_uri: `${process.env.API_URL}/api/plaid/return`,
    });
    // Return the link token to the client. (We don't persist link tokens in this schema.)
    res.json({ link_token: response.data.link_token });

    
    const usernames = ["user_credit_bonus", "user_credit_profile_good", "user_credit_profile_excellent", "user_good", "user_credit_profile_poor"][Math.floor(Math.random() * 5)];
    const sandboxResp = await plaidClient.sandboxPublicTokenCreate({
      institution_id: "ins_109508",
      initial_products: ["transactions"],
      options:{
        override_username: usernames,
        override_password: "pass_good"
      }
    });
    
    const publicToken = sandboxResp.data.public_token;
    const exchangeResp = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
    const accessToken = exchangeResp.data.access_token;

    // Store the new access token in the user's access-token array
    await User.findByIdAndUpdate(userId, { $push: { plaidAccessTokens: accessToken } });
    await User.findByIdAndUpdate(userId, { $push: { plaidItemIds: sandboxResp.data.item_id } });

  } catch (err) {
    console.error("Error creating link token:", err);
    res.status(500).json({ error: "Unable to create link token" });
  }
});

// // Exchange public_token for access_token
router.post('/exchange_public_token', auth, async (req, res) => {
  try {
    const { public_token } = req.body;
    if (!public_token) return res.status(400).json({ error: 'Missing public_token' });

    const exchangeResp = await plaidClient.itemPublicTokenExchange({ public_token });
    const accessToken = exchangeResp.data.access_token;

    // Push into access token array (no legacy single-field updates)
    await User.findByIdAndUpdate(req.user.id, { $push: { plaidAccessTokens: accessToken } });

    res.json({ success: true });
  } catch (err) {
    console.error('Error exchanging public token:', err.response?.data || err);
    if (err.response && err.response.data) return res.status(400).json({ error: err.response.data });
    res.status(500).json({ error: 'Failed to exchange public token' });
  }
});

router.get("/return", async (req, res) => {
  try {
    // Plaid will include public_token in the query when redirecting back. Read safely from query/body.
    const publicToken = (req.query && (req.query.public_token || req.query.publicToken)) || (req.body && (req.body.public_token || req.body.publicToken)) || '';

    // Keep the original HTML return behavior but embed the token safely.
    const safeToken = String(publicToken).replace(/'/g, "\\'");
    return res.send(`
     <html>
       <body>
         <script>
           try {
             const payload = { public_token: '${safeToken}' };
             if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
               window.ReactNativeWebView.postMessage(JSON.stringify(payload));
             } else {
               document.body.innerHTML = '<h2>Bank Linked Successfully</h2><p>You can return to the app.</p>';
             }
           } catch (e) {
             document.body.innerHTML = '<h2>Error posting public token</h2>';
           }
         </script>
         <noscript>
           <h2>Bank Linked</h2>
         </noscript>
       </body>
     </html>
   `);
  } catch (err) {
    console.error("Plaid return error:", err);
    res.status(500).send("Something went wrong linking your bank");
  }
});

router.get("/transactions", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    // Determine date range: support ?period=YYYY-MM or explicit start_date & end_date
    let start_date = req.query.start_date;
    let end_date = req.query.end_date;
    const period = req.query.period; // format: YYYY-MM

    if (period && !start_date && !end_date) {
      const parts = String(period).split('-');
      if (parts.length === 2) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10); // 1-based (1=Jan, 11=Nov)
        if (!Number.isNaN(year) && month >= 1 && month <= 12) {
          const start = new Date(Date.UTC(year, month - 1, 1));
          const end = new Date(Date.UTC(year, month, 0)); // day 0 of next month = last day of current month
          start_date = start.toISOString().slice(0, 10);
          end_date = end.toISOString().slice(0, 10);
        }
      }
    }

    // Default to last 30 days if no range provided
    if (!start_date || !end_date) {
      const now = new Date();
      const thirtyAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      start_date = start_date || thirtyAgo.toISOString().slice(0, 10);
      end_date = end_date || now.toISOString().slice(0, 10);
    }

    // Optional category filter
    const categoryFilter = req.query.category ? String(req.query.category).toLowerCase() : null;

    // Use all stored access tokens for this user (aggregate across items)
    const tokens = Array.isArray(user.plaidAccessTokens) && user.plaidAccessTokens.length ? user.plaidAccessTokens : [];
    if (!tokens || tokens.length === 0) return res.status(400).json({ message: 'No bank linked' });

    let allTransactions = [];
    for (const token of tokens) {
      try {
        const resp = await plaidClient.transactionsGet({ access_token: token, start_date, end_date });
        const txns = resp.data.transactions || [];
        allTransactions = allTransactions.concat(txns);
      } catch (e) {
        console.error('Error fetching transactions for one token:', e.response?.data || e.message || e);
        // continue with other tokens
      }
    }

    // Normalize and filter transactions by category if requested
    // Also exclude income transactions (negative amounts in Plaid indicate credits/income)
    // And strictly enforce the month when `period=YYYY-MM` is provided
    const filtered = allTransactions.filter((tx) => {
      // Enforce strict month match on POSTED date only to match UI
      if (period) {
        const posted = tx && tx.date ? String(tx.date) : '';
        const txMonth = posted.slice(0, 7);
        if (txMonth !== period) return false;
      }

      // Skip income transactions (amount < 0)
      const amt = typeof tx.amount === 'number' ? tx.amount : Number(tx.amount) || 0;
      if (amt < 0) return false;

      if (!categoryFilter) return true;
      const cat = (tx.personal_finance_category && tx.personal_finance_category.primary) ||
        (Array.isArray(tx.category) ? tx.category.join(', ') : tx.category) || '';
      return String(cat).toLowerCase().includes(categoryFilter);
    });

    // Sort by date descending
    filtered.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    // Compute basic totals and totals by category
    const totals = { count: filtered.length, total_amount: 0, by_category: {} };
    for (const tx of filtered) {
      const amt = typeof tx.amount === 'number' ? tx.amount : Number(tx.amount) || 0;
      totals.total_amount += amt; 
      const cat = (tx.personal_finance_category && tx.personal_finance_category.primary) ||
        (Array.isArray(tx.category) ? tx.category.join(', ') : tx.category) || 'Uncategorized';
      const key = String(cat);
      totals.by_category[key] = (totals.by_category[key] || 0) + amt;
    }

    // Include goal for this period if it exists
    let goal = null;
    if (period) {
      const userGoal = user.monthlyGoals?.find((g) => g.period === period);
      if (userGoal) {
        goal = {
          amount: userGoal.amount,
          spent: totals.total_amount,
          remaining: userGoal.amount - totals.total_amount,
          percentage: (totals.total_amount / userGoal.amount) * 100,
        };
      }
    }

    // Respond with period metadata + transactions + goal progress
    return res.json({ period: period || null, start_date, end_date, transactions: filtered, totals, goal });
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});



module.exports = router;