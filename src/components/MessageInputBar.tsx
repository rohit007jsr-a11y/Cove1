import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Image as ImageIcon,
  Smile,
  X,
  Paperclip,
  Mic,
  CornerUpLeft,
  FileText,
  Film,
  Music,
  Plus
} from 'lucide-react';
import { ReplyPreview, MessageType } from '../types';
import { VoiceRecorderModal } from './VoiceRecorderModal';

interface MessageInputBarProps {
  onSendMessage: (
    text: string,
    type?: MessageType,
    mediaUrl?: string,
    fileName?: string,
    mediaMeta?: {
      thumbnailUrl?: string;
      mimeType?: string;
      fileSize?: number;
      duration?: number;
    }
  ) => void;
  onTyping: (isTyping: boolean) => void;
  replyTo?: ReplyPreview | null;
  onCancelReply?: () => void;
  disabled?: boolean;
}

const COMMON_EMOJIS = [
  '😊', '👍', '❤️', '🔥', '🎉', '👋', '🙏', '😂',
  '🙌', '✨', '⚡', '💯', '😍', '😎', '🤝', '🚀'
];

interface AttachedMediaState {
  type: MessageType;
  url: string;
  name?: string;
  thumbnailUrl?: string;
  mimeType?: string;
  size?: number;
  duration?: number;
}

