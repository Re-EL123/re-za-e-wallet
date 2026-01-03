// api/ikhokha-withdraw/route.js - iKhokha Payouts
export async function POST(request) {
  try {
    const { amount, bankAccount, userId } = await request.json();
    
    // iKhokha Payout Structure (same auth as deposits)
    const payoutData = {
      entityID: process.env.IKHOKHA_APP_ID,
      externalEntityID: userId,
      amount: Math.round(amount * 100),  // Convert to cents
      currency: 'ZAR',
      requesterUrl: 'https://re-za-e-wallet.vercel.app',
      mode: 'live',
      description: `ReZA Wallet Withdrawal R${amount}`,
      externalTransactionID: `WD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      payoutDetails: {
        account_number: bankAccount.account_number,
        account_type: bankAccount.account_type,
        bank_name: bankAccount.bank_name,
        account_holder: bankAccount.account_holder_name || userId
      },
      urls: {
        callbackUrl: 'https://re-za-e-wallet.vercel.app/api/ikhokha-withdraw-webhook',
        successPageUrl: 'https://re-za-e-wallet.vercel.app/withdraw.html?withdrawal=success',
        failurePageUrl: 'https://re-za-e-wallet.vercel.app/withdraw.html?withdrawal=failed'
      }
    };

    // Same HMAC signature as deposits
    const path = '/public-api/v1/api/payout';  // Payout endpoint
    const body = JSON.stringify(payoutData);
    const payload = path + body.replace(/"/g, '\\"');
    const signature = crypto
      .createHmac('sha256', process.env.IKHOKHA_SECRET)
      .update(payload)
      .digest('hex');

    const response = await fetch('https://api.ikhokha.com/public-api/v1/api/payout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'IK-APPID': process.env.IKHOKHA_APP_ID,
        'IK-SIGN': signature
      },
      body: body
    });

    const data = await response.json();
    
    if (response.ok && data.payoutUrl) {
      return Response.json({ payoutUrl: data.payoutUrl });
    } else {
      return Response.json({ error: data.message || 'Payout failed' }, { status: 400 });
    }
  } catch (error) {
    console.error('iKhokha Withdraw Error:', error);
    return Response.json({ error: 'Withdrawal service unavailable' }, { status: 500 });
  }
}
