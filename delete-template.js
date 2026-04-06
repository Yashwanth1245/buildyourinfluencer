import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

async function deleteTemplate() {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: node delete-template.js <templateId>');
    console.log('Use node list-templates.js to find IDs.');
    process.exit(1);
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf-8'));
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    const db = getFirestore('ai-studio-188ffe85-dc66-4ecd-951d-44471aa40a58');
    
    // Check if doc exists
    const docRef = db.collection('motion_templates').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log(`\x1b[31mError: Template with ID [${id}] not found.\x1b[0m`);
      process.exit(1);
    }

    const data = doc.data();
    console.log(`Deleting template: ${data.name} (${id})...`);

    // Delete Firestore record
    await docRef.delete();

    console.log(`\x1b[32mSUCCESS: Template [${id}] has been removed.\x1b[0m`);
    process.exit(0);

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

deleteTemplate();
