# ReZA e-wallet

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/akanishibiri4422-4914s-projects/v0-re-za-e-wallet)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/jcYkAKkebty)

## Overview

ReZA is a South African e-wallet application that enables users to deposit and withdraw money from different banks. Built with Firebase for authentication and real-time database, and integrated with iKhokha for secure payment processing.

// <CHANGE> Added comprehensive project documentation

## Features

- User authentication with Firebase Auth
- Real-time balance updates with Firebase Realtime Database
- Secure payment processing with iKhokha API
- Support for major South African banks
- Deposit via card (instant) or EFT
- Withdraw to linked bank accounts
- Transaction history tracking
- Progressive Web App (PWA) - installable from browser

## Tech Stack

- **Frontend**: React (CDN), HTML, CSS
- **Backend**: Firebase (Auth, Realtime Database, Cloud Functions)
- **Payment Gateway**: iKhokha
- **Hosting**: Vercel

## Setup Instructions

### Prerequisites

- Firebase project (already configured)
- iKhokha merchant account with API credentials
- Node.js 18+ (for Cloud Functions)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/re-za-e-wallet.git
cd re-za-e-wallet
```

2. Install Firebase CLI and Cloud Functions dependencies
```bash
npm install -g firebase-tools
cd functions
npm install
cd ..
```

3. Login to Firebase
```bash
firebase login
```

4. Deploy Cloud Functions
```bash
firebase deploy --only functions
```

5. Deploy to Vercel or serve locally
```bash
# Serve locally
npx serve .

# Or deploy to Vercel
vercel
```

### Environment Variables

The following credentials are already configured in the code:

- Firebase configuration (in all HTML files)
- iKhokha API credentials (in Cloud Functions)

For production, these should be moved to environment variables.

## Cloud Functions

The app uses Firebase Cloud Functions for secure transaction processing:

- **createPaymentLink**: Creates iKhokha payment links for card deposits
- **processDeposit**: Securely processes deposits and updates user balance
- **processWithdrawal**: Validates and processes withdrawals to bank accounts
- **paymentCallback**: Webhook endpoint for iKhokha payment confirmations

## Database Structure

```json
{
  "users": {
    "userId": {
      "email": "user@example.com",
      "fullName": "John Doe",
      "balance": 0.00,
      "banks": [
        {
          "name": "FNB",
          "accountHolder": "John Doe",
          "accountNumber": "1234567890",
          "accountType": "cheque",
          "branchCode": "250655",
          "addedDate": "2025-01-01T00:00:00.000Z"
        }
      ],
      "transactions": [
        {
          "type": "deposit",
          "amount": 100.00,
          "description": "Deposit via Card Payment",
          "date": "2025-01-01T00:00:00.000Z",
          "status": "completed",
          "paymentId": "ikhokha_payment_id"
        }
      ]
    }
  }
}
```

## Security

- Database rules prevent direct balance manipulation
- All transactions processed through Cloud Functions
- User authentication required for all operations
- Passwords hashed with Firebase Auth
- Bank account numbers partially masked in UI

## Supported Banks

- ABSA
- Standard Bank
- FNB (First National Bank)
- Nedbank
- Capitec Bank
- Discovery Bank
- TymeBank
- African Bank
- Investec
- Bidvest Bank

## Deployment

Your project is live at:

**[https://vercel.com/akanishibiri4422-4914s-projects/v0-re-za-e-wallet](https://vercel.com/akanishibiri4422-4914s-projects/v0-re-za-e-wallet)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/jcYkAKkebty](https://v0.app/chat/jcYkAKkebty)**

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## License

MIT
```

```text file=".gitignore"
# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
// <CHANGE> Added Firebase and function-specific ignores
/functions/node_modules

# next.js
/.next/
/out/

# production
/build

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files
.env*

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# Firebase
.firebase/
firebase-debug.log
firestore-debug.log
ui-debug.log

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
