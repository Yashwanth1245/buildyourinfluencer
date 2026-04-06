import { db } from './firebase-server.js';
async function test() {
  const snapshot = await db.collection('content').limit(5).get();
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Content ${doc.id}:`);
    console.log(`  content (raw):`, data.content);
    console.log(`  previewUrl:`, data.previewUrl);
    console.log(`  status:`, data.status);
    console.log(`  createdAt:`, data.createdAt);
  });
  process.exit();
}
test();
