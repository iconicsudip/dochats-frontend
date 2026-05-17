import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { AudioPlayer } from '../components/AudioPlayer';
import { MessageType } from '../enums';
import { 
    Send, Smile, Paperclip, MoreVertical, Search, MessageSquare, 
    Check, CheckCheck, Mic, Filter, X, ArrowLeft 
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

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
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { isRecording, recordingTime, formatTime, startRecording, stopRecording, cancelRecording } = useAudioRecorder();

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    useEffect(() => {
        if (!selectedId) {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            return;
        }

        pollIntervalRef.current = setInterval(() => {
            fetchMessages(true);
        }, 5000);

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [selectedId]);

    useEffect(() => {
        if (selectedId) {
            if (messagesCache.current[selectedId]) {
                setMessages(messagesCache.current[selectedId]);
            } else {
                setMessages([]);
            }
            fetchMessages(true);
            setLinkPreview(null);
        } else {
            setMessages([]);
        }
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
                apiClient.post('/public/preview', { url })
                    .then(res => setLinkPreview(res.data))
                    .catch(() => setLinkPreview(null));
            }, 1000);
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
            const res = await apiClient.post('/messages', {
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
            "flex overflow-hidden bg-white border-slate-200",
            isMobile ? "h-[calc(100vh-85px)] -m-5" : "h-[calc(100vh-120px)] border rounded-2xl shadow-sm"
        )}>
            {/* Sidebar List */}
            {(!isMobile || !selectedId) && (
                <div className={cn(
                    "flex flex-col bg-slate-50 border-slate-200 z-20 font-sans text-slate-800",
                    isMobile ? "w-full absolute inset-0" : "w-[360px] border-r"
                )}>
                    {/* Header */}
                    <div className="h-[72px] px-5 flex items-center justify-between border-b border-slate-200 bg-white shrink-0">
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
                    <div className="p-4 flex flex-col gap-3 shrink-0 border-b border-slate-200 bg-white">
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
                    </div>

                    {/* Conversations List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">
                        {isLoadingConvs ? (
                            <div className="p-8 flex justify-center">
                                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {filteredConversations.map((conv: any) => (
                                    <div
                                        key={conv.id}
                                        onClick={() => setSelectedId(conv.id)}
                                        className={cn(
                                            "flex items-center gap-3 p-4 cursor-pointer transition-all border-l-4",
                                            selectedId === conv.id 
                                                ? "bg-white border-primary shadow-xs" 
                                                : "bg-transparent border-transparent hover:bg-slate-100"
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
                                                <div className={cn("text-xs truncate mr-2", conv.unreadCount > 0 ? "font-extrabold text-slate-900" : "font-bold text-slate-700")}>
                                                    {conv.visitorName ? conv.visitorName : `User ${conv.visitorToken.substring(0, 8)}`}
                                                </div>
                                                <div className={cn("text-[11px]", conv.unreadCount > 0 ? "font-bold text-primary" : "font-semibold text-slate-400")}>
                                                    {format(new Date(conv.lastMessageAt), 'h:mm a')}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {conv.isFromAdmin && <CheckCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                                                <div className={cn("text-xs truncate", conv.unreadCount > 0 ? "font-bold text-slate-800" : "font-semibold text-slate-500")}>
                                                    {conv.lastMessageType === MessageType.AUDIO ? (
                                                        <span className="flex items-center gap-1"><Mic className="w-3 h-3" /> Voice Message</span>
                                                    ) : (
                                                        conv.lastMessage || 'No messages yet'
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

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
                <div className="flex-1 flex flex-col relative bg-[#f8fafc] font-sans text-slate-800">
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
                                        <div className="text-xs font-bold text-slate-900 truncate">
                                            {selectedConv?.visitorName ? selectedConv.visitorName : `User ${selectedConv?.visitorToken.substring(0, 8)}`}
                                        </div>
                                        <div className="text-[11px] font-semibold text-green-500 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0"></span>
                                            <span>Online</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-slate-400 shrink-0">
                                    {!isMobile && <Search className="w-5 h-5 cursor-pointer hover:text-primary transition-colors" />}
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
                                                                        {msg.replyTo.type === MessageType.AUDIO ? '🎤 Voice Message' : msg.replyTo.content}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            <LinkPreview preview={msg.linkPreview} />
                                                            
                                                            <div className="text-xs font-semibold leading-relaxed whitespace-pre-wrap break-words">
                                                                {msg.type === MessageType.AUDIO ? (
                                                                    <AudioPlayer src={msg.content} isFromAdmin={msg.isFromAdmin} />
                                                                ) : (
                                                                    formatMessageText(msg.content)
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
                                                    <div className="text-xs font-semibold text-slate-500 truncate">{replyingTo.type === MessageType.AUDIO ? '🎤 Voice Message' : replyingTo.content}</div>
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
                                        {!isMobile && (
                                            <button className="hover:text-primary transition-colors cursor-pointer">
                                                <Paperclip className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>

                                    {showEmoji && (
                                        <div className="absolute bottom-20 left-4 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-200">
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
                                                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-xs font-semibold text-slate-700 py-2.5 px-3.5 custom-scrollbar max-h-32"
                                                rows={1}
                                                placeholder="Type your message..."
                                                value={inputText}
                                                onChange={e => {
                                                    setInputText(e.target.value);
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
            )}
        </div>
    );
};

export default LiveChat;
