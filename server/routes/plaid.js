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

// added from quickstart sandbox
// probably need to have sandbox users implemented for these to work


// // Retrieve Transactions for an Item
// // https://plaid.com/docs/#transactions
// app.get('/api/transactions', function (request, response, next) {
//   Promise.resolve()
//     .then(async function () {
//       // Set cursor to empty to receive all historical updates
//       let cursor = null;

//       // New transaction updates since "cursor"
//       let added = [];
//       let modified = [];
//       // Removed transaction ids
//       let removed = [];
//       let hasMore = true;
//       // Iterate through each page of new transaction updates for item
//       while (hasMore) {
//         const request = {
//           access_token: ACCESS_TOKEN,
//           cursor: cursor,
//         };
//         const response = await client.transactionsSync(request)
//         const data = response.data;

//         // If no transactions are available yet, wait and poll the endpoint.
//         // Normally, we would listen for a webhook, but the Quickstart doesn't
//         // support webhooks. For a webhook example, see
//         // https://github.com/plaid/tutorial-resources or
//         // https://github.com/plaid/pattern
//         cursor = data.next_cursor;
//         if (cursor === "") {
//           await sleep(2000);
//           continue;
//         }

//         // Add this page of results
//         added = added.concat(data.added);
//         modified = modified.concat(data.modified);
//         removed = removed.concat(data.removed);
//         hasMore = data.has_more;

//         prettyPrintResponse(response);
//       }

//       const compareTxnsByDateAscending = (a, b) => (a.date > b.date) - (a.date < b.date);
//       // Return the 8 most recent transactions
//       const recently_added = [...added].sort(compareTxnsByDateAscending).slice(-8);
//       response.json({ latest_transactions: recently_added });
//     })
//     .catch(next);
// });


// // Retrieve real-time Balances for each of an Item's accounts
// // https://plaid.com/docs/#balance
// app.get('/api/balance', function (request, response, next) {
//   Promise.resolve()
//     .then(async function () {
//       const balanceResponse = await client.accountsBalanceGet({
//         access_token: ACCESS_TOKEN,
//       });
//       prettyPrintResponse(balanceResponse);
//       response.json(balanceResponse.data);
//     })
//     .catch(next);
// });

// app.get('/api/statements', function (request, response, next) {
//   Promise.resolve()
//     .then(async function () {
//       const statementsListResponse = await client.statementsList({ access_token: ACCESS_TOKEN });
//       prettyPrintResponse(statementsListResponse);
//       const pdfRequest = {
//         access_token: ACCESS_TOKEN,
//         statement_id: statementsListResponse.data.accounts[0].statements[0].statement_id
//       };

//       const statementsDownloadResponse = await client.statementsDownload(pdfRequest, {
//         responseType: 'arraybuffer',
//       });
//       prettyPrintResponse(statementsDownloadResponse);
//       response.json({
//         json: statementsListResponse.data,
//         pdf: statementsDownloadResponse.data.toString('base64'),
//       });
//     })
//     .catch(next);
// });


// // Retrieve information about an Item
// // https://plaid.com/docs/#retrieve-item
// app.get('/api/item', function (request, response, next) {
//   Promise.resolve()
//     .then(async function () {
//       // Pull the Item - this includes information about available products,
//       // billed products, webhook information, and more.
//       const itemResponse = await client.itemGet({
//         access_token: ACCESS_TOKEN,
//       });
//       // Also pull information about the institution
//       const configs = {
//         institution_id: itemResponse.data.item.institution_id,
//         country_codes: PLAID_COUNTRY_CODES,
//       };
//       const instResponse = await client.institutionsGetById(configs);
//       prettyPrintResponse(itemResponse);
//       response.json({
//         item: itemResponse.data.item,
//         institution: instResponse.data.institution,
//       });
//     })
//     .catch(next);
// });






module.exports = router;