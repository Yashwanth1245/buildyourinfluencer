import React, { useState, useRef } from 'react';
import { Upload, Video, Image as ImageIcon, CheckCircle, AlertCircle, X, Loader2, Play } from 'lucide-react';
import { auth } from '../firebase';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function AdminTemplateUpload() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      
      // Hidden video element to get duration
      const tempVideo = document.createElement('video');
      tempVideo.src = url;
      tempVideo.onloadedmetadata = () => {
        setDuration(tempVideo.duration);
        URL.revokeObjectURL(url);
      };
    }
  };

  const handlePreviewSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPreviewFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile || !name || !duration) {
      setError('Please fill all fields and select a motion video');
      return;
    }

    setIsUploading(true);
    setUploadStatus('idle');
    setError('');

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();

      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('duration', duration.toString());
      formData.append('video', videoFile);
      if (previewFile) {
        formData.append('preview', previewFile);
      }

      const response = await fetch('/api/admin/upload-template', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Upload failed');

      setUploadStatus('success');
      // Reset form
      setName('');
      setDescription('');
      setVideoFile(null);
      setPreviewFile(null);
      setDuration(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic">Upload Motion Template</h1>
          <p className="text-white/40 text-sm">Add a new template to the global library.</p>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors"
        >
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Form Side */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="glass-panel p-8 space-y-6 border-white/10">
              <div className="space-y-2">
                <label className="label-caps">Template Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cinematic Street Walk"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-white/40 focus:bg-white/10 transition-all outline-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="label-caps">Description (Optional)</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the motion or recommended camera angle..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm h-24 focus:border-white/40 focus:bg-white/10 transition-all outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Video Upload */}
                <div className="space-y-2">
                  <label className="label-caps">Motion Video (.mp4)</label>
                  <label className={cn(
                    "relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all h-40",
                    videoFile ? "border-green-500/50 bg-green-500/5" : "border-white/10 bg-white/5 hover:border-white/20"
                  )}>
                    <input type="file" accept="video/mp4" onChange={handleVideoSelect} className="hidden" />
                    {videoFile ? (
                      <div className="text-center">
                        <Video className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="text-[10px] font-bold uppercase truncate max-w-[120px]">{videoFile.name}</p>
                        {duration && <p className="text-[9px] text-white/40 mt-1">{duration.toFixed(1)}s</p>}
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 text-white/20 mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Select Video</p>
                      </>
                    )}
                  </label>
                </div>

                {/* Preview Upload */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="label-caps">Preview Asset</label>
                    <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">Optional</span>
                  </div>
                  <label className={cn(
                    "relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all h-40",
                    previewFile ? "border-blue-500/50 bg-blue-500/5" : "border-white/10 bg-white/5 hover:border-white/20"
                  )}>
                    <input type="file" accept="image/*,video/*" onChange={handlePreviewSelect} className="hidden" />
                    {previewFile ? (
                      <div className="text-center">
                        <ImageIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                        <p className="text-[10px] font-bold uppercase truncate max-w-[120px]">{previewFile.name}</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 text-white/10 mb-2 mx-auto animate-spin-slow" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Auto-Generate</p>
                        <p className="text-[8px] text-white/20 mt-1 max-w-[100px] mx-auto">Or click to upload custom</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isUploading || !videoFile || !name}
                className={cn(
                  "btn-primary w-full py-4 relative overflow-hidden group",
                  isUploading && "opacity-50 cursor-not-allowed"
                )}
              >
                {isUploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finalizing Template...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Publish Template
                  </span>
                )}
              </button>

              {uploadStatus === 'success' && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <p className="text-sm font-bold text-green-500">Template published successfully!</p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-sm font-bold text-red-500">{error}</p>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Requirements Side */}
        <div className="space-y-6">
          <div className="glass-panel p-6 space-y-4 border-white/10">
            <h3 className="label-caps !text-white">Requirements</h3>
            <ul className="space-y-3">
              {[
                { label: 'Ratio', value: '9:16 vertical recommended' },
                { label: 'Format', value: '.mp4 (H.264)' },
                { label: 'Motion', value: 'Subject thigh-up or full-body' },
                { label: 'Length', value: '5-10 seconds ideal' },
              ].map((req, i) => (
                <li key={i} className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{req.label}</span>
                  <span className="text-xs text-white/60 font-medium">{req.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
            <p className="text-[10px] text-blue-400 leading-relaxed font-medium">
              <strong>Admin Tip:</strong> Previews should be high-quality thumbnails. If the motion involves audio that should be keepable, ensure the source video has clean audio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