export const MessageInputBar: React.FC<MessageInputBarProps> = ({
  onSendMessage,
  onTyping,
  replyTo,
  onCancelReply,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [attachedMedia, setAttachedMedia] = useState<AttachedMediaState | null>(null);
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  if (disabled) {
    return (
      <div className="border-t border-slate-200 bg-slate-100/90 p-4 shrink-0 text-center select-none">
        <p className="text-xs font-bold text-slate-500">
          🔒 Only group admins can send messages in this group
        </p>
      </div>
    );
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1500);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!text.trim() && !attachedMedia) || disabled || isUploading) return;

    onTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    if (attachedMedia) {
      onSendMessage(
        text.trim(),
        attachedMedia.type,
        attachedMedia.url,
        attachedMedia.name,
        {
          thumbnailUrl: attachedMedia.thumbnailUrl,
          mimeType: attachedMedia.mimeType,
          fileSize: attachedMedia.size,
          duration: attachedMedia.duration,
        }
      );
    } else {
      onSendMessage(text.trim(), 'text');
    }

    setText('');
    setAttachedMedia(null);
    setShowEmojiPicker(false);
    setShowAttachMenu(false);
    if (onCancelReply) onCancelReply();
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1280;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const processFileUpload = async (file: File) => {
    setIsUploading(true);

    let type: MessageType = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'voice_note';
    else type = 'document';

    if (type === 'image') {
      try {
        const compressedDataUrl = await compressImage(file);
        setAttachedMedia({
          type: 'image',
          url: compressedDataUrl,
          name: file.name,
          thumbnailUrl: compressedDataUrl,
          mimeType: 'image/jpeg',
          size: Math.round(compressedDataUrl.length * 0.75),
        });
        setIsUploading(false);
        return;
      } catch (err) {
        console.warn('Image compression fallback:', err);
      }
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      setAttachedMedia({
        type,
        url: base64Data,
        name: file.name,
        mimeType: file.type,
        size: file.size,
      });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFileUpload(file);
    e.target.value = '';
    setShowAttachMenu(false);
  };

  const handleSendVoiceNoteFromModal = (audioUrl: string, durationSeconds: number) => {
    onSendMessage('Voice Note', 'voice_note', audioUrl, 'voice-recording.webm', {
      mimeType: 'audio/webm',
      duration: durationSeconds,
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="border-t border-slate-200 bg-white p-3 shrink-0 relative select-none">
      {/* Replying Context Banner */}
      {replyTo && (
        <div className="mb-2 p-2 bg-sky-50 border-l-4 border-sky-500 rounded-r-xl flex items-center justify-between text-xs">
          <div className="overflow-hidden">
            <span className="font-bold text-sky-700 flex items-center gap-1">
              <CornerUpLeft className="w-3.5 h-3.5" /> Replying to {replyTo.sender_name}
            </span>
            <p className="text-slate-600 truncate text-[11px] mt-0.5">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 hover:bg-sky-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attached Media Preview Card */}
      {attachedMedia && (
        <div className="mb-2 p-2.5 bg-slate-100/90 rounded-2xl flex items-center justify-between border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-3 overflow-hidden">
            {attachedMedia.type === 'image' ? (
              <img
                src={attachedMedia.thumbnailUrl || attachedMedia.url}
                alt="Attachment"
                className="w-12 h-12 object-cover rounded-xl shrink-0 border border-slate-300"
              />
            ) : attachedMedia.type === 'video' ? (
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-sky-400 flex items-center justify-center shrink-0">
                <Film className="w-6 h-6" />
              </div>
            ) : attachedMedia.type === 'voice_note' ? (
              <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Music className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
            )}

            <div className="overflow-hidden text-xs">
              <p className="font-bold text-slate-900 truncate">{attachedMedia.name || 'Media File'}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                <span className="uppercase font-extrabold text-sky-600">{attachedMedia.type}</span>
                {attachedMedia.size ? <span>&bull; {formatFileSize(attachedMedia.size)}</span> : null}
              </div>
            </div>
          </div>

          <button
            onClick={() => setAttachedMedia(null)}
            className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-800 transition-colors"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 bg-white border border-slate-200 shadow-2xl rounded-2xl p-3 z-30 w-64 grid grid-cols-8 gap-1">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setText((prev) => prev + emoji);
                setShowEmojiPicker(false);
              }}
              className="p-1.5 text-base hover:bg-slate-100 rounded-lg transition-transform hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Attachment Options Popover */}
      {showAttachMenu && (
        <div className="absolute bottom-16 left-12 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2 z-30 w-52 space-y-1 font-medium text-xs text-slate-700">
          <button
            type="button"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = 'image/*,video/*';
                fileInputRef.current.click();
              }
            }}
            className="w-full flex items-center gap-2.5 p-2 hover:bg-sky-50 hover:text-sky-600 rounded-xl transition-colors"
          >
            <ImageIcon className="w-4 h-4 text-sky-500" />
            <span>Photos & Videos</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt,.json';
                fileInputRef.current.click();
              }
            }}
            className="w-full flex items-center gap-2.5 p-2 hover:bg-sky-50 hover:text-sky-600 rounded-xl transition-colors"
          >
            <FileText className="w-4 h-4 text-emerald-500" />
            <span>Document File</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(false);
              setIsVoiceRecorderOpen(true);
            }}
            className="w-full flex items-center gap-2.5 p-2 hover:bg-sky-50 hover:text-sky-600 rounded-xl transition-colors"
          >
            <Mic className="w-4 h-4 text-rose-500" />
            <span>Record Voice Note</span>
          </button>
        </div>
      )}

      {/* Main Input Form */}
      <form onSubmit={handleSend} className="flex items-end gap-2 max-w-5xl mx-auto">
        {/* Hidden file selector */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex items-center gap-1 shrink-0 pb-1">
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachMenu(false);
            }}
            className="p-2 hover:bg-slate-100 text-slate-500 hover:text-sky-600 rounded-full transition-colors"
            title="Add Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setShowAttachMenu(!showAttachMenu);
              setShowEmojiPicker(false);
            }}
            className="p-2 hover:bg-slate-100 text-slate-500 hover:text-sky-600 rounded-full transition-colors"
            title="Attach Media & Documents"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          placeholder="Type a message or share media..."
          rows={1}
          disabled={disabled || isUploading}
          className="flex-1 p-3 bg-slate-100/80 border border-slate-200/60 focus:bg-white focus:border-sky-500 rounded-2xl text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none max-h-32 font-sans leading-relaxed transition-all"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        {text.trim() || attachedMedia ? (
          <button
            type="submit"
            disabled={disabled || isUploading}
            className="p-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white rounded-2xl transition-all shadow-xs flex items-center justify-center shrink-0 active:scale-95"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsVoiceRecorderOpen(true)}
            className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-sky-600 rounded-2xl transition-colors shrink-0"
            title="Record Voice Note"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Live Voice Recorder Modal */}
      <VoiceRecorderModal
        isOpen={isVoiceRecorderOpen}
        onClose={() => setIsVoiceRecorderOpen(false)}
        onSendVoiceNote={handleSendVoiceNoteFromModal}
      />
    </div>
  );
};
