// api/ikhokha.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authString = Buffer.from(`${process.env.IKHOKHA_APP_ID}:${process.env.IKHOKHA_SECRET}`).toString('base64');
    
    const response = await fetch('https://api.ikhokha.com/pay/v1/payment_request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Payment service error' });
  }
}
