import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const PLAID_BASE_URL = "https://sandbox.plaid.com";

// Create Link Token
app.post("/api/create_link_token", async (req, res) => {
  const response = await fetch(`${PLAID_BASE_URL}/link/token/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      client_name: "Plaid Sandbox Demo",
      products: ["transactions"],
      language: "en",
      country_codes: ["US"],
      user: { client_user_id: "user-123" },
    }),
  });
  const data = await response.json();
  res.json(data);
});

// Exchange public_token for access_token
app.post("/api/exchange_public_token", async (req, res) => {
  const { public_token } = req.body;
  const response = await fetch(`${PLAID_BASE_URL}/item/public_token/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      public_token,
    }),
  });
  const data = await response.json();
  console.log("Access token:", data.access_token);
  res.json(data);
});

app.listen(process.env.PORT, () =>
  console.log(`Server running at http://localhost:${process.env.PORT}`)
);
