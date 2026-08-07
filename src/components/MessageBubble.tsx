import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  Check,
  CheckCheck,
  Play,
  FileText,
  Download,
  Image as ImageIcon,
  Film,
  CornerUpLeft,
  CornerUpRight,
  Smile,
  Copy,
  Trash2,
  Users,
  MoreVertical
} from 'lucide-react';
import { Message, Reaction } from '../types';
import { MessageBubbleEnter } from './animations/Animations';
import { VoiceNotePlayer } from './VoiceNotePlayer';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  currentUserId?: string;
  currentUserName?: string;
  searchQuery?: string;
  isActiveMatch?: boolean;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
  onReact?: (message: Message, emoji: string) => void;
  onDelete?: (messageId: string) => void;
  onOpenMediaViewer?: (message: Message) => void;
  onJumpToMessage?: (messageId: string) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

interface GroupedReaction {
  count: number;
  users: string[];
  hasUser: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  currentUserId,
  currentUserName,
  searchQuery,
  isActiveMatch,
  onReply,
  onForward,
  onReact,
  onDelete,
  onOpenMediaViewer,
  onJumpToMessage,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showReactorsModal, setShowReactorsModal] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Close popup menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowPicker(false);
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // System Message Pill Layout
  if (message.type === 'system') {
    return (
      <div className="flex w-full justify-center my-2 select-none">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 5 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="bg-slate-200/80 text-slate-700 text-[11px] font-medium px-3.5 py-1 rounded-full shadow-2xs border border-slate-300/50 flex items-center gap-1.5 max-w-[85%] text-center"
        >
          <Users className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span>{message.content}</span>
        </motion.div>
      </div>
    );
  }

  const status = message.status || (message.id.startsWith('temp') ? 'sending' : 'sent');

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 'Attachment';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleMediaClick = () => {
    if (onOpenMediaViewer) {
      onOpenMediaViewer(message);
    }
  };

  const handleCopyText = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setShowMenu(false);
  };

  const isVideo =
    message.type === 'video' ||
    message.mime_type?.startsWith('video/') ||
    message.media_url?.match(/\.(mp4|webm|ogg|mov)$/i);

  const isVoice = message.type === 'voice' || message.type === 'voice_note';

  const isDoc =
    message.type === 'document' ||
    message.type === 'file' ||
    (message.mime_type && !message.mime_type.startsWith('image/') && !message.mime_type.startsWith('video/') && !message.mime_type.startsWith('audio/'));

  // Group reactions by emoji
  const groupedReactions: Record<string, GroupedReaction> = {};
  (message.reactions || []).forEach((r) => {
    if (!groupedReactions[r.emoji]) {
      groupedReactions[r.emoji] = { count: 0, users: [], hasUser: false };
    }
    groupedReactions[r.emoji].count += 1;
    groupedReactions[r.emoji].users.push(r.userName || 'Member');
    if (currentUserId && r.userId === currentUserId) {
      groupedReactions[r.emoji].hasUser = true;
    }
  });

  const totalReactionsCount = (message.reactions || []).length;

  return (
    <MessageBubbleEnter
      isOwn={isOwn}
      className={`flex w-full group relative my-1 ${isOwn ? 'justify-end' : 'justify-start'}`}
    >
      <div id={`msg-${message.id}`} className="relative max-w-[88%] sm:max-w-[75%] md:max-w-[65%]">
        {/* Hover / Context Action Controls */}
        <div
          ref={menuRef}
          className={`absolute top-0 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${
            isOwn ? '-left-20' : '-right-20'
          }`}
        >
          {/* Reaction Picker Button */}
          {onReact && (
            <button
              onClick={() => {
                setShowPicker(!showPicker);
                setShowMenu(false);
              }}
              className="p-1.5 rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-sky-600 hover:scale-110 transition-all"
              title="React with emoji"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Quick Reply Button */}
          {onReply && (
            <button
              onClick={() => onReply(message)}
              className="p-1.5 rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-sky-600 hover:scale-110 transition-all"
              title="Reply"
            >
              <CornerUpLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Quick Forward Button */}
          {onForward && (
            <button
              onClick={() => onForward(message)}
              className="p-1.5 rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-sky-600 hover:scale-110 transition-all"
              title="Forward"
            >
              <CornerUpRight className="w-3.5 h-3.5" />
            </button>
          )}

          {/* More Menu Dropdown Toggle */}
          <button
            onClick={() => {
              setShowMenu(!showMenu);
              setShowPicker(false);
            }}
            className="p-1.5 rounded-full bg-white border border-slate-200 shadow-md text-slate-500 hover:text-slate-800 transition-all"
            title="Options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Reaction Popover */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: -45 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              className={`absolute top-0 z-30 bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-full p-1 flex items-center gap-1 ${
                isOwn ? 'right-0' : 'left-0'
              }`}
            >
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    if (onReact) onReact(message, emoji);
                    setShowPicker(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-100 rounded-full transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Options Dropdown Menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              className={`absolute top-8 z-30 bg-white border border-slate-200 shadow-2xl rounded-2xl p-1.5 w-36 text-xs text-slate-700 font-medium space-y-0.5 ${
                isOwn ? 'right-0' : 'left-0'
              }`}
            >
              {message.content && (
                <button
                  onClick={handleCopyText}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 rounded-xl flex items-center gap-2 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-sky-500" />
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              )}

              {onReply && (
                <button
                  onClick={() => {
                    onReply(message);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 rounded-xl flex items-center gap-2 transition-colors"
                >
                  <CornerUpLeft className="w-3.5 h-3.5 text-sky-500" />
                  <span>Reply</span>
                </button>
              )}

              {onForward && (
                <button
                  onClick={() => {
                    onForward(message);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 rounded-xl flex items-center gap-2 transition-colors"
                >
                  <CornerUpRight className="w-3.5 h-3.5 text-sky-500" />
                  <span>Forward</span>
                </button>
              )}

              {onDelete && isOwn && (
                <button
                  onClick={() => {
                    onDelete(message.id);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-rose-50 text-rose-600 rounded-xl flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Message Bubble Frame */}
        <div
          className={`p-3 rounded-2xl shadow-2xs relative text-sm select-text transition-all ${
            isOwn
              ? 'bg-sky-500 text-white rounded-tr-xs'
              : 'bg-white text-slate-900 rounded-tl-xs border border-slate-200/80'
          }`}
        >
          {/* Sender Header for Group Chats */}
          {!isOwn && message.is_group && message.sender_name && (
            <p className="text-[11px] font-extrabold text-sky-600 mb-1 select-none">
              {message.sender_name}
            </p>
          )}

          {/* Forwarded Header Indicator */}
          {message.is_forwarded && (
            <div
              className={`flex items-center gap-1 text-[10px] font-bold italic mb-1.5 select-none ${
                isOwn ? 'text-sky-100' : 'text-slate-500'
              }`}
            >
              <CornerUpRight className="w-3 h-3 text-sky-400 shrink-0 stroke-[2.5]" />
              <span>
                {message.forward_count && message.forward_count > 4
                  ? 'Forwarded many times'
                  : 'Forwarded'}
              </span>
            </div>
          )}

          {/* Replying Context Block (Interactive) */}
          {message.reply_to && (
            <div
              onClick={() => onJumpToMessage && onJumpToMessage(message.reply_to!.id)}
              className={`mb-2 p-2 rounded-xl text-xs border-l-4 cursor-pointer transition-all hover:opacity-90 ${
                isOwn
                  ? 'bg-sky-600/60 border-white text-sky-50'
                  : 'bg-slate-100 border-sky-500 text-slate-700'
              }`}
            >
              <p className="font-bold text-[10px] truncate">{message.reply_to.sender_name}</p>
              <p className="truncate text-[11px] opacity-90">{message.reply_to.content}</p>
            </div>
          )}

          {/* 1. Image Media Message */}
          {message.type === 'image' && message.media_url && (
            <div
              onClick={handleMediaClick}
              className="mb-2 rounded-2xl overflow-hidden cursor-pointer relative group/img bg-slate-100 border border-slate-200/50"
            >
              <img
                src={message.thumbnail_url || message.media_url}
                alt="Shared Photo"
                loading="lazy"
                onLoad={() => setIsLoaded(true)}
                className={`max-h-64 w-full object-cover rounded-2xl transition-all duration-300 group-hover/img:scale-102 ${
                  isLoaded ? 'opacity-100' : 'opacity-60 blur-xs'
                }`}
              />
              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                <span className="px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-full text-white text-xs font-semibold flex items-center gap-1.5 shadow-md">
                  <ImageIcon className="w-4 h-4 text-sky-400" /> View Image
                </span>
              </div>
            </div>
          )}

          {/* 2. Video Media Message */}
          {isVideo && message.media_url && (
            <div
              onClick={handleMediaClick}
              className="mb-2 rounded-2xl overflow-hidden cursor-pointer relative group/vid bg-black border border-slate-800"
            >
              {message.thumbnail_url ? (
                <img
                  src={message.thumbnail_url}
                  alt="Video Thumbnail"
                  loading="lazy"
                  className="max-h-64 w-full object-cover opacity-80 group-hover/vid:scale-102 transition-transform duration-300"
                />
              ) : (
                <video
                  src={message.media_url}
                  className="max-h-64 w-full object-cover opacity-90"
                  preload="metadata"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-sky-500/90 text-white flex items-center justify-center shadow-lg group-hover/vid:scale-110 transition-transform">
                  <Play className="w-6 h-6 ml-1 fill-current" />
                </div>
              </div>
              {message.duration ? (
                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 text-white text-[10px] font-mono rounded-md backdrop-blur-xs flex items-center gap-1">
                  <Film className="w-3 h-3 text-sky-400" />
                  <span>
                    {Math.floor(message.duration / 60)}:
                    {Math.floor(message.duration % 60) < 10 ? '0' : ''}
                    {Math.floor(message.duration % 60)}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* 3. Voice Note Message */}
          {isVoice && (
            <VoiceNotePlayer
              audioUrl={message.media_url}
              duration={message.duration}
              isOwn={isOwn}
            />
          )}

          {/* 4. Document / File Attachment Message */}
          {isDoc && (
            <div
              className={`flex items-center justify-between p-3 rounded-2xl mb-1 border ${
                isOwn
                  ? 'bg-sky-600/30 border-sky-400/40 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    isOwn ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-600'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="font-bold text-xs truncate">
                    {message.file_name || 'Document File'}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] opacity-80 font-mono mt-0.5">
                    <span className="uppercase font-bold px-1 py-0.2 bg-black/10 rounded">
                      {message.mime_type?.split('/')[1]?.toUpperCase() || 'FILE'}
                    </span>
                    <span>&bull;</span>
                    <span>{formatFileSize(message.file_size)}</span>
                  </div>
                </div>
              </div>

              {message.media_url && (
                <a
                  href={message.media_url}
                  download={message.file_name || 'document'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-xl shrink-0 transition-colors ml-2 ${
                    isOwn ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 text-slate-700'
                  }`}
                  title="Download Attachment"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Text Message Content */}
          {message.content && (
            <p className="whitespace-pre-wrap leading-relaxed break-words font-sans text-xs sm:text-sm">
              {searchQuery && searchQuery.trim() ? (
                message.content.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')).map((part, idx) =>
                  part.toLowerCase() === searchQuery.toLowerCase() ? (
                    <mark
                      key={idx}
                      className={`px-1 py-0.5 rounded font-bold transition-all ${
                        isActiveMatch
                          ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-500 shadow-xs animate-pulse'
                          : 'bg-amber-200/90 text-amber-950 border border-amber-300'
                      }`}
                    >
                      {part}
                    </mark>
                  ) : (
                    part
                  )
                )
              ) : (
                message.content
              )}
            </p>
          )}

          {/* Time & Read Receipts Footer */}
          <div
            className={`text-[9px] mt-1 flex items-center justify-end gap-1 font-medium select-none ${
              isOwn ? 'text-sky-100' : 'text-slate-400'
            }`}
          >
            <span>{formatTime(message.created_at)}</span>

            {isOwn && (
              <span className="flex items-center ml-0.5 shrink-0 transition-all">
                {status === 'sending' && (
                  <Clock className="w-2.5 h-2.5 text-sky-200 animate-pulse" title="Sending..." />
                )}
                {status === 'sent' && (
                  <Check className="w-3.5 h-3.5 text-sky-100 stroke-[2.5]" title="Sent to server" />
                )}
                {status === 'delivered' && (
                  <CheckCheck className="w-3.5 h-3.5 text-sky-100 stroke-[2.5]" title="Delivered to recipient" />
                )}
                {status === 'read' && (
                  <CheckCheck className="w-3.5 h-3.5 text-cyan-200 stroke-[3]" title="Read by recipient" />
                )}
              </span>
            )}
          </div>
        </div>

        {/* Reaction Row Badges */}
        {totalReactionsCount > 0 && (
          <div
            className={`flex flex-wrap items-center gap-1 mt-1 z-10 ${
              isOwn ? 'justify-end' : 'justify-start'
            }`}
          >
            {Object.entries(groupedReactions).map(([emoji, data]) => (
              <button
                key={emoji}
                onClick={() => onReact && onReact(message, emoji)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all shadow-2xs ${
                  data.hasUser
                    ? 'bg-sky-100 border-sky-400 text-sky-800 scale-105 ring-2 ring-sky-300/40'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                title={`Reacted by: ${data.users.join(', ')}`}
              >
                <span>{emoji}</span>
                <span>{data.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </MessageBubbleEnter>
  );
};

