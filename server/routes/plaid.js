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
      redirect_uri: "https://budgetgator-production.up.railway.app/api/plaid/return",
    });

    res.json({ link_token: response.data.link_token });
    await User.findByIdAndUpdate(userId, { plaidLinkToken: response.data.link_token });
    try {
      const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token: response.data.link_token });
      const access_token = exchangeResponse.data.access_token;
      const item_id = exchangeResponse.data.item_id;

      await User.findByIdAndUpdate(userId, {
        plaidAccessToken: access_token,
        plaidItemId: item_id,
      });

      res.json({ message: "Plaid token exchanged and stored successfully" });
    } catch (err) {
      console.error("Plaid exchange error:", err.response?.data || err);
      res.status(500).json({ error: "Failed to exchange public_token" });
    }
  } catch (err) {
    console.error("Error creating link token:", err);
    res.status(500).json({ error: "Unable to create link token" });
  }
});


// // Exchange public_token for access_token
// router.post("/exchange_public_token", auth, async (req, res) => {
//   const { public_token } = req.body;
//   const userId = req.user.id;

//   if (!public_token) {
//     return res.status(400).json({ error: "Missing public_token" });
//   }

//   try {
//     const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token });
//     const access_token = exchangeResponse.data.access_token;
//     const item_id = exchangeResponse.data.item_id;

//     await User.findByIdAndUpdate(userId, {
//       plaidAccessToken: access_token,
//       plaidItemId: item_id,
//     });

//     res.json({ message: "Plaid token exchanged and stored successfully" });
//   } catch (err) {
//     console.error("Plaid exchange error:", err.response?.data || err);
//     res.status(500).json({ error: "Failed to exchange public_token" });
//   }
// });

router.get("/return", async (req, res) => {
  const publicTokenResponse = await plaidClient.sandboxPublicTokenCreate({
      institution_id: "ins_109508", // First Platypus Bank (sandbox)
      initial_products: ["transactions"],
  });
  const public_token = publicTokenResponse.data.public_token;
  try {
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token });
    const access_token = exchangeResponse.data.access_token;
    const item_id = exchangeResponse.data.item_id;

    await User.findByIdAndUpdate(userId, {
      plaidAccessToken: access_token,
      plaidItemId: item_id,
    });

    res.json({ message: "Plaid token exchanged and stored successfully" });
  } catch (err) {
    console.error("Plaid exchange error:", err.response?.data || err);
    res.status(500).json({ error: "Failed to exchange public_token" });
  }


  try {
    // Look up the user who owns this link_token
    // const user = await User.findOne({ plaidLinkToken: link_token });
    // if (!user) {
    //   return res.status(404).send("No user found for this link_token");
    // }

    // // Optional: clear the link_token so it can't be reused
    // await User.findByIdAndUpdate(user._id, { $unset: { plaidLinkToken: "" } });

    // Show static success page
    res.send(`
      <html>
        <body style="font-family: sans-serif; text-align: center; margin-top: 50px;">
          <h2>Bank account linked successfully 🎉</h2>
          <p>You can now close this window and return to the BudgetGator app.</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("Error handling Plaid return:", err.response?.data || err);
    res.status(500).send("Error completing Plaid link");
  }
});
// Sandbox-only: simulate multiple credit cards + transactions
router.post("/sandbox/cards-and-transactions", auth, async (req, res) => {
  try {
    // 1. Create a sandbox Item with transactions
    const publicTokenResponse = await plaidClient.sandboxPublicTokenCreate({
      institution_id: "ins_109508", // First Platypus Bank
      initial_products: ["transactions"],
    });

    const public_token = publicTokenResponse.data.public_token;

    // 2. Exchange for access_token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token });
    const access_token = exchangeResponse.data.access_token;

    // 3. Fetch accounts (will include checking, savings, credit card)
    const accountsResponse = await plaidClient.accountsGet({ access_token });
    const creditCards = accountsResponse.data.accounts.filter(
      (acct) => acct.subtype === "credit card"
    );

    // 4. Retry until transactions are ready
    async function getTransactionsWithRetry(access_token, retries = 5) {
      for (let i = 0; i < retries; i++) {
        try {
          const txResponse = await plaidClient.transactionsGet({
            access_token,
            start_date: "2023-01-01",
            end_date: "2023-02-01",
          });
          return txResponse.data.transactions;
        } catch (err) {
          if (err.response?.data?.error_code === "PRODUCT_NOT_READY") {
            console.log("Transactions not ready, retrying...");
            await new Promise((r) => setTimeout(r, 3000));
          } else {
            throw err;
          }
        }
      }
      throw new Error("Transactions not ready after retries");
    }

    const allTx = await getTransactionsWithRetry(access_token);
    const creditCardIds = creditCards.map((c) => c.account_id);
    const creditCardTx = allTx.filter((tx) => creditCardIds.includes(tx.account_id));

    res.json({
      message: "Sandbox credit card accounts + transactions",
      creditCards,
      transactions: creditCardTx,
    });
  } catch (err) {
    console.error("Sandbox cards error:", err.response?.data || err);
    res.status(500).json({ error: "Failed to fetch sandbox credit cards" });
  }
});

module.exports = router;