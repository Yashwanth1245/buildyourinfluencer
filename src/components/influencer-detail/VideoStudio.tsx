import React from 'react';
import { Video, Play, Trash2, Plus, Image as ImageIcon, Volume2, VolumeX, ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { db, collection, onSnapshot, query, orderBy, handleFirestoreError, OperationType } from '../../firebase';
import { GeneratedContent, MotionTemplate } from '../../types';
import { SkeletonBox } from './Skeleton';

interface VideoStudioProps {
  videoMode: 'template' | 'transfer';
  setVideoMode: (mode: 'template' | 'transfer') => void;
  selectedTemplate: string;
  setSelectedTemplate: (id: string) => void;
  videoBaseImage: string | null;
  setVideoBaseImage: (url: string | null) => void;
  contents: GeneratedContent[];
  generating: boolean;
  onAnimate: (keepAudio: boolean, model: string, resolution: string) => void;
  onShowTemplatePicker: () => void;
  onShowGalleryPicker: () => void;
  onSwitchToPhotos: () => void;
  loading?: boolean;
}

export default function VideoStudio({
  videoMode,
  setVideoMode,
  selectedTemplate,
  setSelectedTemplate,
  videoBaseImage,
  setVideoBaseImage,
  contents,
  generating,
  onAnimate,
  onShowTemplatePicker,
  onShowGalleryPicker,
  onSwitchToPhotos,
  loading = false
}: VideoStudioProps) {
  const [templates, setTemplates] = React.useState<MotionTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = React.useState(true);
  const [audibleId, setAudibleId] = React.useState<string | null>(null);
  const [keepAudio, setKeepAudio] = React.useState(true);
  const [selectedModel, setSelectedModel] = React.useState<'2.6' | '3.0'>('2.6');
  const [selectedResolution, setSelectedResolution] = React.useState<'720p' | '1080p'>('720p');
  
  const imageContents = contents.filter(c => c.type === 'image');

  const VIDEO_RATES = {
    '2.6': { '720p': 1.7, '1080p': 2.3 },
    '3.0': { '720p': 2.5, '1080p': 3.5 }
  };

  const calculateCost = () => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template?.duration) return 0;
    const rate = VIDEO_RATES[selectedModel][selectedResolution];
    return Math.ceil(template.duration * rate);
  };

  React.useEffect(() => {
    const q = query(
      collection(db, 'motion_templates')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MotionTemplate[];
      console.log('[Studio] Motion Templates Fetched:', data.length, data);
      setTemplates(data);
      if (data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(data[0].id);
      }
      setLoadingTemplates(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'motion_templates');
      setLoadingTemplates(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-6">
      <div className="tab-group p-1 bg-white/5 rounded-xl">
        <button
          onClick={() => setVideoMode('template')}
          className={cn(
            "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all",
            videoMode === 'template' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
          )}
        >
          Template
        </button>
        <button
          onClick={() => setVideoMode('transfer')}
          className={cn(
            "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all",
            videoMode === 'transfer' ? "bg-white/10 text-white" : "text-white/40 hover:text-white"
          )}
        >
          Motion Transfer
        </button>
      </div>

      {videoMode === 'template' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="label-caps">Select Template</label>
            <button
              onClick={onShowTemplatePicker}
              className="text-[10px] font-bold text-white/40 hover:text-white transition-colors"
            >
              See All ({templates.length})
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {loadingTemplates ? (
              Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBox key={i} className="aspect-[9/16] rounded-xl" />
              ))
            ) : templates.length > 0 ? (
              templates.slice(0, 8).map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template.id);
                  }}
                  className={cn(
                    "relative aspect-[9/16] rounded-xl overflow-hidden border-2 transition-all group",
                    selectedTemplate === template.id ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
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
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-2 h-1/2">
                    <span className="text-[9px] font-bold truncate text-white">{template.name}</span>
                  </div>
                  
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
                </button>
              ))
            ) : (
              <div className="col-span-4 py-6 text-center border-2 border-dashed border-white/5 rounded-xl">
                <p className="text-[10px] text-white/20 uppercase tracking-widest">No templates found</p>
              </div>
            )}
            <button
              onClick={onShowTemplatePicker}
              className="aspect-[9/16] rounded-xl border border-white/10 bg-white/5 flex flex-col items-center justify-center gap-1 text-white/40 hover:text-white hover:bg-white/10 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-center px-1">More<br/>Templates</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="glass-panel p-4 border-dashed border-white/20 text-center space-y-3">
            <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <Video className="w-5 h-5 text-white/40" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold">Upload Source Video</p>
              <p className="text-[10px] text-white/40">The AI will transfer this motion to your influencer</p>
            </div>
            <button className="btn-secondary py-2 px-4 text-[10px]">Choose File</button>
          </div>
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-[10px] text-blue-400 leading-relaxed">
              <strong>Pro Tip:</strong> For best results, use a video where the subject is clearly visible from at least the thighs up. 9:16 aspect ratio is recommended.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-bold">1</div>
          <label className="label-caps">Base Image</label>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBox key={i} className="aspect-square rounded-xl" />
              ))
            ) : (
              <>
                {imageContents.slice(0, 3).map((img) => {
                  const isSelected = videoBaseImage === img.content;
                  return (
                    <button
                      key={img.id}
                      onClick={() => setVideoBaseImage(isSelected ? null : img.content)}
                      className={`aspect-square rounded-xl overflow-hidden transition-all group relative border-2 ${
                        isSelected ? 'border-blue-500 scale-95 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10 hover:border-white/40'
                      }`}
                    >
                      <img 
                        src={img.previewUrl || img.content} 
                        alt="" 
                        className="w-full h-full object-cover" 
                        loading="lazy"
                        decoding="async"
                      />
                      {!isSelected && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-[8px] font-bold uppercase tracking-widest bg-white text-black px-2 py-0.5 rounded-full">Select</span>
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                      )}
                    </button>
                  );
                })}
                <button
                  onClick={onShowGalleryPicker}
                  className="aspect-square rounded-xl border border-white/10 bg-white/5 flex flex-col items-center justify-center gap-1 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-[8px] font-bold uppercase tracking-widest">More</span>
                </button>
              </>
            )}
          </div>
          {imageContents.length === 0 && (
            <button
              onClick={onSwitchToPhotos}
              className="w-full py-8 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center gap-2 text-white/40 hover:text-white hover:border-white/20 transition-all"
            >
              <ImageIcon className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Generate Photos First</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-bold">2</div>
            <label className="label-caps">Audio Settings</label>
          </div>
          <button 
            onClick={() => setKeepAudio(!keepAudio)}
            className="flex items-center gap-2 group p-1.5 px-3 bg-white/5 rounded-full border border-white/10 hover:border-white/20 transition-all font-sans"
          >
            {keepAudio ? (
              <>
                <Volume2 className="w-3 h-3 text-white" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Original Sound: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3 h-3 text-neutral-500" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-500">Original Sound: OFF</span>
              </>
            )}
            <div className={cn(
              "w-6 h-3 rounded-full relative transition-colors duration-300",
              keepAudio ? "bg-white" : "bg-neutral-800"
            )}>
              <div className={cn(
                "absolute top-0.5 w-2 h-2 rounded-full transition-all duration-300 shadow-sm",
                keepAudio ? "left-[14px] bg-black" : "left-0.5 bg-neutral-500"
              )} />
            </div>
          </button>
        </div>

        <div className="flex flex-col gap-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-[10px] font-bold">3</div>
            <label className="label-caps">Generation Quality</label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Model Selector */}
            <div className="relative group">
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as any)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest outline-none hover:bg-white/10 transition-all appearance-none cursor-pointer"
              >
                <option value="2.6">Kling v2.6</option>
                <option value="3.0">Kling v3.0</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none group-hover:text-white transition-colors" />
            </div>

            {/* Resolution Selector */}
            <div className="relative group">
              <select 
                value={selectedResolution}
                onChange={(e) => setSelectedResolution(e.target.value as any)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-bold uppercase tracking-widest outline-none hover:bg-white/10 transition-all appearance-none cursor-pointer"
              >
                <option value="720p">720p Standard</option>
                <option value="1080p">1080p High-Res</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40 pointer-events-none group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>

        <button
          onClick={() => onAnimate(keepAudio, selectedModel, selectedResolution)}
          disabled={generating || !videoBaseImage}
          className="btn-primary w-full py-3.5 rounded-xl flex items-center justify-center gap-2.5 transition-all group"
        >
          {generating ? (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Animating...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.15em]">Animate</span>
              <div className="w-px h-3 bg-black/10 mx-0.5" />
              <Sparkles className="w-3.5 h-3.5 fill-black" />
              <span className="text-[11px] font-bold">{calculateCost()}</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
