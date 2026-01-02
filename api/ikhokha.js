// api/ikhokha.js - CORRECT iKhokha integration
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, user_id, email } = req.body;
  
  // iKhokha REQUIRES these fields
  const paymentData = {
    entityID: process.env.IKHOKHA_APP_ID,  // Your APPID
    externalEntityID: user_id || 'reza-wallet',
    amount: Math.round(amount * 100),  // Convert to cents
    currency: 'ZAR',
    requesterUrl: 'https://re-za-e-wallet-mzansi.vercel.app',
    mode: 'live',
    description: `ReZA Wallet Deposit R${amount}`,
    externalTransactionID: `REZA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    urls: {
      callbackUrl: 'https://re-za-e-wallet-mzansi.vercel.app/api/ikhokha-webhook',
      successPageUrl: 'https://re-za-e-wallet-mzansi.vercel.app/deposit.html?payment=success',
      failurePageUrl: 'https://re-za-e-wallet-mzansi.vercel.app/deposit.html?payment=failed',
      cancelUrl: 'https://re-za-e-wallet-mzansi.vercel.app/deposit.html?payment=cancelled'
    }
  };

  // GENERATE IK-SIGN (CRITICAL)
  const endpoint = 'https://api.ikhokha.com/public-api/v1/api/payment';
  const path = '/public-api/v1/api/payment';
  const body = JSON.stringify(paymentData);
  const payload = path + body.replace(/"/g, '\\"');  // Escape quotes
  const signature = crypto
    .createHmac('sha256', process.env.IKHOKHA_SECRET)
    .update(payload)
    .digest('hex');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'IK-APPID': process.env.IKHOKHA_APP_ID,
        'IK-SIGN': signature
      },
      body: body
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'iKhokha error', details: error.message });
  }
}
