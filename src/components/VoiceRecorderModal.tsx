import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Square, Play, Pause, RotateCcw, Send, X, Volume2 } from 'lucide-react';

interface VoiceRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendVoiceNote: (audioUrl: string, durationSeconds: number) => void;
}

export const VoiceRecorderModal: React.FC<VoiceRecorderModalProps> = ({
  isOpen,
  onClose,
  onSendVoiceNote,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSeconds(0);
      setRecordedAudioUrl(null);
      setIsPlayingPreview(false);
      startRecording();
    } else {
      stopRecordingCleanup();
    }
    return () => stopRecordingCleanup();
  }, [isOpen]);

  // Timer counter
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    audioChunksRef.current = [];
    setSeconds(0);
    setRecordedAudioUrl(null);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(audioBlob);
          setRecordedAudioUrl(url);
          // Stop stream tracks
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start(100);
        setIsRecording(true);
      } else {
        // Microphone API not present, fallback
        setIsRecording(true);
      }
    } catch (err) {
      console.warn('Microphone access unavailable or denied. Operating in simulated voice recording mode.', err);
      setIsRecording(true);
    }
  };

  const stopRecordingCleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleStopRecording = () => {
    stopRecordingCleanup();

    if (!recordedAudioUrl) {
      // Generate a clean synth data audio URL if raw mic blob was not generated
      const simulatedDuration = Math.max(seconds, 3);
      setRecordedAudioUrl('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
      setSeconds(simulatedDuration);
    }
  };

  const togglePreviewPlay = () => {
    if (!recordedAudioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(recordedAudioUrl);
      audioRef.current.onended = () => setIsPlayingPreview(false);
    }

    if (isPlayingPreview) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleConfirmSend = () => {
    const finalUrl = recordedAudioUrl || 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQ==';
    const finalDuration = Math.max(seconds, 1);
    onSendVoiceNote(finalUrl, finalDuration);
    onClose();
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs select-none">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 10 }}
          className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-5 relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-full bg-sky-50 text-sky-600 border-2 border-sky-200 flex items-center justify-center mx-auto shadow-inner relative">
            {isRecording ? (
              <div className="relative flex items-center justify-center">
                <Mic className="w-7 h-7 text-red-500 animate-pulse" />
                <div className="absolute -inset-2 rounded-full border-2 border-red-400 animate-ping opacity-75" />
              </div>
            ) : (
              <Volume2 className="w-7 h-7 text-sky-500" />
            )}
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isRecording ? 'Recording Voice Note...' : 'Voice Note Ready'}
            </h3>
            <p className="text-2xl font-mono font-bold text-sky-600 mt-2">
              {formatTimer(seconds)}
            </p>
          </div>

          {/* Dynamic Waveform Visualizer */}
          <div className="flex items-center justify-center gap-1 h-10 px-4 bg-slate-50 rounded-2xl border border-slate-200">
            {Array.from({ length: 24 }).map((_, idx) => (
              <div
                key={idx}
                style={{
                  height: isRecording
                    ? `${Math.max(15, Math.sin(Date.now() / 100 + idx) * 80 + 30)}%`
                    : '40%',
                }}
                className={`w-1 rounded-full transition-all duration-100 ${
                  isRecording ? 'bg-red-500' : 'bg-sky-500'
                }`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 pt-2">
            {isRecording ? (
              <button
                onClick={handleStopRecording}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-2xl flex items-center gap-2 shadow-md transition-transform active:scale-95"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop Recording</span>
              </button>
            ) : (
              <>
                <button
                  onClick={startRecording}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-colors"
                  title="Re-record"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  onClick={togglePreviewPlay}
                  className="p-3 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-2xl transition-colors"
                  title="Play Preview"
                >
                  {isPlayingPreview ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>

                <button
                  onClick={handleConfirmSend}
                  className="flex-1 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Voice Note</span>
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
