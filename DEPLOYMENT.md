# ReZA E-Wallet - Deployment Guide

## Prerequisites

Before deploying, ensure you have:

1. A Firebase project (already configured at `re-el-eed0d`)
2. iKhokha merchant account with API credentials
3. Node.js 18 or higher installed
4. Firebase CLI installed: `npm install -g firebase-tools`
5. A Vercel account

## Step 1: Deploy Firebase Cloud Functions

Cloud Functions handle secure transaction processing and must be deployed before the app can process real payments.

```bash
# Navigate to the functions directory
cd functions

# Install dependencies
npm install

# Login to Firebase
firebase login

# Deploy the functions
firebase deploy --only functions
```

This will deploy:
- `createPaymentLink` - Creates iKhokha payment links
- `processDeposit` - Processes deposit transactions
- `processWithdrawal` - Processes withdrawal transactions
- `paymentCallback` - Handles iKhokha webhook callbacks

## Step 2: Configure Database Rules

Deploy the security rules to protect user data:

```bash
firebase deploy --only database
```

The rules ensure:
- Users can only read/write their own data
- Balance and transactions can only be modified by Cloud Functions
- Prevents unauthorized access

## Step 3: Deploy Frontend to Vercel

The frontend is automatically deployed to Vercel when you push to this repository.

To manually deploy:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

## Step 4: Configure iKhokha Webhooks

1. Log in to your iKhokha merchant dashboard
2. Navigate to API Settings > Webhooks
3. Add webhook URL: `https://YOUR-REGION-YOUR-PROJECT.cloudfunctions.net/paymentCallback`
4. Enable payment status notifications

## Step 5: Test the Application

1. Create a test account
2. Try depositing with a test card (use iKhokha test credentials)
3. Add a bank account
4. Test withdrawal functionality
5. Verify transactions appear in history

## Environment Variables (Production)

For production, move sensitive credentials to environment variables:

### Firebase Functions

Create `functions/.env`:
```
IKHOKHA_APP_KEY=your_app_key
IKHOKHA_SECRET=your_secret
```

### Frontend

Add to Vercel environment variables:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

## Monitoring

- **Firebase Console**: Monitor database usage and function logs
- **Vercel Dashboard**: Monitor frontend deployment and analytics
- **iKhokha Dashboard**: Track payment transactions

## Troubleshooting

### Functions not deploying
- Ensure you're logged in: `firebase login`
- Check Node.js version: `node --version` (must be 18+)
- Review logs: `firebase functions:log`

### Payments failing
- Verify iKhokha credentials are correct
- Check webhook URL is configured
- Review Cloud Function logs for errors

### Database permission errors
- Ensure database rules are deployed
- Verify user is authenticated
- Check Firebase console for rule violations

## Support

For issues:
1. Check Firebase Console logs
2. Review Vercel deployment logs
3. Contact support at vercel.com/help
