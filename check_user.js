const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function check() {
  const uid = 'rlLzJMZFrEcD2T7KldSdObZjLWq1';
  const userDoc = await db.collection('users').doc(uid).get();
  if (userDoc.exists) {
    console.log('User found:', JSON.stringify(userDoc.data(), null, 2));
  } else {
    console.log('User not found in Firestore for UID:', uid);
    
    // Check by email if needed
    const email = 'yashw0112@gmail.com';
    const snapshot = await db.collection('users').where('email', '==', email).get();
    if (snapshot.empty) {
      console.log('No user found for email:', email);
    } else {
      snapshot.forEach(doc => {
        console.log('Found user by email:', doc.id, JSON.stringify(doc.data(), null, 2));
      });
    }
  }
}

check().then(() => process.exit(0));
