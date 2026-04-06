import admin from 'firebase-admin';
import fs from 'fs';
import { getFirestore } from 'firebase-admin/firestore';

async function grantCredits(email, amount) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf-8'));
    
    // Check if already initialized
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    // TARGET CUSTOM DATABASE ID
    const db = getFirestore('ai-studio-188ffe85-dc66-4ecd-951d-44471aa40a58');

    console.log(`Searching for user: ${email}...`);
    const usersSnapshot = await db.collection('users').where('email', '==', email).get();
    
    if (usersSnapshot.empty) {
      console.log('No user found with email:', email);
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    const currentCredits = userDoc.data().credits || 0;
    const newCredits = currentCredits + amount;

    console.log(`Granting ${amount} credits to ${email} (ID: ${userId}). Current: ${currentCredits}, New: ${newCredits}`);

    await db.runTransaction(async (transaction) => {
      // 1. Update User Credits
      transaction.update(db.collection('users').doc(userId), {
        credits: newCredits,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 2. Log the Transaction for tracking
      const transactionRef = db.collection('transactions').doc();
      transaction.set(transactionRef, {
        userId,
        email,
        type: 'ADMIN_GRANT',
        amount: amount,
        previousCredits: currentCredits,
        newCredits: newCredits,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        note: 'Manual administrative credit grant'
      });
    });

    console.log('Transaction completed successfully.');

  } catch (error) {
    console.error('FAILED to grant credits:', error);
  }
}

// Run the grant
const targetEmail = process.argv[2] || 'yashw0112@gmail.com';
const targetAmount = parseInt(process.argv[3]) || 1000;

grantCredits(targetEmail, targetAmount).then(() => {
  console.log('Done.');
  process.exit(0);
});
