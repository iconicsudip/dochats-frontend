import { useState, useRef } from 'react';

export const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const timerInterval = useRef<any>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Attempt to compress as much as possible using low bitrate
            let options = {};
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                options = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 16000 };
            }

            const recorder = new MediaRecorder(stream, options);
            mediaRecorder.current = recorder;
            audioChunks.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunks.current.push(e.data);
                }
            };

            recorder.start(100);
            setIsRecording(true);
            setRecordingTime(0);

            timerInterval.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Microphone access denied or unavailable.');
        }
    };

    const stopRecording = (): Promise<string | null> => {
        return new Promise((resolve) => {
            if (!mediaRecorder.current) return resolve(null);

            mediaRecorder.current.onstop = () => {
                clearInterval(timerInterval.current);
                setIsRecording(false);
                setRecordingTime(0);

                const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                audioChunks.current = [];

                // Stop all tracks to turn off the microphone light
                mediaRecorder.current?.stream.getTracks().forEach(track => track.stop());
                mediaRecorder.current = null;

                if (audioBlob.size < 100) return resolve(null); // Ignore empty clicks

                // Convert blob to base64
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64data = reader.result as string;
                    // Print size for debugging
                    console.log(`Audio recorded & compressed size: ${(base64data.length / 1024).toFixed(2)} KB`);
                    resolve(base64data);
                };
            };

            mediaRecorder.current.stop();
        });
    };

    const cancelRecording = () => {
        if (!mediaRecorder.current) return;
        mediaRecorder.current.onstop = null; // Remove standard onstop handler
        mediaRecorder.current.stop();
        mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
        mediaRecorder.current = null;
        clearInterval(timerInterval.current);
        setIsRecording(false);
        setRecordingTime(0);
        audioChunks.current = [];
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return {
        isRecording,
        recordingTime,
        formatTime,
        startRecording,
        stopRecording,
        cancelRecording
    };
};
