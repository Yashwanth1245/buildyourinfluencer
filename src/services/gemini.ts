import { auth } from '../firebase';

/**
 * BUILDYOURINFLUENCER CLIENT SERVICE
 * This service is a thin bridge to the backend persistence layer.
 * All intelligence and API keys are now securely handled on the server.
 */

// Helper to get fresh JWT token
async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}

/**
 * Pure helper for profile text formatting.
 */
export async function generateInfluencerProfile(params: { 
  name: string; 
  age: number; 
  gender: string;
  ethnicity: string; 
  faceStructure: string;
  eyeColor: string;
  noseStyle: string;
  influencerType: string;
  customInstructions: string;
}) {
  const personality = "confident, engaging, professional";
  const appearance = `${params.age} year old ${params.gender} of ${params.ethnicity} descent. ` +
    `They have a ${params.faceStructure.toLowerCase()} face, ${params.eyeColor.toLowerCase()} eyes, ` +
    `and a ${params.noseStyle.toLowerCase()} nose. Style relies on being a ${params.influencerType.toLowerCase()}. ` +
    (params.customInstructions ? `Special features: ${params.customInstructions}.` : "");
    
  const facePrompt = `A ${params.age} year old ${params.gender} of ${params.ethnicity} descent. ` +
    `Face structure: ${params.faceStructure}, Eyes: ${params.eyeColor}, Nose: ${params.noseStyle}. ` +
    (params.customInstructions ? `Instructions: ${params.customInstructions}.` : "");

  return {
    name: params.name,
    personality: personality,
    appearance: appearance,
    facePrompt: facePrompt
  };
}

/**
 * Generate Initial Persona: Calls backend persistence
 */
export async function generateInfluencerFace(profile: any, influencerId: string) {
  const headers = await getAuthHeaders();
  const resp = await fetch('/api/generate-persona', {
    method: 'POST',
    headers,
    body: JSON.stringify({ profile, influencerId })
  });
  
  if (!resp.ok) throw new Error("Failed to start persona generation");
  return { taskId: 'persona_creation_started' };
}

/**
 * Regenerate Face Version: Calls backend persistence
 */
export async function regenerateInfluencerFace(params: {
  influencerId: string;
  facePrompt: string;
  refinementPrompt: string;
  referenceUrl: string;
  versionCount: number;
}) {
  const headers = await getAuthHeaders();
  const resp = await fetch('/api/regenerate-persona-face', {
    method: 'POST',
    headers,
    body: JSON.stringify(params)
  });
  
  if (!resp.ok) throw new Error("Failed to start face regeneration");
  return { taskId: 'regeneration_started' };
}

/**
 * STUDIO GENERATION: Calls backend persistence
 */
export async function generateInfluencerImage(
  influencerId: string, 
  prompt: string,
  options: { 
    aspectRatio: string; 
    imageSize?: string;
    references?: { url: string; instruction: string }[];
    contentId: string;
  }
) {
  const headers = await getAuthHeaders();
  const resp = await fetch('/api/generate-image', {
    method: 'POST',
    headers,
    body: JSON.stringify({ 
      influencerId, 
      prompt, 
      options,
      contentId: options.contentId
    })
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to start studio generation");
  }
  return { taskId: 'background_started' };
}

/**
 * VIDEO STUDIO: Calls backend persistence
 */
export async function generateVideoContent(params: {
  influencerId: string;
  contentId: string;
  templateId: string;
  prompt: string;
  keepAudio?: boolean;
  baseImageUrl?: string;
  model?: string;
  resolution?: string;
}) {
  const headers = await getAuthHeaders();
  const resp = await fetch('/api/generate-video', {
    method: 'POST',
    headers,
    body: JSON.stringify(params)
  });

  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to start video synthesis");
  }
  return { taskId: 'video_synthesis_started' };
}
