import express from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { rateLimit } from 'express-rate-limit';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import dotenv from 'dotenv';
import fs from 'fs';
import { Readable } from 'stream';
import { fal } from "@fal-ai/client";
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import os from 'os';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import { GoogleGenAI } from "@google/genai";

ffmpeg.setFfmpegPath(ffmpegPath.path);

dotenv.config();

// Initialize Firebase Admin with CUSTOM DATABASE ID from config
let serviceAccount;
try {
  serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf-8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "gen-lang-client-0330659398.firebasestorage.app"
  });
  console.log("Firebase Admin Initialized Successfully.");
} catch (error) {
  console.error("FATAL ERROR: Could NOT load service-account.json. Please download it from Firebase Console and place it in the root.");
  process.exit(1);
}

// TARGET CUSTOM DATABASE ID: ai-studio-188ffe85-dc66-4ecd-951d-44471aa40a58
const db = getFirestore('ai-studio-188ffe85-dc66-4ecd-951d-44471aa40a58');
const bucket = getStorage().bucket();

const server = express();

// --- Security: Standard Middlewares ---
server.use(helmet({
  contentSecurityPolicy: false, // Vite handles CSP in dev, adjust for prod if needed
  crossOriginEmbedderPolicy: false
}));
server.use(cors());

server.use(express.json({ limit: '1mb' }));
server.use(express.urlencoded({ extended: true, limit: '1mb' }));

// --- AI: Gemini 1.5 Flash (Free Tier) ---
const genAI = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
const GEMINI_MODEL = "gemini-1.5-flash";

// --- Security: Validation Helper ---
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Malformed or invalid input', details: errors.array() });
  }
  next();
};

// --- Security: Rate Limiting ---
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per 15 mins (More lenient for SPAs)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again in 15 minutes." }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 attempts per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." }
});

// Apply global limiter to all routes
server.use(globalLimiter);

// --- Multer Configuration ---
const upload = multer({ storage: multer.memoryStorage() });

// --- Media Proxy Download (Harden against SSRF) ---
const TRUSTED_DOMAINS = [
  'fal.ai',
  'fal.media',
  'googleapis.com',
  'firebase.app',
  'firebasestorage.app',
  'googleusercontent.com',
  'vidgo.ai'
];

server.get('/api/download', async (req, res) => {
  const { url, filename } = req.query;
  if (!url) return res.status(400).send('URL is required');

  try {
    const parsedUrl = new URL(url);
    const isTrusted = TRUSTED_DOMAINS.some(domain => 
      parsedUrl.hostname === domain || parsedUrl.hostname.endsWith('.' + domain)
    );

    if (!isTrusted) {
      console.warn(`[Security] Blocked unauthorized download attempt: ${url}`);
      return res.status(403).send('Forbidden: Domain not in whitelist');
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const contentType = response.headers.get('content-type');
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'download'}"`);
    
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body);
      nodeStream.pipe(res);
    } else {
      res.status(404).send('No content found');
    }
  } catch (error) {
    console.error('[Download Proxy Error]', error);
    res.status(500).send('Failed to proxy download');
  }
});

const VIDGO_API_KEY = process.env.VIDGO_API_KEY;
const VIDGO_BASE_URL = "https://api.vidgo.ai/api";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kyashwanth1133@gmail.com';

// --- Authentication Middleware ---
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// --- Public: Newsletter Subscribe ---
server.post('/api/newsletter/subscribe', [
  body('email').isEmail().withMessage('Please provide a valid email'),
  validate
], async (req, res) => {
  const { email } = req.body;
  try {
    const subscriberId = email.toLowerCase().trim();
    await db.collection('newsletter_subscribers').doc(subscriberId).set({
      email: subscriberId,
      subscribedAt: Date.now(),
      status: 'active'
    }, { merge: true });

    console.log(`[Newsletter] New subscriber: ${subscriberId}`);
    res.json({ success: true, message: 'Successfully joined our newsletter' });
  } catch (error) {
    console.error('[Newsletter Error]', error);
    res.status(500).json({ error: 'Failed to join newsletter' });
  }
});

// --- Get User Profile (Credits & Settings) ---
// Apply strict auth limiter to profile runs (first point of call after login)
server.get('/api/user/profile', authLimiter, verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      const isAdminEmail = req.user.email === ADMIN_EMAIL;
      const initialData = {
        email: req.user.email || '',
        credits: isAdminEmail ? 10000 : 5, // Admin gets abundance, users get 5 'Welcome' credits
        maxCredits: isAdminEmail ? 10000 : 10,
        role: isAdminEmail ? 'admin' : 'user',
        planName: isAdminEmail ? 'Administrator' : 'Free',
        createdAt: Date.now()
      };
      
      await db.collection('users').doc(userId).set(initialData);
      return res.json(initialData);
    }

    const data = userDoc.data();
    res.json({
      credits: data.credits || 0,
      maxCredits: data.maxCredits || 10,
      planName: data.planName || (data.subscriptionId ? 'Pro' : 'Free'),
      displayName: data.displayName || data.name || '',
      email: data.email || req.user.email || ''
    });
  } catch (error) {
    console.error('[API Error] Profile fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// --- Get All User Influencers ---
server.get('/api/influencers', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('influencers')
      .where('ownerId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (error) {
    console.error('[API Error] Influencers list fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch influencers' });
  }
});

