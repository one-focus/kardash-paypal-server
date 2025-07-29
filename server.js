// Simple Express server to handle PayPal orders and captures.
// This server uses the PayPal REST APIs via fetch without additional SDKs.

const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 8080;
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
// Use sandbox endpoint for testing; set PAYPAL_BASE to 'https://api-m.paypal.com' for live.
const PAYPAL_BASE = process.env.PAYPAL_BASE || 'https://api-m.sandbox.paypal.com';

// Generate an access token for the PayPal API
async function generateAccessToken() {
  const basicAuth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await response.json();
  return data.access_token;
}

// Create order endpoint
app.post('/api/orders', async (req, res) => {
  try {
    const accessToken = await generateAccessToken();
    const { amount } = req.body;
    const orderResponse = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: amount || '1.00'
            }
          }
        ]
      })
    });
    const orderData = await orderResponse.json();
    res.status(200).json(orderData);
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: err.toString() });
  }
});

// Capture order endpoint
app.post('/api/orders/:orderId/capture', async (req, res) => {
  try {
    const accessToken = await generateAccessToken();
    const { orderId } = req.params;
    const captureResponse = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const captureData = await captureResponse.json();
    res.status(200).json(captureData);
  } catch (err) {
    console.error('Error capturing order:', err);
    res.status(500).json({ error: err.toString() });
  }
});

// Serve static files from /src so index.html and app.js are accessible
const path = require('path');
app.use(express.static(path.join(__dirname, 'src')));

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
