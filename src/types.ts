export interface Influencer {
  id: string;
  name: string;
  personality: string;
  appearance: string;
  bio: string;
  avatarUrl?: string; // Original high-res
  previewUrl?: string; // Optimized WebP thumbnail
  createdAt: number;
  ownerId: string;
  status: 'generating' | 'active' | 'failed';
  error?: string;
}

export interface GeneratedContent {
  id: string;
  influencerId: string;
  type: 'image' | 'video';
  content: string;
  previewUrl?: string;
  prompt: string;
  createdAt: number;
  ownerId: string;
  status: 'generating' | 'active' | 'failed';
  error?: string;
  isAvatar?: boolean;
  versionName?: string;
  references?: { url: string; instruction: string }[];
}

export interface MotionTemplate {
  id: string;
  name: string;
  description: string;
  duration: number;
  previewUrl: string;
  motionVideoUrl: string;
  createdAt?: number;
}
