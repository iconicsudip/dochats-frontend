import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import apiClient from '../api/apiClient';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { AudioPlayer } from '../components/AudioPlayer';
import { MessageType } from '../enums';
import { 
    Send, Smile, User, Check, CheckCheck, Mic, X, MessageCircle, Lock, Phone 
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const PublicChat: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [visitorToken] = useState<string | null>(() => {
        let token = localStorage.getItem('visitor_token');
        if (!token) {
            token = crypto.randomUUID();
            localStorage.setItem('visitor_token', token);
        }
        return token;
    });
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [chatInfo, setChatInfo] = useState<any>(() => {
        if (!slug) return null;
        try {
            const cached = localStorage.getItem(`chat_info_${slug}`);
            return cached ? JSON.parse(cached) : null;
        } catch { return null; }
    });
    const [inputText, setInputText] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [linkPreview, setLinkPreview] = useState<any>(null);
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [onboardingStep, setOnboardingStep] = useState<0 | 1 | 2 | 3>(() => {
        const name = localStorage.getItem('visitor_name');
        const phone = localStorage.getItem('visitor_phone');
        if (name && phone) return 3;
        return 1; 
    });
    const [visitorData, setVisitorData] = useState(() => ({
        name: localStorage.getItem('visitor_name') || '',
        phone: localStorage.getItem('visitor_phone') || ''
    }));
    const [showWAPopup, setShowWAPopup] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [showOnboardingForm, setShowOnboardingForm] = useState(false);
    const [showLeadCaptureForm, setShowLeadCaptureForm] = useState(false);
    const hasTriggeredOnboarding = useRef(false);
    const hasShownFormRef = useRef(false);
    const pollIntervalRef = useRef<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { isRecording, recordingTime, formatTime, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

    useEffect(() => {
        if (slug && visitorToken) {
            const storedName = localStorage.getItem('visitor_name') || undefined;
            const storedPhone = localStorage.getItem('visitor_phone') || undefined;

            apiClient.post('/public/init', { slug, visitorToken, visitorName: storedName, visitorPhone: storedPhone })
                .then(res => {
                    setConversationId(res.data.conversationId);
                    setChatInfo(res.data);
                    setVisitorData({ name: res.data.visitorName || '', phone: res.data.visitorPhone || '' });

                    if (!res.data.leadCaptureEnabled) {
                        setOnboardingStep(3);
                    } else if (res.data.visitorName && res.data.visitorPhone) {
                        setOnboardingStep(3);
                    } else if (res.data.visitorName) {
                        setOnboardingStep(2);
                    } else {
                        setOnboardingStep(1);
                    }
                })
                .catch(err => console.error('Init error:', err));
        }
    }, [slug, visitorToken]);

    useEffect(() => {
        if (conversationId) {
            fetchMessages();
            
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = setInterval(() => { fetchMessages(); }, 5000);
            
            return () => {
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            };
        }
    }, [conversationId]);

    useEffect(() => {
        if (!chatInfo || !conversationId || isInitialLoading || hasTriggeredOnboarding.current) return;
        const runFlow = async () => {
            hasTriggeredOnboarding.current = true;
            if (chatInfo.welcomeMessage) {
                const alreadySent = messages.some(m => m.isFromAdmin && m.content === chatInfo.welcomeMessage);
                if (!alreadySent) {
                    await sendBotMessage(chatInfo.welcomeMessage);
                    setTimeout(() => setShowOnboardingForm(true), 1000);
                } else {
                    setShowOnboardingForm(true);
                }
            } else {
                setShowOnboardingForm(true);
            }
        };
        runFlow();
    }, [chatInfo, conversationId, isInitialLoading, messages]);

    const fetchMessages = async () => {
        if (!conversationId) return;
        try {
            const res = await apiClient.get(`/public/messages?conversationId=${conversationId}`);
            setMessages(prev => {
                const newMsgs = res.data;
                const existingIds = new Set(prev.map(m => m.id));
                const merged = [...prev];
                newMsgs.forEach((msg: any) => {
                    if (existingIds.has(msg.id)) return;
                    const dupeIndex = merged.findIndex(m => (msg.tempId && m.id === msg.tempId) || (m.content === msg.content && m.isFromAdmin === msg.isFromAdmin && m.id.startsWith('temp-')));
                    if (dupeIndex !== -1) merged[dupeIndex] = msg;
                    else merged.push(msg);
                });
                return merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            });
            if (res.data.length > 0) apiClient.post('/public/mark-read', { conversationId, isAdmin: false }).catch(() => { });
        } catch (err) { 
            console.error('Fetch messages error:', err); 
        } finally {
            setIsInitialLoading(false);
        }
    };

    const sendBotMessage = async (text: string) => {
        if (!conversationId) return;
        const alreadyExists = messages.some(m => m.isFromAdmin && m.content === text);
        if (alreadyExists) return;
        try { await apiClient.post('/public/messages', { conversationId, content: text, isFromAdmin: true }); } catch (err) { }
    };

    const handleOnboardingSubmit = async () => {
        if (!visitorData.name.trim() || !visitorData.phone.trim() || !conversationId) return;
        const { name, phone } = visitorData;
        localStorage.setItem('visitor_name', name);
        localStorage.setItem('visitor_phone', phone);
        setOnboardingStep(3);
        try {
            await apiClient.post('/public/init', { slug, visitorToken, visitorName: name, visitorPhone: phone });
            const tempIdName = `temp-name-${Date.now()}`;
            const tempIdPhone = `temp-phone-${Date.now()}`;
            setMessages(prev => [
                ...prev,
                { id: tempIdName, content: `Name: ${name}`, isFromAdmin: false, createdAt: new Date().toISOString(), type: MessageType.TEXT },
                { id: tempIdPhone, content: `Phone: ${phone}`, isFromAdmin: false, createdAt: new Date().toISOString(), type: MessageType.TEXT }
            ]);
            setTimeout(() => { sendBotMessage("Perfect! Thank you for sharing your details. How can I help you today?"); }, 800);
        } catch (err) { console.error('Onboarding submit error:', err); }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !conversationId) return;
        const content = inputText;
        setInputText('');
        setShowEmoji(false);
        setLinkPreview(null);
        setReplyingTo(null);
        const tempId = `temp-${Date.now()}`;
        addOptimisticMessage(content, MessageType.TEXT, tempId);
        try {
            const res = await apiClient.post('/public/messages', { conversationId, content, type: MessageType.TEXT, isFromAdmin: false, tempId, replyToId: replyingTo?.id });
            setMessages(prev => prev.map(m => m.id === tempId ? res.data : m));
        } catch (err) { console.error('Send error:', err); setMessages(prev => prev.filter(m => m.id !== tempId)); }
    };

    const addOptimisticMessage = (content: string, type: MessageType = MessageType.TEXT, tempId?: string) => {
        const optimisticMsg: any = { id: tempId || `temp-${Date.now()}`, conversationId, content, type, isFromAdmin: false, isRead: false, createdAt: new Date().toISOString(), linkPreview, replyTo: replyingTo, replyToId: replyingTo?.id };
        setMessages(prev => [...prev, optimisticMsg]);
    };

    const sendVoiceMessage = async () => {
        if (!conversationId) return;
        if (onboardingStep < 3) return;
        const audioBase64 = await stopRecording();
        if (!audioBase64) return;
        const tempId = `temp-${Date.now()}`;
        addOptimisticMessage(audioBase64, MessageType.AUDIO, tempId);
        try {
            const res = await apiClient.post('/public/messages', { conversationId, content: audioBase64, type: MessageType.AUDIO, isFromAdmin: false, tempId });
            setMessages(prev => prev.map(m => m.id === tempId ? res.data : m));
        } catch (err) { setMessages(prev => prev.filter(m => m.id !== tempId)); }
    };

    useEffect(() => {
        setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 100);
        const customerMsgs = messages.filter(m => !m.isFromAdmin);
        
        const formThreshold = chatInfo?.leadCaptureDelay ?? 3;
        if (chatInfo?.leadCaptureFormId && customerMsgs.length === formThreshold && !hasShownFormRef.current) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && !lastMsg.isFromAdmin) {
                hasShownFormRef.current = true;
                setShowLeadCaptureForm(true);
                return;
            }
        }

        const waThreshold = chatInfo?.whatsappThreshold || 5;
        if (chatInfo?.whatsappLink && customerMsgs.length === waThreshold) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && !lastMsg.isFromAdmin) { setShowWAPopup(true); }
        }
    }, [messages.length, chatInfo]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'LEAD_CAPTURE_SUCCESS') {
                setShowLeadCaptureForm(false);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const onEmojiClick = (emojiData: any) => { setInputText(prev => prev + emojiData.emoji); };

    const groupMessagesByDate = (msgs: any[]) => {
        const groups: { [key: string]: any[] } = {};
        msgs.forEach(msg => { const date = format(new Date(msg.createdAt), 'yyyy-MM-dd'); if (!groups[date]) groups[date] = []; groups[date].push(msg); });
        return groups;
    };

    const formatMessageText = (text: string) => {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        return parts.map((part, i) => {
            if (part.match(urlRegex)) return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">{part}</a>;
            return <span key={i}>{part.split('\n').map((line, j) => <React.Fragment key={j}>{j > 0 && <br />}{line}</React.Fragment>)}</span>;
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') { if (e.shiftKey || e.metaKey || e.ctrlKey || window.innerWidth <= 768) return; e.preventDefault(); handleSendMessage(e as unknown as React.FormEvent); }
    };

    const getDateLabel = (dateStr: string) => {
        if (format(new Date(), 'yyyy-MM-dd') === dateStr) return 'TODAY';
        if (format(new Date(Date.now() - 86400000), 'yyyy-MM-dd') === dateStr) return 'YESTERDAY';
        return format(new Date(dateStr), 'MMMM d, yyyy');
    };

    const LinkPreview = ({ preview }: { preview: any }) => {
        if (!preview) return null;
        return (
            <div className="bg-black/20 rounded-lg mb-2 border-l-4 border-emerald-500 overflow-hidden flex flex-col">
                {preview.image && <img src={preview.image} alt="Preview" className="w-full max-h-36 object-cover" />}
                <div className="p-3">
                    <div className="font-bold text-xs text-emerald-400 mb-1">{preview.title}</div>
                    <div className="text-[11px] opacity-80">{preview.description}</div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-screen w-full bg-[#0b141a] font-sans overflow-hidden relative">
            {/* Background Pattern Overlay */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

            {!chatInfo ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 z-10">
                    <div className="w-10 h-10 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin" />
                    <span className="text-xs font-bold text-slate-400 tracking-wide uppercase">Connecting...</span>
                </div>
            ) : (
                <>
                    {/* Header */}
                    <div className="h-16 px-4 bg-[#202c33] flex items-center justify-between z-10 border-b border-[#111b21] shrink-0 shadow-md">
                        <div className="flex items-center gap-3">
                            {chatInfo.adminLogo ? (
                                <img src={chatInfo.adminLogo} alt="Logo" className="w-10 h-10 rounded-full object-cover border border-[#374248]" />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-[#6a7175] text-white flex items-center justify-center font-bold text-sm shrink-0">
                                    <User className="w-5 h-5" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <h2 className="text-white text-base font-bold truncate m-0">{chatInfo.adminName}</h2>
                                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> Online
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col z-10 custom-scrollbar space-y-4" ref={scrollRef}>
                        <div className="flex justify-center mb-4">
                            <div className="bg-[#182229] px-4 py-2 rounded-xl text-[#ffd279] text-[11px] flex items-center gap-2 shadow-sm max-w-sm text-center border border-[#233138]">
                                <Lock className="w-3.5 h-3.5 shrink-0" /> Messages are end-to-end encrypted.
                            </div>
                        </div>

                        {Object.entries(groupMessagesByDate(messages)).map(([date, dateMsgs]) => (
                            <React.Fragment key={date}>
                                <div className="flex justify-center my-4">
                                    <div className="bg-[#202c33]/90 backdrop-blur-xs px-3 py-1 rounded-lg text-[#8696a0] text-[10px] font-bold uppercase tracking-wider shadow-xs">
                                        {getDateLabel(date)}
                                    </div>
                                </div>

                                {dateMsgs.map((msg: any) => (
                                    <div 
                                        key={msg.tempId || msg.id} 
                                        className={cn(
                                            "max-w-[85%] sm:max-w-md rounded-2xl p-3 shadow-sm relative text-sm font-normal leading-snug",
                                            !msg.isFromAdmin ? "bg-[#005c4b] text-white self-end rounded-tr-none" : "bg-[#202c33] text-[#e9edef] self-start rounded-tl-none"
                                        )}
                                    >
                                        {msg.replyTo && (
                                            <div className="bg-black/20 p-2 rounded mb-2 border-l-4 border-emerald-500 text-xs text-white/80">
                                                <div className="font-bold text-emerald-400 mb-0.5">
                                                    {!msg.replyTo.isFromAdmin ? 'You' : 'Agent'}
                                                </div>
                                                <div className="line-clamp-2">
                                                    {msg.replyTo.type === MessageType.AUDIO ? '🎤 Voice Message' : msg.replyTo.content}
                                                </div>
                                            </div>
                                        )}
                                        <LinkPreview preview={msg.linkPreview} />
                                        <div className="pr-12 whitespace-pre-wrap break-words min-h-[1.5rem]">
                                            {msg.type === MessageType.AUDIO ? <AudioPlayer src={msg.content} isFromAdmin={msg.isFromAdmin} /> : formatMessageText(msg.content)}
                                        </div>
                                        <div className="absolute right-2.5 bottom-1.5 flex items-center gap-1 text-[10px] text-[#8696a0]">
                                            <span>{format(new Date(msg.createdAt), 'HH:mm')}</span>
                                            {!msg.isFromAdmin && (
                                                msg.isRead ? <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" /> : <Check className="w-3.5 h-3.5 text-[#8696a0]" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </React.Fragment>
                        ))}

                        {/* Onboarding Form Bubble */}
                        {onboardingStep < 3 && chatInfo.leadCaptureEnabled && showOnboardingForm && (
                            <div className="bg-[#202c33] text-[#e9edef] p-5 rounded-2xl shadow-lg max-w-sm w-full self-start border border-[#2a3942] animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <h3 className="text-sm font-bold text-white mb-4 m-0">To help you better, please share your details:</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8696a0] mb-1">Full Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. John Doe"
                                            value={visitorData.name}
                                            onChange={e => setVisitorData(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full bg-[#2a3942] border border-[#3b4a54] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8696a0] mb-1">Phone Number</label>
                                        <input 
                                            type="tel" 
                                            maxLength={10}
                                            placeholder="e.g. 9876543210"
                                            value={visitorData.phone}
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setVisitorData(prev => ({ ...prev, phone: val }));
                                            }}
                                            className="w-full bg-[#2a3942] border border-[#3b4a54] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                                        />
                                    </div>
                                    <button 
                                        disabled={!visitorData.name.trim() || visitorData.phone.length !== 10}
                                        onClick={handleOnboardingSubmit}
                                        className="w-full py-3 bg-[#00a884] hover:bg-[#00a884]/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-extrabold text-sm rounded-xl transition-all shadow-md"
                                    >
                                        Start Chatting
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Iframe Lead Capture Bubble */}
                        {showLeadCaptureForm && (
                            <div className="bg-[#202c33] text-[#e9edef] rounded-2xl shadow-lg max-w-md w-full self-start border border-[#2a3942] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="p-3 bg-[#2a3942]/60 border-b border-[#111b21] font-bold text-xs text-white">
                                    Please complete this form to continue:
                                </div>
                                <iframe 
                                    src={`/f/${chatInfo?.leadCaptureFormId}?embed=true`} 
                                    className="w-full h-[500px] border-none bg-transparent"
                                    title="Lead Capture"
                                />
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    {onboardingStep === 3 && !showLeadCaptureForm && (
                        <div className="p-3 bg-[#202c33] flex items-center gap-2 z-10 border-t border-[#111b21] shrink-0 relative">
                            <button 
                                type="button"
                                onClick={() => setShowEmoji(!showEmoji)} 
                                className="w-10 h-10 flex items-center justify-center text-[#8696a0] hover:text-white transition-colors rounded-xl hover:bg-[#2a3942] shrink-0"
                            >
                                <Smile className="w-6 h-6" />
                            </button>

                            {showEmoji && (
                                <div className="absolute bottom-16 left-4 z-50 shadow-2xl">
                                    <EmojiPicker theme={EmojiTheme.DARK} onEmojiClick={onEmojiClick} />
                                </div>
                            )}

                            {isRecording ? (
                                <div className="flex-1 bg-[#2a3942] rounded-2xl px-4 py-2 flex items-center justify-between">
                                    <span className="text-red-400 font-mono text-sm font-bold flex items-center gap-2 animate-pulse">
                                        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> {formatTime(recordingTime)}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            type="button" 
                                            onClick={cancelRecording} 
                                            className="w-8 h-8 flex items-center justify-center text-[#8696a0] hover:text-red-400 rounded-lg transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={sendVoiceMessage} 
                                            className="w-8 h-8 flex items-center justify-center bg-[#00a884] text-black rounded-lg hover:opacity-90 font-bold transition-opacity"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSendMessage} className="flex-1 flex items-end gap-2">
                                    <textarea
                                        rows={1}
                                        placeholder="Type a message..."
                                        value={inputText}
                                        onChange={e => setInputText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="flex-1 bg-[#2a3942] border-none rounded-2xl px-4 py-2.5 text-sm text-white placeholder-[#8696a0] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all resize-none max-h-32 custom-scrollbar leading-normal"
                                    />
                                    {inputText.trim() ? (
                                        <button 
                                            type="submit" 
                                            className="w-10 h-10 bg-[#00a884] text-black hover:opacity-90 transition-opacity rounded-xl flex items-center justify-center font-bold shrink-0 shadow-sm"
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    ) : (
                                        <button 
                                            type="button" 
                                            onClick={startRecording}
                                            className="w-10 h-10 text-[#8696a0] hover:text-white hover:bg-[#2a3942] transition-colors rounded-xl flex items-center justify-center shrink-0"
                                        >
                                            <Mic className="w-5 h-5" />
                                        </button>
                                    )}
                                </form>
                            )}
                        </div>
                    )}

                    {/* WhatsApp Redirect Modal Dialog */}
                    {showWAPopup && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                            <div className="bg-[#202c33] rounded-3xl p-6 shadow-2xl max-w-xs w-full text-center border border-[#2a3942] animate-in zoom-in-95 duration-200">
                                <div className="w-16 h-16 bg-[#25d366]/20 text-[#25d366] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#25d366]/30 shadow-lg">
                                    <MessageCircle className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2 m-0">Continue on WhatsApp?</h3>
                                <p className="text-xs text-[#8696a0] mb-6 leading-relaxed">
                                    Move this conversation instantly to WhatsApp for faster and continuous updates directly to your mobile inbox.
                                </p>
                                <button
                                    onClick={() => { window.open(chatInfo?.whatsappLink, '_blank'); setShowWAPopup(false); }}
                                    className="w-full py-3 bg-[#25d366] hover:bg-[#25d366]/90 text-black font-extrabold rounded-xl text-sm transition-all shadow-lg shadow-[#25d366]/20 mb-3 flex items-center justify-center gap-2"
                                >
                                    <MessageCircle className="w-4 h-4" /> Open in WhatsApp
                                </button>
                                <button
                                    onClick={() => setShowWAPopup(false)}
                                    className="w-full py-2 bg-transparent text-[#8696a0] hover:text-white font-bold text-xs rounded-xl transition-colors"
                                >
                                    Not now
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default PublicChat;
