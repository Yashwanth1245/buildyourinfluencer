import React, { useState, useEffect } from 'react';
import { db, auth, collection, query, where, onSnapshot, orderBy, handleFirestoreError, OperationType } from '../firebase';
import { GeneratedContent } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ImageIcon, Video, Download, Filter, Sparkles, Eye } from 'lucide-react';
import { cn, downloadMedia } from '../lib/utils';
import { ImagePreviewModal } from './influencer-detail';
import { LazyImage } from './ui/LazyImage';
import { SkeletonBox } from './influencer-detail/Skeleton';

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-white/5 rounded", className)} />
);

export default function Gallery() {
  const [contents, setContents] = useState<GeneratedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [previewImage, setPreviewImage] = useState<GeneratedContent | null>(null);

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const fetchGallery = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/user/content', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setContents(data);
        }
      } catch (err) {
        console.error("[Gallery] Fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
    const interval = setInterval(fetchGallery, 15000); // Poll every 15s

    return () => clearInterval(interval);
  }, []);

  // Group isAvatar items by influencerId
  const displayContents = contents.reduce((acc: GeneratedContent[], item) => {
    if (item.isAvatar) {
      const existingIndex = acc.findIndex(c => c.influencerId === item.influencerId && c.isAvatar);
      if (existingIndex === -1) {
        acc.push(item);
      }
      // If we find an existing one, we skip this version for the main grid as it's already represented
      return acc;
    }
    acc.push(item);
    return acc;
  }, []);

  const filteredContents = displayContents.filter(item => 
    filter === 'all' ? true : item.type === filter
  );

  const getVersions = (influencerId?: string) => {
    if (!influencerId) return [];
    return contents.filter(c => c.influencerId === influencerId && c.isAvatar);
  };

  if (loading) {
    return (
      <div className="space-y-12 h-full flex flex-col w-full">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-64 bg-white/5 rounded-lg" />
            <Skeleton className="h-4 w-96 bg-white/5 rounded-lg" />
          </div>
          <Skeleton className="h-12 w-64 bg-white/5 rounded-full" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="glass-card aspect-[9/16] overflow-hidden">
              <SkeletonBox className="w-full h-[85%]" />
              <div className="p-4 space-y-2">
                <SkeletonBox className="h-2 w-2/3" />
                <SkeletonBox className="h-2 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-12 h-full flex flex-col w-full">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="section-header">
          <h1 className="section-title">Content Gallery</h1>
          <p className="section-subtitle">A curated collection of your AI-generated assets.</p>
        </div>
        
        <div className="tab-group">
          {(['all', 'image', 'video'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "tab-btn px-6",
                filter === f ? "tab-btn-active" : "tab-btn-inactive"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      {filteredContents.length === 0 ? (
        <div className="glass-panel w-full flex-1 flex flex-col items-center justify-center text-center space-y-4 border-dashed">
          <p className="text-neutral-600 font-light italic text-lg">No content found in your gallery.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredContents.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={item.id}
                className="glass-card"
              >
                {item.type === 'image' || item.type === 'video' ? (
                  <div 
                    className="relative group aspect-square overflow-hidden bg-neutral-950 cursor-pointer"
                    onClick={() => setPreviewImage(item)}
                  >
                    {item.status === 'generating' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-neutral-900 animate-pulse">
                        <div className="w-12 h-12 border-2 border-white/20 rounded-full border-t-white animate-spin" />
                        <div className="text-center px-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Synthesizing</p>
                          <p className="text-[8px] text-white/20 mt-1 uppercase tracking-tighter">AI Background Worker Active</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full">
                        {item.type === 'video' && !item.previewUrl ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-neutral-950 border border-white/5">
                            <div className="p-4 bg-white/5 rounded-full border border-white/10 group-hover:bg-white/10 transition-colors">
                              <Video className="w-6 h-6 text-white/20 group-hover:text-white/40" />
                            </div>
                            <div className="text-center px-4">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">Native Video</p>
                              <p className="text-[7px] text-white/20 mt-1 uppercase tracking-tighter">Thumbnail unavailable for legacy content</p>
                            </div>
                          </div>
                        ) : (
                          <LazyImage 
                            src={item.previewUrl || item.content} 
                            alt={item.prompt} 
                            className="w-full h-full object-contain transition-all duration-700" 
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                      </div>
                    )}
                    {item.isAvatar && (
                      <div className="absolute top-4 left-4 p-2 px-3 bg-white text-black rounded-full border border-white/10 flex items-center gap-1.5 shadow-xl">
                        <Sparkles className="w-3 h-3" />
                        <span className="text-[8px] font-bold uppercase tracking-widest">Profile</span>
                      </div>
                    )}
                    {item.type === 'video' && (
                      <div className="absolute top-4 right-4 p-2 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                        <Video className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className="overlay-content group-hover:opacity-100 flex items-center justify-center">
                      <div className="p-3 bg-white/20 backdrop-blur-md text-white rounded-full border border-white/30 transform scale-90 group-hover:scale-100 transition-all duration-300">
                        <Eye className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="p-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-neutral-600 uppercase tracking-widest truncate">{item.prompt}</p>
                    <p className="text-[8px] text-neutral-800 tracking-tighter mt-0.5">{new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      const ext = item.type === 'video' ? 'mp4' : 'jpg';
                      downloadMedia(item.content, `persona-ai-${item.id}.${ext}`);
                    }}
                    className="p-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all border border-white/10 shrink-0"
                    title="Download"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {previewImage && (
          <ImagePreviewModal
            image={previewImage}
            allVersions={previewImage.isAvatar ? getVersions(previewImage.influencerId) : []}
            onSelectVersion={setPreviewImage}
            onClose={() => setPreviewImage(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
