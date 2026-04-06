import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { storage, ref, uploadString, getDownloadURL } from '../firebase';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function uploadBase64ToStorage(base64Str: string, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  // uploadString handles data:image/jpeg;base64,... format if we use 'data_url'
  await uploadString(storageRef, base64Str, 'data_url');
  return getDownloadURL(storageRef);
}

export async function compressImage(base64Str: string, maxWidth = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Use a transparent background for WebP if needed, but white is safer for general use
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      }
      // Check if browser supports webp, otherwise fallback to jpeg
      const format = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0 ? 'image/webp' : 'image/jpeg';
      resolve(canvas.toDataURL(format, quality));
    };
    img.onerror = () => resolve(base64Str);
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function downloadMedia(url: string, filename: string) {
  try {
    // Construct our proxy URL
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    
    // Using a direct link with the download attribute pointing to our proxy
    // This is the most reliable way to trigger a "Save As" browser dialog
    const link = document.createElement('a');
    link.href = proxyUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Download initiation failed:', error);
    // Absolute fallback: direct URL in new tab
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
