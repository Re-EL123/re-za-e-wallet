# ReZA E-Wallet - Production Deployment Guide

## Overview

ReZA e-wallet uses **Supabase** for authentication, database, and real-time features, combined with **iKhokha** for payment processing. This guide walks you through deploying everything to production.

---

## Prerequisites

- Supabase account (free tier works)
- iKhokha merchant account with API credentials
- Vercel account for hosting
- GitHub repository connected to Vercel

---

## Step 1: Database Setup (Already Complete)

The following migrations have been applied to your Supabase project:

### Tables Created:
- `wallets` - User wallet balances and info
- `bank_accounts` - Linked bank accounts
- `transactions` - Transaction history
- `payment_links` - iKhokha payment tracking

### Security (RLS Policies):
- Users can only access their own data
- Balance modifications only via secure PostgreSQL functions

### Secure Functions:
- `process_deposit()` - Atomically adds funds
- `process_withdrawal()` - Atomically withdraws funds
- `get_wallet_balance()` - Retrieves current balance

---

## Step 2: Deploy Frontend to Vercel

### Option A: Automatic Deployment (Recommended)

1. Push your code to GitHub
2. Connect repository to Vercel at [vercel.com/new](https://vercel.com/new)
3. Vercel auto-deploys on every push

### Option B: Manual Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

---

## Step 3: Configure Environment Variables

Add these to your Vercel project settings (Settings > Environment Variables):

```env
# Supabase (Already configured via v0 integration)
NEXT_PUBLIC_SUPABASE_URL=https://zbwteaziiasmfagaalve.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# iKhokha Payment Gateway
IKHOKHA_APP_KEY=IKUYN0WT5869GD75KEWWTPNU13BAEYP6
IKHOKHA_SECRET=Ff3y5LZDWyWafDhMK4qBmwzTQpQwKWaL
```

---

## Step 4: Configure iKhokha Webhooks

For real payment notifications:

1. Log in to [iKhokha Merchant Portal](https://dashboard.ikhokha.com)
2. Navigate to **Developer** > **Webhooks**
3. Add webhook URL: `https://your-app.vercel.app/api/ikhokha-webhook`
4. Select events: `payment.success`, `payment.failed`
5. Save and copy the webhook secret

---

## Step 5: Create Webhook Handler (Optional - For Real Payments)

Create this API route to handle iKhokha payment callbacks:

**File: `api/ikhokha-webhook.js`** (if using Vercel serverless)

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { reference, status, amount } = req.body

  if (status === 'SUCCESSFUL') {
    // Find the payment link and process deposit
    const { data: paymentLink } = await supabase
      .from('payment_links')
      .select('*')
      .eq('ikhokha_reference', reference)
      .single()

    if (paymentLink) {
      // Process the deposit using secure function
      await supabase.rpc('process_deposit', {
        p_user_id: paymentLink.user_id,
        p_amount: amount / 100, // Convert cents to rands
        p_description: 'iKhokha Card Deposit',
        p_payment_method: 'card',
        p_reference: reference
      })

      // Update payment link status
      await supabase
        .from('payment_links')
        .update({ status: 'completed' })
        .eq('id', paymentLink.id)
    }
  }

  res.status(200).json({ received: true })
}
```

---

## Step 6: Test the Application

### Test Account Creation:
1. Go to your deployed app URL
2. Click "Create Account"
3. Enter name, email, phone, and password
4. Verify email if Supabase email confirmation is enabled

### Test Deposits:
1. Login to your account
2. Go to "Deposit"
3. Enter an amount (e.g., R100)
4. Click "Pay with Card"
5. Complete payment on iKhokha checkout page
6. Verify balance updated on dashboard

### Test Withdrawals:
1. Add a bank account first
2. Go to "Withdraw"
3. Select bank account and enter amount
4. Submit withdrawal request

---

## Database Schema Reference

### wallets
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | User ID (from auth.users) |
| full_name | TEXT | User's full name |
| email | TEXT | User's email |
| phone | TEXT | Phone number |
| balance | DECIMAL | Current balance in ZAR |
| currency | TEXT | Always 'ZAR' |
| created_at | TIMESTAMP | Account creation date |

### bank_accounts
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Account ID |
| user_id | UUID | Owner's user ID |
| bank_name | TEXT | Bank name |
| account_holder | TEXT | Account holder name |
| account_number | TEXT | Bank account number |
| account_type | TEXT | cheque/savings |
| branch_code | TEXT | Bank branch code |
| is_verified | BOOLEAN | Verification status |

### transactions
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Transaction ID |
| user_id | UUID | User who made transaction |
| type | TEXT | 'deposit' or 'withdrawal' |
| amount | DECIMAL | Amount in ZAR |
| description | TEXT | Transaction description |
| status | TEXT | pending/completed/failed |
| payment_method | TEXT | card/eft/bank_transfer |
| reference | TEXT | External reference |
| created_at | TIMESTAMP | Transaction date |

---

## Security Best Practices

1. **Never expose service role key** - Only use anon key in frontend
2. **RLS is enabled** - Users can only see their own data
3. **Secure functions** - Balance changes only via `process_deposit` and `process_withdrawal`
4. **HTTPS only** - Vercel provides free SSL
5. **Validate webhooks** - Verify iKhokha webhook signatures

---

## Monitoring & Logs

### Supabase Dashboard
- **Auth**: Monitor signups and logins
- **Database**: View tables and run queries
- **Logs**: Check API and database logs

### Vercel Dashboard
- **Deployments**: View deployment history
- **Analytics**: Traffic and performance
- **Logs**: Function execution logs

### iKhokha Dashboard
- **Transactions**: Payment history
- **Reports**: Revenue analytics

---

## Troubleshooting

### "User not found" after signup
- Check Supabase Auth logs for errors
- Verify email confirmation settings
- Ensure wallet record was created

### Payments not updating balance
- Check iKhokha webhook configuration
- Verify webhook URL is correct
- Check Vercel function logs

### "Insufficient balance" errors
- Verify wallet balance in Supabase
- Check for pending transactions
- Review transaction logs

### RLS policy errors
- Ensure user is authenticated
- Verify user ID matches wallet ID
- Check Supabase logs for policy violations

---

## Support

- **Supabase Issues**: [supabase.com/docs](https://supabase.com/docs)
- **iKhokha Support**: [support.ikhokha.com](https://support.ikhokha.com)
- **Vercel Help**: [vercel.com/help](https://vercel.com/help)
- **App Issues**: Open GitHub issue in repository

---

## Quick Commands

```bash
# Deploy to Vercel
vercel --prod

# View Vercel logs
vercel logs

# Open Supabase dashboard
# https://supabase.com/dashboard/project/zbwteaziiasmfagaalve

# Test locally
npx serve .
```

---

## Production Checklist

- [ ] Supabase project configured
- [ ] Database migrations applied
- [ ] RLS policies enabled
- [ ] Environment variables set in Vercel
- [ ] iKhokha webhooks configured
- [ ] Custom domain connected (optional)
- [ ] Email templates customized in Supabase
- [ ] Test signup/login flow
- [ ] Test deposit flow
- [ ] Test withdrawal flow
- [ ] Monitor first real transactions
