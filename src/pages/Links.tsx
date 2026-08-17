import React, { useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    Link as LinkIcon, Plus, Search, Copy, CheckCircle2, ExternalLink, Trash2, Edit2, 
    MessageSquare, AlertCircle, Phone, FileText, X, Check, ChevronLeft, ChevronRight, Download, Image as ImageIcon, Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';
import { formsApi } from '../api/forms';
import { DesignEditor, ChatDesign } from '../components/DesignEditor';
import { useModules } from '../contexts/ModuleContext';
import { Module } from '../enums';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

function stripHtml(html: string) {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

const Links: React.FC = () => {
    const { user } = useAuth();
    const { hasModule } = useModules();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingLink, setEditingLink] = useState<any | null>(null);
    const [copiedId, setCopiedId] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Custom Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const pageSize = 6;
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        title: '',
        welcomeMessage: 'Hello! How can I help you today?',
        whatsappLink: '',
        whatsappThreshold: 5,
        leadCaptureFormId: '',
        leadCaptureMessage: 'Please complete this form to continue:',
        leadCaptureDelay: 3,
        whatsappOnFormSubmit: false,
        chatBackgroundImage: '',
        chatDesign: undefined as ChatDesign | undefined,
        trackingPixels: {
            facebook: '',
            googleAnalytics: '',
            tiktok: '',
            customScripts: ''
        }
    });

    const { data: linksResponse, isLoading } = useQuery({
        queryKey: ['links', currentPage],
        queryFn: () => apiClient.get(`/links?page=${currentPage}&limit=${pageSize}`).then(res => res.data),
    });
    const links = linksResponse?.data || [];
    const totalLinks = linksResponse?.total || 0;
    const totalPages = Math.ceil(totalLinks / pageSize);

    const { data: formsResponse } = useQuery({
        queryKey: ['forms_for_links'],
        queryFn: () => formsApi.getForms().then(res => res.data)
    });
    const forms = formsResponse || [];

    const createMutation = useMutation({
        mutationFn: (values: any) => apiClient.post('/links', values),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['links'] });
            showToast('Chat link created successfully!', 'success');
            setIsDrawerOpen(false);
            resetForm();
        },
        onError: (err: any) => {
            showToast(err.response?.data?.error || 'Failed to create link', 'error');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, values }: { id: string, values: any }) => apiClient.put(`/links/${id}`, values),
        onSuccess: () => {
            setFormData({ title: '', welcomeMessage: 'Hello! How can I help you today?', whatsappLink: '', whatsappThreshold: 5, leadCaptureFormId: '', leadCaptureMessage: 'Please complete this form to continue:', leadCaptureDelay: 3, whatsappOnFormSubmit: false, chatBackgroundImage: '', chatDesign: undefined, trackingPixels: { facebook: '', googleAnalytics: '', tiktok: '', customScripts: '' } });
            queryClient.invalidateQueries({ queryKey: ['links'] });
            showToast('Link updated successfully!', 'success');
            setIsDrawerOpen(false);
            setEditingLink(null);
            resetForm();
        },
        onError: (err: any) => {
            showToast(err.response?.data?.error || 'Failed to save link', 'error');
        }
    });

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, chatBackgroundImage: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/links/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['links'] });
            showToast('Link deleted', 'success');
            setDeleteConfirmId(null);
        },
        onError: () => {
            showToast('Failed to delete link', 'error');
        }
    });

    const resetForm = () => {
        setFormData({
            title: '',
            welcomeMessage: 'Hello! How can I help you today?',
            whatsappLink: '',
            whatsappThreshold: 5,
            leadCaptureFormId: '',
            leadCaptureMessage: 'Please complete this form to continue:',
            leadCaptureDelay: 3,
            whatsappOnFormSubmit: false,
            chatBackgroundImage: '',
            chatDesign: undefined,
            trackingPixels: {
                facebook: '',
                googleAnalytics: '',
                tiktok: '',
                customScripts: ''
            }
        });
        setEditingLink(null);
    };

    const handleOpenCreate = () => {
        resetForm();
        if (!hasModule(Module.FORMS) && forms.length > 0) {
            setFormData(prev => ({ ...prev, leadCaptureFormId: forms[0].id }));
        }
        setIsDrawerOpen(true);
    };

    const handleEdit = (link: any) => {
        setEditingLink(link);
        setFormData({
            title: link.title || '',
            welcomeMessage: link.welcomeMessage || '',
            whatsappLink: link.whatsappLink || '',
            whatsappThreshold: link.whatsappThreshold ?? 5,
            leadCaptureFormId: (!hasModule(Module.FORMS) && link.leadCaptureFormId && forms.length > 0) ? forms[0].id : (link.leadCaptureFormId || ''),
            leadCaptureMessage: link.leadCaptureMessage || 'Please complete this form to continue:',
            leadCaptureDelay: link.leadCaptureDelay ?? 3,
            whatsappOnFormSubmit: link.whatsappOnFormSubmit || false,
            chatBackgroundImage: link.chatBackgroundImage || '',
            chatDesign: link.chatDesign,
            trackingPixels: link.trackingPixels || { facebook: '', googleAnalytics: '', tiktok: '', customScripts: '' }
        });
        setIsDrawerOpen(true);
    };

    const handleCreateDefaultForm = async () => {
        try {
            const res = await formsApi.createForm({
                title: 'Default Inline Form',
                description: 'Capture details during live chat',
                isPublic: true,
                fields: []
            });
            navigate(`/dashboard/forms/edit/${res.data.id}`);
        } catch (e) {
            showToast('Failed to create default form', 'error');
        }
    };

    const handleExportCSV = async () => {
        try {
            const res = await apiClient.get('/links?limit=500');
            const allLinks = res.data?.data || res.data || [];
            if (allLinks.length === 0) {
                showToast('No links found to export.', 'info');
                return;
            }
            const headers = ['Link Title', 'Slug', 'Welcome Message', 'Total Chats', 'WhatsApp Redirection'];
            const csvRows = [
                headers.join(','),
                ...allLinks.map((l: any) => [
                    `"${(l.title || '').replace(/"/g, '""')}"`,
                    l.slug,
                    `"${(stripHtml(l.welcomeMessage || '')).replace(/"/g, '""')}"`,
                    l._count?.conversations || 0,
                    `"${(l.whatsappLink || 'Disabled').replace(/"/g, '""')}"`
                ].join(','))
            ];
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `smart_links_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
        } catch (e) {
            showToast('Failed to export links', 'error');
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            showToast('Please enter an internal title', 'error');
            return;
        }

        const payload = {
            ...formData,
            whatsappThreshold: Number(formData.whatsappThreshold),
            leadCaptureDelay: Number(formData.leadCaptureDelay)
        };

        if (editingLink) {
            updateMutation.mutate({ id: editingLink.id, values: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const copyToClipboard = (slug: string, id: string) => {
        const url = `${window.location.origin}/chat/${slug}`;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        showToast('Link copied to clipboard', 'success');
        setTimeout(() => setCopiedId(''), 2000);
    };

    const filteredLinks = links.filter((l: any) =>
        l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // const usagePercent = Math.min(100, Math.round((totalLinks / (user?.linksLimit || 1)) * 100));

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="flex justify-between items-center mb-8">
                    <div className="h-8 bg-slate-100 rounded-lg w-48" />
                    <div className="h-12 bg-slate-100 rounded-xl w-40" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-64 bg-slate-100 rounded-3xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="pb-20 font-sans text-slate-800 animate-in fade-in duration-500">
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

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white border border-slate-200/80 p-6 sm:p-8 rounded-2xl shadow-xs">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-2xs">
                            <LinkIcon className="w-5 h-5 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight">My Smart Chat Links</h1>
                    </div>
                    <p className="text-xs text-slate-500 m-0">Manage and share custom chat URLs for visitor engagement and lead capture.</p>
                </div>

                {/* Usage & Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs min-w-[180px]">
                        <div className="flex justify-between items-center text-[11px] font-semibold">
                            <span className="text-slate-500 uppercase tracking-wider">Total Links</span>
                            <span className="text-slate-900 font-bold">{totalLinks}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleExportCSV}
                        disabled={totalLinks === 0}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl shadow-2xs transition-all text-xs shrink-0 cursor-pointer disabled:opacity-50"
                    >
                        <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>

                    <button
                        onClick={handleOpenCreate}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-xs transition-all text-xs shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" /> Create New Link
                    </button>
                </div>
            </div>

            {/* Search Filter */}
            <div className="relative mb-8 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search by title or slug..."
                    value={searchTerm}
                    onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs"
                />
            </div>

            {/* Links Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {filteredLinks.map((link: any) => (
                    <div key={link.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all relative group">
                        <div>
                            {/* Link Title and Slug */}
                            <div className="flex justify-between items-start gap-4 mb-5 pb-4 border-b border-slate-100">
                                <div className="truncate min-w-0">
                                    <h3 className="text-base font-bold text-slate-900 m-0 truncate group-hover:text-primary transition-colors">{link.title}</h3>
                                    <p className="text-xs font-semibold text-slate-500 m-0 mt-1 truncate">
                                        {window.location.host}/chat/{link.slug}
                                    </p>
                                </div>
                                <span className="px-3 py-1 bg-primary/10 text-primary font-semibold rounded-xl text-xs border border-primary/20 shrink-0 shadow-2xs">
                                    {link._count?.conversations || 0} Chats
                                </span >
                            </div>

                            {/* Welcome Message Preview */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mb-6">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>Welcome Message</span>
                                </div>
                                <p className="text-xs text-slate-700 italic line-clamp-2 m-0 leading-normal font-medium">
                                    "{link.welcomeMessage ? stripHtml(link.welcomeMessage) : 'No message set'}"
                                </p>
                            </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    onClick={() => copyToClipboard(link.slug, link.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                                >
                                    {copiedId === link.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                                    <span>{copiedId === link.id ? 'Copied' : 'Copy'}</span>
                                </button>
                                <button
                                    onClick={() => handleEdit(link)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                </button>
                                <a
                                    href={`/chat/${link.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-center w-8 h-8 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
                                    title="Open Live Chat"
                                >
                                    <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                                </a>
                            </div>

                            {/* Delete Button with inline confirm */}
                            <div className="relative">
                                {deleteConfirmId === link.id ? (
                                    <div className="absolute right-0 bottom-0 bg-white p-3 rounded-2xl shadow-xl border border-red-200 flex items-center gap-2 z-20 min-w-[160px] animate-in zoom-in-95 duration-150">
                                        <span className="text-xs font-bold text-slate-700">Delete?</span>
                                        <button 
                                            onClick={() => setDeleteConfirmId(null)}
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                                        >
                                            No
                                        </button>
                                        <button 
                                            onClick={() => deleteMutation.mutate(link.id)}
                                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
                                        >
                                            Yes
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setDeleteConfirmId(link.id)}
                                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                        title="Delete Link"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {filteredLinks.length === 0 && (
                <div className="text-center py-16 bg-white border border-slate-200/80 rounded-2xl shadow-xs mb-8 p-8">
                    <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-200/60 shadow-2xs">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 m-0">No chat links found</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-6 font-medium">You have not created any chat links yet or none match your search.</p>
                        <button
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create Link Now</span>
                        </button>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
                    <span className="text-xs text-slate-500">
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalLinks)} of {totalLinks} entries
                    </span>
                    <div className="flex gap-1.5">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            <span>Previous</span>
                        </button>
                        <button 
                            onClick={() => setCurrentPage(p => p + 1)}
                            disabled={currentPage >= totalPages}
                            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        >
                            <span>Next</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Sliding Side Drawer for Create / Edit */}
            {isDrawerOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-300">
                    <div 
                        className="w-full max-w-xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Drawer Header */}
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shadow-2xs">
                                    {editingLink ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                </div>
                                <h2 className="text-lg font-bold text-slate-900 m-0 tracking-tight">
                                    {editingLink ? "Edit Smart Chat Link" : "Create Smart Chat Link"}
                                </h2>
                            </div>
                            <button onClick={() => setIsDrawerOpen(false)} className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Drawer Form Content */}
                        <form id="link-drawer-form" onSubmit={handleFormSubmit} className="flex-1 flex flex-col overflow-hidden text-xs">
                            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Internal Link Title *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Website Sales Widget"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium"
                                    />
                                </div>

                                {editingLink && (
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Chat URL (Auto-Generated)</span>
                                        <span className="text-xs font-bold text-primary">{window.location.host}/chat/{editingLink.slug}</span>
                                    </div>
                                )}

                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">AI Welcome Message</label>
                                    <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
                                        <ReactQuill
                                            theme="snow"
                                            value={formData.welcomeMessage}
                                            onChange={val => setFormData({ ...formData, welcomeMessage: val })}
                                            className="font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Appearance / Chat Background */}
                                <div className="pt-6 border-t border-slate-100 space-y-4">
                                    <h3 className="text-xs font-bold text-primary flex items-center gap-2 m-0 uppercase tracking-wider">
                                        <ImageIcon className="w-3.5 h-3.5" />
                                        <span>Appearance</span>
                                    </h3>

                                    <div>
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Header Background Image</label>
                                        <div className="flex items-center gap-4">
                                            {formData.chatBackgroundImage ? (
                                                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
                                                    <img src={formData.chatBackgroundImage} alt="Background Preview" className="w-full h-full object-cover" />
                                                    <div 
                                                        className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-all"
                                                        onClick={() => setFormData(prev => ({ ...prev, chatBackgroundImage: '' }))}
                                                    >
                                                        <Trash2 className="w-5 h-5 text-red-400" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className="flex flex-col items-center justify-center w-20 h-20 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                                                    <Plus className="w-6 h-6 text-slate-400 mb-1" />
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase">Upload</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                                </label>
                                            )}
                                            <div className="text-xs text-slate-500 max-w-[200px]">
                                                Upload a background image for the public chat widget's header. We recommend a subtle pattern or dark image.
                                            </div>
                                        </div>
                                    </div>

                                    {/* Advanced Chat Design */}
                                    <div className="pt-6 border-t border-slate-100">
                                        <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                                <Settings className="w-3.5 h-3.5" />
                                            </div>
                                            Advanced Chat Design
                                        </h3>
                                        <DesignEditor 
                                            value={formData.chatDesign} 
                                            onChange={(val) => setFormData(prev => ({ ...prev, chatDesign: val }))} 
                                        />
                                    </div>
                                    
                                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                                                <Settings className="w-4 h-4" />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-800 m-0">Advanced Tracking & Pixels</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Meta / Facebook Pixel ID</label>
                                                <input
                                                    type="text"
                                                    value={formData.trackingPixels.facebook}
                                                    onChange={e => setFormData(prev => ({ ...prev, trackingPixels: { ...prev.trackingPixels, facebook: e.target.value } }))}
                                                    placeholder="e.g. 1234567890"
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Google Analytics ID</label>
                                                <input
                                                    type="text"
                                                    value={formData.trackingPixels.googleAnalytics}
                                                    onChange={e => setFormData(prev => ({ ...prev, trackingPixels: { ...prev.trackingPixels, googleAnalytics: e.target.value } }))}
                                                    placeholder="e.g. G-ABCDEFG123"
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">TikTok Pixel ID</label>
                                                <input
                                                    type="text"
                                                    value={formData.trackingPixels.tiktok}
                                                    onChange={e => setFormData(prev => ({ ...prev, trackingPixels: { ...prev.trackingPixels, tiktok: e.target.value } }))}
                                                    placeholder="e.g. C1234567890"
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Custom Scripts (e.g. &lt;script&gt;)</label>
                                                <textarea
                                                    value={formData.trackingPixels.customScripts}
                                                    onChange={e => setFormData(prev => ({ ...prev, trackingPixels: { ...prev.trackingPixels, customScripts: e.target.value } }))}
                                                    placeholder="Paste any custom tracking scripts here..."
                                                    rows={4}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* WhatsApp Redirection */}
                                <div className="pt-6 border-t border-slate-100 space-y-4">
                                    <h3 className="text-xs font-bold text-primary flex items-center gap-2 m-0 uppercase tracking-wider">
                                        <Phone className="w-3.5 h-3.5" />
                                        <span>WhatsApp Redirection (Optional)</span>
                                    </h3>

                                    <div>
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">WhatsApp Target URL</label>
                                        <p className="text-[11px] text-slate-400 mb-2 font-medium">Format: https://wa.me/phonenumber?text=Hi Message</p>
                                        <input
                                            type="url"
                                            placeholder="https://wa.me/1234567890?text=Hi"
                                            value={formData.whatsappLink}
                                            onChange={e => setFormData({ ...formData, whatsappLink: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium"
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Redirection Message Threshold</label>
                                        <p className="text-[11px] text-slate-400 mb-2 font-medium">Prompt customer to move to WhatsApp after these many messages</p>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.whatsappThreshold}
                                            onChange={e => setFormData({ ...formData, whatsappThreshold: Number(e.target.value) })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium"
                                        />
                                    </div>
                                </div>

                                {/* Lead Capture Form Integration */}
                                <div className="pt-6 border-t border-slate-100 space-y-4">
                                    <h3 className="text-xs font-bold text-primary flex items-center gap-2 m-0 uppercase tracking-wider">
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>Form Builder Lead Capture (Optional)</span>
                                    </h3>

                                    <div>
                                        <div className="flex justify-between items-end mb-1">
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider">Inline Capture Form</label>
                                            {!hasModule(Module.FORMS) && (
                                                forms.length === 0 ? (
                                                    <button
                                                        type="button"
                                                        onClick={handleCreateDefaultForm}
                                                        className="text-xs font-bold text-primary hover:text-primary-hover transition-colors"
                                                    >
                                                        + Create Default Form
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/dashboard/forms/edit/${forms[0].id}`)}
                                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                                                    >
                                                        Edit Form
                                                    </button>
                                                )
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-400 mb-2 font-medium">Select a custom form to display during chat</p>
                                        <select
                                            value={formData.leadCaptureFormId}
                                            onChange={e => setFormData({ ...formData, leadCaptureFormId: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all cursor-pointer font-medium"
                                        >
                                            <option value="">None (Disabled)</option>
                                            {!hasModule(Module.FORMS) ? (
                                                forms.length > 0 && <option value={forms[0].id}>{forms[0].title}</option>
                                            ) : (
                                                forms.map((f: any) => (
                                                    <option key={f.id} value={f.id}>{f.title}</option>
                                                ))
                                            )}
                                        </select>
                                    </div>

                                    {formData.leadCaptureFormId && (
                                        <div className="space-y-5">
                                            <div>
                                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Form Request Message</label>
                                                <p className="text-[11px] text-slate-400 mb-2 font-medium">Message shown above the inline form</p>
                                                <input
                                                    type="text"
                                                    value={formData.leadCaptureMessage}
                                                    onChange={e => setFormData({ ...formData, leadCaptureMessage: e.target.value })}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Trigger Form After (Messages)</label>
                                                <p className="text-[11px] text-slate-400 mb-2 font-medium">Wait for this many messages before requiring form submission</p>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.leadCaptureDelay}
                                                onChange={e => setFormData({ ...formData, leadCaptureDelay: Number(e.target.value) })}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-medium"
                                            />
                                            </div>
                                            
                                            <div className="pt-2">
                                                <label className="flex items-start gap-3 cursor-pointer group">
                                                    <div className="relative flex items-center justify-center mt-0.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.whatsappOnFormSubmit}
                                                            onChange={e => setFormData({ ...formData, whatsappOnFormSubmit: e.target.checked })}
                                                            className="w-4 h-4 border-2 border-slate-300 rounded text-primary focus:ring-primary/20 focus:ring-offset-0 transition-all cursor-pointer peer bg-white checked:border-primary"
                                                        />
                                                    </div>
                                                    <div>
                                                        <span className="block font-bold text-slate-700 uppercase tracking-wider text-xs mb-0.5 group-hover:text-primary transition-colors">Redirect to WhatsApp on Submit</span>
                                                        <span className="block text-[11px] text-slate-400 font-medium">Automatically send the customer to the configured WhatsApp URL immediately after they submit this form (Requires WhatsApp Target URL to be set above)</span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsDrawerOpen(false)}
                                    className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-2xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    form="link-drawer-form"
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl text-xs shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    {(createMutation.isPending || updateMutation.isPending) && (
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                                    )}
                                    <span>{editingLink ? "Update Link" : "Generate Link"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Links;
