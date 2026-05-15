import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Layout, Input, Avatar, Spin, Button, Space, Modal } from 'antd';
import { SendOutlined, SmileOutlined, UserOutlined, CheckOutlined, AudioOutlined, CloseOutlined, WhatsAppOutlined } from '@ant-design/icons';
import { format } from 'date-fns';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import apiClient from '../api/apiClient';
import { socket } from '../socket';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { AudioPlayer } from '../components/AudioPlayer';
import { MessageType } from '../enums';

const { Content } = Layout;

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
    const [isAdminTyping, setIsAdminTyping] = useState(false);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [showOnboardingForm, setShowOnboardingForm] = useState(false);
    const [showLeadCaptureForm, setShowLeadCaptureForm] = useState(false);
    const hasTriggeredOnboarding = useRef(false);
    const hasShownFormRef = useRef(false);
    const typingTimeoutRef = useRef<any>(null);
    const pollIntervalRef = useRef<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { isRecording, recordingTime, formatTime, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

    // 1. Initial Visitor Discovery & Load Chat Infrastructure
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

    // 3. Socket & History Engine
    useEffect(() => {
        if (conversationId) {
            // No changes needed here, keeping logic as is
            fetchMessages();
            socket.connect();
            socket.emit('join_conversation', conversationId);
            const onConnect = () => setIsSocketConnected(true);
            const onDisconnect = () => setIsSocketConnected(false);
            socket.on('connect', onConnect);
            socket.on('disconnect', onDisconnect);
            const handleMessage = (msg: any) => {
                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev;
                    if (msg.tempId && prev.some(m => m.id === msg.tempId)) return prev.map(m => m.id === msg.tempId ? msg : m);
                    const dupeIndex = prev.findIndex(m => m.id.startsWith('temp-') && m.content === msg.content && m.isFromAdmin === msg.isFromAdmin);
                    if (dupeIndex !== -1) { const next = [...prev]; next[dupeIndex] = msg; return next; }
                    return [...prev, msg];
                });
                apiClient.post('/public/mark-read', { conversationId, isAdmin: false }).catch(() => { });
            };
            const handleRead = (data: { byAdmin: boolean }) => {
                setMessages(prev => prev.map(m => {
                    if (data?.byAdmin && !m.isFromAdmin) return { ...m, isRead: true };
                    if (data?.byAdmin === false && m.isFromAdmin) return { ...m, isRead: true };
                    return m;
                }));
            };
            const handleTyping = (data: { isFromAdmin: boolean }) => { if (data.isFromAdmin) setIsAdminTyping(true); };
            const handleStopTyping = (data: { isFromAdmin: boolean }) => { if (data.isFromAdmin) setIsAdminTyping(false); };
            socket.on('receive_message', handleMessage);
            socket.on('messages_read', handleRead);
            socket.on('user_typing', handleTyping);
            socket.on('user_stop_typing', handleStopTyping);
            return () => {
                socket.off('connect', onConnect);
                socket.off('disconnect', onDisconnect);
                socket.off('receive_message', handleMessage);
                socket.off('messages_read', handleRead);
                socket.off('user_typing', handleTyping);
                socket.off('user_stop_typing', handleStopTyping);
                socket.emit('leave_conversation', conversationId);
            };
        }
    }, [conversationId]);

    // Poll for messages when socket is disconnected (Fallback)
    useEffect(() => {
        if (!conversationId || isSocketConnected) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            return;
        }
        pollIntervalRef.current = setInterval(() => { fetchMessages(); }, 5000);
        return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
    }, [conversationId, isSocketConnected]);

    useEffect(() => {
        if (!chatInfo || !conversationId || isInitialLoading || hasTriggeredOnboarding.current) return;
        const runFlow = async () => {
            hasTriggeredOnboarding.current = true;
            if (chatInfo.welcomeMessage) {
                const alreadySent = messages.some(m => m.isFromAdmin && m.content === chatInfo.welcomeMessage);
                if (!alreadySent) {
                    await sendBotMessage(chatInfo.welcomeMessage);
                    // Show form with a slight delay after the message is sent
                    setTimeout(() => setShowOnboardingForm(true), 1000);
                } else {
                    // Already exists, show form immediately
                    setShowOnboardingForm(true);
                }
            } else {
                // No welcome message, show form immediately
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
        
        // Lead Capture Form Trigger
        const formThreshold = chatInfo?.leadCaptureDelay ?? 3;
        if (chatInfo?.leadCaptureFormId && customerMsgs.length === formThreshold && !hasShownFormRef.current) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && !lastMsg.isFromAdmin) {
                hasShownFormRef.current = true;
                setShowLeadCaptureForm(true);
                return;
            }
        }

        // WA Popup Trigger
        const waThreshold = chatInfo?.whatsappThreshold || 5;
        if (chatInfo?.whatsappLink && customerMsgs.length === waThreshold) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && !lastMsg.isFromAdmin) { setShowWAPopup(true); }
        }
    }, [messages.length]);

    // Listen for form submission from iframe
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'LEAD_CAPTURE_SUCCESS') {
                setShowLeadCaptureForm(false);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const onEmojiClick = (emojiData: any) => { setInputText(prev => prev + emojiData.emoji); handleTypingIndicator(); };

    const handleTypingIndicator = () => {
        if (!conversationId) return;
        socket.emit('typing', { conversationId, isFromAdmin: false });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => { socket.emit('stop_typing', { conversationId, isFromAdmin: false }); }, 2000);
    };

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
            if (part.match(urlRegex)) return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#53bdeb', textDecoration: 'underline' }}>{part}</a>;
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
            <div style={{ background: 'rgba(0,0,0,0.1)', borderRadius: 4, marginBottom: 8, borderLeft: '4px solid #00df9a', display: 'flex', flexDirection: 'column' }}>
                {preview.image && <img src={preview.image} alt="P" style={{ width: '100%', maxHeight: 150, objectFit: 'cover' }} />}
                <div style={{ padding: '8px 12px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#00df9a', marginBottom: 2 }}>{preview.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{preview.description}</div>
                </div>
            </div>
        );
    };

    return (
        <Layout className="full-height-mobile" style={{ background: 'var(--wa-bg)', overflow: 'hidden', minHeight: '100vh' }}>
            <Content style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', flex: 1 }}>
                <div className="whatsapp-bg"></div>

                {!chatInfo ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                        <Spin size="large" tip="Connecting..." />
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div style={{ height: 60, padding: '10px 16px', background: 'var(--wa-panel)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10, flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Avatar
                                    size={40}
                                    src={chatInfo.adminLogo}
                                    icon={<UserOutlined />}
                                    style={{ background: '#6a7175' }}
                                />
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chatInfo.adminName}</div>
                                    <div style={{ color: 'var(--wa-secondary)', fontSize: 12 }}>online</div>
                                </div>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '15px 4% 20px 4%', display: 'flex', flexDirection: 'column', zIndex: 5 }} ref={scrollRef}>
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                                <div style={{ background: '#182229', padding: '10px 16px', borderRadius: 12, color: '#ffd279', fontSize: 11, textAlign: 'center', maxWidth: '85%' }}>
                                    <CheckOutlined style={{ marginRight: 8 }} /> Messages are end-to-end encrypted.
                                </div>
                            </div>

                            {Object.entries(groupMessagesByDate(messages)).map(([date, dateMsgs]) => (
                                <React.Fragment key={date}>
                                    <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
                                        <div style={{ background: 'rgba(32,44,51,0.85)', padding: '6px 12px', borderRadius: 8, color: '#8696a0', fontSize: 11 }}>{getDateLabel(date)}</div>
                                    </div>
                                    {dateMsgs.map((msg: any) => (
                                        <div key={msg.tempId || msg.id} className={`wa-bubble ${!msg.isFromAdmin ? 'wa-bubble-out' : 'wa-bubble-in'}`} style={{ marginBottom: 12 }}>
                                            {msg.replyTo && (
                                                <div style={{ background: 'rgba(0,0,0,0.1)', padding: '6px 10px', borderRadius: 4, marginBottom: 8, borderLeft: `4px solid ${!msg.replyTo.isFromAdmin ? '#53bdeb' : '#00df9a'}`, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                                                    <div style={{ fontWeight: 600, color: !msg.replyTo.isFromAdmin ? '#53bdeb' : '#00df9a' }}>{!msg.replyTo.isFromAdmin ? 'You' : 'Agent'}</div>
                                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', WebkitLineClamp: 3, display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                                                        {msg.replyTo.type === MessageType.AUDIO ? '🎤 Voice Message' : msg.replyTo.content}
                                                    </div>
                                                </div>
                                            )}
                                            <LinkPreview preview={msg.linkPreview} />
                                            <div style={{ paddingRight: !msg.isFromAdmin ? 45 : 35, whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: msg.type === MessageType.AUDIO ? 56 : undefined }}>
                                                {msg.type === MessageType.AUDIO ? <AudioPlayer src={msg.content} isFromAdmin={msg.isFromAdmin} /> : formatMessageText(msg.content)}
                                            </div>
                                            <div className="wa-timestamp">
                                                {format(new Date(msg.createdAt), 'HH:mm')}
                                                {!msg.isFromAdmin && (
                                                    <div style={{ display: 'inline-flex', marginLeft: 4 }}>
                                                        <CheckOutlined style={{ color: msg.isRead ? '#53bdeb' : '#8696a0' }} />
                                                        <CheckOutlined style={{ color: msg.isRead ? '#53bdeb' : '#8696a0', marginLeft: -9 }} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </React.Fragment>
                            ))}
                            {(onboardingStep < 3 && chatInfo.leadCaptureEnabled && showOnboardingForm) && (
                                <div className="wa-bubble wa-bubble-in" style={{ padding: '16px', maxWidth: '320px', width: '90%', marginBottom: 16, alignSelf: 'flex-start', animation: 'fadeIn 0.6s ease-out' }}>
                                    <div style={{ marginBottom: 16, color: 'var(--wa-text)', fontSize: 13, fontWeight: 500 }}>
                                        To help you better, please share your details:
                                    </div>
                                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                        <div>
                                            <div style={{ color: 'var(--wa-secondary)', fontSize: 11, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</div>
                                            <Input 
                                                placeholder="e.g. John Doe" 
                                                value={visitorData.name} 
                                                onChange={e => setVisitorData(prev => ({ ...prev, name: e.target.value }))}
                                                style={{ background: '#2a3942', border: '1px solid #3b4a54', borderRadius: 8, color: '#fff', padding: '8px 12px' }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--wa-secondary)', fontSize: 11, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number (10 digits)</div>
                                            <Input 
                                                placeholder="e.g. 9876543210" 
                                                value={visitorData.phone} 
                                                maxLength={10}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                    setVisitorData(prev => ({ ...prev, phone: val }));
                                                }}
                                                style={{ background: '#2a3942', border: '1px solid #3b4a54', borderRadius: 8, color: '#fff', padding: '8px 12px' }}
                                            />
                                        </div>
                                        <Button 
                                            type="primary" 
                                            block 
                                            style={{ background: 'var(--wa-green)', border: 'none', height: 44, fontWeight: 700, color: '#000', marginTop: 8, borderRadius: 8 }}
                                            onClick={handleOnboardingSubmit}
                                            disabled={!visitorData.name.trim() || visitorData.phone.length !== 10}
                                        >
                                            Start Chatting
                                        </Button>
                                    </Space>
                                </div>
                            )}

                            {showLeadCaptureForm && (
                                <div className="wa-bubble wa-bubble-in" style={{ padding: '0', maxWidth: '400px', width: '90%', marginBottom: 16, alignSelf: 'flex-start', animation: 'fadeIn 0.6s ease-out', overflow: 'hidden', borderRadius: 8 }}>
                                    <div style={{ padding: '12px 16px', background: '#202c33', borderBottom: '1px solid #111b21', color: 'var(--wa-text)', fontSize: 13, fontWeight: 500 }}>
                                        Please complete this form to continue:
                                    </div>
                                    <iframe 
                                        src={`/f/${chatInfo?.leadCaptureFormId}?embed=true`} 
                                        style={{ width: '100%', height: '500px', border: 'none', background: 'transparent' }}
                                        title="Lead Capture"
                                    />
                                </div>
                            )}

                            {isAdminTyping && (
                                <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn 0.3s' }}>
                                    <div className="wa-bubble wa-bubble-in" style={{ padding: '8px 12px', minWidth: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <div className="typing-indicator">
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area - Only show when onboarding is complete and no lead capture is blocking */}
                        {onboardingStep === 3 && !showLeadCaptureForm && (
                            <div style={{ padding: '10px 12px', background: 'var(--wa-panel)', display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 10, flexShrink: 0 }}>
                                <SmileOutlined style={{ fontSize: 24, color: 'var(--wa-secondary)', cursor: 'pointer' }} onClick={() => setShowEmoji(!showEmoji)} />
                                {showEmoji && <div style={{ position: 'absolute', bottom: 70, left: 16 }}><EmojiPicker theme={EmojiTheme.DARK} onEmojiClick={onEmojiClick} /></div>}

                                {isRecording ? (
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ color: '#ef5350' }}>{formatTime(recordingTime)}</div>
                                        <Space>
                                            <Button type="text" onClick={cancelRecording} icon={<CloseOutlined style={{ color: '#8696a0' }} />} />
                                            <Button type="text" onClick={sendVoiceMessage} icon={<SendOutlined style={{ color: 'var(--wa-green)' }} />} />
                                        </Space>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSendMessage} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                                        <Input.TextArea
                                            autoSize={{ minRows: 1, maxRows: 5 }}
                                            placeholder="Type a message"
                                            value={inputText}
                                            onChange={e => {
                                                setInputText(e.target.value);
                                                handleTypingIndicator();
                                            }}
                                            onKeyDown={handleKeyDown}
                                            style={{ background: '#2a3942', border: 'none', borderRadius: 8, color: '#fff', padding: '9px 12px' }}
                                        />
                                        {inputText.trim() ? (
                                            <Button type="text" htmlType="submit" icon={<SendOutlined style={{ fontSize: 22, color: 'var(--wa-secondary)' }} />} />
                                        ) : (
                                            <AudioOutlined onClick={startRecording} style={{ fontSize: 22, color: 'var(--wa-secondary)', cursor: 'pointer' }} />
                                        )}
                                    </form>
                                )}
                            </div>
                        )}

                        {/* WA Popup */}
                        <Modal open={showWAPopup} onCancel={() => setShowWAPopup(false)} footer={null} centered styles={{ body: { background: '#202c33', color: '#fff' } }} width={360}>
                            <div style={{ textAlign: 'center', padding: 20 }}>
                                <WhatsAppOutlined style={{ fontSize: 50, color: '#25D366', marginBottom: 20 }} />
                                <h3 style={{ color: '#fff', fontSize: 18 }}>Continue on WhatsApp?</h3>
                                <p style={{ color: '#8696a0', marginBottom: 24 }}>Move to WhatsApp for faster replies?</p>
                                <Button block type="primary" style={{ background: '#25D366', border: 'none', marginBottom: 12, height: 44 }} icon={<WhatsAppOutlined />} onClick={() => { window.open(chatInfo?.whatsappLink, '_blank'); setShowWAPopup(false); }}>Open WhatsApp</Button>
                                <Button block type="text" style={{ color: '#8696a0' }} onClick={() => setShowWAPopup(false)}>Not now</Button>
                            </div>
                        </Modal>
                    </>
                )}
            </Content>
        </Layout>
    );
};

export default PublicChat;
