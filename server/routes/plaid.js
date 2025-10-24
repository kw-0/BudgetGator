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

    // 3. Get accounts and filter for credit cards
    const accountsResponse = await plaidClient.accountsGet({ access_token });
    const creditCardIds = accountsResponse.data.accounts
      .filter((acct) => acct.subtype === "credit card")
      .map((acct) => acct.account_id);

    // 4. Sync transactions (no cursor = full history)
    let cursor = null;
    let added = [];
    let hasMore = true;

    while (hasMore) {
      const response = await plaidClient.transactionsSync({ access_token, cursor });
      const data = response.data;

      added = added.concat(data.added);
      cursor = data.next_cursor;
      hasMore = data.has_more;
    }

    // 5. Filter for credit card transactions only
    const creditCardTx = added.filter((tx) => creditCardIds.includes(tx.account_id));

    res.json({
      message: "Synced sandbox credit card transactions",
      transactions: creditCardTx,
    });
  } catch (err) {
    console.error("Sync error:", err.response?.data || err);
    res.status(500).json({ error: "Failed to sync transactions" });
  }
});


module.exports = router;