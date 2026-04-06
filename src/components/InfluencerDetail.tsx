import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Image as ImageIcon, Sparkles, Video, ArrowLeft, Trash2 } from 'lucide-react';
import { db, auth, doc, getDoc, collection, setDoc, query, where, onSnapshot, orderBy, handleFirestoreError, OperationType } from '../firebase';
import { Influencer, GeneratedContent } from '../types';
import { generateInfluencerImage, generateVideoContent } from '../services/gemini';
import { AnimatePresence } from 'motion/react';
import { cn, compressImage, uploadBase64ToStorage } from '../lib/utils';
import { ReferenceImage } from './influencer-detail/PhotoStudio';
import CreditModal from './ui/CreditModal';

import {
  InfluencerDetailSkeleton,
  PhotoStudio,
  VideoStudio,
  ContentFeed,
  TemplatePickerModal,
  GalleryPickerModal,
  ApiKeyModal,
  ImagePreviewModal,
} from './influencer-detail';

export default function InfluencerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [influencer, setInfluencer] = useState<Influencer | null>(null);
  const [contents, setContents] = useState<GeneratedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentsLoading, setContentsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [videoBaseImage, setVideoBaseImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:5" | "9:16" | "16:9" | "4:3">("1:1");
  const [imageQuality, setImageQuality] = useState<"1K" | "2K" | "4K">("2K");
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [videoMode, setVideoMode] = useState<'template' | 'transfer'>('template');
  const [previewImage, setPreviewImage] = useState<GeneratedContent | null>(null);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const activeIdRef = React.useRef<string | null>(null);

  // --- Data fetching (Bypassing firestore rules via backend proxy) ---
  useEffect(() => {
    if (!id || !auth.currentUser) return;

    const fetchInfluencer = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch(`/api/influencers/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setInfluencer(data);
        } else {
          navigate('/dashboard');
        }
      } catch (err) {
        console.error("[Studio] Influencer fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchContent = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch(`/api/influencers/${id}/content`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = (await response.json()) as GeneratedContent[];
          const filtered = data.filter(c => !c.isAvatar);
          setContents(filtered);

          // Reactive Loading Logic via Fetch:
          // Keep the "generating" overlay active until the proxy returns the completed video.
          if (activeIdRef.current) {
            const activeItem = filtered.find(c => c.id === activeIdRef.current);
            if (activeItem && (activeItem.status === 'active' || activeItem.status === 'failed')) {
              setGenerating(false);
              setActiveContentId(null);
              activeIdRef.current = null;
            }
          }
        }
      } catch (err) {
        console.error("[Studio] Content fetch failed:", err);
      } finally {
        setContentsLoading(false);
      }
    };

    const fetchProfile = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUserCredits(data.credits || 0);
        }
      } catch (err) {
        console.error("[Studio] Profile fetch failed:", err);
      }
    };

    fetchInfluencer();
    fetchContent();
    fetchProfile();

    const interval = setInterval(() => {
      fetchContent();
      fetchProfile();
    }, 5000); // 5s poll for content and credits
    
    return () => clearInterval(interval);
  }, [id, navigate]);

  // --- Handlers ---
  const handleGenerateImage = async () => {
    // Prevent double-clicks during active generation
    if (generating || !influencer || !auth.currentUser) return;
    
    setGenerating(true);
    try {
      const contentId = doc(collection(db, 'content')).id;
      activeIdRef.current = contentId;
      setActiveContentId(contentId); // Focus the "generating" spot

      // 1. Prepare references (Upload to storage first so server can access URL)
      const uploadedRefs: { url: string; instruction: string }[] = [];
      for (let i = 0; i < referenceImages.length; i++) {
        const ref = referenceImages[i];
        const compressed = await compressImage(ref.preview);
        const refPath = `content/${auth.currentUser.uid}/${contentId}_ref_${i}.jpg`;
        const url = await uploadBase64ToStorage(compressed, refPath);
        uploadedRefs.push({ url, instruction: ref.instruction });
      }

      // 2. Call the backend-proxy service
      await generateInfluencerImage(id!, prompt, {
        aspectRatio,
        imageSize: imageQuality,
        references: uploadedRefs,
        contentId
      });
      
      // We don't await the result here! The server will update Firestore when done.
      // The onSnapshot listener in useEffect will automatically pick up the new content.
      
      setPrompt('');
      setReferenceImages([]);
    } catch (error: any) {
      console.error("Image generation failed:", error);
      if (error.message.includes('credits') || error.message.includes('402')) {
        setShowCreditModal(true);
      } else {
        alert(error.message || "Failed to start image generation.");
      }
      activeIdRef.current = null;
      setGenerating(false);
      setActiveContentId(null);
    }
    // Note: setGenerating(false) is handled when Firestore onSnapshot sees the new doc or here if failed
  };

  const handleAnimateVideo = async (keepAudio: boolean = true, model: string = '2.6', resolution: string = '720p') => {
    // Prevent double-clicks during active generation
    if (generating || !videoBaseImage || !influencer || !auth.currentUser || !selectedTemplate) return;
    
    setGenerating(true);
    const contentId = doc(collection(db, 'content')).id;
    activeIdRef.current = contentId;
    setActiveContentId(contentId);

    try {
      // 1. Trigger the background generation
      await generateVideoContent({
        influencerId: id!,
        contentId,
        templateId: selectedTemplate,
        prompt: prompt || 'Professional motion synthesis',
        keepAudio,
        baseImageUrl: videoBaseImage,
        model,
        resolution
      });

      // 2. The backend is now working. Our onSnapshot listener will
      //    automatically detect the new ghost record and show the skeleton.
      
      setVideoBaseImage(null);
      setPrompt('');
    } catch (error: any) {
      console.error("Video animation failed:", error);
      if (error.message.includes('credits') || error.message.includes('402')) {
        setShowCreditModal(true);
      } else {
        alert(error.message || "Failed to start video synthesis. Check credits or connection.");
      }
      activeIdRef.current = null;
      setGenerating(false);
      setActiveContentId(null);
    }
  };


  const handleOpenKeyDialog = async () => {
    await (window as any).aistudio.openSelectKey();
    setShowKeyPrompt(false);
    handleGenerateImage();
  };

  const handleGallerySelect = (imageUrl: string) => {
    setVideoBaseImage(imageUrl);
    setShowGalleryPicker(false);
    setActiveTab('videos');
  };

  // --- Render ---
  if (loading || !influencer) {
    return <InfluencerDetailSkeleton />;
  }

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-white/5 rounded-full border border-white/10 transition-colors shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <img
              src={influencer.previewUrl || influencer.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${influencer.id}`}
              alt={influencer.name}
              decoding="async"
              onClick={() => {
                const avatarVersion = contents.find(c => c.content === influencer.avatarUrl);
                if (avatarVersion) setPreviewImage(avatarVersion);
              }}
              className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border-2 border-white/20 object-cover shrink-0 cursor-pointer hover:border-white/50 transition-colors"
            />
          </div>
          <div className="section-header">
            <h1 className="section-title italic">{influencer.name}</h1>
            <p className="section-subtitle">{influencer.personality}</p>
          </div>
        </div>
        <div className="flex gap-4 self-end lg:self-auto">
          <button className="p-3 border border-white/10 rounded-full hover:bg-red-500/10 hover:text-red-400 transition-all">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Studio Grid */}
      <div className="grid-studio">
        {/* Generation Panel */}
        <div className="studio-panel">
          <div className="glass-panel studio-sticky">
            <div className="tab-group">
              <button
                onClick={() => setActiveTab('photos')}
                className={cn(
                  "tab-btn flex items-center justify-center gap-2",
                  activeTab === 'photos' ? "tab-btn-active" : "tab-btn-inactive"
                )}
              >
                <ImageIcon className="w-3 h-3" />
                Photos
              </button>
              <button
                onClick={() => setActiveTab('videos')}
                className={cn(
                  "tab-btn flex items-center justify-center gap-2",
                  activeTab === 'videos' ? "tab-btn-active" : "tab-btn-inactive"
                )}
              >
                <Video className="w-3 h-3" />
                Videos
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="label-caps flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {activeTab === 'photos' ? 'Photo Studio' : 'Motion Studio'}
              </h3>

              {activeTab === 'photos' && (
                <PhotoStudio
                  prompt={prompt}
                  setPrompt={setPrompt}
                  aspectRatio={aspectRatio}
                  setAspectRatio={setAspectRatio}
                  imageQuality={imageQuality}
                  setImageQuality={setImageQuality}
                  generating={generating}
                  onGenerate={handleGenerateImage}
                  referenceImages={referenceImages}
                  setReferenceImages={setReferenceImages}
                />
              )}

              {activeTab === 'videos' && (
                <VideoStudio
                  videoMode={videoMode}
                  setVideoMode={setVideoMode}
                  selectedTemplate={selectedTemplate}
                  setSelectedTemplate={setSelectedTemplate}
                  videoBaseImage={videoBaseImage}
                  setVideoBaseImage={setVideoBaseImage}
                  contents={contents}
                  generating={generating}
                  onAnimate={handleAnimateVideo}
                  onShowTemplatePicker={() => setShowTemplatePicker(true)}
                  onShowGalleryPicker={() => setShowGalleryPicker(true)}
                  onSwitchToPhotos={() => setActiveTab('photos')}
                  loading={contentsLoading}
                />
              )}
            </div>

            <div className="pt-6 border-t border-white/5 space-y-3">
              <h4 className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.2em]">Appearance</h4>
              <p className="text-xs text-neutral-500 leading-relaxed font-light italic">{influencer.appearance}</p>
            </div>
          </div>
        </div>

        <ContentFeed
          contents={contents}
          onPreviewImage={setPreviewImage}
          activeContentId={activeContentId}
          setActiveContentId={setActiveContentId}
        />
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showTemplatePicker && (
          <TemplatePickerModal
            selectedTemplate={selectedTemplate}
            onSelect={setSelectedTemplate}
            onClose={() => setShowTemplatePicker(false)}
          />
        )}

        {showGalleryPicker && (
          <GalleryPickerModal
            contents={contents}
            loading={contentsLoading}
            onSelect={handleGallerySelect}
            onClose={() => setShowGalleryPicker(false)}
          />
        )}

        {showKeyPrompt && (
          <ApiKeyModal
            onSelectKey={handleOpenKeyDialog}
            onClose={() => setShowKeyPrompt(false)}
          />
        )}
        
        {previewImage && (
          <ImagePreviewModal
            image={previewImage}
            allVersions={previewImage.isAvatar ? contents.filter(c => c.isAvatar) : []}
            onSelectVersion={setPreviewImage}
            onClose={() => setPreviewImage(null)}
          />
        )}
      </AnimatePresence>
      {/* Credit Purchase Modal */}
      <CreditModal 
        isOpen={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        userCredits={userCredits}
      />
    </div>
  );
}
