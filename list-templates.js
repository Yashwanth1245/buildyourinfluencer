import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

async function listTemplates() {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf-8'));
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    const db = getFirestore('ai-studio-188ffe85-dc66-4ecd-951d-44471aa40a58');
    const snapshot = await db.collection('motion_templates').get();

    if (snapshot.empty) {
      console.log('No templates found.');
      return;
    }

    console.log(`\x1b[36mFound ${snapshot.size} templates:\x1b[0m`);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- \x1b[33m[${doc.id}]\x1b[0m ${data.name} (${data.description || 'No description'})`);
      console.log(`  Video: ${data.motionVideoUrl}`);
      console.log(`  Preview: ${data.previewUrl}`);
      console.log('---');
    });

  } catch (error) {
    console.error('ERROR:', error.message);
  }
}

listTemplates();
