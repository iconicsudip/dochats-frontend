import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import apiClient from '../api/apiClient';
import { realtimeApi } from '../api/realtime';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../enums';
import { User, Calendar, FileText, Link2, X } from 'lucide-react';
import ChatGroupList from '../components/chat-groups/ChatGroupList';
import ChatArea from '../components/chat-groups/ChatArea';
import CreateGroupModal from '../components/chat-groups/CreateGroupModal';
import LinkPickerModal from '../components/chat-groups/LinkPickerModal';
import { cn } from '../utils/cn';



type SystemLink = { type: string; id: string; label: string; path: string; subtitle?: string };

const LINK_TYPE_ICONS: Record<string, React.ReactNode> = {
    contact: <User className="w-4 h-4" />,
    booking: <Calendar className="w-4 h-4" />,
    form: <FileText className="w-4 h-4" />,
    link: <Link2 className="w-4 h-4" />
};

const ChatGroups: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isAdmin = user?.role === Role.ADMIN;

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [inputText, setInputText] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showLinkPicker, setShowLinkPicker] = useState(false);
    const [linkSearch, setLinkSearch] = useState('');
    const [debouncedLinkSearch, setDebouncedLinkSearch] = useState('');
    const [groupName, setGroupName] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [editingGroup, setEditingGroup] = useState<any | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Custom Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const { data: groups = [], isLoading } = useQuery({
        queryKey: ['chat-groups'],
        queryFn: () => apiClient.get('/chat-groups').then((r) => r.data),
    });

    const selectedGroup = groups.find((g: any) => g.id === selectedGroupId);

    const { data: subUsers = [] } = useQuery({
        queryKey: ['sub-users'],
        queryFn: () => apiClient.get('/auth/sub-users?limit=100').then((r) => r.data?.data || r.data || []),
        enabled: !!isAdmin
    });

    const { data: messages = [], isLoading: loadingMessages } = useQuery({
        queryKey: ['chat-messages', selectedGroupId],
        queryFn: () => apiClient.get(`/chat-groups/${selectedGroupId}/messages`).then((r) => r.data),
        enabled: !!selectedGroupId,
    });

    useEffect(() => {
        if (messages.length) {
            setTimeout(() => {
                if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }, 50);
        }
    }, [messages.length, selectedGroupId]);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedLinkSearch(linkSearch), 300);
        return () => clearTimeout(t);
    }, [linkSearch]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const sseUrl = realtimeApi.getSSERealtimeUrl(token);

        console.log('[SSE] ChatGroups connecting to:', sseUrl);
        const es = new EventSource(sseUrl);

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[SSE] ChatGroups received event:', data);

                if (data.type === 'group_message') {
                    const { groupId } = data;
                    if (groupId === selectedGroupId) {
                        queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedGroupId] });
                    }
                    queryClient.invalidateQueries({ queryKey: ['chat-groups'] });
                }
            } catch (err) {
                console.error('[SSE] ChatGroups parse error:', err);
            }
        };

        es.onerror = (err) => {
            console.error('[SSE] ChatGroups connection error:', err);
        };

        return () => {
            es.close();
        };
    }, [selectedGroupId, queryClient]);


    const { data: linkable } = useQuery({
        queryKey: ['chat-linkable', debouncedLinkSearch],
        queryFn: () => apiClient.get(`/chat-groups/linkable${debouncedLinkSearch ? `?q=${encodeURIComponent(debouncedLinkSearch)}` : ''}`).then((r) => r.data),
        enabled: showLinkPicker
    });

    const sendMutation = useMutation({
        mutationFn: (data: any) => apiClient.post(`/chat-groups/${selectedGroupId}/messages`, data),
        onMutate: async (newMsg) => {
            await queryClient.cancelQueries({ queryKey: ['chat-messages', selectedGroupId] });
            const previousMessages = queryClient.getQueryData(['chat-messages', selectedGroupId]);
            const optimistic = {
                id: newMsg.tempId,
                content: newMsg.content || `Shared: ${newMsg.systemLink?.label}`,
                systemLink: newMsg.systemLink || null,
                senderId: user?.id,
                sender: { id: user?.id, name: user?.name, username: user?.username },
                createdAt: new Date().toISOString(),
                isOwn: true
            };
            queryClient.setQueryData(['chat-messages', selectedGroupId], (old: any) => [...(old || []), optimistic]);
            return { previousMessages };
        },
        onError: (err, newMsg, context) => {
            queryClient.setQueryData(['chat-messages', selectedGroupId], context?.previousMessages);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedGroupId] });
            queryClient.invalidateQueries({ queryKey: ['chat-groups'] });
        }
    });

    const createOrUpdateMutation = useMutation({
        mutationFn: (data: any) => editingGroup
            ? apiClient.put(`/chat-groups/${editingGroup.id}`, data)
            : apiClient.post('/chat-groups', data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['chat-groups'] });
            showToast(editingGroup ? 'Group updated successfully!' : 'Group created successfully!', 'success');
            setShowCreateModal(false);
            setGroupName('');
            setSelectedMemberIds([]);
            setEditingGroup(null);
        },
        onError: (e: any) => showToast(e.response?.data?.error || 'Failed to save group', 'error')
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/chat-groups/${id}`),
        onSuccess: (_, id) => {
            if (selectedGroupId === id) setSelectedGroupId(null);
            queryClient.invalidateQueries({ queryKey: ['chat-groups'] });
            showToast('Group deleted', 'success');
        },
        onError: (e: any) => showToast(e.response?.data?.error || 'Failed to delete', 'error')
    });

    const leaveMutation = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/chat-groups/${id}/leave`),
        onSuccess: (_, id) => {
            if (selectedGroupId === id) setSelectedGroupId(null);
            queryClient.invalidateQueries({ queryKey: ['chat-groups'] });
            showToast('Left group successfully', 'success');
        },
        onError: (e: any) => showToast(e.response?.data?.error || 'Failed to leave', 'error')
    });

    const handleSend = (e?: React.FormEvent, systemLink?: SystemLink) => {
        e?.preventDefault();
        if (!selectedGroupId) return;
        if (!systemLink && !inputText.trim()) return;

        const content = systemLink ? `Shared: ${systemLink.label}` : inputText.trim();
        const tempId = `temp-${Date.now()}`;

        sendMutation.mutate({
            content: systemLink ? '' : content,
            systemLink,
            tempId
        });

        if (!systemLink) setInputText('');
        setShowLinkPicker(false);
    };

    const handleCreateOrUpdate = () => {
        if (!groupName.trim()) return;
        createOrUpdateMutation.mutate({
            name: groupName,
            memberIds: selectedMemberIds
        });
    };

    const openEdit = (group: any) => {
        setEditingGroup(group);
        setGroupName(group.name);
        setSelectedMemberIds(group.members?.filter((m: any) => m.id !== user?.id).map((m: any) => m.id) || []);
        setShowCreateModal(true);
    };

    const handleDelete = (id: string) => {
        if (!isAdmin) {
            showToast('Only admins can delete chat groups.', 'error');
            return;
        }
        if (!window.confirm('Delete this chat group?')) return;
        deleteMutation.mutate(id);
    };

    const handleLeaveGroup = (id: string) => {
        if (!window.confirm('Leave this chat group?')) return;
        leaveMutation.mutate(id);
    };

    const openLinkPicker = () => {
        setShowLinkPicker(true);
    };

    const toggleMember = (id: string) => {
        setSelectedMemberIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const allLinkItems: SystemLink[] = linkable
        ? [
            ...(linkable.contacts || []),
            ...(linkable.bookings || []),
            ...(linkable.forms || []),
            ...(linkable.links || [])
        ]
        : [];

    return (
        <div className={cn(
            "min-h-[500px] flex flex-col md:flex-row chat-container overflow-hidden",
            isMobile 
                ? "h-[calc(100vh-80px)] mx-[-16px] my-[-32px]" 
                : "h-[calc(100vh-82px)] border rounded-2xl shadow-sm m-[-40px]"
        )}>
            <ChatGroupList
                groups={groups}
                isLoading={isLoading}
                selectedGroupId={selectedGroupId}
                onSelectGroup={setSelectedGroupId}
                isAdmin={isAdmin}
                onCreateClick={() => {
                    setEditingGroup(null);
                    setGroupName('');
                    setSelectedMemberIds([]);
                    setShowCreateModal(true);
                }}
            />

            <ChatArea
                selectedGroupId={selectedGroupId}
                selectedGroup={selectedGroup}
                messages={messages}
                loadingMessages={loadingMessages}
                isAdmin={isAdmin}
                user={user}
                inputText={inputText}
                setInputText={setInputText}
                onClearSelection={() => setSelectedGroupId(null)}
                onEditGroup={openEdit}
                onDeleteGroup={handleDelete}
                onLeaveGroup={handleLeaveGroup}
                onOpenLinkPicker={openLinkPicker}
                handleSend={handleSend}
                navigate={navigate}
                LINK_TYPE_ICONS={LINK_TYPE_ICONS}
            />

            <CreateGroupModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                editingGroup={editingGroup}
                groupName={groupName}
                setGroupName={setGroupName}
                selectedMemberIds={selectedMemberIds}
                subUsers={subUsers}
                toggleMember={toggleMember}
                handleCreateOrUpdate={handleCreateOrUpdate}
                isPending={createOrUpdateMutation.isPending}
            />

            <LinkPickerModal
                isOpen={showLinkPicker}
                onClose={() => setShowLinkPicker(false)}
                linkSearch={linkSearch}
                setLinkSearch={setLinkSearch}
                allLinkItems={allLinkItems}
                handleSend={handleSend}
                LINK_TYPE_ICONS={LINK_TYPE_ICONS}
            />

            {/* Custom Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[60] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-5">
                    <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : toast.type === 'error' ? 'bg-red-400' : 'bg-blue-400'}`} />
                    <span className="text-sm font-medium">{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ChatGroups;
