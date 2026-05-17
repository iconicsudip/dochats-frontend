import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface AudioPlayerProps {
    src: string;
    isFromAdmin?: boolean;
}

const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, isFromAdmin }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = new Audio(src);
        audioRef.current = audio;

        const setAudioData = () => {
            setDuration(audio.duration);
            setCurrentTime(audio.currentTime);
        };
        const setAudioTime = () => setCurrentTime(audio.currentTime);

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('loadedmetadata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('loadedmetadata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('ended', handleEnded);
            audio.pause();
        };
    }, [src]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        if (!audioRef.current) return;
        audioRef.current.currentTime = value;
        setCurrentTime(value);
    };

    return (
        <div
            onTouchStart={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
            onTouchEnd={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onMouseMove={e => e.stopPropagation()}
            className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 rounded-2xl min-w-[280px] max-w-[340px] shadow-xs font-sans text-xs",
                !isFromAdmin ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-800 border border-slate-200/80"
            )}
        >
            <button
                type="button"
                onClick={togglePlay}
                className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center transition-transform hover:scale-105 shrink-0 cursor-pointer border shadow-2xs",
                    !isFromAdmin ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-400/30" : "bg-white hover:bg-slate-50 text-slate-900 border-slate-200"
                )}
            >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <div className="flex-1 flex flex-col gap-1">
                <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between items-center text-[10px] font-semibold opacity-70 px-0.5">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                <img 
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${isFromAdmin ? 'Admin' : 'Visitor'}`} 
                    className="w-9 h-9 rounded-full object-cover bg-slate-400 opacity-90 border border-white/20" 
                    alt="avatar" 
                />
                <div className={cn(
                    "absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center shadow-xs border border-white",
                    !isFromAdmin ? "bg-emerald-500 text-white" : "bg-primary text-white"
                )}>
                    <Mic className="w-2.5 h-2.5" />
                </div>
            </div>
        </div>
    );
};
