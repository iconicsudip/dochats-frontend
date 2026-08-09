import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { broadcastsApi, BroadcastCampaign } from '../../api/broadcasts';
import apiClient from '../../api/apiClient';
import { 
    Radio, Plus, Trash2, Send, Clock, Search, SlidersHorizontal, AlertCircle, FileText, CheckCircle2, X, ChevronRight, Filter, Megaphone
} from 'lucide-react';
import { format } from 'date-fns';

const Broadcasts: React.FC = () => {
    const queryClient = useQueryClient();
    
    // Dialog and filter states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Form inputs
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [targetLink, setTargetLink] = useState('all');
    const [targetStatus, setTargetStatus] = useState('all');

    // Fetch Campaign logs
    const { data: campaigns = [], isLoading } = useQuery({
        queryKey: ['broadcast-campaigns'],
        queryFn: broadcastsApi.getCampaigns
    });

    // Fetch Smart Links for dropdown filter
    const { data: links = [] } = useQuery({
        queryKey: ['shortlinks'],
        queryFn: async () => {
            const res = await apiClient.get('/links');
            return res.data;
        }
    });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Mutations
    const createMutation = useMutation({
        mutationFn: broadcastsApi.createCampaign,
        onSuccess: (data) => {
            // Trigger send immediately upon creation
            sendMutation.mutate(data.id);
        },
        onError: (err: any) => {
            showToast(err.response?.data?.error || 'Failed to create campaign', 'error');
        }
    });

    const sendMutation = useMutation({
        mutationFn: broadcastsApi.sendCampaign,
        onSuccess: () => {
            showToast('Campaign execution started successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['broadcast-campaigns'] });
            setIsCreateOpen(false);
            resetForm();
        },
        onError: (err: any) => {
            showToast(err.response?.data?.error || 'Failed to send campaign', 'error');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: broadcastsApi.deleteCampaign,
        onSuccess: () => {
            showToast('Campaign deleted successfully', 'success');
            queryClient.invalidateQueries({ queryKey: ['broadcast-campaigns'] });
        },
        onError: (err: any) => {
            showToast(err.response?.data?.error || 'Failed to delete campaign', 'error');
        }
    });

    const resetForm = () => {
        setName('');
        setContent('');
        setMediaUrl('');
        setTargetLink('all');
        setTargetStatus('all');
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !content.trim()) {
            showToast('Please enter a campaign name and message content', 'error');
            return;
        }

        createMutation.mutate({
            name,
            content,
            mediaUrl: mediaUrl || undefined,
            targetFilter: {
                linkId: targetLink !== 'all' ? targetLink : undefined,
                leadStatus: targetStatus !== 'all' ? targetStatus : undefined
            }
        });
    };

    const filteredCampaigns = campaigns.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 font-sans text-slate-800 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-xs shrink-0">
                            <Radio className="w-5 h-5 animate-pulse" />
                        </div>
                        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight m-0">Bulk Broadcasts</h1>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 m-0 leading-relaxed">
                        Pushes instant template notifications to selected subscriber lists or lead profiles.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-xl text-xs font-bold shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer w-full md:w-auto"
                >
                    <Plus className="w-4 h-4" /> Create Broadcast
                </button>
            </div>

            {/* Main Content Area */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-clip">
                {/* Search & filters bar */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search campaigns..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
                        />
                    </div>
                </div>

                {/* Table/List of Campaigns */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
                        <span className="text-xs text-slate-500 font-semibold">Loading broadcasts...</span>
                    </div>
                ) : filteredCampaigns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                        <Megaphone className="w-12 h-12 text-slate-300 mb-4" />
                        <h3 className="text-sm font-bold text-slate-900 mb-1">No Broadcasts Found</h3>
                        <p className="text-xs text-slate-500 max-w-sm m-0 leading-relaxed">
                            Create your first broadcast template to send bulk announcements directly to visitors' conversations.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[#64748b] font-bold uppercase tracking-wider">
                                    <th className="px-6 py-4">Campaign Name</th>
                                    <th className="px-6 py-4">Filters</th>
                                    <th className="px-6 py-4">Message</th>
                                    <th className="px-6 py-4">Execution Status</th>
                                    <th className="px-6 py-4">Created Date</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                {filteredCampaigns.map(campaign => (
                                    <tr key={campaign.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-900">{campaign.name}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {campaign.targetFilter.linkId ? (
                                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold">
                                                        Link ID: {campaign.targetFilter.linkId.substring(0, 8)}
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-slate-50 text-slate-600 rounded-md text-[10px] font-bold">
                                                        All Links
                                                    </span>
                                                )}
                                                {campaign.targetFilter.leadStatus ? (
                                                    <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-[10px] font-bold">
                                                        CRM: {campaign.targetFilter.leadStatus}
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-slate-50 text-slate-600 rounded-md text-[10px] font-bold">
                                                        All Statuses
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs truncate text-slate-500 font-normal">
                                            {campaign.content}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    campaign.status === 'SENT' ? 'bg-emerald-500' :
                                                    campaign.status === 'FAILED' ? 'bg-red-500' : 'bg-amber-400'
                                                }`} />
                                                <span className="font-bold text-[10px] uppercase">
                                                    {campaign.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400">
                                            {format(new Date(campaign.createdAt), 'MMM dd, yyyy h:mm a')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => deleteMutation.mutate(campaign.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                                                title="Delete Log"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Campaign Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl border border-slate-200/50 shadow-2xl max-w-lg w-full overflow-clip animate-in scale-in duration-300">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Radio className="w-5 h-5 text-primary" />
                                <h2 className="text-base font-bold text-slate-900 m-0">New Broadcast Campaign</h2>
                            </div>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleCreate} className="p-6 space-y-4 text-xs font-semibold">
                            {/* Campaign Name */}
                            <div className="space-y-1">
                                <label className="block text-slate-700 uppercase tracking-wider text-[10px] font-bold">Campaign Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. August Launch Offer"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800"
                                />
                            </div>

                            {/* Segmentation Criteria */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-slate-700 uppercase tracking-wider text-[10px] font-bold">Target Link</label>
                                    <select
                                        value={targetLink}
                                        onChange={e => setTargetLink(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800"
                                    >
                                        <option value="all">All Smart Links</option>
                                        {links.map((link: any) => (
                                            <option key={link.id} value={link.id}>{link.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-slate-700 uppercase tracking-wider text-[10px] font-bold">CRM Lead Status</label>
                                    <select
                                        value={targetStatus}
                                        onChange={e => setTargetStatus(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800"
                                    >
                                        <option value="all">All Lead Statuses</option>
                                        <option value="NEW">New</option>
                                        <option value="CONTACTED">Contacted</option>
                                        <option value="INTERESTED">Interested</option>
                                        <option value="WON">Won</option>
                                        <option value="LOST">Lost</option>
                                    </select>
                                </div>
                            </div>

                            {/* Message Content */}
                            <div className="space-y-1">
                                <label className="block text-slate-700 uppercase tracking-wider text-[10px] font-bold">Message Content</label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Type your message here. Variables or templates are supported..."
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 resize-none"
                                />
                            </div>

                            {/* Actions */}
                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => { setIsCreateOpen(false); resetForm(); }}
                                    className="px-4 py-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || sendMutation.isPending}
                                    className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-xl text-xs font-bold shadow-md shadow-primary/20 transition-colors cursor-pointer disabled:opacity-65 disabled:cursor-not-allowed"
                                >
                                    {createMutation.isPending || sendMutation.isPending ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Sending...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            <span>Send Broadcast</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {toast && (
                <div className={`fixed bottom-5 right-5 z-[99999] flex items-center gap-3 px-4 py-3 text-white text-xs font-semibold rounded-2xl shadow-xl animate-in slide-in-from-bottom-4 duration-300 ${
                    toast.type === 'success' ? 'bg-slate-900' : 'bg-red-600'
                }`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-emerald-400' : 'bg-white'}`} />
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
};

export default Broadcasts;
