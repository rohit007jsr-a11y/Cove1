import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Clock,
  Shield,
  Send
} from 'lucide-react';
import { UserStatusGroup, StatusItem, StatusViewer } from '../types';

interface StatusViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  statusGroups: UserStatusGroup[];
  initialGroupIndex?: number;
  initialOwnerId?: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  onMarkViewed: (statusId: string) => void;
  onDeleteStatus?: (statusId: string) => void;
  onReplyToStatus?: (statusOwnerId: string, text: string) => void;
}

const ITEM_DURATION = 5000; // 5 seconds per story

export const StatusViewerModal: React.FC<StatusViewerModalProps> = ({
  isOpen,
  onClose,
  statusGroups,
  initialGroupIndex = 0,
  initialOwnerId,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  onMarkViewed,
  onDeleteStatus,
  onReplyToStatus,
}) => {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [itemIndex, setItemIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showViewersDrawer, setShowViewersDrawer] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [mediaError, setMediaError] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Filter to only groups that have valid statuses
  const validGroups = (statusGroups || []).filter(
    (g) => g && Array.isArray(g.statuses) && g.statuses.length > 0
  );

  useEffect(() => {
    let targetIdx = initialGroupIndex;
    if (initialOwnerId) {
      const foundIdx = validGroups.findIndex((g) => g.ownerId === initialOwnerId);
      if (foundIdx >= 0) {
        targetIdx = foundIdx;
      }
    }
    setGroupIndex(Math.min(Math.max(0, targetIdx), Math.max(0, validGroups.length - 1)));
    setItemIndex(0);
    setProgress(0);
    setIsPaused(false);
    setShowViewersDrawer(false);
    setMediaError(false);
  }, [initialGroupIndex, initialOwnerId, isOpen, validGroups.length]);

  const safeGroupIndex = Math.min(Math.max(0, groupIndex), Math.max(0, validGroups.length - 1));
  const activeGroup = validGroups[safeGroupIndex];
  const statuses = activeGroup?.statuses || [];
  const safeItemIndex = Math.min(Math.max(0, itemIndex), Math.max(0, statuses.length - 1));
  const activeStatus: StatusItem | undefined = statuses[safeItemIndex];
  const isOwn = activeGroup?.ownerId === currentUserId;

  // Reset media error whenever active status changes
  useEffect(() => {
    setMediaError(false);
  }, [activeStatus?.id, safeItemIndex, safeGroupIndex]);

  // Mark status as viewed when displayed
  useEffect(() => {
    if (isOpen && activeStatus && !isOwn) {
      onMarkViewed(activeStatus.id);
    }
  }, [isOpen, activeStatus?.id, isOwn, onMarkViewed]);

  const handleNext = useCallback(() => {
    if (!activeGroup || statuses.length === 0) {
      onClose();
      return;
    }

    if (safeItemIndex < statuses.length - 1) {
      setItemIndex((prev) => prev + 1);
      setProgress(0);
      setMediaError(false);
    } else if (safeGroupIndex < validGroups.length - 1) {
      setGroupIndex((prev) => prev + 1);
      setItemIndex(0);
      setProgress(0);
      setMediaError(false);
    } else {
      onClose();
    }
  }, [activeGroup, statuses.length, safeItemIndex, safeGroupIndex, validGroups.length, onClose]);

  const handlePrev = useCallback(() => {
    if (!activeGroup || statuses.length === 0) {
      onClose();
      return;
    }

    if (safeItemIndex > 0) {
      setItemIndex((prev) => prev - 1);
      setProgress(0);
      setMediaError(false);
    } else if (safeGroupIndex > 0) {
      const prevGroup = validGroups[safeGroupIndex - 1];
      setGroupIndex((prev) => prev - 1);
      setItemIndex(prevGroup && prevGroup.statuses ? Math.max(0, prevGroup.statuses.length - 1) : 0);
      setProgress(0);
      setMediaError(false);
    } else {
      setProgress(0);
    }
  }, [activeGroup, statuses.length, safeItemIndex, safeGroupIndex, validGroups, onClose]);

  // Slideshow Progress Timer
  useEffect(() => {
    if (!isOpen || isPaused || showViewersDrawer || !activeStatus) return;

    const interval = 50; // ms
    const increment = (interval / ITEM_DURATION) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen, isPaused, showViewersDrawer, activeStatus, handleNext]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showViewersDrawer) setShowViewersDrawer(false);
        else onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((p) => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleNext, handlePrev, showViewersDrawer]);

  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (showViewersDrawer) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width * 0.35) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !onReplyToStatus || !activeGroup) return;
    onReplyToStatus(activeGroup.ownerId, replyText.trim());
    setReplyText('');
    setIsPaused(false);
  };

  const formatTimeAgo = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return `${Math.floor(hrs / 24)}d ago`;
    } catch {
      return '';
    }
  };

  if (!isOpen || !activeGroup || !activeStatus) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center select-none overflow-hidden"
      >
        {/* Main Phone-style Display Stage */}
        <div className="relative w-full max-w-md h-full sm:h-[92vh] sm:rounded-3xl bg-black overflow-hidden shadow-2xl flex flex-col justify-between border border-white/10">
          
          {/* Top Segmented Progress Bars */}
          <div className="absolute top-0 left-0 right-0 z-30 p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent space-y-2">
            <div className="flex items-center gap-1.5">
              {statuses.map((st, idx) => {
                let barWidth = 0;
                if (idx < safeItemIndex) barWidth = 100;
                else if (idx === safeItemIndex) barWidth = progress;
                else barWidth = 0;

                return (
                  <div
                    key={st.id}
                    className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                  >
                    <div
                      style={{ width: `${barWidth}%` }}
                      className="h-full bg-white transition-all duration-75 rounded-full"
                    />
                  </div>
                );
              })}
            </div>

            {/* Header: User Info & Controls */}
            <div className="flex items-center justify-between text-white pt-1">
              <div className="flex items-center gap-3">
                <img
                  src={
                    activeGroup.ownerAvatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      activeGroup.ownerName
                    )}&background=0284c7&color=fff`
                  }
                  alt={activeGroup.ownerName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-sky-400 shrink-0"
                />
                <div className="overflow-hidden">
                  <h4 className="font-bold text-xs sm:text-sm truncate leading-tight">
                    {activeGroup.ownerName}
                  </h4>
                  <p className="text-[10px] text-slate-300 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-sky-400" />
                    <span>{formatTimeAgo(activeStatus.createdAt)}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
                  title={isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>

                {isOwn && onDeleteStatus && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this status update?')) {
                        onDeleteStatus(activeStatus.id);
                        if (statuses.length <= 1) {
                          if (validGroups.length <= 1) {
                            onClose();
                          } else {
                            handleNext();
                          }
                        } else {
                          handleNext();
                        }
                      }
                    }}
                    className="p-2 hover:bg-red-500/80 rounded-full text-white transition-colors"
                    title="Delete Status"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-full text-white transition-colors ml-1"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Center Story Content Canvas */}
          <div
            onClick={handleScreenClick}
            onMouseDown={() => setIsPaused(true)}
            onMouseUp={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            className="flex-1 w-full relative flex items-center justify-center cursor-pointer overflow-hidden bg-slate-900"
          >
            {/* 1. Image Story */}
            {activeStatus.type === 'image' && activeStatus.contentUrl && !mediaError && (
              <img
                src={activeStatus.contentUrl}
                alt="Story Content"
                onError={() => setMediaError(true)}
                className="w-full h-full object-cover"
              />
            )}

            {/* 2. Video Story */}
            {activeStatus.type === 'video' && activeStatus.contentUrl && !mediaError && (
              <video
                ref={videoRef}
                src={activeStatus.contentUrl}
                autoPlay
                playsInline
                muted={isMuted}
                onError={() => setMediaError(true)}
                className="w-full h-full object-cover"
                onEnded={handleNext}
              />
            )}

            {/* Fallback if image/video failed to load */}
            {mediaError && (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-950 text-white">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-3 backdrop-blur-md border border-white/15">
                  <Shield className="w-7 h-7 text-sky-400" />
                </div>
                <h4 className="text-base font-bold drop-shadow-md max-w-xs">
                  {activeStatus.caption || `${activeGroup.ownerName}'s Update`}
                </h4>
                <p className="text-xs text-sky-200/80 mt-1.5 max-w-xs font-medium">
                  {formatTimeAgo(activeStatus.createdAt)}
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMediaError(false);
                  }}
                  className="mt-4 px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full text-xs font-semibold backdrop-blur-md transition-all border border-white/20 active:scale-95 cursor-pointer"
                >
                  Tap to retry
                </button>
              </div>
            )}

            {/* 3. Text Story Canvas */}
            {activeStatus.type === 'text' && (
              <div
                className={`w-full h-full bg-gradient-to-br ${
                  activeStatus.bgColor || 'from-sky-500 to-indigo-700'
                } flex items-center justify-center p-8 text-center`}
              >
                <p className="text-white text-xl sm:text-2xl font-black font-sans leading-relaxed drop-shadow-md whitespace-pre-wrap max-w-xs">
                  {activeStatus.text}
                </p>
              </div>
            )}

            {/* Caption Overlay */}
            {activeStatus.caption && activeStatus.type !== 'text' && (
              <div className="absolute bottom-20 left-4 right-4 z-20 bg-black/60 backdrop-blur-md text-white p-3.5 rounded-2xl border border-white/10 text-center font-medium text-xs sm:text-sm">
                <p>{activeStatus.caption}</p>
              </div>
            )}
          </div>

          {/* Bottom Bar: Viewers (for Owner) or Reply Bar (for Contact) */}
          <div className="absolute bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center">
            {isOwn ? (
              <button
                type="button"
                onClick={() => {
                  setIsPaused(true);
                  setShowViewersDrawer(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-all text-xs font-bold border border-white/20 active:scale-95 shadow-lg"
              >
                <Eye className="w-4 h-4 text-sky-400" />
                <span>{activeStatus.viewers?.length || 0} Views</span>
              </button>
            ) : (
              <form
                onSubmit={handleSendReply}
                onClick={(e) => e.stopPropagation()}
                className="w-full flex items-center gap-2"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  placeholder={`Reply to ${activeGroup.ownerName}...`}
                  className="flex-1 px-4 py-2.5 bg-white/20 border border-white/30 focus:bg-white/30 focus:border-sky-400 rounded-full text-white text-xs placeholder-white/70 focus:outline-none backdrop-blur-md"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim()}
                  className="p-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white rounded-full transition-all shadow-md shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>

          {/* Viewers Bottom Drawer */}
          <AnimatePresence>
            {showViewersDrawer && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute inset-x-0 bottom-0 z-40 bg-slate-900 border-t border-slate-700 rounded-t-3xl max-h-[60%] flex flex-col p-4 text-white shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-sky-400" />
                    <h3 className="font-bold text-sm">Viewed by ({activeStatus.viewers?.length || 0})</h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowViewersDrawer(false);
                      setIsPaused(false);
                    }}
                    className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-2 space-y-3 divide-y divide-slate-800/60">
                  {(!activeStatus.viewers || activeStatus.viewers.length === 0) ? (
                    <div className="text-center py-8 text-slate-400 text-xs font-medium">
                      No views yet. Check back soon!
                    </div>
                  ) : (
                    activeStatus.viewers.map((viewer) => (
                      <div key={viewer.userId} className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              viewer.userAvatar ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                viewer.userName
                              )}&background=0284c7&color=fff`
                            }
                            alt={viewer.userName}
                            className="w-9 h-9 rounded-full object-cover border border-slate-700"
                          />
                          <div>
                            <p className="font-bold text-xs text-slate-100">{viewer.userName}</p>
                            <p className="text-[10px] text-slate-400">
                              {formatTimeAgo(viewer.viewedAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
