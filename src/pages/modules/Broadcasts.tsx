import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { broadcastsApi, BroadcastCampaign, RecipientLog } from '../../api/broadcasts';
import apiClient from '../../api/apiClient';
import {
    Radio, Plus, Trash2, Send, Search, X, Megaphone, Users, MessageSquare, Filter,
    CheckCircle2, XCircle, Clock, ChevronRight, SlidersHorizontal, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG = {
    SENT:    { color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', label: 'Sent' },
    FAILED:  { color: 'bg-red-500',     text: 'text-red-700',     bg: 'bg-red-50',     label: 'Failed' },
    PENDING: { color: 'bg-amber-400',   text: 'text-amber-700',   bg: 'bg-amber-50',   label: 'Pending' },
};

type DrawerTab = 'details' | 'recipients';

const Broadcasts: React.FC = () => {
    const queryClient = useQueryClient();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [drawerCampaign, setDrawerCampaign] = useState<BroadcastCampaign | null>(null);
    const [drawerTab, setDrawerTab] = useState<DrawerTab>('details');
    const [searchQuery, setSearchQuery] = useState('');
    const [recipientSearch, setRecipientSearch] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [mediaUrl, setMediaUrl] = useState('');
    const [targetLink, setTargetLink] = useState('all');
    const [targetStatus, setTargetStatus] = useState('all');
    const [targetPushSubscribers, setTargetPushSubscribers] = useState(false);

    const { data: campaigns = [], isLoading } = useQuery({
        queryKey: ['broadcast-campaigns'],
        queryFn: broadcastsApi.getCampaigns
    });

    const { data: linksResponse } = useQuery({
        queryKey: ['shortlinks'],
        queryFn: async () => {
            const res = await apiClient.get('/links');
            return res.data;
        }
    });
    const links = Array.isArray(linksResponse?.data) ? linksResponse.data : (Array.isArray(linksResponse) ? linksResponse : []);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const createMutation = useMutation({
        mutationFn: broadcastsApi.createCampaign,
        onSuccess: (data) => { sendMutation.mutate(data.id); },
        onError: (err: any) => { showToast(err.response?.data?.error || 'Failed to create campaign', 'error'); }
    });

    const sendMutation = useMutation({
        mutationFn: broadcastsApi.sendCampaign,
        onSuccess: () => {
            showToast('Campaign execution started successfully!', 'success');
            queryClient.invalidateQueries({ queryKey: ['broadcast-campaigns'] });
            setIsCreateOpen(false);
            resetForm();
        },
        onError: (err: any) => { showToast(err.response?.data?.error || 'Failed to send campaign', 'error'); }
    });

    const deleteMutation = useMutation({
        mutationFn: broadcastsApi.deleteCampaign,
        onSuccess: () => {
            showToast('Campaign deleted', 'success');
            queryClient.invalidateQueries({ queryKey: ['broadcast-campaigns'] });
            if (drawerCampaign) setDrawerCampaign(null);
        },
        onError: (err: any) => { showToast(err.response?.data?.error || 'Failed to delete campaign', 'error'); }
    });

    const resetForm = () => { setName(''); setContent(''); setMediaUrl(''); setTargetLink('all'); setTargetStatus('all'); setTargetPushSubscribers(false); };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !content.trim()) { showToast('Please enter a campaign name and message content', 'error'); return; }
        createMutation.mutate({
            name, content,
            mediaUrl: mediaUrl || undefined,
            targetFilter: {
                linkId: targetLink !== 'all' ? targetLink : undefined,
                leadStatus: targetStatus !== 'all' ? targetStatus : undefined,
                pushSubscribersOnly: targetPushSubscribers
            }
        });
    };

    const openDrawer = (campaign: BroadcastCampaign) => {
        setDrawerCampaign(campaign);
        setDrawerTab('details');
        setRecipientSearch('');
    };

    const filteredCampaigns = campaigns.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const recipientsLog: RecipientLog[] = Array.isArray(drawerCampaign?.recipientsLog)
        ? (drawerCampaign!.recipientsLog as RecipientLog[])
        : [];

    const filteredRecipients = recipientsLog.filter(r =>
        r.name.toLowerCase().includes(recipientSearch.toLowerCase()) ||
        r.phone.toLowerCase().includes(recipientSearch.toLowerCase())
    );

    const sentCount   = recipientsLog.filter(r => r.status === 'SENT').length;
    const failedCount = recipientsLog.filter(r => r.status === 'FAILED').length;

    return (
        <div className="pb-20 font-sans text-slate-800 animate-in fade-in duration-500 w-full min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-xs shrink-0">
                            <Radio className="w-5 h-5 animate-pulse" />
                        </div>
                        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight m-0">Bulk Broadcasts</h1>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 m-0 leading-relaxed ml-[52px]">
                        Pushes instant template notifications to selected subscriber lists or lead profiles.
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-3 rounded-xl text-xs font-bold shadow-md shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer w-full sm:w-auto shrink-0"
                >
                    <Plus className="w-4 h-4" /> Create Broadcast
                </button>
            </div>

            {/* Main Content */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-clip">
                {/* Search bar */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative max-w-sm w-full">
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
                            Create your first broadcast to send bulk messages to your visitors and leads.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-[#64748b] font-bold uppercase tracking-wider">
                                        <th className="px-6 py-4">Campaign Name</th>
                                        <th className="px-6 py-4">Filters</th>
                                        <th className="px-6 py-4">Message</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Sent To</th>
                                        <th className="px-6 py-4">Created</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {filteredCampaigns.map(campaign => {
                                        const log: RecipientLog[] = Array.isArray(campaign.recipientsLog) ? campaign.recipientsLog as RecipientLog[] : [];
                                        const sent = log.filter(r => r.status === 'SENT').length;
                                        const total = log.length;
                                        const cfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.PENDING;
                                        return (
                                            <tr
                                                key={campaign.id}
                                                className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                                                onClick={() => openDrawer(campaign)}
                                            >
                                                <td className="px-6 py-4 font-bold text-slate-900">{campaign.name}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold">
                                                            {campaign.targetFilter.linkId ? `Link: ${campaign.targetFilter.linkId.substring(0, 6)}…` : 'All Links'}
                                                        </span>
                                                        {campaign.targetFilter.leadStatus && (
                                                            <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-[10px] font-bold">
                                                                CRM: {campaign.targetFilter.leadStatus}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 max-w-[180px] truncate text-slate-500 font-normal">{campaign.content}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.color}`} />
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {total > 0 ? (
                                                        <span className="text-xs font-bold text-slate-700">
                                                            {sent}/{total}
                                                            <span className="text-slate-400 font-normal ml-1">delivered</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                                                    {format(new Date(campaign.createdAt), 'MMM dd, yyyy')}
                                                </td>
                                                <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => deleteMutation.mutate(campaign.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {filteredCampaigns.map(campaign => {
                                const log: RecipientLog[] = Array.isArray(campaign.recipientsLog) ? campaign.recipientsLog as RecipientLog[] : [];
                                const sent = log.filter(r => r.status === 'SENT').length;
                                const total = log.length;
                                const cfg = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.PENDING;
                                return (
                                    <div
                                        key={campaign.id}
                                        className="p-4 hover:bg-slate-50/70 transition-colors cursor-pointer"
                                        onClick={() => openDrawer(campaign)}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-900 text-sm truncate">{campaign.name}</p>
                                                <p className="text-xs text-slate-500 truncate mt-0.5">{campaign.content}</p>
                                            </div>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${cfg.bg} ${cfg.text}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.color}`} />
                                                {cfg.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                                            <span>{format(new Date(campaign.createdAt), 'MMM dd, yyyy')}</span>
                                            {total > 0 && <span className="text-slate-600">{sent}/{total} delivered</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* ── Campaign Detail Drawer ── */}
            {drawerCampaign && (
                <div className="fixed inset-0 z-[9998] flex">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
                        onClick={() => setDrawerCampaign(null)}
                    />
                    {/* Drawer panel */}
                    <div className="relative ml-auto h-full w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-10">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <Radio className="w-4 h-4 text-primary shrink-0" />
                                <h2 className="text-sm font-bold text-slate-900 truncate m-0">{drawerCampaign.name}</h2>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => deleteMutation.mutate(drawerCampaign.id)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                    title="Delete campaign"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setDrawerCampaign(null)}
                                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Status Bar */}
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
                            {(() => {
                                const cfg = STATUS_CONFIG[drawerCampaign.status] || STATUS_CONFIG.PENDING;
                                return (
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
                                            <span className={`w-2 h-2 rounded-full ${cfg.color}`} />
                                            {cfg.label}
                                        </span>
                                        {drawerCampaign.sentAt && (
                                            <span className="text-[10px] text-slate-400 font-semibold">
                                                Sent {format(new Date(drawerCampaign.sentAt), 'MMM dd, yyyy h:mm a')}
                                            </span>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-100 shrink-0 px-5">
                            {([
                                { key: 'details',    icon: MessageSquare, label: 'Details' },
                                { key: 'recipients', icon: Users, label: `Recipients${recipientsLog.length > 0 ? ` (${recipientsLog.length})` : ''}` }
                            ] as { key: DrawerTab; icon: any; label: string }[]).map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setDrawerTab(tab.key)}
                                    className={`flex items-center gap-1.5 px-3 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                                        drawerTab === tab.key
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto">
                            {drawerTab === 'details' && (
                                <div className="p-5 space-y-5">
                                    {/* Message */}
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Message Content</p>
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                                            {drawerCampaign.content}
                                        </div>
                                    </div>

                                    {/* Filters */}
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Target Filters</p>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">
                                                {drawerCampaign.targetFilter.linkId ? `Link: ${drawerCampaign.targetFilter.linkId.substring(0, 8)}…` : 'All Smart Links'}
                                            </span>
                                            <span className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold border border-purple-100">
                                                CRM: {drawerCampaign.targetFilter.leadStatus || 'All Statuses'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    {recipientsLog.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Delivery Summary</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                                                    <p className="text-2xl font-extrabold text-emerald-600 m-0">{sentCount}</p>
                                                    <p className="text-[10px] font-bold text-emerald-600/70 mt-1 m-0">Delivered</p>
                                                </div>
                                                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
                                                    <p className="text-2xl font-extrabold text-red-500 m-0">{failedCount}</p>
                                                    <p className="text-[10px] font-bold text-red-500/70 mt-1 m-0">Failed</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Timestamps */}
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Timeline</p>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-500 font-semibold">Created</span>
                                                <span className="text-slate-700 font-bold">{format(new Date(drawerCampaign.createdAt), 'MMM dd, yyyy h:mm a')}</span>
                                            </div>
                                            {drawerCampaign.sentAt && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-500 font-semibold">Executed</span>
                                                    <span className="text-slate-700 font-bold">{format(new Date(drawerCampaign.sentAt), 'MMM dd, yyyy h:mm a')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {drawerTab === 'recipients' && (
                                <div className="flex flex-col h-full">
                                    {recipientsLog.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
                                            <Users className="w-10 h-10 text-slate-300" />
                                            <div>
                                                <p className="text-sm font-bold text-slate-700 m-0">No delivery data yet</p>
                                                <p className="text-xs text-slate-400 mt-1 m-0">Recipients will appear here after the campaign is executed.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Recipient Search */}
                                            <div className="px-5 py-3 border-b border-slate-100 shrink-0">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search by name or phone..."
                                                        value={recipientSearch}
                                                        onChange={e => setRecipientSearch(e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-2 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-3 mt-2.5">
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                                        <CheckCircle2 className="w-3 h-3" /> {sentCount} sent
                                                    </span>
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                                                        <XCircle className="w-3 h-3" /> {failedCount} failed
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-semibold">{recipientsLog.length} total</span>
                                                </div>
                                            </div>

                                            {/* Recipients List */}
                                            <div className="divide-y divide-slate-100 overflow-y-auto">
                                                {filteredRecipients.length === 0 ? (
                                                    <div className="py-10 text-center text-xs text-slate-400 font-semibold">No results match your search</div>
                                                ) : (
                                                    filteredRecipients.map((r, i) => (
                                                        <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-bold text-slate-800 m-0 truncate">{r.name}</p>
                                                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5 m-0">{r.phone}</p>
                                                                {r.error && (
                                                                    <p className="text-[10px] text-red-500 font-semibold mt-0.5 m-0 flex items-center gap-1">
                                                                        <AlertCircle className="w-3 h-3 shrink-0" /> {r.error}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <span className={`shrink-0 ml-3 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
                                                                r.status === 'SENT'
                                                                    ? 'bg-emerald-50 text-emerald-700'
                                                                    : 'bg-red-50 text-red-600'
                                                            }`}>
                                                                {r.status === 'SENT'
                                                                    ? <CheckCircle2 className="w-3 h-3" />
                                                                    : <XCircle className="w-3 h-3" />
                                                                }
                                                                {r.status}
                                                            </span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Campaign Modal */}
            {isCreateOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-[9999] animate-in fade-in duration-200">
                    <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200/50 shadow-2xl max-w-lg w-full overflow-clip animate-in slide-in-from-bottom sm:scale-in duration-300 max-h-[90vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
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
                        <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs font-semibold overflow-y-auto">
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            
                            <div className="flex items-center gap-2 mt-2">
                                <input
                                    type="checkbox"
                                    id="pushSubscribers"
                                    checked={targetPushSubscribers}
                                    onChange={(e) => setTargetPushSubscribers(e.target.checked)}
                                    className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                                />
                                <label htmlFor="pushSubscribers" className="text-xs font-semibold text-slate-700">
                                    Target Web Push Subscribers Only
                                </label>
                            </div>

                            <div className="space-y-1">
                                <label className="block text-slate-700 uppercase tracking-wider text-[10px] font-bold">Message Content</label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Type your message here..."
                                    value={content}
                                    onChange={e => setContent(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 resize-none"
                                />
                            </div>

                            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
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
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Sending...</span></>
                                    ) : (
                                        <><Send className="w-4 h-4" /><span>Send Broadcast</span></>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Toast */}
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
