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
    const [visitorToken, setVisitorToken] = useState<string | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [chatInfo, setChatInfo] = useState<any>(null);
    const [inputText, setInputText] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [linkPreview, setLinkPreview] = useState<any>(null);
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [onboardingStep, setOnboardingStep] = useState<0 | 1 | 2 | 3>(0); // 0: Init, 1: Ask Name, 2: Ask Phone, 3: Completed
    const [visitorData, setVisitorData] = useState({ name: '', phone: '' });
    const [showWAPopup, setShowWAPopup] = useState(false);
    const [isAdminTyping, setIsAdminTyping] = useState(false);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const hasTriggeredOnboarding = useRef(false);
    const typingTimeoutRef = useRef<any>(null);
    const pollIntervalRef = useRef<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { isRecording, recordingTime, formatTime, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

    // 1. Initial Visitor Discovery
    useEffect(() => {
        let token = localStorage.getItem('visitor_token');
        if (!token) {
            token = crypto.randomUUID();
            localStorage.setItem('visitor_token', token);
        }
        setVisitorToken(token);
    }, []);

    // 2. Load Chat Infrastructure
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
                        setOnboardingStep(3); // Skip onboarding if not enabled in plan
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
                    if (msg.tempId && prev.some(m => m.id === msg.tempId)) {
                        return prev.map(m => m.id === msg.tempId ? msg : m);
                    }

                    const dupeIndex = prev.findIndex(m =>
                        m.id.startsWith('temp-') &&
                        m.content === msg.content &&
                        m.isFromAdmin === msg.isFromAdmin
                    );

                    if (dupeIndex !== -1) {
                        const next = [...prev];
                        next[dupeIndex] = msg;
                        return next;
                    }

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

            const handleTyping = (data: { isFromAdmin: boolean }) => {
                if (data.isFromAdmin) setIsAdminTyping(true);
            };

            const handleStopTyping = (data: { isFromAdmin: boolean }) => {
                if (data.isFromAdmin) setIsAdminTyping(false);
            };

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

        pollIntervalRef.current = setInterval(() => {
            fetchMessages();
        }, 5000);

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [conversationId, isSocketConnected]);

    useEffect(() => {
        if (!chatInfo || !conversationId || onboardingStep !== 1 || hasTriggeredOnboarding.current) return;

        const triggerOnboardingMsg = async (text: string) => {
            try {
                await apiClient.post('/public/messages', {
                    conversationId,
                    content: text,
                    isFromAdmin: true,
                });
            } catch (err) { }
        };

        const runOnboarding = async () => {
            if (messages.length === 0) {
                hasTriggeredOnboarding.current = true;
                if (chatInfo.welcomeMessage) {
                    await triggerOnboardingMsg(chatInfo.welcomeMessage);
                }
                setTimeout(() => triggerOnboardingMsg("To get started, could you please tell me your name?"), 600);
            }
        };

        runOnboarding();
    }, [chatInfo, conversationId, onboardingStep, messages.length]);

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

                    // Check for optimistic message to replace
                    const dupeIndex = merged.findIndex(m =>
                        (msg.tempId && m.id === msg.tempId) ||
                        (m.content === msg.content && m.isFromAdmin === msg.isFromAdmin && m.id.startsWith('temp-'))
                    );

                    if (dupeIndex !== -1) {
                        merged[dupeIndex] = msg;
                    } else {
                        merged.push(msg);
                    }
                });

                return merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            });

            if (res.data.length > 0) {
                apiClient.post('/public/mark-read', { conversationId, isAdmin: false }).catch(() => { });
            }
        } catch (err) {
            console.error('Fetch messages error:', err);
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !conversationId) return;

        const content = inputText;
        setInputText('');
        setShowEmoji(false);
        setLinkPreview(null);
        setReplyingTo(null);

        // Onboarding Handling
        if (onboardingStep === 1) {
            // Processing Name
            setVisitorData(prev => ({ ...prev, name: content }));
            localStorage.setItem('visitor_name', content);
            setOnboardingStep(2);
            // Submit to backend
            apiClient.post('/public/init', { slug, visitorToken, visitorName: content });

            const tempId = `temp-${Date.now()}`;
            addOptimisticMessage(content, MessageType.TEXT, tempId);

            // Trigger next question
            setTimeout(async () => {
                await triggerOnboardingMsg("Thank you! And what's your phone number or email so we can reach you?");
            }, 600);
            return;
        }

        if (onboardingStep === 2) {
            // Processing Phone
            setVisitorData(prev => ({ ...prev, phone: content }));
            localStorage.setItem('visitor_phone', content);
            setOnboardingStep(3);
            // Submit to backend
            apiClient.post('/public/init', { slug, visitorToken, visitorName: visitorData.name, visitorPhone: content });

            const tempId = `temp-${Date.now()}`;
            addOptimisticMessage(content, MessageType.TEXT, tempId);

            setTimeout(async () => {
                await triggerOnboardingMsg("Perfect! How can I help you today?");
            }, 600);
            return;
        }

        // Regular Sending
        const tempId = `temp-${Date.now()}`;
        addOptimisticMessage(content, MessageType.TEXT, tempId);

        try {
            const res = await apiClient.post('/public/messages', {
                conversationId,
                content,
                type: MessageType.TEXT,
                isFromAdmin: false,
                tempId,
                replyToId: replyingTo?.id
            });
            // Replace optimistic message with actual DB message
            setMessages(prev => prev.map(m => m.id === tempId ? res.data : m));
        } catch (err) {
            console.error('Send error:', err);
            // Optionally remove optimistic message on failure
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    const triggerOnboardingMsg = async (text: string) => {
        try {
            await apiClient.post('/public/messages', {
                conversationId,
                content: text,
                isFromAdmin: true,
            });
        } catch (err) { }
    };

    const addOptimisticMessage = (content: string, type: MessageType = MessageType.TEXT, tempId?: string) => {
        const optimisticMsg: any = {
            id: tempId || `temp-${Date.now()}`,
            conversationId,
            content,
            type,
            isFromAdmin: false,
            isRead: false,
            createdAt: new Date().toISOString(),
            linkPreview,
            replyTo: replyingTo,
            replyToId: replyingTo?.id
        };
        setMessages(prev => [...prev, optimisticMsg]);
    };

    const sendVoiceMessage = async () => {
        if (!conversationId) return;
        if (onboardingStep < 3) return; // Disallow voice during onboarding for simplicity

        const audioBase64 = await stopRecording();
        if (!audioBase64) return;

        const tempId = `temp-${Date.now()}`;
        addOptimisticMessage(audioBase64, MessageType.AUDIO, tempId);
        try {
            const res = await apiClient.post('/public/messages', {
                conversationId,
                content: audioBase64,
                type: MessageType.AUDIO,
                isFromAdmin: false,
                tempId
            });
            setMessages(prev => prev.map(m => m.id === tempId ? res.data : m));
        } catch (err) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    // UI Helpers & Scroll
    useEffect(() => {
        setTimeout(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }, 100);

        const customerMsgs = messages.filter(m => !m.isFromAdmin);
        if (chatInfo?.whatsappLink && customerMsgs.length >= (chatInfo.whatsappThreshold || 5)) {
            const hasShown = sessionStorage.getItem(`wa_popup_${conversationId}`);
            if (!hasShown) {
                setShowWAPopup(true);
                sessionStorage.setItem(`wa_popup_${conversationId}`, 'true');
            }
        }
    }, [messages.length]);

    const onEmojiClick = (emojiData: any) => {
        setInputText(prev => prev + emojiData.emoji);
        handleTypingIndicator();
    };

    const handleTypingIndicator = () => {
        if (!conversationId) return;
        socket.emit('typing', { conversationId, isFromAdmin: false });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing', { conversationId, isFromAdmin: false });
        }, 2000);
    };

    const groupMessagesByDate = (msgs: any[]) => {
        const groups: { [key: string]: any[] } = {};
        msgs.forEach(msg => {
            const date = format(new Date(msg.createdAt), 'yyyy-MM-dd');
            if (!groups[date]) groups[date] = [];
            groups[date].push(msg);
        });
        return groups;
    };

    const formatMessageText = (text: string) => {
        if (!text) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#53bdeb', textDecoration: 'underline' }}>{part}</a>;
            }
            return <span key={i}>{part.split('\n').map((line, j) => <React.Fragment key={j}>{j > 0 && <br />}{line}</React.Fragment>)}</span>;
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            if (e.shiftKey || e.metaKey || e.ctrlKey || window.innerWidth <= 768) return;
            e.preventDefault();
            handleSend(e as unknown as React.FormEvent);
        }
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
        <Layout style={{ height: '100vh', background: 'var(--wa-bg)', overflow: 'hidden' }}>
            <Content style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                <div className="whatsapp-bg"></div>

                {!chatInfo ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                        <Spin size="large" tip="Connecting..." />
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div style={{ height: 60, padding: '10px 16px', background: 'var(--wa-panel)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Avatar
                                    size={40}
                                    src={chatInfo.adminLogo}
                                    icon={<UserOutlined />}
                                    style={{ background: '#6a7175' }}
                                />
                                <div>
                                    <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>{chatInfo.adminName}</div>
                                    <div style={{ color: 'var(--wa-secondary)', fontSize: 12 }}>online</div>
                                </div>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 5%', display: 'flex', flexDirection: 'column', zIndex: 5 }} ref={scrollRef}>
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
                                        <div key={msg.tempId || msg.id} className={`wa-bubble ${!msg.isFromAdmin ? 'wa-bubble-out' : 'wa-bubble-in'}`} style={{ marginBottom: 16 }}>
                                            {msg.replyTo && (
                                                <div style={{ background: 'rgba(0,0,0,0.1)', padding: '6px 10px', borderRadius: 4, marginBottom: 8, borderLeft: `4px solid ${!msg.replyTo.isFromAdmin ? '#53bdeb' : '#00df9a'}`, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                                                    <div style={{ fontWeight: 600, color: !msg.replyTo.isFromAdmin ? '#53bdeb' : '#00df9a' }}>{!msg.replyTo.isFromAdmin ? 'You' : 'Agent'}</div>
                                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {msg.replyTo.type === MessageType.AUDIO ? '🎤 Voice Message' : msg.replyTo.content}
                                                    </div>
                                                </div>
                                            )}
                                            <LinkPreview preview={msg.linkPreview} />
                                            <div style={{ paddingRight: !msg.isFromAdmin ? 45 : 35, whiteSpace: 'pre-wrap', minHeight: msg.type === MessageType.AUDIO ? 56 : undefined }}>
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

                        {/* Input Area */}
                        <div style={{ padding: '10px 16px', background: 'var(--wa-panel)', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 10 }}>
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
                                <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                                    <Input.TextArea
                                        autoSize={{ minRows: 1, maxRows: 5 }}
                                        placeholder={onboardingStep === 1 ? "Enter your name..." : onboardingStep === 2 ? "Enter phone/email..." : "Type a message"}
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

                        {/* WA Popup */}
                        <Modal open={showWAPopup} onCancel={() => setShowWAPopup(false)} footer={null} centered styles={{ body: { background: '#202c33', color: '#fff' } }} width={360}>
                            <div style={{ textAlign: 'center', padding: 20 }}>
                                <WhatsAppOutlined style={{ fontSize: 50, color: '#25D366', marginBottom: 20 }} />
                                <h3 style={{ color: '#fff', fontSize: 18 }}>Continue on WhatsApp?</h3>
                                <p style={{ color: '#8696a0', marginBottom: 24 }}>Move to WhatsApp for faster replies?</p>
                                <Button block type="primary" style={{ background: '#25D366', border: 'none', marginBottom: 12, height: 44 }} icon={<WhatsAppOutlined />} onClick={() => { window.open(chatInfo.whatsappLink, '_blank'); setShowWAPopup(false); }}>Open WhatsApp</Button>
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
