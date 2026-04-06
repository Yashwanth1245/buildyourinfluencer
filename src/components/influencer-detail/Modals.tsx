import React from 'react';
import { X, Check, Image as ImageIcon, Video, Plus, Volume2, VolumeX, Download, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, downloadMedia } from '../../lib/utils';
import { db, collection, onSnapshot, query, orderBy, handleFirestoreError, OperationType } from '../../firebase';
import { GeneratedContent, MotionTemplate } from '../../types';
import { SynthesizingSkeleton } from '../ui/SynthesizingSkeleton';
import { SkeletonBox } from './Skeleton';

interface ImagePreviewModalProps {
  image: GeneratedContent;
  allVersions: GeneratedContent[];
  onSelectVersion: (image: GeneratedContent) => void;
  onClose: () => void;
}

export function ImagePreviewModal({ image, allVersions, onSelectVersion, onClose }: ImagePreviewModalProps) {
  const [isMuted, setIsMuted] = React.useState(true);

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[70] flex items-center justify-center">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-3 hover:bg-white/10 rounded-full transition-colors z-10 text-white"
      >
        <Plus className="w-6 h-6 rotate-45" />
      </button>

      <div className="flex flex-col md:flex-row w-full h-full p-4 md:p-12 gap-8 items-center max-w-[1600px] mx-auto">
        <div className="flex-1 w-full h-full relative flex flex-col items-center justify-center space-y-8">
          <div className="relative group max-h-[70vh] bg-black/40 rounded-xl overflow-hidden shadow-2xl">
            {image.type === 'video' ? (
              <>
                <video 
                  src={image.content} 
                  autoPlay 
                  loop 
                  muted={isMuted}
                  playsInline
                  className="max-h-[70vh] max-w-full object-contain"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  className="absolute top-4 right-4 p-3 bg-black/60 backdrop-blur-md rounded-full border border-white/10 hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
                </button>
              </>
            ) : (
              <img 
                src={image.content} 
                alt={image.prompt} 
                className="max-h-[70vh] max-w-full object-contain"
              />
            )}
          </div>
          <div>
            <button 
              onClick={() => {
                const ext = image.type === 'video' ? 'mp4' : 'jpg';
                downloadMedia(image.content, `BuildYourInfluencer_${image.id}.${ext}`);
              }}
              className="btn-primary flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full"
            >
              <Download className="w-5 h-5" />
              Download Full {image.type === 'video' ? 'Video' : 'Image'}
            </button>
          </div>
        </div>

        {image.isAvatar && allVersions.length > 0 && (
          <div className="w-full md:w-80 h-full bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col shrink-0 overflow-hidden">
            <div className="mb-6">
              <h3 className="text-xl font-serif italic text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Avatar Versions
              </h3>
              <p className="text-sm text-white/50 mt-1 font-light">
                {allVersions.length} versions generated
              </p>
            </div>
            <div className="overflow-y-auto pr-2 space-y-4 flex-1">
              {allVersions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onSelectVersion(v)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-all flex gap-4 items-center group",
                    image.id === v.id 
                      ? "border-white/40 bg-white/10" 
                      : "border-transparent hover:bg-white/5"
                  )}
                >
                  <img 
                    src={v.previewUrl || v.content} 
                    className="w-16 h-16 rounded-lg object-cover bg-black/50 shrink-0" 
                    alt="version thumbnail"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="flex-1 overflow-hidden">
                    <p className={cn(
                      "text-sm font-bold truncate",
                      image.id === v.id ? "text-white" : "text-white/70 group-hover:text-white"
                    )}>
                      {v.versionName || "Version"}
                    </p>
                    <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1 truncate">
                      {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TemplatePickerModalProps {
  selectedTemplate: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function TemplatePickerModal({ selectedTemplate, onSelect, onClose }: TemplatePickerModalProps) {
  const [templates, setTemplates] = React.useState<MotionTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [audibleId, setAudibleId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const q = query(
      collection(db, 'motion_templates')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MotionTemplate[];
      console.log('[Modal] Motion Templates Fetched:', data.length, data);
      setTemplates(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'motion_templates');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl max-h-[80vh] glass-panel flex flex-col"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold italic tracking-tight">Select Motion Template</h2>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Available Cinematic Motions</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <SkeletonBox key={i} className="aspect-[9/16] rounded-xl" />
              ))
            ) : templates.length > 0 ? (
              templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    onSelect(template.id);
                    // Also unmute temporarily or keep it muted if we are closing
                    // Actually, if we close the modal, it doesn't matter.
                    onClose();
                  }}
                  className={cn(
                    "aspect-[9/16] rounded-xl overflow-hidden border-2 transition-all group relative",
                    selectedTemplate === template.id ? "border-white" : "border-white/10 hover:border-white/40"
                  )}
                >
                  <video 
                    src={template.motionVideoUrl} 
                    autoPlay 
                    loop 
                    muted={audibleId !== template.id}
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover" 
                  />
                  
                  {/* Audio Toggle */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setAudibleId(audibleId === template.id ? null : template.id);
                    }}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/60 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer hover:bg-white hover:text-black"
                  >
                    {audibleId === template.id ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                  </div>

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[8px] font-bold uppercase tracking-widest bg-white text-black px-3 py-1 rounded-full">Select</span>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 backdrop-blur-sm">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-center">{template.name}</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-full py-12 text-center">
                <p className="text-[10px] text-white/20 uppercase tracking-widest">No templates created yet</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface GalleryPickerModalProps {
  contents: GeneratedContent[];
  onSelect: (imageUrl: string) => void;
  onClose: () => void;
  loading?: boolean;
}

export function GalleryPickerModal({ contents, onSelect, onClose, loading = false }: GalleryPickerModalProps) {
  const imageContents = contents.filter(c => c.type === 'image');

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-xl font-serif italic">Select Base Image</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <SkeletonBox key={i} className="aspect-square rounded-xl" />
              ))
            ) : imageContents.map((img) => (
              <button
                key={img.id}
                onClick={() => {
                  if (img.status !== 'generating') {
                    onSelect(img.content);
                    onClose();
                  }
                }}
                className={cn(
                  "aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-white/40 transition-all group relative",
                  img.status === 'generating' ? "cursor-wait" : "cursor-pointer"
                )}
              >
                {img.status === 'generating' ? (
                  <SynthesizingSkeleton label="Synthesizing" isSmall />
                ) : (
                  <img 
                    src={img.previewUrl || img.content} 
                    alt="" 
                    className="w-full h-full object-cover transition-all" 
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-[8px] font-bold uppercase tracking-widest bg-white text-black px-3 py-1 rounded-full">Select</span>
                </div>
              </button>
            ))}
            {!loading && imageContents.length === 0 && (
              <div className="col-span-full py-20 text-center text-neutral-600 italic font-light">
                No photos generated yet.
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface ApiKeyModalProps {
  onSelectKey: () => void;
  onClose: () => void;
}

export function ApiKeyModal({ onSelectKey, onClose }: ApiKeyModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel max-w-md w-full p-8 text-center space-y-6"
      >
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-serif">High Quality Generation</h2>
          <p className="text-neutral-500 text-sm font-light">
            Generating 2K or 4K images requires a paid Gemini API key.
            Please select your key to continue.
          </p>
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-white/40 hover:text-white underline block mt-2"
          >
            Learn about billing
          </a>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={onSelectKey}
            className="btn-primary w-full py-3"
          >
            Select API Key
          </button>
          <button
            onClick={onClose}
            className="btn-ghost w-full py-3"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}
