import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import apiClient from '../api/apiClient';
import { realtimeApi } from '../api/realtime';
import { useAuth } from '../contexts/AuthContext';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { AudioPlayer } from '../components/AudioPlayer';
import { MessageType } from '../enums';
import {
    Send, Smile, Paperclip, MoreVertical, Search, MessageSquare,
    Check, CheckCheck, Mic, Filter, X, ArrowLeft, Camera,
    User, Copy, ExternalLink, Phone, Calendar, Tag, Clock,
    MessagesSquare, Pin, Archive, Trash2, Sparkles, RefreshCw
} from 'lucide-react';
import { stripHtml } from '../utils/helpers';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

const parseVisitorName = (fullName: string) => {
    if (!fullName) return { cleanName: 'Anonymous', tag: null };
    const match = fullName.match(/^(.*?)\s*\[Form:\s*(.*?)\]$/i) || fullName.match(/^(.*?)\s*\[(.*?)\]$/);
    if (match) {
        return {
            cleanName: match[1].trim() || 'Anonymous',
            tag: match[2].trim()
        };
    }
    return { cleanName: fullName, tag: null };
};

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
    const pollIntervalRef = useRef<any>(null);
    const chatInputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { isRecording, recordingTime, formatTime, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

    // Typing and AI states
    const [showArchived, setShowArchived] = useState(false);
    const [isVisitorTyping, setIsVisitorTyping] = useState(false);
    const typingRef = useRef(false);
    const typingTimeoutRef = useRef<any>(null);

    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
    const [fetchingSuggestion, setFetchingSuggestion] = useState(false);
    const [activeLead, setActiveLead] = useState<any>(null);
    const [loadingLead, setLoadingLead] = useState(false);

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [showContactCard, setShowContactCard] = useState(true);
    const [showMobileContactSheet, setShowMobileContactSheet] = useState(false);
    const [copiedPhone, setCopiedPhone] = useState(false);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
    };

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const { data: convsResponse, isLoading: isLoadingConvs } = useQuery({
        queryKey: ['conversations', convPage],
        queryFn: () => apiClient.get(`/conversations?page=${convPage}&limit=20`).then(res => res.data),
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
            setHasMore(convPage < (convsResponse.totalPages || 1));
        } else if (Array.isArray(convsResponse)) {
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

    const markReadMutation = useMutation({
        mutationFn: (conversationId: string) => apiClient.post('/messages/mark-read', { conversationId, isAdmin: true })
    });

    const sendMsgMutation = useMutation({
        mutationFn: (data: any) => apiClient.post('/messages', data)
    });

    const togglePin = async (id: string, currentPin: boolean) => {
        try {
            await apiClient.patch(`/conversations/${id}/pin`, { isPinned: !currentPin });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        } catch (e) {
            console.error('Failed to pin conversation', e);
        }
    };

    const toggleArchive = async (id: string, currentArchive: boolean) => {
        try {
            await apiClient.patch(`/conversations/${id}/archive`, { isArchived: !currentArchive });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            if (id === selectedId) setSelectedId(null);
        } catch (e) {
            console.error('Failed to archive conversation', e);
        }
    };

    const deleteConv = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this conversation and all its messages? This action cannot be undone.')) return;
        try {
            await apiClient.delete(`/conversations/${id}`);
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            if (id === selectedId) setSelectedId(null);
        } catch (e) {
            console.error('Failed to delete conversation', e);
        }
    };

    const handleTyping = () => {
        if (!selectedId) return;
        if (!typingRef.current) {
            typingRef.current = true;
            apiClient.post('/realtime/typing', { conversationId: selectedId, isTyping: true, isFromAdmin: true }).catch(() => { });
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
            typingRef.current = false;
            apiClient.post('/realtime/typing', { conversationId: selectedId, isTyping: false, isFromAdmin: true }).catch(() => { });
        }, 2000);
    };

    const getAiSuggestion = async () => {
        if (!selectedId) return;
        setFetchingSuggestion(true);
        try {
            const res = await apiClient.get(`/messages/${selectedId}/suggested-reply`);
            setAiSuggestion(res.data.suggestion);
        } catch (e) {
            console.error('Failed to fetch suggested reply', e);
        } finally {
            setFetchingSuggestion(false);
        }
    };

    const fetchActiveLead = async (phone: string) => {
        setLoadingLead(true);
        setActiveLead(null);
        try {
            const res = await apiClient.get(`/crm/lead-by-phone?phone=${phone}`);
            setActiveLead(res.data);
        } catch (e) {
            console.error('Failed to fetch CRM lead', e);
        } finally {
            setLoadingLead(false);
        }
    };

    const previewMutation = useMutation({
        mutationFn: (url: string) => apiClient.post('/public/preview', { url })
    });

    const loadMoreMutation = useMutation({
        mutationFn: ({ conversationId, cursor }: { conversationId: string, cursor: string }) =>
            apiClient.get(`/messages?conversationId=${conversationId}&cursor=${cursor}&limit=40`)
    });

    const { data: fetchedMessages, isLoading: loadingFetchedMessages } = useQuery({
        queryKey: ['live-messages', selectedId],
        queryFn: () => apiClient.get(`/messages?conversationId=${selectedId}`).then(res => res.data),
        enabled: !!selectedId,
    });

    useEffect(() => {
        if (fetchedMessages && selectedId) {
            setLoadingMessages(false);
            setMessages(prev => {
                const newMsgs = fetchedMessages;
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
                messagesCache.current[selectedId] = sorted;
                return sorted;
            });

            if (fetchedMessages.length > 0) {
                markReadMutation.mutate(selectedId);
            }
        }
    }, [fetchedMessages, selectedId]);

    useEffect(() => {
        setAiSuggestion(null);
        setIsVisitorTyping(false);
        if (selectedId) {
            setLoadingMessages(true);
            if (messagesCache.current[selectedId]) {
                setMessages(messagesCache.current[selectedId]);
                setLoadingMessages(false);
            } else {
                setMessages([]);
            }
            setLinkPreview(null);
        } else {
            setMessages([]);
        }
    }, [selectedId]);



    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const sseUrl = realtimeApi.getSSERealtimeUrl(token);

        console.log('[SSE] LiveChat connecting to:', sseUrl);
        const es = new EventSource(sseUrl);

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[SSE] LiveChat received event:', data);

                if (data.type === 'message') {
                    const { conversationId, message } = data;

                    if (conversationId === selectedId) {
                        setMessages(prev => {
                            if (prev.some(m => m.id === message.id)) return prev;
                            const dupeIndex = prev.findIndex(m =>
                                (message.tempId && m.id === message.tempId) ||
                                (m.id.startsWith('temp-') && m.content === message.content && m.isFromAdmin === message.isFromAdmin)
                            );
                            const merged = [...prev];
                            if (dupeIndex !== -1) {
                                merged[dupeIndex] = message;
                            } else {
                                merged.push(message);
                            }
                            const sorted = merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                            messagesCache.current[conversationId] = sorted;
                            return sorted;
                        });

                        markReadMutation.mutate(conversationId);
                    } else {
                        messagesCache.current[conversationId] = [];
                    }

                    queryClient.invalidateQueries({ queryKey: ['conversations'] });
                }

                if (data.type === 'typing') {
                    const { conversationId, isTyping, isFromAdmin } = data;
                    if (conversationId === selectedId && !isFromAdmin) {
                        setIsVisitorTyping(isTyping);
                    }
                }

                if (data.type === 'mark_read') {
                    const { conversationId, isAdmin } = data;
                    if (conversationId === selectedId) {
                        setMessages(prev => prev.map(m => m.isFromAdmin === !isAdmin ? { ...m, isRead: true } : m));
                    }
                    queryClient.invalidateQueries({ queryKey: ['conversations'] });
                }

                if (data.type === 'conversation_updated') {
                    const { conversation } = data;
                    setAllConvs(prev => {
                        const existingIdx = prev.findIndex(c => c.id === conversation.id);
                        let updated = [...prev];
                        if (existingIdx !== -1) {
                            updated[existingIdx] = {
                                ...updated[existingIdx],
                                ...conversation
                            };
                        } else {
                            updated.push(conversation);
                        }
                        return updated.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
                    });
                }
            } catch (err) {
                console.error('[SSE] LiveChat parse error:', err);
            }
        };

        es.onerror = (err) => {
            console.error('[SSE] LiveChat connection error:', err);
        };

        return () => {
            es.close();
        };
    }, [selectedId]);


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
                previewMutation.mutateAsync(url)
                    .then(res => setLinkPreview(res.data))
                    .catch(() => setLinkPreview(null));
            }, 1000);
            return () => clearTimeout(timer);
        } else {
            setLinkPreview(null);
        }
    }, [inputText]);



    const loadMoreMessages = async () => {
        if (loadingMore || !hasMore || messages.length === 0) return;
        setLoadingMore(true);
        const oldestId = messages[0].id;
        try {
            const res = await loadMoreMutation.mutateAsync({ conversationId: selectedId!, cursor: oldestId });
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
        if (chatInputRef.current) {
            chatInputRef.current.style.height = 'auto';
        }
        setLinkPreview(null);
        setShowEmoji(false);
        const currentReplyTo = replyingTo;
        setReplyingTo(null);

        const optimisticMsg = {
            id: `temp-${Date.now()}`,
            conversationId: selectedId,
            content,
            isFromAdmin: true,
            isRead: false,
            createdAt: new Date().toISOString(),
            linkPreview: linkPreview,
            replyTo: currentReplyTo,
            replyToId: currentReplyTo?.id
        };

        isSending.current = true;
        fetchCounter.current += 1;

        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const res = await sendMsgMutation.mutateAsync({
                conversationId: selectedId,
                content,
                type: MessageType.TEXT,
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
            const res = await sendMsgMutation.mutateAsync({
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

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedId) return;
        
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            
            const currentReplyTo = replyingTo;
            setReplyingTo(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            const optimisticMsg = {
                id: `temp-${Date.now()}`,
                conversationId: selectedId,
                content: base64String,
                type: MessageType.IMAGE,
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
                const res = await sendMsgMutation.mutateAsync({
                    conversationId: selectedId,
                    content: base64String,
                    type: MessageType.IMAGE,
                    isFromAdmin: true,
                    tempId: optimisticMsg.id,
                    replyToId: currentReplyTo?.id
                });
                fetchCounter.current += 1;
                setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? res.data : m));
                queryClient.invalidateQueries({ queryKey: ['conversations'] });
                messagesCache.current[selectedId] = [];
            } catch (error) {
                console.error(error);
                setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
            } finally {
                isSending.current = false;
            }
        };
        reader.readAsDataURL(file);
    };

    const renderMessageContent = (msg: any) => {
        if (msg.isFromAdmin && msg.content && typeof msg.content === 'string' && msg.content.startsWith('<p>')) {
            return (
                <div 
                    dangerouslySetInnerHTML={{ __html: msg.content }} 
                    className="prose prose-sm prose-invert max-w-none w-fit inline-block overflow-hidden whitespace-normal break-words [word-break:break-word] [&_*]:break-words [&>p]:m-0 [&>p]:leading-normal [&_img]:max-w-[200px] [&_img]:rounded-lg [&_img]:my-2"
                />
            );
        }
        return formatMessageText(msg.content);
    };

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const selectedConv = conversations.find((c: any) => c.id === selectedId);

    useEffect(() => {
        if (selectedConv?.visitorPhone && selectedConv.visitorPhone !== 'N/A') {
            fetchActiveLead(selectedConv.visitorPhone);
        } else {
            setActiveLead(null);
        }
    }, [selectedId, selectedConv]);

    const onEmojiClick = (emojiData: any) => {
        setInputText(prev => prev + emojiData.emoji);
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
                    <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 underline underline-offset-2">
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
            if (e.shiftKey || e.metaKey || e.ctrlKey || isMobile) {
                return;
            } else {
                e.preventDefault();
                handleSend(e as unknown as React.FormEvent);
            }
        }
    };

    const getDateLabel = (dateStr: string) => {
        const date = new Date(dateStr);
        if (format(new Date(), 'yyyy-MM-dd') === dateStr) return 'Today';
        if (format(new Date(Date.now() - 86400000), 'yyyy-MM-dd') === dateStr) return 'Yesterday';
        return format(date, 'MMMM d, yyyy');
    };

    const LinkPreview = ({ preview }: { preview: any }) => {
        if (!preview) return null;
        return (
            <div className="bg-black/5 rounded-lg mb-2 overflow-hidden border-l-4 border-primary flex flex-col">
                {preview.image && (
                    <img src={preview.image} alt="Preview" className="w-full max-h-[150px] object-cover" />
                )}
                <div className="p-2.5">
                    <div className="font-bold text-xs text-primary mb-1">{preview.title}</div>
                    <div className="text-[11px] opacity-80 line-clamp-2 leading-tight">{preview.description}</div>
                </div>
            </div>
        );
    };

    return (
        <div className={cn(
            "flex overflow-hidden chat-container",
            isMobile 
                ? "h-[calc(100dvh-80px)] mx-[-16px] my-[-32px]" 
                : "h-[calc(100vh-82px)] border rounded-2xl shadow-sm m-[-40px]"
        )}>
            {/* Sidebar List */}
            {(!isMobile || !selectedId) && (
                <div className={cn(
                    "flex flex-col border-slate-200 z-20 font-sans text-slate-800 chat-sidebar",
                    isMobile ? "w-full absolute inset-0" : "w-[360px] border-r"
                )}>
                    {/* Header */}
                    <div className="h-[72px] px-5 flex items-center justify-between border-b shrink-0 chat-sidebar-header">
                        <div className="flex items-center gap-3">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`} className="w-10 h-10 rounded-full border border-slate-200 bg-slate-100" alt="avatar" />
                            <h2 className="text-xl font-bold text-slate-900 m-0 tracking-tight">Live Inbox</h2>
                        </div>
                        <div className="flex items-center gap-4 text-slate-400">
                            <MessageSquare className="w-5 h-5 cursor-pointer hover:text-primary transition-colors" />
                            <MoreVertical className="w-5 h-5 cursor-pointer hover:text-slate-700 transition-colors" />
                        </div>
                    </div>

                    {/* Filters & Search */}
                    <div className="p-4 flex flex-col gap-3 shrink-0 border-b chat-sidebar-header">
                        <select
                            value={selectedLinkId}
                            onChange={(e) => {
                                setSelectedLinkId(e.target.value);
                                setSelectedId(null);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none pr-10 relative cursor-pointer"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em 1.2em' }}
                        >
                            <option value="all">All Smart Links</option>
                            {uniqueLinks.map((link) => (
                                <option key={link.id} value={link.id}>{link.title}</option>
                            ))}
                        </select>
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                placeholder="Search conversations..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400 font-semibold"
                            />
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px] font-bold text-slate-500">
                            <span>Show Archived Chats</span>
                            <button
                                type="button"
                                onClick={() => { setShowArchived(!showArchived); setSelectedId(null); }}
                                className={cn(
                                    "px-3 py-1 rounded-full transition-all border font-extrabold cursor-pointer",
                                    showArchived
                                        ? "bg-primary/10 text-primary border-primary/20"
                                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                                )}
                            >
                                {showArchived ? "On" : "Off"}
                            </button>
                        </div>
                    </div>

                    {/* Conversations List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
                        {isLoadingConvs ? (
                            <div className="p-8 flex justify-center">
                                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {(() => {
                                    const filtered = selectedLinkId === 'all'
                                        ? conversations
                                        : conversations.filter((c: any) => c.linkId === selectedLinkId);

                                    const matchesArchive = filtered.filter((c: any) => showArchived ? c.isArchived : !c.isArchived);

                                    const sorted = [...matchesArchive].sort((a: any, b: any) => {
                                        if (a.isPinned && !b.isPinned) return -1;
                                        if (!a.isPinned && b.isPinned) return 1;
                                        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
                                    });

                                    return sorted.map((conv: any) => (
                                        <div
                                            key={conv.id}
                                            onClick={() => setSelectedId(conv.id)}
                                            className={cn(
                                                "flex items-center gap-3 p-4 cursor-pointer transition-all border-l-4 group chat-sidebar-item",
                                                selectedId === conv.id
                                                    ? "chat-sidebar-item-active border-primary shadow-xs"
                                                    : "border-transparent"
                                            )}
                                        >
                                            <div className="relative shrink-0">
                                                <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${conv.visitorToken}`} className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 shadow-2xs" alt="visitor" />
                                                {conv.unreadCount > 0 && (
                                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-2xs">
                                                        {conv.unreadCount}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0 overflow-hidden">
                                                <div className="flex justify-between items-center mb-1">
                                                    <div className={cn("text-xs truncate mr-2 flex flex-col gap-0.5", conv.unreadCount > 0 ? "font-extrabold text-slate-900" : "font-bold text-slate-700")}>
                                                        <div className="flex items-center gap-1.5">
                                                            {conv.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
                                                            <span className="truncate">
                                                                {conv.visitorName ? parseVisitorName(conv.visitorName).cleanName : `User ${conv.visitorToken.substring(0, 8)}`}
                                                            </span>
                                                        </div>
                                                        {conv.visitorName && parseVisitorName(conv.visitorName).tag && (
                                                            <span className="self-start inline-flex items-center gap-0.5 bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider scale-95 origin-left shrink-0">
                                                                <Tag className="w-2.5 h-2.5" strokeWidth={3} />
                                                                <span>{parseVisitorName(conv.visitorName).tag}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={cn("text-[11px]", conv.unreadCount > 0 ? "font-bold text-primary" : "font-semibold text-slate-400")}>
                                                        {format(new Date(conv.lastMessageAt), 'h:mm a')}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                        {conv.isFromAdmin && <CheckCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                                        <div className={cn("text-xs truncate", conv.unreadCount > 0 ? "font-bold text-slate-800" : "font-semibold text-slate-500")}>
                                                            {conv.lastMessageType === MessageType.AUDIO ? (
                                                                <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> Voice Message</span>
                                                            ) : (
                                                                stripHtml(conv.lastMessage) || 'No messages yet'
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Hover actions */}
                                                     <div className={cn("flex items-center gap-1 ml-2 transition-opacity", isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); togglePin(conv.id, conv.isPinned); }}
                                                            className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-amber-500"
                                                            title={conv.isPinned ? "Unpin Chat" : "Pin Chat"}
                                                        >
                                                            <Pin className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleArchive(conv.id, conv.isArchived); }}
                                                            className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-blue-500"
                                                            title={conv.isArchived ? "Unarchive Chat" : "Archive Chat"}
                                                        >
                                                            <Archive className="w-3.5 h-3.5" />
                                                        </button>
                                                        {user?.role !== 'SUB_USER' && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); deleteConv(conv.id); }}
                                                                className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-red-500"
                                                                title="Delete Chat"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ));
                                })()}

                                {hasMoreConvs && (
                                    <button
                                        onClick={() => setConvPage(prev => prev + 1)}
                                        className="m-4 py-2.5 px-4 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors cursor-pointer shadow-2xs"
                                    >
                                        Load older chats
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Chat Area */}
            {(!isMobile || selectedId) && (
                <div className="flex-1 flex md:flex-row flex-col relative bg-[#f8fafc] font-sans text-slate-800 overflow-hidden">
                    {/* Main Chat Pane */}
                    <div className="flex-1 flex flex-col min-w-0 relative h-full">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

                        {selectedId ? (
                            <>
                                {/* Chat Header */}
                                <div className="h-[72px] px-4 md:px-6 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md z-10 shrink-0 shadow-xs">
                                    <div className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                                        {isMobile && (
                                            <button onClick={() => setSelectedId(null)} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer">
                                                <ArrowLeft className="w-5 h-5" />
                                            </button>
                                        )}
                                        <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${selectedConv?.visitorToken}`} className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-slate-100 border border-slate-200 shrink-0 shadow-2xs" alt="visitor" />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-2">
                                                <span>{selectedConv?.visitorName ? parseVisitorName(selectedConv.visitorName).cleanName : `User ${selectedConv?.visitorToken.substring(0, 8)}`}</span>
                                                {selectedConv?.visitorName && parseVisitorName(selectedConv.visitorName).tag && (
                                                    <span className="shrink-0 bg-primary/10 text-primary text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                                                        {parseVisitorName(selectedConv.visitorName).tag}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] font-semibold text-green-500 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                                                <span>Online</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-400 shrink-0">
                                        {!isMobile && <Search className="w-5 h-5 cursor-pointer hover:text-primary transition-colors" />}
                                         {!isMobile && (
                                            <button
                                                onClick={() => setShowContactCard(prev => !prev)}
                                                className={cn(
                                                    "p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold border",
                                                    showContactCard ? "border-primary bg-primary/5 text-primary hover:text-primary hover:bg-primary/10" : "border-slate-200 bg-white"
                                                )}
                                                title="Toggle Contact Card"
                                            >
                                                <User className="w-3.5 h-3.5" />
                                                <span>Contact Info</span>
                                            </button>
                                        )}
                                        {isMobile && (
                                            <button
                                                onClick={() => setShowMobileContactSheet(true)}
                                                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all cursor-pointer border border-slate-200 bg-white"
                                                title="Contact Info"
                                            >
                                                <User className="w-4 h-4" />
                                            </button>
                                        )}
                                        <MoreVertical className="w-5 h-5 cursor-pointer hover:text-slate-700 transition-colors" />
                                    </div>
                                </div>

                                {/* Messages Container */}
                                <div
                                    ref={scrollRef}
                                    onScroll={(e) => {
                                        if (e.currentTarget.scrollTop === 0) loadMoreMessages();
                                    }}
                                    className="flex-1 overflow-y-auto px-4 md:px-8 py-6 flex flex-col z-0 relative scroll-smooth custom-scrollbar"
                                >
                                    {loadingMessages ? (
                                        <div className="flex justify-center mt-10">
                                            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                        </div>
                                    ) : (
                                        <>
                                            {loadingMore && <div className="flex justify-center py-2"><div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>}
                                            {Object.entries(groupMessagesByDate(messages)).map(([date, dateMsgs]) => (
                                                <React.Fragment key={date}>
                                                    <div className="flex justify-center my-6 sticky top-2 z-10">
                                                        <span className="px-3.5 py-1.5 bg-white/90 backdrop-blur-xs border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-500 uppercase tracking-wider shadow-2xs">
                                                            {getDateLabel(date)}
                                                        </span>
                                                    </div>
                                                    {dateMsgs.map((msg: any) => (
                                                        <div
                                                            key={msg.tempId || msg.id}
                                                            className={cn(
                                                                "max-w-[85%] md:max-w-[70%] mb-4 flex flex-col relative group animate-in fade-in slide-in-from-bottom-2 duration-300",
                                                                msg.isFromAdmin ? "self-end items-end" : "self-start items-start"
                                                            )}
                                                            onDoubleClick={() => setReplyingTo(msg)}
                                                        >
                                                            <div className={cn(
                                                                "p-4 shadow-xs relative",
                                                                msg.isFromAdmin
                                                                    ? "bg-primary text-white rounded-2xl rounded-tr-xs"
                                                                    : "bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-xs"
                                                            )}>
                                                                {msg.replyTo && (
                                                                    <div className={cn(
                                                                        "mb-2.5 p-2.5 rounded-xl text-xs font-semibold border-l-4 cursor-pointer",
                                                                        msg.isFromAdmin
                                                                            ? "bg-white/20 border-white text-white/90"
                                                                            : "bg-slate-50 border-primary text-slate-600"
                                                                    )}>
                                                                        <div className="font-bold mb-0.5">{msg.replyTo.isFromAdmin ? 'Admin' : 'Visitor'}</div>
                                                                        <div className="line-clamp-2 opacity-90">
                                                                            {msg.replyTo.type === MessageType.AUDIO ? '🎤 Voice Message' : msg.replyTo.type === MessageType.IMAGE ? '📷 Image' : msg.replyTo.content}
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                <LinkPreview preview={msg.linkPreview} />

                                                                <div className="text-xs font-semibold leading-relaxed whitespace-pre-wrap break-words">
                                                                    {msg.type === MessageType.AUDIO ? (
                                                                        <AudioPlayer src={msg.content} isFromAdmin={msg.isFromAdmin} />
                                                                    ) : msg.type === MessageType.IMAGE ? (
                                                                        <img src={msg.content} alt="Attachment" className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.content, '_blank')} />
                                                                    ) : (
                                                                        renderMessageContent(msg)
                                                                    )}
                                                                </div>

                                                                <div className={cn(
                                                                    "flex items-center justify-end gap-1 mt-1.5 text-[11px] font-semibold",
                                                                    msg.isFromAdmin ? "text-white/70" : "text-slate-400"
                                                                )}>
                                                                    <span>{format(new Date(msg.createdAt), 'h:mm a')}</span>
                                                                    {msg.isFromAdmin && (
                                                                        <CheckCheck className={cn("w-3.5 h-3.5 shrink-0", msg.isRead ? (msg.isFromAdmin ? "text-white" : "text-blue-500") : "opacity-50")} />
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Hover Reply Button */}
                                                            <button
                                                                onClick={() => setReplyingTo(msg)}
                                                                className={cn(
                                                                    "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-slate-400 hover:text-primary cursor-pointer",
                                                                    msg.isFromAdmin ? "-left-10" : "-right-10"
                                                                )}
                                                            >
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </>
                                    )}
                                    {isVisitorTyping && (
                                        <div className="self-start bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-none p-3.5 shadow-2xs text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 ml-4 mb-2">
                                            <span className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </span>
                                            <span>Visitor is typing...</span>
                                        </div>
                                    )}
                                </div>

                                {/* Chat Input */}
                                <div className="bg-white border-t border-slate-200 z-20 shrink-0">
                                    {/* Reply / Preview Bar */}
                                    {(replyingTo || linkPreview) && (
                                        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-start gap-3">
                                            <div className="flex-1 min-w-0 border-l-4 border-primary pl-3.5">
                                                {replyingTo && (
                                                    <>
                                                        <div className="text-xs font-bold text-primary mb-0.5">Replying to {replyingTo.isFromAdmin ? 'Admin' : 'Visitor'}</div>
                                                        <div className="text-xs font-semibold text-slate-500 truncate">{replyingTo.type === MessageType.AUDIO ? '🎤 Voice Message' : replyingTo.type === MessageType.IMAGE ? '📷 Image' : replyingTo.content}</div>
                                                    </>
                                                )}
                                                {linkPreview && (
                                                    <>
                                                        <div className="text-xs font-bold text-primary mb-0.5">{linkPreview.title}</div>
                                                        <div className="text-xs font-semibold text-slate-500 truncate">{linkPreview.description}</div>
                                                    </>
                                                )}
                                            </div>
                                            <button onClick={() => { setReplyingTo(null); setLinkPreview(null); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

                                    <div className="px-4 py-3 md:px-6 md:py-4 flex items-end gap-3 md:gap-4">
                                        <div className="flex gap-2 pb-2 text-slate-400 shrink-0">
                                            <button onClick={() => setShowEmoji(!showEmoji)} className={cn("hover:text-primary transition-colors cursor-pointer", showEmoji && "text-primary")}>
                                                <Smile className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => fileInputRef.current?.click()} className="hover:text-primary transition-colors cursor-pointer">
                                                <Camera className="w-5 h-5" />
                                            </button>
                                            {!isMobile && (
                                                <button className="hover:text-primary transition-colors cursor-pointer">
                                                    <Paperclip className="w-5 h-5" />
                                                </button>
                                            )}
                                            <input 
                                                type="file" 
                                                ref={fileInputRef} 
                                                onChange={handleImageUpload} 
                                                accept="image/*" 
                                                capture="environment" 
                                                className="hidden" 
                                            />
                                        </div>

                                        {showEmoji && (
                                            <div className={cn("absolute z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200", isMobile ? "bottom-16 left-0 right-0 mx-2" : "bottom-20 left-4")}>
                                                <EmojiPicker theme={EmojiTheme.LIGHT} onEmojiClick={onEmojiClick} />
                                            </div>
                                        )}

                                        {isRecording ? (
                                            <div className="flex-1 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-red-500 font-bold text-xs">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                                                    <span>Recording: {formatTime(recordingTime)}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={cancelRecording} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-full transition-all cursor-pointer shadow-2xs">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={sendVoiceMessage} className="p-2 text-white bg-primary hover:bg-primary-hover rounded-full transition-all shadow-xs cursor-pointer">
                                                        <Send className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <form onSubmit={handleSend} className="flex-1 flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-white transition-all shadow-2xs">
                                                <textarea
                                                    ref={chatInputRef}
                                                    className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-xs font-semibold text-slate-700 py-2.5 px-3.5 custom-scrollbar max-h-32"
                                                    rows={1}
                                                    placeholder="Type your message..."
                                                    value={inputText}
                                                    onChange={e => {
                                                        setInputText(e.target.value);
                                                        handleTyping();
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = e.target.scrollHeight + 'px';
                                                    }}
                                                    onFocus={() => setShowEmoji(false)}
                                                    onKeyDown={handleKeyDown}
                                                />
                                                {inputText.trim() ? (
                                                    <button type="submit" className="w-10 h-10 shrink-0 bg-primary hover:bg-primary-hover text-white rounded-xl flex items-center justify-center transition-all shadow-2xs mb-0.5 mr-0.5 cursor-pointer">
                                                        <Send className="w-4 h-4 ml-0.5" />
                                                    </button>
                                                ) : (
                                                    <button type="button" onClick={startRecording} className="w-10 h-10 shrink-0 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center transition-all mb-0.5 mr-0.5 cursor-pointer shadow-2xs">
                                                        <Mic className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </form>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f8fafc] z-10">
                                <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center mx-auto mb-6">
                                    <MessageSquare className="w-8 h-8 text-primary" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 mb-2 m-0 tracking-tight">Select a Conversation</h2>
                                <p className="text-xs font-semibold text-slate-500 max-w-sm mb-8 m-0 leading-relaxed">
                                    Choose a chat from the sidebar to start responding to leads, sending messages, or recording voice notes.
                                </p>
                                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 shadow-2xs">
                                    <CheckCheck className="w-3.5 h-3.5 shrink-0" />
                                    <span>Real-time syncing enabled</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right-side Contact Card Panel */}
                    {/* Mobile Contact Info Bottom Sheet */}
                    {isMobile && showMobileContactSheet && selectedConv && (
                        <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={() => setShowMobileContactSheet(false)}>
                            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" />
                            <div
                                className="relative bg-white rounded-t-3xl max-h-[80dvh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300"
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Handle */}
                                <div className="flex justify-center pt-3 pb-2 shrink-0">
                                    <div className="w-10 h-1 bg-slate-200 rounded-full" />
                                </div>
                                {/* Sheet Header */}
                                <div className="px-6 pb-4 flex items-center justify-between shrink-0 border-b border-slate-100">
                                    <h3 className="text-sm font-bold text-slate-800 m-0">Contact Details</h3>
                                    <button
                                        onClick={() => setShowMobileContactSheet(false)}
                                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                {/* Sheet Body - same content as the desktop panel */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                                    <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
                                        <div className="relative mb-3 group">
                                            <img
                                                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${selectedConv.visitorToken}`}
                                                className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm p-1.5"
                                                alt="Visitor avatar"
                                            />
                                            <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white animate-pulse" />
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900 m-0 line-clamp-1">
                                            {selectedConv.visitorName ? parseVisitorName(selectedConv.visitorName).cleanName : `User ${selectedConv.visitorToken.substring(0, 8)}`}
                                        </h4>
                                        <span className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider select-all">
                                            Token: {selectedConv.visitorToken.substring(0, 8)}
                                        </span>
                                    </div>

                                    {selectedConv.visitorName && parseVisitorName(selectedConv.visitorName).tag && (
                                        <div className="p-3.5 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                                                <Tag className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <span className="block text-[10px] font-bold text-primary/70 uppercase tracking-wider">Lead Source Tag</span>
                                                <span className="block text-xs font-extrabold text-slate-800 mt-0.5 truncate uppercase">
                                                    {parseVisitorName(selectedConv.visitorName).tag}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Contact Methods</div>
                                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4 text-slate-400" />
                                                    <span className="text-xs font-bold text-slate-700">{selectedConv.visitorPhone || 'N/A'}</span>
                                                </div>
                                                {selectedConv.visitorPhone && selectedConv.visitorPhone !== 'N/A' && (
                                                    <button
                                                        onClick={() => copyToClipboard(selectedConv.visitorPhone)}
                                                        className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
                                                    >
                                                        {copiedPhone ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                    </button>
                                                )}
                                            </div>
                                            {selectedConv.visitorPhone && selectedConv.visitorPhone !== 'N/A' && (
                                                <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-200">
                                                    <a href={`tel:${selectedConv.visitorPhone}`} className="py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs">
                                                        <Phone className="w-3.5 h-3.5 text-primary" /> Call
                                                    </a>
                                                    <a
                                                        href={`https://wa.me/${selectedConv.visitorPhone.replace(/\D/g, '')}`}
                                                        target="_blank" rel="noopener noreferrer"
                                                        className="py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                                                    >
                                                        WhatsApp
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-2">
                                        <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tracking</div>
                                        <div className="divide-y divide-slate-100 text-xs">
                                            <div className="py-2.5 flex items-center justify-between gap-4">
                                                <span className="text-slate-500 font-semibold flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Source Link</span>
                                                <span className="font-bold text-slate-800 text-right truncate max-w-[140px]">{selectedConv.linkTitle}</span>
                                            </div>
                                            <div className="py-2.5 flex items-center justify-between gap-4">
                                                <span className="text-slate-500 font-semibold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Connected</span>
                                                <span className="font-bold text-slate-800 text-right">
                                                    {selectedConv.createdAt ? format(new Date(selectedConv.createdAt), 'MMM d, h:mm a') : 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Suggestion */}
                                    <div className="space-y-4">
                                        <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                                            <span>AI Assistance</span>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={fetchingSuggestion}
                                            onClick={getAiSuggestion}
                                            className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-65"
                                        >
                                            {fetchingSuggestion ? (
                                                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /><span>Analyzing...</span></>
                                            ) : (
                                                <><Sparkles className="w-3.5 h-3.5 text-primary" /><span>Suggest AI Reply</span></>
                                            )}
                                        </button>
                                        {aiSuggestion && (
                                            <div className="p-3.5 bg-white border border-slate-200/80 rounded-xl">
                                                <p className="text-xs font-medium text-slate-700 m-0 leading-relaxed select-all">{aiSuggestion}</p>
                                                <button
                                                    type="button"
                                                    onClick={() => { setInputText(aiSuggestion); setShowMobileContactSheet(false); }}
                                                    className="mt-2 text-[10px] font-bold text-primary hover:text-primary-hover transition-colors cursor-pointer"
                                                >
                                                    Use this reply
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedId && showContactCard && !isMobile && selectedConv && (
                        <div className="w-[320px] shrink-0 border-l border-slate-200 bg-white flex flex-col h-full animate-in slide-in-from-right duration-300 z-10">
                            {/* Panel Header */}
                            <div className="h-[72px] px-6 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
                                <h3 className="text-sm font-bold text-slate-800 m-0">Contact Details</h3>
                                <button
                                    onClick={() => setShowContactCard(false)}
                                    className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Panel Body */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                                {/* Avatar and Name */}
                                <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
                                    <div className="relative mb-3 group">
                                        <img
                                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${selectedConv.visitorToken}`}
                                            className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm p-1.5 transition-transform duration-300 group-hover:scale-105"
                                            alt="Visitor avatar"
                                        />
                                        <span className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white animate-pulse" />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900 m-0 line-clamp-1">
                                        {selectedConv.visitorName ? parseVisitorName(selectedConv.visitorName).cleanName : `User ${selectedConv.visitorToken.substring(0, 8)}`}
                                    </h4>
                                    <span className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider select-all">
                                        Token: {selectedConv.visitorToken.substring(0, 8)}
                                    </span>
                                </div>

                                {/* Form Source Tag (if available) */}
                                {selectedConv.visitorName && parseVisitorName(selectedConv.visitorName).tag && (
                                    <div className="p-3.5 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
                                            <Tag className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="block text-[10px] font-bold text-primary/70 uppercase tracking-wider">Leads Source Tag</span>
                                            <span className="block text-xs font-extrabold text-slate-800 mt-0.5 truncate uppercase">
                                                {parseVisitorName(selectedConv.visitorName).tag}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Contact Details */}
                                <div className="space-y-4">
                                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Contact Methods</div>
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-slate-400" />
                                                <span className="text-xs font-bold text-slate-700">{selectedConv.visitorPhone || 'N/A'}</span>
                                            </div>
                                            {selectedConv.visitorPhone && selectedConv.visitorPhone !== 'N/A' && (
                                                <button
                                                    onClick={() => copyToClipboard(selectedConv.visitorPhone)}
                                                    className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer relative"
                                                    title="Copy phone number"
                                                >
                                                    {copiedPhone ? (
                                                        <Check className="w-3.5 h-3.5 text-green-600 animate-bounce" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        {selectedConv.visitorPhone && selectedConv.visitorPhone !== 'N/A' && (
                                            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-200">
                                                <a
                                                    href={`tel:${selectedConv.visitorPhone}`}
                                                    className="py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs text-center"
                                                >
                                                    <Phone className="w-3.5 h-3.5 text-primary" /> Call Client
                                                </a>
                                                <a
                                                    href={`https://wa.me/${selectedConv.visitorPhone.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="py-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs text-center"
                                                >
                                                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.859 0c3.166.001 6.141 1.233 8.375 3.469 2.235 2.237 3.465 5.212 3.462 8.377-.003 6.535-5.328 11.86-11.859 11.86-2.004-.001-3.973-.51-5.716-1.48L0 24zm6.59-4.846c1.6.95 3.1 1.45 4.6 1.452 5.4 0 9.8-4.4 9.803-9.8.002-2.6-1.01-5.07-2.85-6.91-1.85-1.83-4.3-2.84-6.91-2.84-5.4 0-9.8 4.4-9.8 9.8-.001 1.7.46 3.3 1.35 4.74l-.99 3.6 3.7-.97zm10.4-3.5c-.3-.15-1.7-.85-2.0-.95-.3-.1-.5-.15-.7.15-.2.3-.75.95-.9.1-.15-.15-.3-.45-.3-.45 0-1.7-.6-3.2-1.95-1.16-1-1.95-2.3-2.2-2.7-.2-.3-.02-.45.13-.6.13-.13.3-.35.45-.5.15-.15.2-.25.3-.45.1-.2.05-.4-.02-.55-.07-.15-.7-1.7-.95-2.3-.3-.6-.6-.5-.8-.5-.2 0-.4 0-.6 0-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7 0 1.6 1.2 3.1 1.35 3.3.15.2 2.35 3.6 5.7 5.03.8.34 1.43.55 1.9.7.8.25 1.5.2 2.1.1.65-.1 1.7-.7 2.0-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3z" /></svg> WhatsApp
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Tracking & Metadata */}
                                <div className="space-y-4 pt-2">
                                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tracking Details</div>
                                    <div className="divide-y divide-slate-100 text-xs">
                                        <div className="py-2.5 flex items-center justify-between gap-4">
                                            <span className="text-slate-500 font-semibold flex items-center gap-1.5"><ExternalLink className="w-3.5 h-3.5" /> Source Link</span>
                                            <span className="font-bold text-slate-800 text-right truncate max-w-[140px] select-all" title={selectedConv.linkTitle}>
                                                {selectedConv.linkTitle}
                                            </span>
                                        </div>
                                        <div className="py-2.5 flex items-center justify-between gap-4">
                                            <span className="text-slate-500 font-semibold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> First Connected</span>
                                            <span className="font-bold text-slate-800 text-right" title={selectedConv.createdAt}>
                                                {selectedConv.createdAt ? format(new Date(selectedConv.createdAt), 'MMM d, yyyy h:mm a') : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="py-2.5 flex items-center justify-between gap-4">
                                            <span className="text-slate-500 font-semibold flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Link Route</span>
                                            <a
                                                href={`/chat/${selectedConv.linkSlug}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center font-bold text-slate-600 transition-colors flex items-center justify-center gap-1.5"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                <span>/{selectedConv.linkSlug}</span>
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* AI Assistance Section */}
                                <div className="space-y-4">
                                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                                        <span>AI Insights & Assistance</span>
                                    </div>

                                    <div className="p-4 bg-gradient-to-br from-indigo-50/40 to-primary/5 border border-indigo-100 rounded-2xl space-y-4">
                                        {/* Auto-Summary */}
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Conversation Summary</div>
                                            {loadingLead ? (
                                                <div className="h-4 bg-slate-100 animate-pulse rounded w-2/3" />
                                            ) : activeLead?.aiSummary ? (
                                                <p className="text-xs font-medium text-slate-600 m-0 leading-relaxed">
                                                    {activeLead.aiSummary}
                                                </p>
                                            ) : (
                                                <p className="text-xs font-semibold text-slate-400 italic m-0">
                                                    No AI summary available yet. Send a message to trigger summary generation.
                                                </p>
                                            )}
                                        </div>

                                        {/* Sentiment & Intent tags */}
                                        {!loadingLead && activeLead?.aiInsights && (
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className={cn(
                                                    "px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider",
                                                    activeLead.aiInsights.sentiment === 'positive' ? "bg-emerald-50 text-emerald-700" :
                                                        activeLead.aiInsights.sentiment === 'negative' ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"
                                                )}>
                                                    Sentiment: {activeLead.aiInsights.sentiment}
                                                </span>
                                                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[9px] font-bold uppercase tracking-wider">
                                                    Intent: {activeLead.aiInsights.intent}
                                                </span>
                                                {activeLead.aiInsights.spam && (
                                                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-[9px] font-bold uppercase tracking-wider animate-pulse">
                                                        SPAM DETECTED
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* Suggest Reply Button */}
                                        <div className="pt-2 border-t border-slate-100">
                                            <button
                                                type="button"
                                                disabled={fetchingSuggestion}
                                                onClick={getAiSuggestion}
                                                className="w-full py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-65"
                                            >
                                                {fetchingSuggestion ? (
                                                    <>
                                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                                        <span>Analyzing history...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                                                        <span>Suggest AI Reply</span>
                                                    </>
                                                )}
                                            </button>

                                            {aiSuggestion && (
                                                <div className="mt-3 p-3.5 bg-white border border-slate-200/80 rounded-xl relative group/suggest">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Suggested Reply</div>
                                                    <p className="text-xs font-medium text-slate-700 m-0 leading-relaxed select-all">
                                                        {aiSuggestion}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setInputText(aiSuggestion); }}
                                                        className="mt-2 text-[10px] font-bold text-primary hover:text-primary-hover transition-colors cursor-pointer"
                                                    >
                                                        Use this reply
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LiveChat;
