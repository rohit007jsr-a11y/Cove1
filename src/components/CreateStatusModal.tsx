import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Type,
  Image as ImageIcon,
  Send,
  Palette,
  Shield,
  UploadCloud,
  Check,
  Film
} from 'lucide-react';
import { StatusPrivacy } from '../types';

interface CreateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  onStatusCreated: (status: any) => void;
}

const BG_GRADIENTS = [
  'from-sky-500 to-blue-700',
  'from-violet-600 to-indigo-900',
  'from-emerald-500 to-teal-800',
  'from-amber-500 to-orange-700',
  'from-rose-500 to-pink-700',
  'from-slate-800 to-slate-950',
  'from-fuchsia-600 to-purple-900',
];

export const CreateStatusModal: React.FC<CreateStatusModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onStatusCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'media'>('text');
  const [text, setText] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedBg, setSelectedBg] = useState(BG_GRADIENTS[0]);
  const [privacy, setPrivacy] = useState<StatusPrivacy>('contacts');
  const [mediaData, setMediaData] = useState<{ url: string; type: 'image' | 'video'; name: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVid = file.type.startsWith('video/');
    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaData({
        url: event.target?.result as string,
        type: isVid ? 'video' : 'image',
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'text' && !text.trim()) return;
    if (activeTab === 'media' && !mediaData) return;

    setIsSubmitting(true);

    try {
      const payload = {
        ownerId: currentUserId,
        ownerName: currentUserName,
        ownerAvatar: currentUserAvatar,
        type: activeTab === 'text' ? 'text' : mediaData?.type || 'image',
        text: activeTab === 'text' ? text.trim() : undefined,
        bgColor: activeTab === 'text' ? selectedBg : undefined,
        contentUrl: activeTab === 'media' ? mediaData?.url : undefined,
        caption: activeTab === 'media' ? caption.trim() : undefined,
        privacy,
      };

      const res = await fetch('/api/statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.status) {
          onStatusCreated(data.status);
          onClose();
          // Reset form
          setText('');
          setCaption('');
          setMediaData(null);
        }
      }
    } catch (err) {
      console.error('Error creating status:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs select-none">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 10 }}
          className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col relative"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <h3 className="font-bold text-slate-900 text-base">Add Status Update</h3>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="flex border-b border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                activeTab === 'text'
                  ? 'border-sky-500 text-sky-600 bg-sky-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Type className="w-4 h-4" />
              <span>Text Status</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('media')}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                activeTab === 'media'
                  ? 'border-sky-500 text-sky-600 bg-sky-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Photo / Video</span>
            </button>
          </div>

          {/* Main Form Body */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {activeTab === 'text' ? (
              <div className="space-y-4">
                {/* Text Story Live Preview Canvas */}
                <div
                  className={`w-full h-56 rounded-2xl bg-gradient-to-br ${selectedBg} p-6 flex items-center justify-center text-center shadow-inner relative`}
                >
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type a status update..."
                    maxLength={180}
                    className="w-full bg-transparent text-white placeholder-white/70 text-center font-bold text-lg focus:outline-none resize-none font-sans"
                    rows={4}
                  />
                  <div className="absolute bottom-2 right-3 text-[10px] text-white/80 font-mono">
                    {text.length}/180
                  </div>
                </div>

                {/* Color Palette Selector */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 mb-2">
                    <Palette className="w-3.5 h-3.5 text-sky-500" />
                    <span>Choose Background Style</span>
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {BG_GRADIENTS.map((bg) => (
                      <button
                        key={bg}
                        type="button"
                        onClick={() => setSelectedBg(bg)}
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${bg} border-2 shrink-0 transition-transform ${
                          selectedBg === bg ? 'scale-110 border-sky-500 ring-2 ring-sky-300' : 'border-white'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {mediaData ? (
                  <div className="relative rounded-2xl overflow-hidden max-h-60 bg-black flex items-center justify-center border border-slate-200">
                    {mediaData.type === 'video' ? (
                      <video src={mediaData.url} controls className="max-h-60 w-full object-contain" />
                    ) : (
                      <img src={mediaData.url} alt="Selected Status" className="max-h-60 w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => setMediaData(null)}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-48 border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-2xl bg-slate-50 hover:bg-sky-50/50 flex flex-col items-center justify-center cursor-pointer transition-colors p-4 text-center"
                  >
                    <div className="p-3 bg-sky-100 text-sky-600 rounded-full mb-2">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-xs text-slate-800">Click to upload photo or video</p>
                    <p className="text-[11px] text-slate-500 mt-1">PNG, JPG, MP4 up to 50MB</p>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Caption (Optional)
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption..."
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 focus:bg-white focus:border-sky-500 rounded-xl text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Privacy Controls Selector */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>Audience Privacy:</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPrivacy('contacts')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    privacy === 'contacts' ? 'bg-white text-sky-600 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  My Contacts
                </button>
                <button
                  type="button"
                  onClick={() => setPrivacy('all')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    privacy === 'all' ? 'bg-white text-sky-600 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  Everyone
                </button>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={
                isSubmitting ||
                (activeTab === 'text' && !text.trim()) ||
                (activeTab === 'media' && !mediaData)
              }
              className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Posting...' : 'Share Status Update'}</span>
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
