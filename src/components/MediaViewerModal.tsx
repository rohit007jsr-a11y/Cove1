import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Share2,
  Check,
  Film,
  Image as ImageIcon
} from 'lucide-react';
import { Message } from '../types';

interface MediaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItems: Message[];
  initialIndex?: number;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  isOpen,
  onClose,
  mediaItems,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [copiedShare, setCopiedShare] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [initialIndex, isOpen]);

  const currentItem = mediaItems[currentIndex] || mediaItems[0];

  const handleNext = useCallback(() => {
    if (mediaItems.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [mediaItems.length]);

  const handlePrev = useCallback(() => {
    if (mediaItems.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [mediaItems.length]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.5, 4));
  const handleZoomOut = () =>
    setZoom((z) => {
      const next = Math.max(z - 0.5, 1);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev]);

  // Pan / Drag handlers when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleDownload = () => {
    if (!currentItem?.media_url) return;
    const a = document.createElement('a');
    a.href = currentItem.media_url;
    a.download = currentItem.file_name || `cove-media-${Date.now()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (!currentItem?.media_url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentItem.file_name || 'Shared Media',
          text: currentItem.content || 'Check out this media from Cove',
          url: currentItem.media_url,
        });
      } catch (err) {
        console.warn('Share cancelled or not supported:', err);
      }
    } else {
      navigator.clipboard.writeText(currentItem.media_url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  if (!isOpen || !currentItem) return null;

  const isVideo =
    currentItem.type === 'video' ||
    currentItem.mime_type?.startsWith('video/') ||
    currentItem.media_url?.match(/\.(mp4|webm|ogg|mov)$/i);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none overflow-hidden"
      >
        {/* Top Header Bar */}
        <div className="p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white z-20">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2 bg-white/10 rounded-xl">
              {isVideo ? <Film className="w-5 h-5 text-sky-400" /> : <ImageIcon className="w-5 h-5 text-sky-400" />}
            </div>
            <div className="overflow-hidden">
              <h3 className="font-bold text-sm truncate">
                {currentItem.file_name || (isVideo ? 'Video Media' : 'Photo Media')}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Shared by {currentItem.sender_name || 'Contact'} &bull; {mediaItems.length > 0 ? `${currentIndex + 1} of ${mediaItems.length}` : ''}
              </p>
            </div>
          </div>

          {/* Action Tools & Close */}
          <div className="flex items-center gap-2">
            {!isVideo && (
              <div className="hidden sm:flex items-center gap-1 bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/10">
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-white/20 rounded-lg text-slate-200 transition-colors"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold px-2">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 hover:bg-white/20 rounded-lg text-slate-200 transition-colors"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                {zoom > 1 && (
                  <button
                    onClick={handleResetZoom}
                    className="p-1.5 hover:bg-white/20 rounded-lg text-slate-200 transition-colors"
                    title="Reset Zoom (0)"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            <button
              onClick={handleShare}
              className="p-2 hover:bg-white/20 rounded-xl text-white transition-colors bg-white/10"
              title="Share / Copy Link"
            >
              {copiedShare ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              onClick={handleDownload}
              className="p-2 hover:bg-white/20 rounded-xl text-white transition-colors bg-white/10"
              title="Download File"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-red-500/80 rounded-xl text-white transition-colors bg-white/10 ml-2"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Center Canvas Display */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="flex-1 relative flex items-center justify-center p-4 cursor-grab active:cursor-grabbing overflow-hidden"
        >
          {/* Navigation Arrows */}
          {mediaItems.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-4 z-30 p-3 rounded-full bg-black/60 hover:bg-sky-600 text-white transition-all transform hover:scale-110 shadow-lg backdrop-blur-md"
                title="Previous Media (Left Arrow)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 z-30 p-3 rounded-full bg-black/60 hover:bg-sky-600 text-white transition-all transform hover:scale-110 shadow-lg backdrop-blur-md"
                title="Next Media (Right Arrow)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Render Active Image or Video with smooth motion animation */}
          <motion.div
            key={currentItem.id}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            }}
            className="max-w-full max-h-[80vh] flex flex-col items-center justify-center transition-transform duration-75"
          >
            {isVideo ? (
              <video
                src={currentItem.media_url}
                controls
                autoPlay
                className="max-h-[75vh] max-w-full rounded-2xl shadow-2xl border border-white/10"
              />
            ) : (
              <img
                src={currentItem.media_url}
                alt="Enlarged Media Preview"
                loading="lazy"
                draggable={false}
                className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10 select-none"
              />
            )}

            {currentItem.content && (
              <p className="mt-4 text-white text-xs bg-black/70 backdrop-blur-md px-5 py-2 rounded-full font-medium border border-white/10 text-center max-w-lg truncate">
                {currentItem.content}
              </p>
            )}
          </motion.div>
        </div>

        {/* Bottom Thumbnail Filmstrip Navigation Carousel */}
        {mediaItems.length > 1 && (
          <div className="p-3 bg-gradient-to-t from-black/80 to-transparent flex justify-center z-20">
            <div className="flex items-center gap-2 overflow-x-auto max-w-full px-4 py-1 scrollbar-none">
              {mediaItems.map((item, idx) => {
                const itemIsVideo =
                  item.type === 'video' || item.media_url?.match(/\.(mp4|webm|ogg)$/i);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setZoom(1);
                      setPan({ x: 0, y: 0 });
                    }}
                    className={`relative w-12 h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      idx === currentIndex
                        ? 'border-sky-400 scale-105 shadow-lg shadow-sky-500/30'
                        : 'border-transparent opacity-50 hover:opacity-100'
                    }`}
                  >
                    {itemIsVideo ? (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                        <Film className="w-5 h-5 text-sky-400" />
                      </div>
                    ) : (
                      <img
                        src={item.thumbnail_url || item.media_url}
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
