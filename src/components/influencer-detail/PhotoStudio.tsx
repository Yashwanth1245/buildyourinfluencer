import React, { useRef } from 'react';
import { Sparkles, Upload, X } from 'lucide-react';
import { cn, fileToDataUrl, compressImage } from '../../lib/utils';

export type ReferenceImage = {
  file: File;
  preview: string;
  instruction: string;
};

interface PhotoStudioProps {
  prompt: string;
  setPrompt: (value: string) => void;
  aspectRatio: "1:1" | "4:5" | "9:16" | "16:9" | "4:3";
  setAspectRatio: (value: "1:1" | "4:5" | "9:16" | "16:9" | "4:3") => void;
  imageQuality: "1K" | "2K" | "4K";
  setImageQuality: (value: "1K" | "2K" | "4K") => void;
  generating: boolean;
  onGenerate: () => void;
  referenceImages: ReferenceImage[];
  setReferenceImages: (images: ReferenceImage[]) => void;
}

const ASPECT_RATIOS = ["1:1", "4:5", "9:16", "16:9", "4:3"] as const;
const QUALITY_OPTIONS = ["1K", "2K", "4K"] as const;

const IMAGE_RATES = {
  "1K": 3,
  "2K": 3,
  "4K": 4
};

export default function PhotoStudio({
  prompt,
  setPrompt,
  aspectRatio,
  setAspectRatio,
  imageQuality,
  setImageQuality,
  generating,
  onGenerate,
  referenceImages,
  setReferenceImages,
}: PhotoStudioProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newRefs: ReferenceImage[] = [];
    for (const file of files) {
      if (referenceImages.length + newRefs.length >= 3) break;
      const dataUrl = await fileToDataUrl(file);
      const preview = await compressImage(dataUrl, 400, 0.8); // 400px is plenty for the small ref thumbnail
      newRefs.push({ file, preview, instruction: '' });
    }

    setReferenceImages([...referenceImages, ...newRefs]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateInstruction = (index: number, instruction: string) => {
    const updated = [...referenceImages];
    updated[index].instruction = instruction;
    setReferenceImages(updated);
  };

  const removeReference = (index: number) => {
    setReferenceImages(referenceImages.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="label-caps">Aspect Ratio</label>
          <div className="grid grid-cols-5 gap-1">
            {ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={cn(
                  "py-2 text-[10px] font-bold border rounded-lg transition-all",
                  aspectRatio === ratio
                    ? "bg-white text-black border-white"
                    : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                )}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="label-caps">Quality</label>
          <div className="grid grid-cols-3 gap-1">
            {QUALITY_OPTIONS.map((q) => (
              <button
                key={q}
                onClick={() => setImageQuality(q as any)}
                className={cn(
                  "py-2 text-[10px] font-bold border rounded-lg transition-all",
                  imageQuality === q
                    ? "bg-white text-black border-white"
                    : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                )}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="label-caps">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Leave empty for auto-generated creative scene, or describe exactly what you want..."
          className="input-field min-h-[120px] resize-none leading-relaxed text-sm"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="label-caps">Reference Images (Max 3)</label>
          {referenceImages.length < 3 && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] text-white/60 hover:text-white flex items-center gap-1 uppercase tracking-widest font-bold"
            >
              <Upload className="w-3 h-3" /> Add Image
            </button>
          )}
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          multiple
          className="hidden"
        />
        
        {referenceImages.length > 0 && (
          <div className="grid gap-3">
            {referenceImages.map((ref, index) => (
              <div key={index} className="flex gap-3 bg-white/5 p-2 rounded-xl border border-white/10 relative">
                <button 
                  onClick={() => removeReference(index)}
                  className="absolute -top-2 -right-2 p-1 bg-neutral-900 border border-white/20 rounded-full hover:bg-neutral-800 transition-colors z-10"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
                <img src={ref.preview} alt={`Reference ${index + 1}`} className="w-16 h-16 object-cover rounded-lg shrink-0 border border-white/10" />
                <textarea
                  value={ref.instruction}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  placeholder="What should I do with this? (e.g. wear this dress)"
                  className="bg-transparent border-none focus:ring-0 text-xs w-full resize-none placeholder:text-white/30 text-white/80 p-1"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onGenerate}
        disabled={generating}
        className="btn-primary w-full py-3.5 mt-4 rounded-xl flex items-center justify-center gap-2.5 transition-all group"
      >
        {generating ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Processing...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em]">Generate</span>
            <div className="w-px h-3 bg-black/10 mx-0.5" />
            <Sparkles className="w-3.5 h-3.5 fill-black" />
            <span className="text-[11px] font-bold">{IMAGE_RATES[imageQuality]}</span>
          </div>
        )}
      </button>
    </div>
  );
}
