// api/ikhokha-webhook.js
export default async function handler(req, res) {
  // Verify webhook signature (from docs)
  const signature = req.headers['ik-sign'];
  const calculatedSign = crypto
    .createHmac('sha256', process.env.IKHOKHA_SECRET)
    .update(req.body)
    .digest('hex');
    
  if (signature !== calculatedSign) {
    return res.status(403).json({ error: 'Invalid signature' });
  }

  console.log('iKhokha webhook:', req.body);
  res.status(200).json({ status: 'received' });
}