// --- Get Influencer Details ---
server.get('/api/influencers/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const infRef = db.collection('influencers').doc(id);
    const infDoc = await infRef.get();

    if (!infDoc.exists || infDoc.data().ownerId !== userId) {
      return res.status(403).json({ error: 'Unauthorized or not found' });
    }

    res.json({ id: infDoc.id, ...infDoc.data() });
  } catch (error) {
    console.error('[API Error] Influencer fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch influencer' });
  }
});

// --- Get Influencer Content Feed ---
server.get('/api/influencers/:id/content', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;

    const contentSnapshot = await db.collection('content')
      .where('influencerId', '==', id)
      .where('ownerId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const items = contentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (error) {
    console.error('[API Error] Content fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

// --- Regenerate Influencer Face ---
server.post('/api/regenerate-face', verifyToken, async (req, res) => {
  const { influencerId, refinementPrompt, currentDetails } = req.body;
  const ownerId = req.user.uid;

  if (!influencerId) return res.status(400).json({ error: 'Missing influencerId' });

  try {
    const infRef = db.collection('influencers').doc(influencerId);
    const infDoc = await infRef.get();

    if (!infDoc.exists || infDoc.data().ownerId !== ownerId) {
      return res.status(403).json({ error: 'Unauthorized or not found' });
    }

    // Set status to generating
    await infRef.update({ status: 'generating' });

    // Create ghost record for the new version
    const contentId = `face_${influencerId}_${Date.now()}`;
    const ghostContent = {
      id: contentId,
      influencerId: influencerId,
      type: 'image',
      isAvatar: true,
      content: '', // Pending
      status: 'generating',
      prompt: refinementPrompt || 'Face Refinement',
      createdAt: Date.now(),
      ownerId: ownerId,
    };
    await db.collection('content').doc(contentId).set(ghostContent);

    // Background Worker
    (async () => {
      try {
        console.log(`[Persona] Regenerating face for ${influencerId}...`);
        // Assuming generateInfluencerFace is defined or imported
        const result = await generateInfluencerFace(currentDetails, refinementPrompt);
        
        if (result && result.imageUrl) {
          // Update influencer
          await infRef.update({
            avatarUrl: result.imageUrl,
            status: 'active'
          });

          // Update content record
          await db.collection('content').doc(contentId).update({
            content: result.imageUrl,
            status: 'active'
          });
          console.log(`[Persona] Regeneration successful for ${influencerId}`);
        } else {
          throw new Error('No image URL returned');
        }
      } catch (err) {
        console.error(`[Persona Error] Regeneration failed for ${influencerId}:`, err);
        await infRef.update({ status: 'active' }); // Revert so user isn't stuck
        await db.collection('content').doc(contentId).delete().catch(() => {});
      }
    })();

    res.json({ success: true, message: 'Generation started in background' });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- Get All User Content (Gallery) ---
server.get('/api/user/content', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('content')
      .where('ownerId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (error) {
    console.error('[API Error] Gallery fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch gallery content' });
  }
});

// --- Helpers ---
async function logTransaction(userId, type, amount, action, status = 'success', note = '') {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const email = userDoc.exists ? userDoc.data().email : 'unknown';
    const currentCredits = userDoc.exists ? (userDoc.data().credits || 0) : 0;
    const transactionRef = db.collection('transactions').doc();
    await transactionRef.set({
      userId,
      email,
      type, // 'DEBIT' (Spent), 'CREDIT' (Refund/Add)
      amount,
      action, // e.g. 'Video Generation'
      status,
      previousCredits: currentCredits,
      newCredits: currentCredits, // Audit snapshot
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      note
    });
    console.log(`[Transaction] Logged ${type} for ${userId}: ${amount} (${action})`);
  } catch (err) {
    console.error(`[Transaction Error] Failed to log:`, err);
  }
}
async function submitVidgoTask(model, input) {
  const resp = await fetch(`${VIDGO_BASE_URL}/generate/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${VIDGO_API_KEY}`
    },
    body: JSON.stringify({ model, input })
  });
  const data = await resp.json();
  if (!data.data?.task_id) throw new Error(data.error?.message || "Task ID not returned");
  return data.data.task_id;
}

async function pollVidgoTask(taskId) {
  let attempts = 0;
  while (attempts < 60) {
    const resp = await fetch(`${VIDGO_BASE_URL}/generate/status/${taskId}`, {
      headers: { "Authorization": `Bearer ${VIDGO_API_KEY}` }
    });
    if (resp.ok) {
      const data = await resp.json();
      const { status, files, message, task_error } = data.data;
      if (status === "finished") return files[0].file_url;
      if (status === "failed") {
        const errorMsg = message || task_error || "Generation task failed at provider";
        throw new Error(errorMsg);
      }
    }
    await new Promise(r => setTimeout(r, 3000));
    attempts++;
  }
  throw new Error("Timed out");
}

async function uploadToFirebase(finalUrl, ownerId, fileName, contentType = 'image/jpeg') {
    const resp = await fetch(finalUrl);
    if (!resp.ok) throw new Error(`Failed to download resource from URL: ${resp.statusText}`);
    const buffer = Buffer.from(await resp.arrayBuffer());
    
    // Auto-detect extension based on content type
    const isVideo = contentType.includes('video');
    const ext = isVideo ? 'mp4' : 'jpg';
    const storagePath = `content/${ownerId}/${fileName}.${ext}`;
    const file = bucket.file(storagePath);
    
    const token = uuidv4();
    await file.save(buffer, {
        metadata: { 
            contentType,
            metadata: { firebaseStorageDownloadTokens: token }
        },
        public: true
    });
    
    const originalUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
    let previewUrl = originalUrl;

    // 2. Generate Optimized WebP Preview
    if (!isVideo) {
        try {
            const previewBuffer = await sharp(buffer)
                .resize({ width: 600, withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();
                
            const previewPath = `content/${ownerId}/previews/${fileName}.webp`;
            const previewFile = bucket.file(previewPath);
            const previewToken = uuidv4();
            await previewFile.save(previewBuffer, {
                metadata: { 
                    contentType: 'image/webp',
                    metadata: { firebaseStorageDownloadTokens: previewToken }
                },
                public: true
            });
            previewUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(previewPath)}?alt=media&token=${previewToken}`;
            console.log(`[Storage] Generated WebP preview for image: ${fileName}`);
        } catch (err) {
            console.error(`[Storage Error] Failed to generate image preview:`, err);
        }
    } else {
        // --- VIDEO THUMBNAIL GENERATION ---
        const tmpDir = os.tmpdir();
        const inputPath = path.join(tmpDir, `${fileName}_temp.mp4`);
        const outputPath = path.join(tmpDir, `${fileName}_thumb.jpg`);

        try {
            // Write buffer to temp file for ffmpeg
            fs.writeFileSync(inputPath, buffer);

            // Extract frame at 1s
            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .screenshots({
                        timestamps: [1.0],
                        folder: tmpDir,
                        filename: `${fileName}_thumb.jpg`,
                        size: '640x?'
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });

            if (fs.existsSync(outputPath)) {
                // Optimize with sharp
                const previewBuffer = await sharp(outputPath)
                    .webp({ quality: 80 })
                    .toBuffer();

                const previewPath = `content/${ownerId}/previews/${fileName}.webp`;
                const previewFile = bucket.file(previewPath);
                const previewToken = uuidv4();
                await previewFile.save(previewBuffer, {
                    metadata: { 
                        contentType: 'image/webp',
                        metadata: { firebaseStorageDownloadTokens: previewToken }
                    },
                    public: true
                });
                previewUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(previewPath)}?alt=media&token=${previewToken}`;
                console.log(`[Storage] Generated WebP preview for video: ${fileName}`);
            }
        } catch (err) {
            console.error(`[Storage Error] Failed to generate video thumbnail:`, err);
        } finally {
            // Cleanup temp files
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        }
    }
    
    return { original: originalUrl, preview: previewUrl };
}

/**
 * RICH PROMPTING ENGINE: Moved from Frontend and unified.
 * Generates the complex cinematic system instructions.
 */
function constructRichPrompt(userPrompt, influencer, options = {}) {
  const prompt = (userPrompt || "").trim();
  const hasMultiplePeopleRequested = /\b(people|crowd|friends|group|partner|family|couple|man|woman|child)\b/i.test(prompt);

  const systemInstructions = [
    "AUTHENTICITY: 100% human-world realism. Professional high-end photography standards (shot on 35mm lens, natural window light, intentional cinematic color grading).",
    "SUBJECT: Maintain 100% character facial consistency with Reference Image 1 (the base avatar). Subject name: " + influencer.name + ".",
    "COMPOSITION: Professional camera angles only (low-angle, Dutch angle, or high-fashion editorial shots).",
    "ENVIRONMENT: Randomize creative settings (luxury interiors, urban streets, architectural marvels, or serene nature) with tasteful, fashion-forward outfits.",
    !hasMultiplePeopleRequested 
      ? "ISOLATION: CRITICAL: Do NOT include any other people, background extras, or secondary subjects. The subject must be ALONE in the shot."
      : "SCENE: Primary subject focus. Secondary people are permitted only as secondary elements."
  ].join(" ");

  let finalPrompt = "";
  if (!prompt) {
    finalPrompt = `${systemInstructions} Scenario: Generate a highly creative, candid lifestyle photo of the subject alone in an authentic human-world environment. Randomize pose and outfit tastefully. Extreme realism.`;
  } else {
    finalPrompt = `${systemInstructions} Scenario: ${prompt}. Cinematic lighting, professional execution.`;
    if (options.isVideoBase) {
      finalPrompt += " Pose: Standing, centered for motion synthesis.";
    }
  }

  // Character Consistency Reinforcement
  if (influencer.avatarUrl) {
    finalPrompt += `\nMaintain EXACT facial consistency with Reference Image 1. Reference: ${influencer.avatarUrl}`;
  }

  return finalPrompt;
}

// --- Endpoints ---

/**
 * STUDIO GENERATION: Now uses Rich Prompting Engine
 */
server.post('/api/generate-image', 
  verifyToken,
  [
    body('influencerId').isString().notEmpty().trim(),
    body('prompt').optional().isString().trim().escape().isLength({ max: 2000 }),
    body('contentId').isString().notEmpty().trim(),
    body('options.aspectRatio').optional().isString().isIn(['1:1', '16:9', '9:16', '3:2', '2:3']),
    body('options.imageSize').optional().isString().isIn(['1K', '2K', '4K'])
  ],
  validate,
  async (req, res) => {
  const { influencerId, prompt, options, contentId } = req.body;
  const ownerId = req.user.uid;

  // 1. Calculate Cost (Default to 2K/3 credits)
  const quality = options.imageSize || '2K';
  const cost = IMAGE_RATES[quality] || 3;

  try {
    // 2. Verify Authorization & Credits
    const [infDoc, userDoc] = await Promise.all([
      db.collection('influencers').doc(influencerId).get(),
      db.collection('users').doc(ownerId).get()
    ]);

    if (!infDoc.exists || infDoc.data().ownerId !== ownerId) {
      return res.status(403).json({ error: 'Unauthorized: Influencer not found or not owned by you' });
    }

    const currentCredits = userDoc.exists ? (userDoc.data().credits || 0) : 0;
    if (currentCredits < cost) {
      return res.status(402).json({ error: 'Insufficient credits', required: cost, current: currentCredits });
    }

    // 3. Atomic Deduction
    await db.collection('users').doc(ownerId).update({
      credits: admin.firestore.FieldValue.increment(-cost)
    });
    await logTransaction(ownerId, 'DEBIT', cost, 'Image Generation', 'success', `Quality: ${quality}, Content: ${contentId}`);

    const influencer = infDoc.data();
    res.status(202).json({ taskId: 'background_started', cost });

    // --- Background Worker ---
    (async () => {
      try {
        // 1. Create Ghost Record
        const ghostContent = {
          id: contentId,
          influencerId: influencerId,
          type: 'image',
          content: '',
          status: 'generating',
          prompt: prompt || 'Synthesized lifestyle moment',
          createdAt: Date.now(),
          ownerId: ownerId,
        };
        await db.collection('content').doc(contentId).set(ghostContent);

        // 2. Core Intelligence
        const finalPrompt = constructRichPrompt(prompt, influencer, options);
        const imageUrls = [influencer.avatarUrl];
        if (options.references) options.references.forEach(r => imageUrls.push(r.url));

        const model = imageUrls.length > 0 ? 'nano-banana-2-edit' : 'nano-banana-2';
        const inputConfig = {
          prompt: finalPrompt,
          size: options.aspectRatio,
          resolution: quality,
          image_urls: imageUrls
        };

        const taskId = await submitVidgoTask(model, inputConfig);
        const finalUrl = await pollVidgoTask(taskId);
        const { original: finalImageUrl, preview: previewUrl } = await uploadToFirebase(finalUrl, ownerId, contentId);
        
        await db.collection('content').doc(contentId).update({
          content: finalImageUrl,
          previewUrl: previewUrl,
          status: 'active'
        });
        console.log(`[Studio] Image Generation ${contentId} completed. Cost: ${cost} credits.`);
      } catch (err) {
        console.error("[Background Image Error]", err);
        // REFUND on failure
        await Promise.all([
          db.collection('content').doc(contentId).update({ status: 'failed', error: err.message }),
          db.collection('users').doc(ownerId).update({
            credits: admin.firestore.FieldValue.increment(cost)
          }),
          logTransaction(ownerId, 'CREDIT', cost, 'Image Refund', 'success', `Refund for failed task ${contentId}`)
        ]);
        console.log(`[Refund] Returned ${cost} credits to ${ownerId} due to failure.`);
      }
    })();
  } catch (error) {
    console.error("[API Image Error]", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PERSONA CREATION
 */
server.post('/api/generate-persona', 
  verifyToken, 
  [
    body('influencerId').isString().notEmpty().trim(),
    body('profile.name').isString().notEmpty().trim().escape().isLength({ max: 100 }),
    body('profile.facePrompt').isString().notEmpty().trim().escape().isLength({ max: 1000 }),
    body('profile.voiceId').optional().isString().trim(),
    body('profile.styleId').optional().isString().trim()
  ],
  validate,
  async (req, res) => {
  const { profile, influencerId } = req.body;
  const ownerId = req.user.uid;
  const cost = 3;

  try {
    // 1. Verify Credits
    const userRef = db.collection('users').doc(ownerId);
    const userDoc = await userRef.get();
    const currentCredits = userDoc.exists ? (userDoc.data().credits || 0) : 0;

    if (currentCredits < cost) {
      return res.status(402).json({ error: 'Insufficient credits', required: cost, current: currentCredits });
    }

    // 2. Atomic Deduction
    await userRef.update({
      credits: admin.firestore.FieldValue.increment(-cost)
    });
    await logTransaction(ownerId, "DEBIT", cost, "Persona Creation", "success", `Influencer: ${influencerId}`);

    console.log(`[Persona] Starting creation for ${profile.name} by ${ownerId}. Cost: ${cost}`);
    res.status(202).json({ taskId: 'persona_creation_started', cost });

    // --- Background Worker ---
    (async () => {
      try {
        // Ghost Record
        const influencerData = {
          ...profile,
          bio: "Synthesizing personality and appearance...",
          id: influencerId,
          ownerId: ownerId,
          createdAt: Date.now(),
          status: 'generating'
        };
        await db.collection('influencers').doc(influencerId).set(influencerData);

        // --- AI Personalization: Gemini 1.5 Flash ---
        let personality = "confident, engaging, professional";
        let appearance = profile.appearance || "";
        let finalFacePrompt = profile.facePrompt || "";

        try {
          const aiPrompt = `Act as a creative director for a top AI influencer agency. 
          Based on these details: ${profile.facePrompt}, ${profile.influencerType}, ${profile.customInstructions}.
          Give me a 1-sentence personality description and a refined, highly specific descriptive physical prompt for an AI image generator. 
          Format your response as JSON: {"personality": "...", "refinedFacePrompt": "..."}`;
          
          const response = await genAI.models.generateContent({
            model: GEMINI_MODEL,
            contents: [{ role: 'user', parts: [{ text: aiPrompt }] }]
          });

          const text = response.text;
          const jsonMatch = text.match(/\{.*\}/s);
          if (jsonMatch) {
            const aiData = JSON.parse(jsonMatch[0]);
            personality = aiData.personality || personality;
            finalFacePrompt = aiData.refinedFacePrompt || finalFacePrompt;
          }
        } catch (err) {
          console.warn("[Gemini Tip] Falling back to default personality logic:", err.message);
        }

        const facePrompt = `A high-quality, professional head shot of a 100% human face, looking straight to face/camera. Subject: ${finalFacePrompt}. Ensure natural skin textures and natural human asymmetry. Front-facing head shot only.`;

        const model = 'nano-banana-2';
        const inputConfig = {
          prompt: facePrompt,
          size: '1:1',
          resolution: '2K'
        };

        const taskId = await submitVidgoTask(model, inputConfig);
        const finalUrl = await pollVidgoTask(taskId);
        const { original: finalImageUrl, preview: previewUrl } = await uploadToFirebase(finalUrl, ownerId, `influencer_${influencerId}`);
        
        await db.collection('influencers').doc(influencerId).update({
          avatarUrl: finalImageUrl,
          previewUrl: previewUrl,
          personality: personality,
          status: 'active'
        });

        const contentId = `content_init_${influencerId}`;
        await db.collection('content').doc(contentId).set({
          id: contentId,
          influencerId: influencerId,
          type: 'image',
          content: finalImageUrl,
          previewUrl: previewUrl,
          prompt: finalFacePrompt,
          createdAt: Date.now(),
          ownerId: ownerId,
          isAvatar: true,
          versionName: "Initial Version"
        });

        console.log(`[Persona] Creation successful for ${influencerId}`);
      } catch (error) {
        console.error("[Persona Error]", error);
        // REFUND on failure
        await Promise.all([
          db.collection('influencers').doc(influencerId).update({
            status: 'failed',
            error: error.message || "Persona creation failed"
          }).catch(() => {}),
          userRef.update({
            credits: admin.firestore.FieldValue.increment(cost)
          }),
          logTransaction(ownerId, "CREDIT", cost, "Persona Refund", "success", `Refund for failed persona ${influencerId}`)
        ]);
        console.log(`[Refund] Returned ${cost} credits to ${ownerId} due to failure.`);
      }
    })();
  } catch (error) {
    console.error("[Persona API Error]", error);
    res.status(500).json({ error: 'Failed to generate persona' });
  }
});

// --- Regenerate Influencer Face ---
server.post('/api/regenerate-persona-face', 
  verifyToken, 
  [
    body('influencerId').isString().notEmpty().trim(),
    body('facePrompt').isString().notEmpty().trim().escape(),
    body('refinementPrompt').optional().isString().trim().escape(),
    body('referenceUrl').isURL().trim(),
    body('versionCount').isInt({ min: 1 })
  ],
  validate,
  async (req, res) => {
  const { influencerId, facePrompt, refinementPrompt, referenceUrl, versionCount } = req.body;
  const ownerId = req.user.uid;
  const cost = 3;

  if (!influencerId) return res.status(400).json({ error: 'Missing influencerId' });

  try {
    // 1. Verify Credits
    const userRef = db.collection('users').doc(ownerId);
    const userDoc = await userRef.get();
    const currentCredits = userDoc.exists ? (userDoc.data().credits || 0) : 0;

    if (currentCredits < cost) {
      return res.status(402).json({ error: 'Insufficient credits', required: cost, current: currentCredits });
    }

    // 2. Atomic Deduction
    await userRef.update({
      credits: admin.firestore.FieldValue.increment(-cost)
    });
    await logTransaction(ownerId, "DEBIT", cost, "Face Refinement", "success", `Influencer: ${influencerId}`);

    const infRef = db.collection('influencers').doc(influencerId);
    
    // 3. Set influencer status to generating immediately
    await infRef.update({ status: 'generating' });

    // 4. Create ghost content record
    const contentId = `content_v${versionCount}_${influencerId}`;
    await db.collection('content').doc(contentId).set({
      id: contentId,
      influencerId: influencerId,
      type: 'image',
      content: '', // Pending
      status: 'generating',
      prompt: refinementPrompt || facePrompt,
      createdAt: Date.now(),
      ownerId: ownerId,
      isAvatar: true,
      versionName: `Version ${versionCount}`
    });

    // Accept request
    res.status(202).json({ success: true, message: 'Regeneration started', cost });

    // 5. Background Worker
    (async () => {
      try {
        console.log(`[Persona] Starting background regeneration for ${influencerId}. Cost: ${cost}`);
        
        const fullPrompt = refinementPrompt
          ? `Apply refinement: ${refinementPrompt}. Subject: ${facePrompt}`
          : facePrompt;
          
        const finalPrompt = `Refine 100% human face: ${fullPrompt}. Maintain extreme realism and natural imperfections. Cinematic lighting, professional photography.`;

        const inputConfig = {
          prompt: finalPrompt,
          size: '1:1',
          resolution: '2K',
          image_urls: [referenceUrl]
        };

        const taskId = await submitVidgoTask('nano-banana-2-edit', inputConfig);
        const finalUrl = await pollVidgoTask(taskId);
        
        const { original: finalImageUrl, preview: previewUrl } = await uploadToFirebase(finalUrl, ownerId, `influencer_${influencerId}_v${versionCount}`);
        
        const batch = db.batch();
        batch.update(infRef, {
            avatarUrl: finalImageUrl,
            previewUrl: previewUrl,
            status: 'active'
        });
        batch.update(db.collection('content').doc(contentId), {
            content: finalImageUrl,
            previewUrl: previewUrl,
            status: 'active'
        });
        await batch.commit();

        console.log(`[Persona] Regeneration successful for ${influencerId}`);
      } catch (err) {
        console.error(`[Persona Error] Regeneration failed for ${influencerId}:`, err);
        const errorMsg = err.message || "Regeneration failed";
        
        // REFUND on failure
        await Promise.all([
          infRef.update({ status: 'failed', error: errorMsg }).catch(() => {}),
          db.collection('content').doc(contentId).update({ status: 'failed', error: errorMsg }).catch(() => {}),
          userRef.update({
            credits: admin.firestore.FieldValue.increment(cost)
          }),
          logTransaction(ownerId, "CREDIT", cost, "Refinement Refund", "success", `Refund for failed face refinement ${contentId}`)
        ]);
        console.log(`[Refund] Returned ${cost} credits to ${ownerId} due to failure.`);
      }
    })();
  } catch (error) {
    console.error("[Regeneration API Error]", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * VIDEO GENERATION (FAL.AI)
 */
const VIDEO_RATES = {
  '2.6': { '720p': 1.7, '1080p': 2.3 },
  '3.0': { '720p': 2.5, '1080p': 3.5 }
};

const IMAGE_RATES = {
  '1K': 3,
  '2K': 3,
  '4K': 4
};

server.post('/api/generate-video', 
  verifyToken, 
  [
    body('influencerId').isString().notEmpty().trim(),
    body('contentId').isString().notEmpty().trim(),
    body('templateId').isString().notEmpty().trim(),
    body('prompt').optional().isString().trim().escape().isLength({ max: 1000 }),
    body('model').optional().isIn(['2.6', '3.0']),
    body('resolution').optional().isIn(['720p', '1080p'])
  ],
  validate,
  async (req, res) => {
  const { influencerId, contentId, templateId, prompt, keepAudio = true, baseImageUrl, model = '2.6', resolution = '720p' } = req.body;
  const ownerId = req.user.uid;
  console.log(`[API Hit] /api/generate-video by ${ownerId}. Influencer: ${influencerId}`);

  if (!influencerId || !contentId || !templateId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const infDoc = await db.collection('influencers').doc(influencerId).get();
    if (!infDoc.exists || infDoc.data().ownerId !== ownerId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const influencer = infDoc.data();

    // Look up template to get duration
    const templateDoc = await db.collection('motion_templates').doc(templateId).get();
    if (!templateDoc.exists) {
      console.warn(`[Video Error] Motion template not found: ${templateId}`);
      throw new Error('Motion template not found');
    }
    const template = templateDoc.data();

    // 1. Calculate Cost
    const rate = VIDEO_RATES[model]?.[resolution] || 1.7;
    const cost = Math.ceil((template.duration || 5) * rate);

    // 2. Check Credits
    const userRef = db.collection('users').doc(ownerId);
    const userDoc = await userRef.get();
    const userData = userDoc.data() || { credits: 0 };
    
    if ((userData.credits || 0) < cost) {
      const errorMsg = `Insufficient credits. Need ${cost} credits but you have ${userData.credits || 0}.`;
      console.warn(`[Credit Check] ${errorMsg} (User: ${ownerId})`);
      return res.status(402).json({ error: errorMsg });
    }

    // 3. Deduct Credits
    await userRef.update({ 
      credits: admin.firestore.FieldValue.increment(-cost) 
    });
    await logTransaction(ownerId, 'DEBIT', cost, 'Video Animation', 'success', `Template: ${templateId}, Model: ${model}`);

    // 4. Create immediate placeholder for tracking
    await db.collection('content').doc(contentId).set({
      id: contentId,
      influencerId: influencerId,
      type: 'video',
      content: '',
      status: 'generating',
      prompt: prompt || `Animated with ${template.name}`,
      createdAt: Date.now(),
      ownerId: ownerId,
      model,
      resolution,
      cost
    });

    res.status(202).json({ success: true, message: 'Video generation started', cost, contentId });

    // 5. Worker
    (async () => {
      try {
        console.log(`[Video] Starting Fal.ai ${model} (${resolution}) motion transfer for ${influencerId}. Cost: ${cost}`);
        
        // Map model/resolution to Fal.ai endpoint
        const qualityPath = resolution === '1080p' ? 'high' : 'standard';
        const falEndpoint = `fal-ai/kling-video/v${model}/${qualityPath}/motion-control`;

        const result = await fal.subscribe(falEndpoint, {
          input: {
            image_url: baseImageUrl || influencer.avatarUrl,
            video_url: template.motionVideoUrl,
            character_orientation: "video",
            keep_original_sound: keepAudio,
            prompt: prompt || `High-end cinematic video featuring ${influencer.name} performing ${template.name}.`
          },
          logs: true
        });

        if (result.data?.video?.url) {
          const { original: finalVideoUrl, preview: previewUrl } = await uploadToFirebase(result.data.video.url, ownerId, contentId, 'video/mp4');
          
          await db.collection('content').doc(contentId).update({
            content: finalVideoUrl,
            previewUrl: previewUrl,
            status: 'active'
          });
          console.log(`[Video] Successfully generated video for ${influencerId}`);
        } else {
          throw new Error('Fal.ai returned no video URL');
        }
      } catch (err) {
        console.error(`[Video Error] Generation failed:`, err);
        
        // 6. REFUND CREDITS
        console.log(`[Video Refund] Refunding ${cost} credits to ${ownerId} due to failure.`);
        await userRef.update({
          credits: admin.firestore.FieldValue.increment(cost)
        }).catch(rErr => console.error("[Refund Error] Critical: Failed to refund credits!", rErr));
        await logTransaction(ownerId, 'CREDIT', cost, 'Video Refund', 'success', `Refund for failed animation ${contentId}`);

        await db.collection('content').doc(contentId).update({
          status: 'failed',
          error: err.message || "Motion synthesis failed"
        }).catch(() => {});
      }
    })();
  } catch (error) {
    console.error("[Video API Error]", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * ADMIN: UPLOAD TEMPLATE
 */
server.post('/api/admin/upload-template', verifyToken, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'preview', maxCount: 1 }
]), async (req, res) => {
  const { name, description, duration } = req.body;
  const videoFile = req.files['video']?.[0];
  const previewFile = req.files['preview']?.[0];

  if (!videoFile || !name || !duration) {
    return res.status(400).json({ error: 'Missing required files or metadata' });
  }

  try {
    // 0. Verify Admin Role
    const isAdminEmail = req.user.email === ADMIN_EMAIL;
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const hasAdminRole = userDoc.exists && userDoc.data().role === 'admin';

    if (!isAdminEmail && !hasAdminRole) {
      console.warn(`[Admin] Unauthorized upload attempt by ${req.user.email}`);
      return res.status(403).json({ error: 'Unauthorized: Admin role required' });
    }

    const templateId = `tpl_${uuidv4().slice(0, 8)}`;
    
    // 1. Upload Motion Video
    const videoPath = `templates/motions/${templateId}_${videoFile.originalname}`;
    const vFile = bucket.file(videoPath);
    const vToken = uuidv4();
    await vFile.save(videoFile.buffer, {
      metadata: { 
        contentType: videoFile.mimetype,
        metadata: { firebaseStorageDownloadTokens: vToken }
      },
      public: true
    });
    const videoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(videoPath)}?alt=media&token=${vToken}`;

    // 2. Handle Preview (Upload or Auto-generate)
    let previewUrl = '';
    if (previewFile) {
      const previewPath = `templates/previews/${templateId}_${previewFile.originalname}`;
      const pFile = bucket.file(previewPath);
      const pToken = uuidv4();
      await pFile.save(previewFile.buffer, {
        metadata: { 
          contentType: previewFile.mimetype,
          metadata: { firebaseStorageDownloadTokens: pToken }
        },
        public: true
      });
      previewUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(previewPath)}?alt=media&token=${pToken}`;
    } else {
      // AUTO-GENERATE PREVIEW
      console.log(`[Admin] Auto-generating preview for ${templateId}...`);
      const tmpDir = os.tmpdir();
      const tmpVideoPath = path.join(tmpDir, `${templateId}_input.mp4`);
      const tmpPreviewPath = path.join(tmpDir, `${templateId}_preview.jpg`);
      
      // Write buffer to temp file
      fs.writeFileSync(tmpVideoPath, videoFile.buffer);

      try {
        // Extract frame at 1s
        await new Promise((resolve, reject) => {
          ffmpeg(tmpVideoPath)
            .screenshots({
              timestamps: [1],
              filename: `${templateId}_preview.jpg`,
              folder: tmpDir,
              size: '640x?'
            })
            .on('end', resolve)
            .on('error', reject);
        });

        const previewBuffer = fs.readFileSync(tmpPreviewPath);
        const optimizedPreview = await sharp(previewBuffer)
          .webp({ quality: 80 })
          .toBuffer();

        const storagePreviewPath = `templates/previews/${templateId}_thumb.webp`;
        const pFile = bucket.file(storagePreviewPath);
        const pToken = uuidv4();
        await pFile.save(optimizedPreview, {
          metadata: { 
            contentType: 'image/webp',
            metadata: { firebaseStorageDownloadTokens: pToken }
          },
          public: true
        });
        previewUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePreviewPath)}?alt=media&token=${pToken}`;
        console.log(`[Admin] Auto-preview generated successfully.`);
      } finally {
        // Cleanup
        if (fs.existsSync(tmpVideoPath)) fs.unlinkSync(tmpVideoPath);
        if (fs.existsSync(tmpPreviewPath)) fs.unlinkSync(tmpPreviewPath);
      }
    }

    // 3. Save to Firestore
    const templateData = {
      id: templateId,
      name,
      description: description || '',
      duration: parseFloat(duration),
      motionVideoUrl: videoUrl,
      previewUrl: previewUrl,
      createdAt: Date.now()
    };

    await db.collection('motion_templates').doc(templateId).set(templateData);

    console.log(`[Admin] New template uploaded: ${name} (${templateId})`);
    res.json({ success: true, template: templateData });
  } catch (error) {
    console.error('[Admin Error] Template upload failed:', error);
    res.status(500).json({ error: 'Failed to upload template' });
  }
});

// --- Unified Hosting: Serve Frontend ---
const __dirname = path.resolve();
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  server.use(express.static(path.join(__dirname, 'dist')));
  server.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
       return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
    res.status(404).json({ error: 'API route not found' });
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`BuildYourInfluencer SECURED Persistence Backend on port ${PORT}`);
});
