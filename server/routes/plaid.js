const express = require('express');
const router = express.Router();
const plaid = require('plaid');

const client = new plaid.Client({
  clientID: process.env.PLAID_CLIENT_ID,
  secret: process.env.PLAID_SECRET,
  env: plaid.environments.sandbox,
});

// Create link token
router.post('/api/plaid/create_link_token', async (req, res) => {
  try {
    const response = await client.linkTokenCreate({
      user: {
        client_user_id: req.body.userId, // your authenticated user ID
      },
      client_name: 'BudgetGator',
      products: ['auth', 'transactions'],
      country_codes: ['US'],
      language: 'en',
    });
    res.json({ link_token: response.link_token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create link token' });
  }
});

// Exchange public token for access token
router.post('/api/plaid/exchange_public_token', async (req, res) => {
  const { publicToken } = req.body;

  try {
    const response = await client.itemPublicTokenExchange({ public_token: publicToken });
    const accessToken = response.access_token;

    // TODO: store accessToken in your database linked to the user
    res.json({ accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to exchange public token' });
  }
});

module.exports = router;
