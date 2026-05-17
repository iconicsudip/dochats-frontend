import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, X, Link as LinkIcon, Search, MoreHorizontal, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const SubUsers: React.FC = () => {
    const { user } = useAuth();
    const [subUsers, setSubUsers] = useState<any[]>([]);
    const [links, setLinks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({ username: '', password: '', links: [] as string[] });

    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    // Custom Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        fetchData(page);
    }, [page]);

    const fetchData = async (currentPage: number = 1) => {
        setLoading(true);
        try {
            const [subRes, linksRes] = await Promise.all([
                apiClient.get(`/auth/sub-users?page=${currentPage}&limit=12`),
                apiClient.get('/links?limit=500')
            ]);
            setSubUsers(subRes.data?.data || subRes.data);
            setTotal(subRes.data?.total || 0);
            setLinks(linksRes.data?.data || linksRes.data);
        } catch (e: any) {
            showToast('Failed to load sub users', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreateDrawer = () => {
        setEditingUser(null);
        setFormData({ username: '', password: '', links: [] });
        setIsDrawerOpen(true);
    };

    const handleOpenEditDrawer = (targetUser: any) => {
        setEditingUser(targetUser);
        setFormData({
            username: targetUser.username,
            password: '',
            links: targetUser.assignedLinks?.map((l: any) => l.id) || []
        });
        setIsDrawerOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingUser) {
                await apiClient.put(`/auth/sub-users/${editingUser.id}`, {
                    password: formData.password || undefined,
                    assignedLinkIds: formData.links
                });
                showToast('Team member updated successfully!', 'success');
            } else {
                await apiClient.post('/auth/sub-users', {
                    username: formData.username,
                    password: formData.password,
                    assignedLinkIds: formData.links
                });
                showToast('Team member created successfully!', 'success');
            }
            setIsDrawerOpen(false);
            setFormData({ username: '', password: '', links: [] });
            fetchData(page);
        } catch (e: any) {
            showToast(e.response?.data?.error || 'Operation failed', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, username: string) => {
        if (!window.confirm(`Are you sure you want to delete ${username}?`)) return;
        try {
            await apiClient.delete(`/auth/sub-users/${id}`);
            showToast('Team member deleted successfully', 'success');
            fetchData(page);
        } catch (e: any) {
            showToast('Failed to delete team member', 'error');
        }
    };

    const toggleLinkSelection = (linkId: string) => {
        setFormData(prev => ({
            ...prev,
            links: prev.links.includes(linkId)
                ? prev.links.filter(id => id !== linkId)
                : [...prev.links, linkId]
        }));
    };

    const limitPercent = Math.min(100, (total / (user?.subUsersLimit || 1)) * 100);

    return (
        <div className="animate-in fade-in duration-500 pb-20 font-sans text-slate-800">
            {/* Custom Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 text-white shadow-xl text-sm font-medium animate-in slide-in-from-bottom-4 duration-200">
                    <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : toast.type === 'error' ? 'bg-red-400' : 'bg-blue-400'}`} />
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white border border-slate-200/80 p-6 sm:p-8 rounded-2xl shadow-xs">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Users className="w-6 h-6 text-primary" />
                        <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight">Team Management</h1>
                    </div>
                    <p className="text-xs text-slate-500 m-0">Create and manage sub-users who can handle your chat links.</p>
                </div>

                <div className="flex flex-col md:items-end w-full md:w-auto gap-4">
                    <div className="w-full md:w-48">
                        <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                            <span>Team Limits</span>
                            <span className="text-primary font-black">{total} / {user?.subUsersLimit || 0}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                            <div 
                                className={cn("h-full rounded-full transition-all duration-500", limitPercent > 90 ? "bg-red-500" : "bg-primary")} 
                                style={{ width: `${limitPercent}%` }}
                            />
                        </div>
                    </div>
                    
                    <button
                        onClick={handleOpenCreateDrawer}
                        disabled={total >= (user?.subUsersLimit || 0)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Team Member</span>
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search members..."
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs"
                        />
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 p-2 cursor-pointer">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-1/3">Team Member</th>
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-1/2">Assigned Links</th>
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="py-20 text-center">
                                        <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
                                        <p className="text-xs font-bold text-slate-400 mt-4">Loading team...</p>
                                    </td>
                                </tr>
                            ) : subUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="py-20 text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-2xs">
                                            <Users className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-700 mb-1">No team members</h3>
                                        <p className="text-xs text-slate-500 mb-4">You haven't added any sub-users yet.</p>
                                        <button 
                                            onClick={handleOpenCreateDrawer}
                                            className="text-primary text-xs font-semibold hover:underline cursor-pointer"
                                        >
                                            Add your first member &rarr;
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                subUsers.map(member => (
                                    <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-4">
                                                {member.logoUrl ? (
                                                    <img src={member.logoUrl} alt="avatar" className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20 shadow-2xs">
                                                        {member.username.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-xs font-semibold text-slate-900 leading-tight">{member.name || member.username}</div>
                                                    <div className="text-[11px] font-normal text-slate-400 mt-0.5">@{member.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex flex-wrap gap-1.5">
                                                {member.assignedLinks?.length > 0 ? (
                                                    member.assignedLinks.map((l: any) => (
                                                        <span key={l.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                                            <LinkIcon className="w-3 h-3" />
                                                            {l.title}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60">No links assigned</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex justify-end gap-1.5">
                                                <button 
                                                    onClick={() => handleOpenEditDrawer(member)}
                                                    className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer shadow-2xs"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(member.id, member.username)}
                                                    className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center hover:bg-rose-100 transition-colors cursor-pointer shadow-2xs"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > 12 && (
                    <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                        <span className="text-xs font-semibold text-slate-500">
                            Showing {((page - 1) * 12) + 1} to {Math.min(page * 12, total)} of {total} entries
                        </span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                            >
                                Previous
                            </button>
                            <button 
                                onClick={() => setPage(p => p + 1)}
                                disabled={page * 12 >= total}
                                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Sliding Drawer Overlay (Replaced Modal) */}
            {isDrawerOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200" onClick={() => setIsDrawerOpen(false)}>
                    <div 
                        className="w-full max-w-xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center p-6 sm:p-8 border-b border-slate-100 bg-slate-50 shrink-0">
                            <h2 className="text-lg font-bold text-slate-900 m-0 tracking-tight">
                                {editingUser ? 'Edit Team Member' : 'Add Team Member'}
                            </h2>
                            <button onClick={() => setIsDrawerOpen(false)} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <form id="team-drawer-form" onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden text-xs">
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Username *</label>
                                    <input 
                                        required={!editingUser}
                                        disabled={!!editingUser}
                                        value={formData.username}
                                        onChange={e => setFormData({...formData, username: e.target.value})}
                                        type="text" 
                                        placeholder="agent_sarah" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100 disabled:text-slate-400 transition-all" 
                                    />
                                    {!!editingUser && <p className="text-[11px] font-medium text-slate-400 mt-1.5">Username cannot be changed</p>}
                                </div>
                                
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        {editingUser ? "New Password (optional)" : "Initial Password *"}
                                    </label>
                                    <input 
                                        required={!editingUser}
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                        type="password" 
                                        placeholder={editingUser ? "Leave blank to keep current" : "Minimum 6 characters"} 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                                    />
                                </div>
                                
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Assign Smart Links</label>
                                    <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50 shadow-2xs divide-y divide-slate-100">
                                        {links.map(link => (
                                            <div 
                                                key={link.id} 
                                                onClick={() => toggleLinkSelection(link.id)}
                                                className="flex items-center gap-3.5 p-3.5 cursor-pointer hover:bg-white transition-colors"
                                            >
                                                <div className={cn(
                                                    "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shadow-2xs",
                                                    formData.links.includes(link.id) ? "bg-primary border-primary text-white" : "border-slate-300 bg-white"
                                                )}>
                                                    {formData.links.includes(link.id) && <CheckCircle className="w-3.5 h-3.5" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold text-slate-900 leading-tight">{link.title}</span>
                                                    <span className="text-[11px] font-normal text-slate-400 mt-0.5">/{link.slug}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {links.length === 0 && (
                                            <div className="p-8 text-center text-xs font-medium text-slate-400">No links available to assign.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                                <button 
                                    type="button" 
                                    onClick={() => setIsDrawerOpen(false)} 
                                    className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submitting}
                                    className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    <span>{editingUser ? "Update Member" : "Create Member"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubUsers;
