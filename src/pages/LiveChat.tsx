import React, { useState, useEffect, useRef } from 'react';
import { Layout, Input, Avatar, Typography, Spin, Button, Space, Select, Grid } from 'antd';
import { SendOutlined, SmileOutlined, PaperClipOutlined, MoreOutlined, SearchOutlined, MessageOutlined, CheckOutlined, AudioOutlined, FilterOutlined, CloseOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import apiClient from '../api/apiClient';
import { socket } from '../socket';
import { useAuth } from '../contexts/AuthContext';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { AudioPlayer } from '../components/AudioPlayer';
import { MessageType } from '../enums';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

const LiveChat: React.FC = () => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedLinkId, setSelectedLinkId] = useState<string>('all');
    const [inputText, setInputText] = useState('');
    const [convPage, setConvPage] = useState(1);
    const [showEmoji, setShowEmoji] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [linkPreview, setLinkPreview] = useState<any>(null);
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesCache = useRef<Record<string, any[]>>({});
    const fetchCounter = useRef(0);
    const isSending = useRef(false);
    const [isVisitorTyping, setIsVisitorTyping] = useState(false);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const typingTimeoutRef = useRef<any>(null);
    const pollIntervalRef = useRef<any>(null);
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { isRecording, recordingTime, formatTime, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

    useEffect(() => {
        if (!user?.id) return;
        socket.connect();
        socket.emit('join_admin', user.id);

        const onConnect = () => setIsSocketConnected(true);
        const onDisconnect = () => setIsSocketConnected(false);

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        const updateConv = () => queryClient.invalidateQueries({ queryKey: ['conversations'] });
        socket.on('conversation_updated', updateConv);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('conversation_updated', updateConv);
            socket.disconnect();
        };
    }, [user?.id, queryClient]);

    const { data: convsResponse, isLoading: isLoadingConvs } = useQuery({
        queryKey: ['conversations', convPage],
        queryFn: () => apiClient.get(`/conversations?page=${convPage}&limit=20`).then(res => res.data),
        refetchInterval: 10000,
    });

    const [allConvs, setAllConvs] = useState<any[]>([]);

    useEffect(() => {
        if (convsResponse?.data) {
            setAllConvs(prev => {
                if (convPage === 1) return convsResponse.data;
                const existingIds = new Set(prev.map(c => c.id));
                const newConvs = convsResponse.data.filter((c: any) => !existingIds.has(c.id));
                return [...prev, ...newConvs];
            });
        } else if (Array.isArray(convsResponse)) {
            // Fallback for non-paginated legacy response
            setAllConvs(convsResponse);
        }
    }, [convsResponse, convPage]);

    const conversations = allConvs;
    const hasMoreConvs = convsResponse?.total ? conversations.length < convsResponse.total : false;

    const uniqueLinks = Array.from(new Map(conversations.map((c: any) => [c.linkId, c.linkTitle])).entries())
        .map(([id, title]) => ({ id, title }));

    const filteredConversations = selectedLinkId === 'all'
        ? conversations
        : conversations.filter((c: any) => c.linkId === selectedLinkId);

    // Poll for messages when socket is disconnected (Fallback)
    useEffect(() => {
        if (!selectedId || isSocketConnected) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            return;
        }

        pollIntervalRef.current = setInterval(() => {
            fetchMessages(true); // Quiet fetch (non-loading)
        }, 5000); // 5s fallback polling

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [selectedId, isSocketConnected]);

    useEffect(() => {
        if (selectedId) {
            // INSTANT CACHE LOAD
            if (messagesCache.current[selectedId]) {
                setMessages(messagesCache.current[selectedId]);
            } else {
                setMessages([]);
            }
            fetchMessages(true);
            setLinkPreview(null);

            socket.emit('join_conversation', selectedId);

            const handleMessage = (msg: any) => {
                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev;

                    // Support both tempId check and fallback content-based deduplication
                    const dupeIndex = prev.findIndex(m =>
                        (msg.tempId && m.id === msg.tempId) ||
                        (m.id.startsWith('temp-') && m.content === msg.content && m.isFromAdmin === msg.isFromAdmin)
                    );

                    let nextMessages;
                    if (dupeIndex !== -1) {
                        nextMessages = [...prev];
                        nextMessages[dupeIndex] = msg;
                    } else {
                        nextMessages = [...prev, msg];
                    }

                    messagesCache.current[selectedId] = nextMessages;
                    return nextMessages;
                });

                // Mark as read immediately when active
                apiClient.post('/messages/mark-read', { conversationId: selectedId, isAdmin: true }).catch(() => { });
            };

            const handleRead = (data: { byAdmin: boolean }) => {
                setMessages(prev => {
                    const newMsgs = prev.map(m => {
                        if (data?.byAdmin && !m.isFromAdmin) return { ...m, isRead: true };
                        if (data?.byAdmin === false && m.isFromAdmin) return { ...m, isRead: true };
                        return m;
                    });
                    messagesCache.current[selectedId] = newMsgs;
                    return newMsgs;
                });
            };

            const handleTyping = (data: { isFromAdmin: boolean }) => {
                if (!data.isFromAdmin) setIsVisitorTyping(true);
            };

            const handleStopTyping = (data: { isFromAdmin: boolean }) => {
                if (!data.isFromAdmin) setIsVisitorTyping(false);
            };

            socket.on('receive_message', handleMessage);
            socket.on('messages_read', handleRead);
            socket.on('user_typing', handleTyping);
            socket.on('user_stop_typing', handleStopTyping);

            return () => {
                socket.off('receive_message', handleMessage);
                socket.off('messages_read', handleRead);
                socket.off('user_typing', handleTyping);
                socket.off('user_stop_typing', handleStopTyping);
                socket.emit('leave_conversation', selectedId);
            };
        } else {
            setMessages([]);
        }
    }, [selectedId]);

    // Handle reliable auto-scrolling to bottom when completely new messages exist
    useEffect(() => {
        if (!loadingMore) {
            setTimeout(scrollToBottom, 100);
        }
    }, [messages.length]);

    useEffect(() => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const match = inputText.match(urlRegex);
        if (match && match[0]) {
            const url = match[0];
            if (linkPreview?.url === url) return;

            const timer = setTimeout(() => {
                apiClient.post('/public/preview', { url })
                    .then(res => setLinkPreview(res.data))
                    .catch(() => setLinkPreview(null));
            }, 1000); // 1s debounce
            return () => clearTimeout(timer);
        } else {
            setLinkPreview(null);
        }
    }, [inputText]);

    const fetchMessages = async (isInitial = false) => {
        if (!selectedId) return;
        if (isSending.current && !isInitial) return;

        const currentFetch = ++fetchCounter.current;
        try {
            const res = await apiClient.get(`/messages?conversationId=${selectedId}`);
            if (currentFetch !== fetchCounter.current) return;

            setMessages(prev => {
                const newMsgs = res.data;
                const existingIds = new Set(prev.map(m => m.id));
                const merged = [...prev];

                newMsgs.forEach((msg: any) => {
                    if (existingIds.has(msg.id)) return;

                    const dupeIndex = merged.findIndex(m =>
                        (msg.tempId && m.id === msg.tempId) ||
                        (m.id.startsWith('temp-') && m.content === msg.content && m.isFromAdmin === msg.isFromAdmin)
                    );

                    if (dupeIndex !== -1) {
                        merged[dupeIndex] = msg;
                    } else {
                        merged.push(msg);
                    }
                });

                const sorted = merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                messagesCache.current[selectedId!] = sorted;
                return sorted;
            });

            // Mark as read when messages are fetched/viewed
            if (res.data.length > 0) {
                apiClient.post('/messages/mark-read', { conversationId: selectedId, isAdmin: true })
                    .catch(err => console.error('Mark read error:', err));
            }
        } catch (err) {
            console.error('Fetch messages error:', err);
        } finally {
            if (isInitial) setLoadingMessages(false);
        }
    };

    const loadMoreMessages = async () => {
        if (loadingMore || !hasMore || messages.length === 0) return;
        setLoadingMore(true);
        const oldestId = messages[0].id;
        try {
            const res = await apiClient.get(`/messages?conversationId=${selectedId}&cursor=${oldestId}&limit=40`);
            if (res.data.length < 40) setHasMore(false);
            const prevHeight = scrollRef.current?.scrollHeight || 0;
            setMessages(prev => [...res.data, ...prev]);
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight;
                }
            }, 0);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !selectedId) return;

        const content = inputText;
        setInputText('');
        setLinkPreview(null);
        const currentReplyTo = replyingTo;
        setReplyingTo(null);

        // Optimistic UI Update
        const optimisticMsg = {
            id: `temp-${Date.now()}`,
            conversationId: selectedId,
            content,
            isFromAdmin: true,
            isRead: false,
            createdAt: new Date().toISOString(),
            linkPreview: linkPreview, // Use current preview if available
            replyTo: currentReplyTo,
            replyToId: currentReplyTo?.id
        };

        isSending.current = true;
        fetchCounter.current += 1;

        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const res = await apiClient.post('/messages', {
                conversationId: selectedId,
                content,
                type: MessageType.TEXT,
                isFromAdmin: true,
                tempId: optimisticMsg.id,
                replyToId: currentReplyTo?.id
            });
            fetchCounter.current += 1;
            // Replace optimistic message with actual DB message
            setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? res.data : m));
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            messagesCache.current[selectedId] = []; // Force refresh cache next pull
        } catch (e) {
            console.error(e);
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        } finally {
            isSending.current = false;
        }
    };

    const sendVoiceMessage = async () => {
        if (!selectedId) return;
        const audioBase64 = await stopRecording();
        if (!audioBase64) return;

        const currentReplyTo = replyingTo;
        setReplyingTo(null);

        const optimisticMsg = {
            id: `temp-${Date.now()}`,
            conversationId: selectedId,
            content: audioBase64,
            type: MessageType.AUDIO,
            isFromAdmin: true,
            isRead: false,
            createdAt: new Date().toISOString(),
            linkPreview: null,
            replyTo: currentReplyTo,
            replyToId: currentReplyTo?.id
        };

        isSending.current = true;
        fetchCounter.current += 1;
        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const res = await apiClient.post('/messages', {
                conversationId: selectedId,
                content: audioBase64,
                type: MessageType.AUDIO,
                isFromAdmin: true,
                tempId: optimisticMsg.id,
                replyToId: currentReplyTo?.id
            });
            fetchCounter.current += 1;
            setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? res.data : m));
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            messagesCache.current[selectedId] = [];
        } catch (e) {
            console.error(e);
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
        } finally {
            isSending.current = false;
        }
    };

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const selectedConv = conversations.find((c: any) => c.id === selectedId);

    const onEmojiClick = (emojiData: any) => {
        setInputText(prev => prev + emojiData.emoji);
        handleTypingIndicator();
    };

    const handleTypingIndicator = () => {
        if (!selectedId) return;
        socket.emit('typing', { conversationId: selectedId, isFromAdmin: true });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing', { conversationId: selectedId, isFromAdmin: true });
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
                return (
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#53bdeb', textDecoration: 'underline' }}>
                        {part}
                    </a>
                );
            }
            return (
                <span key={i}>
                    {part.split('\n').map((line, j) => (
                        <React.Fragment key={j}>
                            {j > 0 && <br />}
                            {line}
                        </React.Fragment>
                    ))}
                </span>
            );
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            const isMobile = window.innerWidth <= 768;
            if (e.shiftKey || e.metaKey || e.ctrlKey || isMobile) {
                // Allow default (new line)
                return;
            } else {
                e.preventDefault();
                handleSend(e as unknown as React.FormEvent);
            }
        }
    };

    const getDateLabel = (dateStr: string) => {
        const date = new Date(dateStr);
        if (format(new Date(), 'yyyy-MM-dd') === dateStr) return 'TODAY';
        if (format(new Date(Date.now() - 86400000), 'yyyy-MM-dd') === dateStr) return 'YESTERDAY';
        return format(date, 'MMMM d, yyyy');
    };

    const LinkPreview = ({ preview }: { preview: any }) => {
        if (!preview) return null;
        return (
            <div style={{
                background: 'rgba(0,0,0,0.1)',
                borderRadius: 4,
                marginBottom: 8,
                overflow: 'hidden',
                borderLeft: '4px solid #00df9a',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {preview.image && (
                    <img src={preview.image} alt="Preview" style={{ width: '100%', maxHeight: 150, objectFit: 'cover' }} />
                )}
                <div style={{ padding: '8px 12px' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#00df9a', marginBottom: 2 }}>{preview.title}</div>
                    <div style={{ fontSize: 12, opacity: 0.8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{preview.description}</div>
                </div>
            </div>
        );
    };

    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    return (
        <Layout style={{
            height: isMobile ? 'calc(100vh - 85px)' : 'calc(100vh - 120px)',
            background: 'var(--wa-bg)',
            overflow: 'hidden',
            border: isMobile ? 'none' : '1px solid var(--divider)',
            borderRadius: isMobile ? 0 : 4,
            margin: isMobile ? '-20px -20px 0 -20px' : 0 // Perfect alignment on mobile
        }}>
            {(!isMobile || !selectedId) && (
                <Sider
                    width={isMobile ? '100%' : 400}
                    style={{
                        background: 'var(--wa-sidebar)',
                        borderRight: isMobile ? 'none' : '1px solid var(--divider)',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                        position: isMobile ? 'absolute' : 'relative',
                        zIndex: 20
                    }}
                >
                    {/* Sidebar Header */}
                    <div style={{
                        height: 60,
                        padding: '10px 16px',
                        background: 'var(--wa-panel)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <Avatar src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
                        <Space size={20} style={{ color: 'var(--wa-secondary)', fontSize: 20 }}>
                            <MessageOutlined style={{ cursor: 'pointer' }} />
                            <MoreOutlined style={{ cursor: 'pointer' }} />
                        </Space>
                    </div>

                    {/* Link Filter Dropdown */}
                    <div style={{ padding: '8px 12px 0 12px', background: 'var(--wa-sidebar)' }}>
                        <Select
                            value={selectedLinkId}
                            onChange={(value) => {
                                setSelectedLinkId(value);
                                setSelectedId(null);
                            }}
                            style={{ width: '100%' }}
                            popupMatchSelectWidth={false}
                            options={[
                                { value: 'all', label: 'All Links' },
                                ...uniqueLinks.map((link) => ({ value: link.id, label: String(link.title) }))
                            ]}
                        />
                    </div>

                    {/* Search & Filter */}
                    <div style={{ padding: '8px 12px', background: 'var(--wa-sidebar)' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <div style={{ position: 'absolute', left: 12, top: 8, color: 'var(--wa-secondary)', zIndex: 1, fontSize: 16 }}>
                                    <SearchOutlined />
                                </div>
                                <input
                                    placeholder="Search or start new chat"
                                    style={{
                                        width: '100%',
                                        background: 'var(--wa-panel)',
                                        border: 'none',
                                        borderRadius: 8,
                                        padding: '8px 8px 8px 44px',
                                        color: '#fff',
                                        fontSize: 14,
                                        height: 35
                                    }}
                                />
                            </div>
                            <FilterOutlined style={{ color: 'var(--wa-secondary)', fontSize: 20, cursor: 'pointer' }} />
                        </div>
                    </div>

                    {/* Conversation List */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {isLoadingConvs ? (
                            <div style={{ padding: 24, textAlign: 'center' }}><Spin size="small" /></div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {filteredConversations.map((conv: any) => (
                                    <div
                                        key={conv.id}
                                        onClick={() => setSelectedId(conv.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: '12px 16px',
                                            cursor: 'pointer',
                                            background: selectedId === conv.id ? 'var(--wa-active)' : 'transparent',
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            transition: 'background 0.2s'
                                        }}
                                        className="wa-sidebar-item"
                                    >
                                        <Avatar size={48} src={`https://api.dicebear.com/7.x/bottts/svg?seed=${conv.visitorToken}`} style={{ background: '#6a7175' }} />
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                <Text strong={conv.unreadCount > 0} ellipsis style={{ color: '#fff', fontSize: 16 }}>
                                                    {conv.visitorName ? `${conv.visitorName}` : `User ${conv.visitorToken.substring(0, 8)}`}
                                                </Text>
                                                <Text style={{ color: conv.unreadCount > 0 ? 'var(--wa-green)' : 'var(--wa-secondary)', fontSize: 12, fontWeight: conv.unreadCount > 0 ? 600 : 400 }}>
                                                    {format(new Date(conv.lastMessageAt), 'HH:mm')}
                                                </Text>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {conv.isFromAdmin && <CheckOutlined style={{ fontSize: 14, color: '#53bdeb' }} />}
                                                <Text ellipsis style={{
                                                    color: conv.unreadCount > 0 ? '#e9edef' : 'var(--wa-secondary)',
                                                    fontSize: 13,
                                                    flex: 1,
                                                    fontWeight: conv.unreadCount > 0 ? 600 : 400
                                                }}>
                                                    {conv.lastMessageType === MessageType.AUDIO ? (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <AudioOutlined style={{ fontSize: 14 }} /> Voice Message
                                                        </span>
                                                    ) : (
                                                        conv.lastMessage || 'No messages yet'
                                                    )}
                                                </Text>
                                                {conv.unreadCount > 0 && (
                                                    <div style={{
                                                        background: 'var(--wa-green)',
                                                        color: '#000',
                                                        borderRadius: '50%',
                                                        minWidth: 20,
                                                        height: 20,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        marginLeft: 8,
                                                        padding: '0 6px'
                                                    }}>
                                                        {conv.unreadCount}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {hasMoreConvs && (
                                    <div style={{ padding: 12, textAlign: 'center' }}>
                                        <Button
                                            type="text"
                                            style={{ color: 'var(--wa-green)', fontSize: 13 }}
                                            onClick={() => setConvPage(prev => prev + 1)}
                                        >
                                            Load older chats
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Sider>
            )}

            {(!isMobile || selectedId) && (
                <Content style={{
                    background: 'var(--wa-bg)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                    height: '100%'
                }}>
                    <div className="whatsapp-bg"></div>

                    {selectedId ? (
                        <>
                            {/* Chat Header */}
                            <div style={{
                                height: 60,
                                padding: isMobile ? '10px 8px' : '10px 16px',
                                background: 'var(--wa-panel)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                zIndex: 10,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, cursor: 'pointer', flex: 1, minWidth: 0 }}>
                                    {isMobile && (
                                        <Button
                                            type="text"
                                            icon={<ArrowLeftOutlined />}
                                            onClick={() => setSelectedId(null)}
                                            style={{ color: 'var(--wa-secondary)', padding: '0 4px', fontSize: 18, height: 'auto' }}
                                        />
                                    )}
                                    <Avatar size={isMobile ? 36 : 40} src={`https://api.dicebear.com/7.x/bottts/svg?seed=${selectedConv?.visitorToken}`} style={{ background: '#6a7175', flexShrink: 0 }} />
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                        <div style={{ color: '#fff', fontSize: isMobile ? 14 : 16, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {selectedConv?.visitorName ? `${selectedConv.visitorName}` : `User ${selectedConv?.visitorToken.substring(0, 8)}`}
                                        </div>
                                        <div style={{ color: 'var(--wa-green)', fontSize: 10, fontWeight: 500, lineHeight: 1 }}>online</div>
                                    </div>
                                </div>
                                <Space size={isMobile ? 12 : 20} style={{ color: 'var(--wa-secondary)', fontSize: 20 }}>
                                    {!isMobile && <SearchOutlined style={{ cursor: 'pointer' }} />}
                                    <MoreOutlined style={{ cursor: 'pointer' }} />
                                </Space>
                            </div>

                            {/* Messages Area */}
                            <div
                                style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    padding: isMobile ? '15px 4%' : '20px 7%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    zIndex: 5
                                }}
                                ref={scrollRef}
                                onScroll={(e) => {
                                    if (e.currentTarget.scrollTop === 0) loadMoreMessages();
                                }}
                            >
                                {loadingMessages ? (
                                    <div style={{ textAlign: 'center', marginTop: 40 }}><Spin /></div>
                                ) : (
                                    <>
                                        {loadingMore && <div style={{ textAlign: 'center', padding: 12 }}><Spin size="small" /></div>}
                                        {Object.entries(groupMessagesByDate(messages)).map(([date, dateMsgs]) => (
                                            <React.Fragment key={date}>
                                                <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
                                                    <div style={{
                                                        background: 'rgba(32,44,51,0.85)',
                                                        padding: '6px 12px',
                                                        borderRadius: 8,
                                                        color: '#8696a0',
                                                        fontSize: 11,
                                                        boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: 0.5
                                                    }}>
                                                        {getDateLabel(date)}
                                                    </div>
                                                </div>
                                                {dateMsgs.map((msg: any) => {
                                                    return (
                                                        <div
                                                            key={msg.tempId || msg.id}
                                                            className={`wa-bubble ${msg.isFromAdmin ? 'wa-bubble-out' : 'wa-bubble-in'}`}
                                                            style={{ marginBottom: 12, animation: 'fadeIn 0.3s' }}
                                                            onDoubleClick={() => setReplyingTo(msg)}
                                                            onTouchStart={(e) => {
                                                                const el = e.currentTarget as any;
                                                                el._startX = e.touches[0].clientX;
                                                                el._startY = e.touches[0].clientY;
                                                                el._isSwiping = false;
                                                                el.style.transition = 'none';
                                                            }}
                                                            onTouchMove={(e) => {
                                                                const el = e.currentTarget as any;
                                                                if (el._startX !== undefined) {
                                                                    const deltaX = e.touches[0].clientX - el._startX;
                                                                    const deltaY = Math.abs(e.touches[0].clientY - el._startY);
                                                                    if (deltaX > 10 && deltaX > deltaY) {
                                                                        el._isSwiping = true;
                                                                        const swipeAmount = Math.min(Math.max(0, deltaX), 60);
                                                                        el.style.transform = `translateX(${swipeAmount}px)`;
                                                                    }
                                                                }
                                                            }}
                                                            onTouchEnd={(e) => {
                                                                const el = e.currentTarget as any;
                                                                if (el._isSwiping) {
                                                                    const deltaX = e.changedTouches[0].clientX - el._startX;
                                                                    if (deltaX > 40) setReplyingTo(msg);
                                                                }
                                                                el.style.transform = `translateX(0px)`;
                                                                el.style.transition = 'transform 0.2s ease-out';
                                                                el._startX = undefined;
                                                                el._isSwiping = false;
                                                            }}
                                                            onTouchCancel={(e) => {
                                                                const el = e.currentTarget as any;
                                                                el.style.transform = `translateX(0px)`;
                                                                el.style.transition = 'transform 0.2s ease-out';
                                                                el._startX = undefined;
                                                                el._isSwiping = false;
                                                            }}
                                                        >
                                                            {msg.replyTo && (
                                                                <div style={{
                                                                    background: 'rgba(0,0,0,0.1)',
                                                                    padding: '6px 10px',
                                                                    borderRadius: 4,
                                                                    marginBottom: 8,
                                                                    borderLeft: `4px solid ${msg.replyTo.isFromAdmin ? '#53bdeb' : '#00df9a'}`,
                                                                    fontSize: 12,
                                                                    color: 'rgba(255,255,255,0.7)',
                                                                    cursor: 'pointer'
                                                                }}>
                                                                    <div style={{ fontWeight: 600, color: msg.replyTo.isFromAdmin ? '#53bdeb' : '#00df9a', marginBottom: 2 }}>{msg.replyTo.isFromAdmin ? 'Admin' : 'Visitor'}</div>
                                                                    <div style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{msg.replyTo.type === MessageType.AUDIO ? '🎤 Voice Message' : msg.replyTo.content}</div>
                                                                </div>
                                                            )}
                                                            <LinkPreview preview={msg.linkPreview} />
                                                            <div style={{ paddingRight: msg.isFromAdmin ? 45 : 35, whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: msg.type === MessageType.AUDIO ? 56 : undefined, fontSize: 14.5 }}>
                                                                {msg.type === MessageType.AUDIO ? (
                                                                    <AudioPlayer src={msg.content} isFromAdmin={msg.isFromAdmin} />
                                                                ) : (
                                                                    formatMessageText(msg.content)
                                                                )}
                                                            </div>
                                                            <div className="wa-timestamp">
                                                                {format(new Date(msg.createdAt), 'HH:mm')}
                                                                {msg.isFromAdmin && (
                                                                    <div style={{ display: 'inline-flex', marginLeft: 4, position: 'relative', width: 16 }}>
                                                                        <CheckOutlined style={{
                                                                            color: msg.isRead ? '#53bdeb' : '#8696a0',
                                                                            fontSize: 13
                                                                        }} />
                                                                        <CheckOutlined style={{
                                                                            color: msg.isRead ? '#53bdeb' : '#8696a0',
                                                                            fontSize: 13,
                                                                            marginLeft: -9
                                                                        }} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </React.Fragment>
                                        ))}
                                    </>
                                )}
                                {isVisitorTyping && (
                                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn 0.3s' }}>
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
                            <div style={{ position: 'relative', zIndex: 10 }}>
                                {linkPreview && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '100%',
                                        left: 0,
                                        right: 0,
                                        background: 'var(--wa-panel)',
                                        padding: '12px 16px',
                                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                                        borderTopLeftRadius: 8,
                                        borderTopRightRadius: 8,
                                        zIndex: 100
                                    }}>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            {linkPreview.image && (
                                                <img src={linkPreview.image} alt="Preview" style={{ width: 80, height: 80, borderRadius: 4, objectFit: 'cover' }} />
                                            )}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ color: 'var(--wa-green)', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{linkPreview.title}</div>
                                                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {linkPreview.description}
                                                </div>
                                            </div>
                                            <Button
                                                type="text"
                                                size="small"
                                                onClick={() => setLinkPreview(null)}
                                                style={{ color: 'var(--wa-secondary)', position: 'absolute', top: 8, right: 8 }}
                                            >✕</Button>
                                        </div>
                                    </div>
                                )}
                                {replyingTo && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '100%',
                                        left: 0,
                                        right: 0,
                                        background: 'var(--wa-panel)',
                                        padding: '12px 16px',
                                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                                        borderTopLeftRadius: 8,
                                        borderTopRightRadius: 8,
                                        zIndex: 100
                                    }}>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <div style={{ flex: 1, minWidth: 0, background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: 6, borderLeft: `4px solid ${replyingTo.isFromAdmin ? '#53bdeb' : '#00df9a'}` }}>
                                                <div style={{ color: replyingTo.isFromAdmin ? '#53bdeb' : '#00df9a', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{replyingTo.isFromAdmin ? 'Admin' : 'Visitor'}</div>
                                                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {replyingTo.type === MessageType.AUDIO ? '🎤 Voice Message' : replyingTo.content}
                                                </div>
                                            </div>
                                            <Button
                                                type="text"
                                                size="small"
                                                onClick={() => setReplyingTo(null)}
                                                style={{ color: 'var(--wa-secondary)', position: 'absolute', top: 8, right: 8 }}
                                            >✕</Button>
                                        </div>
                                    </div>
                                )}
                                <div style={{
                                    padding: '10px 16px',
                                    background: 'var(--wa-panel)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: isMobile ? 8 : 12,
                                }}>
                                    <Space size={isMobile ? 12 : 20} style={{ color: 'var(--wa-secondary)', fontSize: 24 }}>
                                        <SmileOutlined
                                            style={{ cursor: 'pointer', color: showEmoji ? 'var(--wa-green)' : 'inherit' }}
                                            onClick={() => setShowEmoji(!showEmoji)}
                                        />
                                        {!isMobile && <PaperClipOutlined style={{ cursor: 'pointer' }} />}
                                    </Space>

                                    {showEmoji && (
                                        <div style={{ position: 'absolute', bottom: isMobile ? 60 : 70, left: isMobile ? 0 : 16, width: isMobile ? '100%' : 'auto', zIndex: 200 }}>
                                            <EmojiPicker theme={EmojiTheme.DARK} onEmojiClick={onEmojiClick} width={isMobile ? '100%' : undefined} />
                                        </div>
                                    )}

                                    {isRecording ? (
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
                                            <div style={{ color: '#ef5350', display: 'flex', alignItems: 'center', gap: 8, animation: 'pulse 1.5s infinite' }}>
                                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef5350' }} />
                                                {formatTime(recordingTime)}
                                            </div>
                                            <div style={{ display: 'flex', gap: 16 }}>
                                                <Button type="text" onClick={cancelRecording} style={{ color: 'var(--wa-secondary)' }} icon={<CloseOutlined />} />
                                                <Button type="text" onClick={sendVoiceMessage} icon={<SendOutlined style={{ fontSize: 22, color: 'var(--wa-green)' }} />} />
                                            </div>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSend} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                                            <Input.TextArea
                                                autoSize={{ minRows: 1, maxRows: 5 }}
                                                className="wa-input"
                                                placeholder="Type a message"
                                                value={inputText}
                                                onChange={e => {
                                                    setInputText(e.target.value);
                                                    handleTypingIndicator();
                                                }}
                                                onFocus={() => setShowEmoji(false)}
                                                onKeyDown={handleKeyDown}
                                                style={{
                                                    background: '#2a3942',
                                                    border: 'none',
                                                    borderRadius: 8,
                                                    color: '#fff',
                                                    fontSize: 15,
                                                    padding: '9px 12px',
                                                    resize: 'none',
                                                }}
                                            />
                                            <div style={{ display: 'flex', width: 45, height: 42, alignItems: 'center', justifyContent: 'center' }}>
                                                {inputText.trim() ? (
                                                    <Button
                                                        type="text"
                                                        htmlType="submit"
                                                        icon={<SendOutlined style={{ fontSize: 22, color: 'var(--wa-secondary)' }} />}
                                                    />
                                                ) : (
                                                    <AudioOutlined onClick={startRecording} style={{ fontSize: 22, color: 'var(--wa-secondary)', cursor: 'pointer' }} />
                                                )}
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: 20 }}>
                            <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                <MessageOutlined style={{ fontSize: 50, color: 'rgba(255,255,255,0.1)' }} />
                            </div>
                            <Title level={4} style={{ color: '#fff', opacity: 0.8, marginBottom: 8, textAlign: 'center' }}>WhatsApp for Web</Title>
                            <Text style={{ color: 'var(--wa-secondary)', textAlign: 'center', maxWidth: 400 }}>
                                Send and receive messages without keeping your phone online. Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
                            </Text>
                            <div style={{ position: 'absolute', bottom: 40, color: 'var(--wa-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckOutlined /> End-to-end encrypted
                            </div>
                        </div>
                    )}
                </Content>
            )}
        </Layout>
    );
};

export default LiveChat;
