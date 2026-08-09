import React, { useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Edit2, Trash2, LogOut, Send, Link2, ExternalLink, Hash, MessagesSquare } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ChatAreaProps {
    selectedGroupId: string | null;
    selectedGroup: any;
    messages: any[];
    loadingMessages: boolean;
    isAdmin: boolean;
    user: any;
    inputText: string;
    setInputText: (text: string) => void;
    onClearSelection: () => void;
    onEditGroup: (group: any) => void;
    onDeleteGroup: (id: string) => void;
    onLeaveGroup: (id: string) => void;
    onOpenLinkPicker: () => void;
    handleSend: (e?: React.FormEvent) => void;
    navigate: (path: string) => void;
    LINK_TYPE_ICONS: Record<string, React.ReactNode>;
}

const ChatArea: React.FC<ChatAreaProps> = ({
    selectedGroupId,
    selectedGroup,
    messages,
    loadingMessages,
    isAdmin,
    user,
    inputText,
    setInputText,
    onClearSelection,
    onEditGroup,
    onDeleteGroup,
    onLeaveGroup,
    onOpenLinkPicker,
    handleSend,
    navigate,
    LINK_TYPE_ICONS
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (messages.length) {
            setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 50);
        }
    }, [messages.length, selectedGroupId]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter') {
            if (e.shiftKey || e.metaKey || e.ctrlKey) {
                e.preventDefault();
                const target = e.currentTarget;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const value = target.value;
                const newValue = value.substring(0, start) + '\n' + value.substring(end);
                setInputText(newValue);
                
                target.style.height = 'auto';
                setTimeout(() => {
                    target.selectionStart = target.selectionEnd = start + 1;
                    target.style.height = target.scrollHeight + 'px';
                }, 0);
            } else {
                e.preventDefault();
                handleSend(e as unknown as React.FormEvent);
                if (chatInputRef.current) {
                    chatInputRef.current.style.height = 'auto';
                }
            }
        }
    };

    return (
        <div className={cn('flex-1 flex flex-col min-w-0', !selectedGroupId && 'hidden md:flex')}>
            {!selectedGroupId ? (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                        <MessagesSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Select a group to start chatting</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="px-4 py-3 border-b flex items-center gap-3 chat-area-header">
                        <button
                            className="md:hidden p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                            onClick={onClearSelection}
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-500 shrink-0 overflow-hidden">
                            {selectedGroup?.avatarUrl || selectedGroup?.id ? (
                                <img src={selectedGroup.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${selectedGroup.id}`} alt={selectedGroup.name} className="w-full h-full object-cover" />
                            ) : (
                                <Hash className="w-5 h-5" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-900 m-0 truncate">{selectedGroup?.name}</h3>
                            <p className="text-xs text-slate-500 m-0">{selectedGroup?.memberCount} members</p>
                        </div>
                        {isAdmin ? (
                            <div className="flex gap-1 shrink-0">
                                <button onClick={() => onEditGroup(selectedGroup)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer" title="Edit">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => onDeleteGroup(selectedGroupId)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 cursor-pointer" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-1 shrink-0">
                                <button onClick={() => onLeaveGroup(selectedGroupId)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer" title="Leave Group">
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 chat-area-feed">
                        {loadingMessages ? (
                            <div className="text-center text-slate-400 text-sm py-8">Loading messages...</div>
                        ) : messages.length === 0 ? (
                            <div className="text-center text-slate-400 text-sm py-8">No messages yet. Say hello!</div>
                        ) : (
                            messages.map((msg: any) => {
                                const own = msg.isOwn || msg.senderId === user?.id;
                                return (
                                    <div key={msg.id} className={cn('flex', own ? 'justify-end' : 'justify-start')}>
                                        <div className={cn(
                                            'max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm',
                                            own ? 'bg-primary text-white rounded-br-md' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 text-slate-800 dark:text-slate-100 rounded-bl-md'
                                        )}>
                                            {!own && (
                                                <div className="text-[10px] font-semibold opacity-70 mb-1">
                                                    {msg.sender?.name || msg.sender?.username}
                                                </div>
                                            )}
                                            {msg.systemLink && (
                                                <button
                                                    onClick={() => navigate(msg.systemLink.path)}
                                                    className={cn(
                                                        'w-full text-left p-3 rounded-xl border flex items-start gap-3 mb-2 transition-colors cursor-pointer',
                                                        own ? 'bg-white/15 border-white/30 hover:bg-white/25' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850'
                                                    )}
                                                >
                                                    <span className={cn('mt-0.5', own ? 'text-white' : 'text-primary')}>
                                                        {LINK_TYPE_ICONS[msg.systemLink.type] || <Link2 className="w-4 h-4" />}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-sm truncate">{msg.systemLink.label}</div>
                                                        <div className={cn('text-xs truncate', own ? 'text-white/70' : 'text-slate-500')}>
                                                            Open in {msg.systemLink.type}
                                                        </div>
                                                    </div>
                                                    <ExternalLink className={cn('w-4 h-4 shrink-0', own ? 'text-white/80' : 'text-slate-400')} />
                                                </button>
                                            )}
                                            {msg.content && !msg.systemLink && (
                                                <p className="m-0 text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                            )}
                                            {msg.content && msg.systemLink && msg.content !== `Shared: ${msg.systemLink.label}` && (
                                                <p className="m-0 text-sm whitespace-pre-wrap break-words mt-1">{msg.content}</p>
                                            )}
                                            <div className={cn('text-[10px] mt-1', own ? 'text-white/60 text-right' : 'text-slate-400')}>
                                                {format(new Date(msg.createdAt), 'h:mm a')}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <form 
                        onSubmit={(e) => {
                            handleSend(e);
                            if (chatInputRef.current) {
                                chatInputRef.current.style.height = 'auto';
                            }
                        }} 
                        className="p-3 border-t flex gap-2 items-end chat-area-footer"
                    >
                        <button
                            type="button"
                            onClick={onOpenLinkPicker}
                            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-primary hover:border-primary/30 cursor-pointer shrink-0"
                            title="Link from system"
                        >
                            <Link2 className="w-5 h-5" />
                        </button>
                        <textarea
                            ref={chatInputRef}
                            value={inputText}
                            onChange={(e) => {
                                setInputText(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            rows={1}
                            className="flex-1 bg-transparent border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none max-h-32 custom-scrollbar"
                        />
                        <button
                            type="submit"
                            disabled={!inputText.trim()}
                            className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-40 cursor-pointer shrink-0"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </>
            )}
        </div>
    );
};

export default ChatArea;
