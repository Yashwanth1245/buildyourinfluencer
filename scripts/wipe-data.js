import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Initialize Firebase Admin (Copy from server.js)
let serviceAccount;
try {
  serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf-8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase Admin Initialized for Wipe.");
} catch (error) {
  console.error("ERROR: Could NOT load service-account.json.");
  process.exit(1);
}

const db = getFirestore('ai-studio-188ffe85-dc66-4ecd-951d-44471aa40a58');

const COLLECTIONS_TO_WIPE = [
  'content',
  'influencers',
  'motion_templates',
  'transactions',
  'users'
];

async function deleteCollection(collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db, query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // When there are no documents left, we are done
    resolve();
    return;
  }

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid
  // exploding the stack.
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

async function wipeDatabase() {
  console.log("Starting Global Wipe...");
  
  for (const collection of COLLECTIONS_TO_WIPE) {
    try {
      console.log(`Wiping collection: ${collection}...`);
      await deleteCollection(collection);
      console.log(`Successfully wiped: ${collection}`);
    } catch (err) {
      console.error(`Error wiping ${collection}:`, err);
    }
  }

  console.log("Data wipe COMPLETE.");
}

wipeDatabase().then(() => {
  console.log("Exiting.");
  process.exit(0);
}).catch(err => {
  console.error("FATAL ERROR during wipe:", err);
  process.exit(1);
});
