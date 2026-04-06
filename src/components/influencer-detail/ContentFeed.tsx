import React, { useState } from 'react';
import { Download, Play, Video, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { GeneratedContent } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { downloadMedia } from '../../lib/utils';
import { LazyImage } from '../ui/LazyImage';
import { SynthesizingSkeleton } from '../ui/SynthesizingSkeleton';
import { SkeletonBox } from './Skeleton';

interface ContentFeedProps {
  contents: GeneratedContent[];
  onPreviewImage?: (content: GeneratedContent) => void;
  activeContentId: string | null;
  setActiveContentId: (id: string | null) => void;
}

export default function ContentFeed({ contents, onPreviewImage, activeContentId, setActiveContentId }: ContentFeedProps) {
  const focusedContent = contents.find(c => c.id === activeContentId);
  const isGenerating = activeContentId && !focusedContent;
  const [isMuted, setIsMuted] = useState(true);

  return (
    <div className="studio-content">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-serif">Studio Output</h2>
        <span className="label-caps">
          {contents.length} Creations
        </span>
      </div>

      {!activeContentId ? (
        <div className="glass-panel aspect-square flex flex-col items-center justify-center gap-6 border-dashed opacity-60">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-neutral-700 opacity-20" />
          </div>
          <div className="text-center space-y-2">
            <p className="label-caps opacity-40">Ready for Creation</p>
            <p className="text-xs text-neutral-600 font-light italic">Your photographic vision will appear here once generated.</p>
          </div>
        </div>
      ) : (isGenerating || (focusedContent && focusedContent.status === 'generating')) ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel overflow-hidden border-white/20 shadow-2xl relative p-0"
        >
          <div className="aspect-square relative group">
            <SynthesizingSkeleton 
              label="Synthesizing Vision" 
              sublabel="Our AI is crafting your high-end cinematic render"
            />
          </div>
        </motion.div>
      ) : (focusedContent && focusedContent.status === 'failed') ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel overflow-hidden border-red-500/20 bg-red-500/5 shadow-2xl relative p-8 mb-12"
        >
          <div className="flex flex-col items-center justify-center text-center gap-6 min-h-[300px]">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-red-500 opacity-40" />
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="label-caps text-red-400">Generation Failed</h3>
              <p className="text-sm text-neutral-400 font-light italic leading-relaxed">
                {focusedContent.error || "Our AI was unable to synthesize this specific vision. This often happens if the content doesn't comply with platform regulations."}
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 w-full max-w-sm">
              <p className="text-[10px] text-neutral-600 uppercase tracking-widest leading-relaxed">
                Please refine your prompt or reference images and try again.
              </p>
            </div>
          </div>
        </motion.div>
      ) : focusedContent ? (
        <div className="space-y-12">
          {/* Focused Creation Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card overflow-hidden"
          >
            <div 
              className="relative group aspect-square max-h-[500px] mx-auto overflow-hidden cursor-pointer bg-neutral-950"
              onClick={() => onPreviewImage?.(focusedContent)}
            >
              {focusedContent.type === 'video' ? (
                <>
                  <video 
                    src={focusedContent.content}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-6 right-6 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMuted(!isMuted);
                      }}
                      className="p-3 bg-black/60 backdrop-blur-md rounded-full border border-white/10 hover:bg-black/80 transition-all group-hover:scale-110"
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5 text-white" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <LazyImage
                  src={focusedContent.previewUrl || focusedContent.content}
                  alt={focusedContent.prompt}
                  className="w-full h-full object-contain transition-all duration-1000"
                />
              )}
            </div>
            <div className="p-6 bg-white/[0.02] border-t border-white/5 flex items-center justify-between gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <p className="text-[10px] text-neutral-500 uppercase tracking-[0.2em]">{focusedContent.id === contents[0]?.id ? 'Latest Creation' : 'Selected History'}</p>
                <p className="text-sm text-neutral-300 font-light italic leading-relaxed truncate">{focusedContent.prompt}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <p className="text-[10px] text-neutral-700 uppercase tracking-widest">{new Date(focusedContent.createdAt).toLocaleDateString()}</p>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    const ext = focusedContent.type === 'video' ? 'mp4' : 'jpg';
                    downloadMedia(focusedContent.content, `persona-ai-${focusedContent.id}.${ext}`);
                  }}
                  className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all border border-white/10"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
