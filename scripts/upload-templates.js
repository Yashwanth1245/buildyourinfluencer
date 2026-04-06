import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';

/**
 * DEVELOPER UTILITY: Upload a new Motion Template
 * Usage: node scripts/upload-templates.js <name> <description> <local_mp4_path> <local_preview_jpg_path>
 */

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf-8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "gen-lang-client-0330659398.firebasestorage.app"
});

const db = getFirestore('ai-studio-188ffe85-dc66-4ecd-951d-44471aa40a58');
const bucket = getStorage().bucket();

async function uploadTemplate() {
  const [,, name, description, mp4Path, jpgPath] = process.argv;

  if (!name || !mp4Path || !jpgPath) {
    console.log('Usage: node scripts/upload-templates.js <name> <description> <mp4_path> <jpg_path>');
    process.exit(1);
  }

  const id = name.toLowerCase().replace(/\s+/g, '_');
  
  console.log(`[Admin] Uploading template: ${name}...`);

  // 1. Upload MP4
  const mp4Buffer = fs.readFileSync(mp4Path);
  const mp4FileName = `templates/motions/${id}_${Date.now()}.mp4`;
  const mp4File = bucket.file(mp4FileName);
  await mp4File.save(mp4Buffer, { metadata: { contentType: 'video/mp4' } });
  const motionVideoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(mp4FileName)}?alt=media`;

  // 2. Upload Preview JPG
  let jpgBuffer;
  if (jpgPath.startsWith('http')) {
    const resp = await fetch(jpgPath);
    if (!resp.ok) throw new Error(`Failed to fetch preview image: ${resp.statusText}`);
    jpgBuffer = Buffer.from(await resp.arrayBuffer());
  } else {
    jpgBuffer = fs.readFileSync(jpgPath);
  }

  const jpgFileName = `templates/previews/${id}_${Date.now()}.jpg`;
  const jpgFile = bucket.file(jpgFileName);
  await jpgFile.save(jpgBuffer, { metadata: { contentType: 'image/jpeg' } });
  const previewUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(jpgFileName)}?alt=media`;

  // 3. Register in Firestore
  await db.collection('motion_templates').doc(id).set({
    id,
    name,
    description: description || '',
    motionVideoUrl,
    previewUrl,
    createdAt: Date.now()
  });

  console.log(`\n[SUCCESS] Template "${name}" is now LIVE for all users!`);
  console.log(`ID: ${id}`);
  console.log(`Motion: ${motionVideoUrl}`);
  process.exit(0);
}

uploadTemplate().catch(err => {
  console.error('[Admin Error]', err);
  process.exit(1);
});
