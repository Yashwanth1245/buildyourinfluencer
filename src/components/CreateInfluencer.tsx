import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Wand2, ArrowLeft, Check, RefreshCcw } from 'lucide-react';
import { db, auth, collection, setDoc, doc, addDoc, onSnapshot, query, where, orderBy, handleFirestoreError, OperationType } from '../firebase';
import { generateInfluencerProfile, generateInfluencerFace, regenerateInfluencerFace } from '../services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import { cn, compressImage, uploadBase64ToStorage } from '../lib/utils';
import { SynthesizingSkeleton } from './ui/SynthesizingSkeleton';

export default function CreateInfluencer() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    age: 24,
    gender: '',
    ethnicity: '',
    faceStructure: '',
    eyeColor: '',
    noseStyle: '',
    influencerType: '',
    customInstructions: ''
  });

  // State for custom inputs when "Other" is selected
  const [customFields, setCustomFields] = useState({
    gender: '',
    ethnicity: '',
    faceStructure: '',
    eyeColor: '',
    noseStyle: '',
    influencerType: ''
  });

  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [faceVersions, setFaceVersions] = useState<string[]>([]);
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [currentInfluencerId, setCurrentInfluencerId] = useState<string | null>(null);
  const [versionCount, setVersionCount] = useState<number>(0);
  const [success, setSuccess] = useState(false);

  // Sync with Firestore for background updates
  React.useEffect(() => {
    if (!currentInfluencerId || !auth.currentUser) return;

    const unsubscribeInf = onSnapshot(doc(db, 'influencers', currentInfluencerId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPreview(data); // Always sync data metadata
        
        // REACTIVE LOADING: If the influencer document status is 'generating',
        // keep the loading state on. If it's 'active', we are ready.
        if (data.status === 'generating') {
          setLoading(true);
        } else if (data.status === 'active' && loading) {
          // Only stop loading if we were actually waiting for something
          setLoading(false);
          setSuccess(true);
          if (data.avatarUrl) {
            setFaceImage(data.avatarUrl);
            setSelectedReference(data.avatarUrl);
          }
        } else if (data.status === 'active' && data.avatarUrl && !faceImage) {
           // Initial load sync
           setFaceImage(data.avatarUrl);
           setSelectedReference(data.avatarUrl);
        }
      }
    });

    const unsubscribeGallery = onSnapshot(
      query(
        collection(db, 'content'),
        where('influencerId', '==', currentInfluencerId),
        where('ownerId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'asc')
      ),
      (snap) => {
        const versions = snap.docs.map(d => d.data().content);
        setFaceVersions(versions);
        if (versions.length > 0 && !selectedReference) {
           setSelectedReference(versions[versions.length - 1]);
        }
      }
    );

    return () => {
      unsubscribeInf();
      unsubscribeGallery();
    };
  }, [currentInfluencerId, faceImage, selectedReference]);

  const saveToGallery = async (imageUrl: string, promptText: string, infId: string, currentVersion: number) => {
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'content'), {
        content: imageUrl,
        prompt: promptText,
        type: 'image',
        ownerId: auth.currentUser.uid,
        createdAt: Date.now(),
        influencerId: infId,
        isAvatar: true,
        versionName: `Version ${currentVersion}`
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'content');
    }
  };

  const isFormValid = () => {
    if (!formData.name) return false;
    
    const requiredSelects: (keyof typeof formData)[] = [
      'gender', 'ethnicity', 'faceStructure', 'eyeColor', 'noseStyle', 'influencerType'
    ];
    
    for (const field of requiredSelects) {
      if (!formData[field]) return false;
      if (formData[field] === 'Other' && !customFields[field as keyof typeof customFields]) {
        return false;
      }
    }
    return true;
  };

  const handleInitialGenerate = async () => {
    if (!isFormValid()) {
      setErrorMsg("Please fill out all required fields.");
      return;
    }
    
    setErrorMsg(null);
    
    // Prepare final data by merging custom fields if "Other" is selected
    const finalData = {
      ...formData,
      gender: formData.gender === 'Other' ? customFields.gender : formData.gender,
      ethnicity: formData.ethnicity === 'Other' ? customFields.ethnicity : formData.ethnicity,
      faceStructure: formData.faceStructure === 'Other' ? customFields.faceStructure : formData.faceStructure,
      eyeColor: formData.eyeColor === 'Other' ? customFields.eyeColor : formData.eyeColor,
      noseStyle: formData.noseStyle === 'Other' ? customFields.noseStyle : formData.noseStyle,
      influencerType: formData.influencerType === 'Other' ? customFields.influencerType : formData.influencerType,
    };

    setLoading(true);
    try {
      const newInfId = currentInfluencerId || doc(collection(db, 'influencers')).id;
      if (!currentInfluencerId) setCurrentInfluencerId(newInfId);
      
      const newVersion = versionCount + 1;
      setVersionCount(newVersion);

      const profile = await generateInfluencerProfile(finalData);
      setPreview(profile);

      // Trigger Backend-Proxy Generation
      await generateInfluencerFace(profile, newInfId);
      
      // We don't await the result! The server will update Firestore when done.
      // Leave loading as true - the onSnapshot will flip it when status goes 'active'
      setErrorMsg(null);
    } catch (error: any) {
      console.error("Generation failed:", error);
      setErrorMsg(error.message || "An error occurred during generation.");
      setLoading(false);
    }
  };

  const handleRegenerateFace = async () => {
    if (!preview || !currentInfluencerId) return;
    setLoading(true);
    try {
      const newVersion = versionCount + 1;
      setVersionCount(newVersion);

      // 1. Prepare data with current form values (allow refinements to update)
      const finalData = {
        ...formData,
        gender: formData.gender === 'Other' ? customFields.gender : formData.gender,
        ethnicity: formData.ethnicity === 'Other' ? customFields.ethnicity : formData.ethnicity,
        faceStructure: formData.faceStructure === 'Other' ? customFields.faceStructure : formData.faceStructure,
        eyeColor: formData.eyeColor === 'Other' ? customFields.eyeColor : formData.eyeColor,
        noseStyle: formData.noseStyle === 'Other' ? customFields.noseStyle : formData.noseStyle,
        influencerType: formData.influencerType === 'Other' ? customFields.influencerType : formData.influencerType,
      };
      
      const currentProfile = await generateInfluencerProfile(finalData);

      // 2. Trigger Backend-Proxy Regeneration
      await regenerateInfluencerFace({
        influencerId: currentInfluencerId,
        facePrompt: currentProfile.facePrompt, // Use updated prompt from form
        refinementPrompt: (refinementPrompt.trim() || ""),
        referenceUrl: preview.avatarUrl || preview.facePrompt,
        versionCount: newVersion
      });

      // Leave loading true - onSnapshot will handle it.
      setRefinementPrompt('');
    } catch (error: any) {
      console.error("Regeneration failed:", error);
      setErrorMsg(error.message || "An error occurred during regeneration.");
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preview || !faceImage || !auth.currentUser) return;
    // Data is already auto-saved during generation
    navigate('/dashboard');
  };

  const renderSelectWithOther = (
    label: string, 
    field: keyof typeof formData, 
    options: string[], 
    placeholder: string
  ) => {
    const isOther = formData[field] === 'Other';
    // Core identity fields are locked after first generation
    const isCoreField = ['gender', 'ethnicity'].includes(field as string);
    const isDisabled = !!faceImage && isCoreField;
    
    return (
      <div className={cn("space-y-1.5", isDisabled && "opacity-80")}>
        <label className="label-caps">{label}</label>
        <div className="space-y-2">
          <select
            value={formData[field]}
            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
            className={cn("input-field appearance-none", isDisabled && "cursor-not-allowed bg-white/5")}
            disabled={isDisabled}
          >
            <option value="" disabled className="bg-neutral-900">{placeholder}</option>
            {options.map(opt => (
              <option key={opt} value={opt} className="bg-neutral-900">{opt}</option>
            ))}
            <option value="Other" className="bg-neutral-900">Other</option>
          </select>
          
          {isOther && (
            <input
              type="text"
              value={customFields[field as keyof typeof customFields]}
              onChange={(e) => setCustomFields({ ...customFields, [field]: e.target.value })}
              className={cn("input-field", faceImage && "cursor-not-allowed bg-white/5")}
              disabled={!!faceImage}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 sm:space-y-12">
      <header className="flex items-center gap-4 sm:gap-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-white/5 rounded-full transition-colors border border-white/10 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="section-header">
          <h1 className="section-title italic">Create Persona</h1>
          <p className="section-subtitle">Build your digital identity from the ground up.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12">
        {/* Form Section */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel space-y-6 p-5 sm:p-8">
            <div className="space-y-1.5">
              <label className="label-caps">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={cn("input-field", !!faceImage && "cursor-not-allowed bg-white/5 opacity-50")}
                placeholder="Persona Name"
                disabled={!!faceImage}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="label-caps">Age</label>
                <span className="text-white font-bold text-sm tracking-widest">{formData.age}</span>
              </div>
              <input
                type="range"
                min="18"
                max="65"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                className={cn("w-full accent-white h-1 bg-white/10 rounded-lg appearance-none cursor-pointer", !!faceImage && "opacity-30 cursor-not-allowed")}
                disabled={!!faceImage}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {renderSelectWithOther('Gender', 'gender', 
                ['Female', 'Male', 'Non-binary'], 
                'Select gender'
              )}
              {renderSelectWithOther('Ethnicity', 'ethnicity', 
                ['East Asian', 'South Asian', 'Caucasian', 'African', 'Hispanic/Latino', 'Middle Eastern', 'Mixed'], 
                'Select ethnicity'
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {renderSelectWithOther('Face Structure', 'faceStructure', 
                ['Oval', 'Square', 'Heart', 'Diamond', 'Round'], 
                'Select structure'
              )}
              {renderSelectWithOther('Eye Color', 'eyeColor', 
                ['Brown', 'Blue', 'Green', 'Hazel', 'Amber', 'Gray'], 
                'Select color'
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {renderSelectWithOther('Nose Style', 'noseStyle', 
                ['Straight', 'Button', 'Aquiline', 'Grecian', 'Nubian'], 
                'Select style'
              )}
              {renderSelectWithOther('Influencer Type', 'influencerType', 
                ['Tech-savvy', 'Minimalist', 'Street fashion enthusiast', 'Dancer', 'Doctor', 'Fitness', 'Travel', 'Artist'], 
                'Select type'
              )}
            </div>

            <div className="space-y-1.5">
              <label className="label-caps">Custom Instructions</label>
              <input
                type="text"
                value={formData.customInstructions}
                onChange={(e) => setFormData({ ...formData, customInstructions: e.target.value })}
                placeholder="e.g. Sharp jawline, subtle freckles..."
                className={cn("input-field", faceImage && "cursor-not-allowed opacity-80 bg-white/5")}
                disabled={!!faceImage}
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {errorMsg}
              </div>
            )}

            {!faceImage ? (
              <button
                onClick={handleInitialGenerate}
                disabled={loading || !isFormValid()}
                className="btn-primary w-full py-3.5 mt-4 rounded-xl flex items-center justify-center gap-2.5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em]">Generate Identity</span>
                    <div className="w-px h-3 bg-black/10 mx-0.5" />
                    <Sparkles className="w-3.5 h-3.5 fill-black" />
                    <span className="text-[11px] font-bold text-black">3</span>
                  </div>
                )}
              </button>
            ) : (
              <div className="space-y-4 pt-4 border-t border-white/5">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="btn-primary w-full py-4 text-sm font-bold"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-black mx-auto"></div>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Check className="w-5 h-5" />
                      Confirm & Save Persona
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-6 space-y-6">
          <div className="image-preview group aspect-square bg-white/[0.02] flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 relative">
            {faceImage ? (
              <>
                <img 
                  src={faceImage} 
                  alt="Generated Face" 
                  className={cn("w-full h-full object-cover transition-all duration-1000 ease-in-out", loading && "blur-md scale-105")} 
                />
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <SynthesizingSkeleton 
                      label="Synthesizing Refinement" 
                      sublabel="Tuning persona features to your requirements"
                    />
                  </div>
                )}
              </>
            ) : loading ? (
              <SynthesizingSkeleton 
                label="Synthesizing Identity" 
                sublabel="Crafting custom human-world proportions"
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-neutral-700">
                <Sparkles className="w-12 h-12 opacity-20" />
                <p className="label-caps opacity-40">Identity Preview</p>
              </div>
            )}
          </div>

          {faceImage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {faceVersions.length > 1 && (
                <div className="space-y-3">
                  <label className="label-caps">Select Reference Version</label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {faceVersions.map((version, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedReference(version);
                          setFaceImage(version);
                        }}
                        className={cn(
                          "aspect-square rounded-lg overflow-hidden border-2 transition-all relative group",
                          selectedReference === version 
                            ? "border-white" 
                            : "border-white/10 hover:border-white/40"
                        )}
                      >
                        <img 
                          src={version} 
                          alt={`Version ${index + 1}`} 
                          className="w-full h-full object-cover" 
                        />
                        {selectedReference === version && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-[8px] font-bold uppercase tracking-widest text-white px-2 py-0.5 rounded-full border border-white/50">Reference</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-[8px] font-bold uppercase tracking-widest text-center">v{index + 1}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="label-caps">Refine Face</label>
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Using v{faceVersions.indexOf(selectedReference || '') + 1 || faceVersions.length} as base</span>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={refinementPrompt}
                    onChange={(e) => setRefinementPrompt(e.target.value)}
                    placeholder="e.g. Add freckles, change eye color to green..."
                    className="input-field flex-1"
                  />
                  <button
                    onClick={handleRegenerateFace}
                    disabled={loading}
                    className="px-5 py-3.5 border border-white/20 rounded-xl hover:bg-white hover:text-black transition-all bg-white/5 flex items-center justify-center min-w-[160px] font-bold text-[11px] uppercase tracking-[0.15em] gap-2 shadow-lg shadow-black/40 group"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                        <span>Wait...</span>
                      </div>
                    ) : (
                      <>
                        <RefreshCcw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                        <span>Regenerate</span>
                        <div className="w-px h-3 bg-white/10 mx-0.5" />
                        <Sparkles className="w-3.5 h-3.5 fill-current" />
                        <span>3</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
