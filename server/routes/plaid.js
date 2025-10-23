const express = require('express');
const router = express.Router();
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

// Ensure these are set in Railway
const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
      'Plaid-Version': '2020-09-14',
    },
  },
});
const plaid = new PlaidApi(configuration);

// Example Mongo model; adapt to your schema
// const Token = mongoose.model('Token', new Schema({ userId: String, accessToken: String, itemId: String }));

// Your auth middleware should set req.user.id
router.post('/create_link_token', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId; 
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: String(userId) },
      client_name: 'BudgetGator',
      products: ['transactions'], // adjust as needed
      country_codes: ['US'],
      language: 'en',
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error(err?.response?.data || err);
    res.status(500).json({ error: 'link_token_failed' });
  }
});

router.post('/exchange_public_token', async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const { public_token } = req.body;
    const exchange = await plaid.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = exchange.data;

    // Persist securely; never send access_token to client
    // await Token.findOneAndUpdate({ userId }, { accessToken: access_token, itemId: item_id }, { upsert: true });

    res.json({ ok: true, item_id });
  } catch (err) {
    console.error(err?.response?.data || err);
    res.status(500).json({ error: 'exchange_failed' });
  }
});

router.get('/accounts', async (req, res) => {
  try {
    const userId = req.user?.id;
    // const doc = await Token.findOne({ userId });
    // if (!doc) return res.status(404).json({ error: 'no_token' });

    // const acc = await plaid.accountsGet({ access_token: doc.accessToken });
    // res.json(acc.data.accounts);

    res.json([]); // stub until you wire Mongo
  } catch (err) {
    console.error(err?.response?.data || err);
    res.status(500).json({ error: 'accounts_failed' });
  }
});

module.exports = router;

