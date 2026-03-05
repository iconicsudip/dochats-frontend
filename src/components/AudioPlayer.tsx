import React, { useState, useRef, useEffect } from 'react';
import { Slider } from 'antd';
import { CaretRightOutlined, PauseOutlined, AudioOutlined } from '@ant-design/icons';

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

    const handleSeek = (value: number) => {
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
            style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 280 }}
        >
            <div
                onClick={togglePlay}
                style={{
                    cursor: 'pointer',
                    fontSize: 26,
                    color: !isFromAdmin ? '#d1d7db' : '#54656f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 30
                }}
            >
                {isPlaying ? <PauseOutlined /> : <CaretRightOutlined style={{ marginLeft: 4 }} />}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Slider
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    tooltip={{ formatter: null }}
                    style={{ margin: 0, padding: '10px 0' }}
                    trackStyle={{ backgroundColor: !isFromAdmin ? '#00a884' : '#53bdeb', height: 4 }}
                    handleStyle={{
                        border: 'none',
                        backgroundColor: !isFromAdmin ? '#00a884' : '#53bdeb',
                        marginTop: -4,
                        boxShadow: 'none',
                        width: 12,
                        height: 12,
                        opacity: 1,
                        borderRadius: '50%'
                    }}
                    railStyle={{ backgroundColor: !isFromAdmin ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)', height: 4 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: !isFromAdmin ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                    <span>{formatTime(currentTime)}</span>
                </div>
            </div>

            <div style={{ position: 'relative', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${isFromAdmin ? 'Admin' : 'Visitor'}`} style={{ width: 40, height: 40, borderRadius: '50%', background: '#6a7175', opacity: 0.8 }} alt="" />
                <div style={{ position: 'absolute', bottom: -4, right: -4 }}>
                    <AudioOutlined style={{ fontSize: 14, color: !isFromAdmin ? '#53bdeb' : '#00a884' }} />
                </div>
            </div>
        </div>
    );
};
