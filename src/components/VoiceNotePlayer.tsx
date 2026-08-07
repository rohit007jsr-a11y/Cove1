import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, FastForward } from 'lucide-react';

interface VoiceNotePlayerProps {
  audioUrl?: string;
  duration?: number; // duration in seconds
  isOwn: boolean;
}

export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  audioUrl,
  duration = 12,
  isOwn,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.5 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Generate deterministic pseudo-random waveform bar heights
  const waveformBars = useRef(
    Array.from({ length: 28 }, (_, i) => Math.max(20, Math.sin(i * 0.4) * 45 + Math.cos(i * 0.7) * 35 + 20))
  ).current;

  const effectiveDuration = duration && duration > 0 ? duration : 12;

  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        // Updated loaded metadata
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [audioUrl]);

  // Handle Playback rate changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Fallback synthetic playback timer if audioUrl is a placeholder or fails to decode
  useEffect(() => {
    let timer: any;
    if (isPlaying && (!audioRef.current || !audioRef.current.src || audioRef.current.error)) {
      timer = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= effectiveDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.25 * playbackRate;
        });
      }, 250);
    }
    return () => clearInterval(timer);
  }, [isPlaying, effectiveDuration, playbackRate]);

  const togglePlay = () => {
    if (!audioRef.current || !audioUrl) {
      setIsPlaying(!isPlaying);
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          // Fallback to simulated audio timeline if browser restricts autoplay
          setIsPlaying(true);
        });
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * effectiveDuration;
    setCurrentTime(newTime);

    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = newTime;
    }
  };

  const cycleSpeed = () => {
    if (playbackRate === 1) setPlaybackRate(1.5);
    else if (playbackRate === 1.5) setPlaybackRate(2);
    else setPlaybackRate(1);
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = Math.min(100, (currentTime / effectiveDuration) * 100);

  return (
    <div
      className={`flex flex-col p-2.5 rounded-2xl mb-1 min-w-[240px] sm:min-w-[280px] shadow-2xs border ${
        isOwn ? 'bg-sky-600/40 border-sky-400/30 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Play / Pause Toggle Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95 ${
            isOwn
              ? 'bg-white text-sky-600 hover:bg-sky-50'
              : 'bg-sky-500 text-white hover:bg-sky-600'
          }`}
          title={isPlaying ? 'Pause' : 'Play Voice Note'}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        {/* Waveform Scrubber Visualizer */}
        <div className="flex-1 space-y-1.5 cursor-pointer select-none" onClick={handleSeek}>
          <div className="flex items-center gap-0.5 h-7 px-1">
            {waveformBars.map((barHeight, idx) => {
              const barPercent = (idx / waveformBars.length) * 100;
              const isPlayed = barPercent <= progressPercent;

              return (
                <div
                  key={idx}
                  style={{
                    height: `${isPlaying && isPlayed ? Math.min(100, barHeight + Math.sin(Date.now() / 150 + idx) * 20) : barHeight}%`,
                  }}
                  className={`flex-1 rounded-full transition-all duration-150 ${
                    isPlayed
                      ? isOwn
                        ? 'bg-white'
                        : 'bg-sky-500'
                      : isOwn
                      ? 'bg-sky-200/40'
                      : 'bg-slate-300'
                  }`}
                />
              );
            })}
          </div>

          {/* Time and Duration display */}
          <div className="flex items-center justify-between text-[10px] font-mono opacity-85 px-0.5">
            <span className="flex items-center gap-1 font-bold">
              <Volume2 className="w-3 h-3 text-sky-400" />
              {isPlaying ? formatSeconds(currentTime) : formatSeconds(effectiveDuration)}
            </span>
            <span>{isPlaying ? `${playbackRate}x` : 'Voice Note'}</span>
          </div>
        </div>

        {/* Speed Controls Pill */}
        <button
          type="button"
          onClick={cycleSpeed}
          className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-colors shrink-0 ${
            isOwn
              ? 'bg-white/20 hover:bg-white/30 text-white'
              : 'bg-slate-200/80 hover:bg-slate-300 text-slate-700'
          }`}
          title="Change playback speed"
        >
          <div className="flex items-center gap-0.5">
            <FastForward className="w-2.5 h-2.5" />
            <span>{playbackRate}x</span>
          </div>
        </button>
      </div>
    </div>
  );
};
