import React from 'react';
import { MessagesSquare, Plus, Hash, Paperclip } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ChatGroupListProps {
    groups: any[];
    isLoading: boolean;
    selectedGroupId: string | null;
    onSelectGroup: (id: string) => void;
    isAdmin: boolean;
    onCreateClick: () => void;
}

const ChatGroupList: React.FC<ChatGroupListProps> = ({
    groups,
    isLoading,
    selectedGroupId,
    onSelectGroup,
    isAdmin,
    onCreateClick
}) => {
    return (
        <div className={cn(
            'w-full md:w-80 border-r flex flex-col chat-sidebar shrink-0',
            selectedGroupId && 'hidden md:flex'
        )}>
            <div className="p-5 border-b flex items-center justify-between chat-sidebar-header">
                <div className="flex items-center gap-2.5">
                    <MessagesSquare className="w-5 h-5 text-primary" strokeWidth={2} />
                    <h2 className="font-bold text-slate-900 text-[16px] m-0">Chat Groups</h2>
                </div>
                {isAdmin && (
                    <button
                        onClick={onCreateClick}
                        className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-sm transition-all"
                        title="Create group"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="p-6 text-center text-slate-400 text-sm">Loading...</div>
                ) : groups.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-sm">
                        {isAdmin ? 'Create a group to start chatting with your team.' : 'No groups yet. Ask your admin to add you.'}
                    </div>
                ) : (
                    groups.map((g: any) => (
                        <button
                            key={g.id}
                            onClick={() => onSelectGroup(g.id)}
                            className={cn(
                                'w-full text-left px-5 py-4 border-b transition-colors cursor-pointer chat-sidebar-item group flex items-center gap-4',
                                selectedGroupId === g.id && 'chat-sidebar-item-active border-l-4 border-l-primary pl-4'
                            )}
                        >
                            <div className={cn(
                                "w-[42px] h-[42px] rounded-2xl flex items-center justify-center shrink-0 transition-colors overflow-hidden",
                                selectedGroupId === g.id 
                                    ? "bg-primary text-white shadow-sm" 
                                    : "bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary"
                            )}>
                                {g.avatarUrl || g.id ? (
                                    <img src={g.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${g.id}`} alt={g.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Hash className="w-5 h-5" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-800 text-[15px] truncate">{g.name}</div>
                                <div className="text-[14px] text-slate-500 truncate mt-1 flex items-center gap-1.5 font-medium">
                                    {g.lastMessagePreview ? (
                                        <>
                                            {g.lastMessagePreview.includes('test') && <Paperclip className="w-3.5 h-3.5" />}
                                            {g.lastMessagePreview}
                                        </>
                                    ) : (
                                        `${g.memberCount} members`
                                    )}
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};

export default ChatGroupList;
