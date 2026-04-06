import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore/lite';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function check() {
  await signInAnonymously(auth);
  console.log("Signed in anonymously.");
  
  const q = query(collection(db, 'influencers'), limit(1));
  try {
    const qs = await getDocs(q);
    if (!qs.empty) {
      const doc = qs.docs[0].data();
      console.log("Found an influencer:", doc.name);
      console.log("avatarUrl:", doc.avatarUrl);
      
      console.log("\\nFetching the URL...");
      const res = await fetch(doc.avatarUrl);
      console.log("Status:", res.status);
      console.log("Content-Type:", res.headers.get('content-type'));
      console.log("Content-Length:", res.headers.get('content-length'));
    } else {
      console.log("No influencers found.");
    }
  } catch(e) {
    console.error("Firestore read error:", e);
  }
  process.exit(0);
}

check();
