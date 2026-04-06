import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

async function promoteAdmin() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node promote-admin.js <email>');
    process.exit(1);
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf-8'));
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    // USE CUSTOM DATABASE ID: ai-studio-188ffe85-dc66-4ecd-951d-44471aa40a58
    const db = getFirestore('ai-studio-188ffe85-dc66-4ecd-951d-44471aa40a58');
    const auth = admin.auth();

    // 1. Find user by email
    const userRecord = await auth.getUserByEmail(email);
    console.log(`Found user: ${userRecord.uid} (${email})`);

    // 2. Update/Create user document in 'users' collection with admin role
    await db.collection('users').doc(userRecord.uid).set({
      email: email,
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log(`\x1b[32mSUCCESS: ${email} has been promoted to Admin in the custom database!\x1b[0m`);
    process.exit(0);
  } catch (error) {
    console.error('\x1b[31mERROR:\x1b[0m', error.message);
    process.exit(1);
  }
}

promoteAdmin();
