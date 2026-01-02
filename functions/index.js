const functions = require("firebase-functions")
const admin = require("firebase-admin")
const axios = require("axios")

admin.initializeApp()

// iKhokha API Configuration
const IKHOKHA_APP_KEY = "IKUYN0WT5869GD75KEWWTPNU13BAEYP6"
const IKHOKHA_SECRET = "Ff3y5LZDWyWafDhMK4qBmwzTQpQwKWaL"
const IKHOKHA_API_URL = "https://api.ikhokha.com/v1"

// Create payment link with iKhokha
exports.createPaymentLink = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated")
  }

  const { amount, description } = data

  if (!amount || amount <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid amount")
  }

  try {
    // Create payment link with iKhokha
    const response = await axios.post(
      `${IKHOKHA_API_URL}/payments/link`,
      {
        amount: Math.round(amount * 100), // Convert to cents
        currency: "ZAR",
        description: description || "ReZA Wallet Deposit",
        reference: `${context.auth.uid}_${Date.now()}`,
        callback_url: `https://${process.env.GCLOUD_PROJECT}.web.app/payment-callback`,
        success_url: `https://${process.env.GCLOUD_PROJECT}.web.app/dashboard.html?payment=success`,
        cancel_url: `https://${process.env.GCLOUD_PROJECT}.web.app/deposit.html?payment=cancelled`,
      },
      {
        headers: {
          Authorization: `Bearer ${IKHOKHA_APP_KEY}`,
          "X-API-Secret": IKHOKHA_SECRET,
          "Content-Type": "application/json",
        },
      },
    )

    return {
      success: true,
      paymentLink: response.data.payment_url,
      paymentId: response.data.id,
    }
  } catch (error) {
    console.error("iKhokha payment link creation error:", error)
    throw new functions.https.HttpsError("internal", "Failed to create payment link")
  }
})

// Process deposit after successful payment
exports.processDeposit = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated")
  }

  const { amount, paymentId, method } = data

  if (!amount || amount <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid amount")
  }

  try {
    const db = admin.database()
    const userRef = db.ref(`users/${context.auth.uid}`)

    // Get current user data
    const snapshot = await userRef.once("value")
    const userData = snapshot.val()

    if (!userData) {
      throw new functions.https.HttpsError("not-found", "User not found")
    }

    // Calculate new balance
    const newBalance = (userData.balance || 0) + amount

    // Create transaction record
    const transaction = {
      type: "deposit",
      amount: amount,
      description: `Deposit via ${method || "Card"}`,
      date: new Date().toISOString(),
      status: "completed",
      paymentId: paymentId || null,
    }

    const transactions = userData.transactions || []
    transactions.push(transaction)

    // Update database atomically
    await userRef.update({
      balance: newBalance,
      transactions: transactions,
      lastUpdated: admin.database.ServerValue.TIMESTAMP,
    })

    return {
      success: true,
      newBalance: newBalance,
      transaction: transaction,
    }
  } catch (error) {
    console.error("Deposit processing error:", error)
    throw new functions.https.HttpsError("internal", "Failed to process deposit")
  }
})

// Process withdrawal
exports.processWithdrawal = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated")
  }

  const { amount, bankAccountId, bankName, accountNumber } = data

  if (!amount || amount <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid amount")
  }

  if (!bankAccountId && (!bankName || !accountNumber)) {
    throw new functions.https.HttpsError("invalid-argument", "Bank details required")
  }

  try {
    const db = admin.database()
    const userRef = db.ref(`users/${context.auth.uid}`)

    // Get current user data
    const snapshot = await userRef.once("value")
    const userData = snapshot.val()

    if (!userData) {
      throw new functions.https.HttpsError("not-found", "User not found")
    }

    // Check if user has sufficient balance
    if (userData.balance < amount) {
      throw new functions.https.HttpsError("failed-precondition", "Insufficient balance")
    }

    // Calculate new balance
    const newBalance = userData.balance - amount

    // Create transaction record
    const transaction = {
      type: "withdrawal",
      amount: amount,
      description: `Withdrawal to ${bankName || "Bank Account"}`,
      date: new Date().toISOString(),
      status: "completed",
      bankAccountId: bankAccountId || null,
      accountNumber: accountNumber ? `***${accountNumber.slice(-4)}` : null,
    }

    const transactions = userData.transactions || []
    transactions.push(transaction)

    // Update database atomically
    await userRef.update({
      balance: newBalance,
      transactions: transactions,
      lastUpdated: admin.database.ServerValue.TIMESTAMP,
    })

    // In production, you would initiate actual bank transfer here
    // This could involve integration with a banking API or payment processor

    return {
      success: true,
      newBalance: newBalance,
      transaction: transaction,
    }
  } catch (error) {
    console.error("Withdrawal processing error:", error)
    throw new functions.https.HttpsError("internal", "Failed to process withdrawal")
  }
})

// Payment webhook callback from iKhokha
exports.paymentCallback = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed")
    return
  }

  try {
    const { payment_id, status, amount, reference } = req.body

    // Extract user ID from reference
    const userId = reference.split("_")[0]

    if (status === "completed" || status === "successful") {
      const db = admin.database()
      const userRef = db.ref(`users/${userId}`)

      const snapshot = await userRef.once("value")
      const userData = snapshot.val()

      if (userData) {
        const depositAmount = amount / 100 // Convert from cents
        const newBalance = (userData.balance || 0) + depositAmount

        const transaction = {
          type: "deposit",
          amount: depositAmount,
          description: "Deposit via Card Payment",
          date: new Date().toISOString(),
          status: "completed",
          paymentId: payment_id,
        }

        const transactions = userData.transactions || []
        transactions.push(transaction)

        await userRef.update({
          balance: newBalance,
          transactions: transactions,
          lastUpdated: admin.database.ServerValue.TIMESTAMP,
        })
      }
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    res.status(500).json({ error: "Webhook processing failed" })
  }
})
