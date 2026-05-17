import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { emailApi, EmailTemplate } from '../../api/email';
import { useAuth } from '../../contexts/AuthContext';
import { useModules } from '../../contexts/ModuleContext';
import { Module } from '../../enums';
import { 
    Mail, Plus, Trash2, Edit3, Lock, LayoutTemplate, 
    RefreshCw, Info, Eye, Settings, X, CheckCircle2, Download
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const Email: React.FC = () => {
    const { user, updateMe } = useAuth();
    const { hasModule } = useModules();
    const navigate = useNavigate();
    
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'templates' | 'settings'>('templates');
    
    const [showVerifyAlert, setShowVerifyAlert] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState('');
    const [previewTitle, setPreviewTitle] = useState('');
    
    // Custom Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Form state for settings
    const [fromName, setFromName] = useState(user?.emailConfig?.fromName || '');
    const [fromEmail, setFromEmail] = useState(user?.emailConfig?.fromEmail || '');

    useEffect(() => {
        if (hasModule(Module.EMAIL)) {
            fetchTemplates();
        }
    }, [hasModule]);

    useEffect(() => {
        if (user?.emailConfig) {
            setFromName(user.emailConfig.fromName || '');
            setFromEmail(user.emailConfig.fromEmail || '');
        }
    }, [user?.emailConfig]);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const data = await emailApi.getTemplates();
            setTemplates(data);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this template?")) return;
        try {
            await emailApi.deleteTemplate(id);
            showToast('Template deleted', 'success');
            fetchTemplates();
        } catch (error) {
            showToast('Failed to delete template', 'error');
        }
    };

    const handleSync = async (id: string) => {
        try {
            await emailApi.syncTemplate(id);
            showToast('Template synced with AWS SES successfully', 'success');
            fetchTemplates();
        } catch (error) {
            showToast('Failed to sync with AWS SES', 'error');
        }
    };

    const handleSyncIdentity = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateMe({ emailConfig: { fromName, fromEmail } });
            showToast('Sender profile updated', 'success');
            setShowVerifyAlert(true);
        } catch (e) {
            showToast('Update failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (templates.length === 0) return;
        const headers = ['Template Name', 'Subject Line', 'AWS SES Synced', 'Last Modified'];
        const rows = [
            headers.join(','),
            ...templates.map(t => [
                `"${(t.name || '').replace(/"/g, '""')}"`,
                `"${(t.subject || '').replace(/"/g, '""')}"`,
                t.sesSynced ? 'Yes' : 'No',
                t.updatedAt ? t.updatedAt.split('T')[0] : ''
            ].join(','))
        ];
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `email_templates_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
    };

    if (!hasModule(Module.EMAIL)) {
        return (
            <div className="flex items-center justify-center min-h-[600px] p-6 animate-in fade-in w-full min-w-0 font-sans text-slate-800">
                <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center shadow-xl min-w-0">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shrink-0 border border-blue-100 shadow-2xs">
                        <Lock className="w-8 h-8 text-blue-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2 truncate">Email Marketing Locked</h2>
                    <p className="text-xs text-slate-500 mb-8 leading-relaxed">
                        This module is not enabled for your account. Please contact your administrator or upgrade your plan to unlock the Drag-and-Drop Email Builder.
                    </p>
                    <button className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer">
                        Upgrade Plan
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-20 animate-in fade-in duration-500 font-sans w-full min-w-0 text-slate-800">
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white border border-slate-200/80 p-6 sm:p-8 rounded-2xl shadow-xs w-full min-w-0">
                <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0 shadow-2xs">
                            <Mail className="w-5 h-5 text-blue-600" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight truncate">Email Marketing Hub</h1>
                    </div>
                    <p className="text-xs text-slate-500 m-0 truncate">
                        Manage your high-converting email templates for broadcast and automation.
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3 shrink-0">
                    <button 
                        onClick={handleExportCSV}
                        disabled={templates.length === 0}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all shadow-2xs disabled:opacity-50 cursor-pointer shrink-0"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Export CSV</span>
                    </button>
                    <button 
                        onClick={() => navigate('/dashboard/email/new')}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all hover:-translate-y-0.5 cursor-pointer shrink-0"
                    >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span>New Email Template</span>
                    </button>
                </div>
            </div>

            {/* Custom Tabs */}
            <div className="flex gap-2 mb-6 bg-slate-200/60 p-1.5 rounded-2xl w-fit max-w-full overflow-x-auto min-w-0">
                <button 
                    onClick={() => setActiveTab('templates')}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer shrink-0",
                        activeTab === 'templates' 
                            ? "bg-white text-slate-900 shadow-sm font-extrabold" 
                            : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                    )}
                >
                    <LayoutTemplate className="w-4 h-4 shrink-0" /> My Templates
                </button>
                <button 
                    onClick={() => setActiveTab('settings')}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap cursor-pointer shrink-0",
                        activeTab === 'settings' 
                            ? "bg-white text-slate-900 shadow-sm font-extrabold" 
                            : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                    )}
                >
                    <Settings className="w-4 h-4 shrink-0" /> Sender Identity
                </button>
            </div>

            {/* Tab Content */}
            <div className="mt-6 w-full min-w-0">
                {activeTab === 'templates' && (
                    <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden w-full min-w-0">
                        <div className="overflow-x-auto">
                            {loading ? (
                                <div className="flex justify-center items-center py-20">
                                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin shrink-0"></div>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-slate-50/80 border-b border-slate-200/80">
                                            <th className="py-4 px-6 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Template Name</th>
                                            <th className="py-4 px-6 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-40">Status</th>
                                            <th className="py-4 px-6 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-48">Last Modified</th>
                                            <th className="py-4 px-6 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider w-48 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm font-medium">
                                        {templates.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-16 text-center">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-200 text-slate-400 shrink-0">
                                                        <Mail className="w-8 h-8" />
                                                    </div>
                                                    <h3 className="text-lg font-extrabold text-slate-800 mb-1">No templates yet</h3>
                                                    <p className="text-slate-500 text-sm m-0">Create your first email template to get started.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            templates.map((t) => (
                                                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors group">
                                                    <td className="py-5 px-6 min-w-[240px]">
                                                        <span className="block text-base font-extrabold text-slate-900 mb-1 truncate">{t.name}</span>
                                                        <span className="block text-xs font-bold text-slate-400 truncate max-w-md">{t.subject}</span>
                                                    </td>
                                                    <td className="py-5 px-6 shrink-0">
                                                        {t.sesSynced ? (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-extrabold">
                                                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Synced
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-extrabold">
                                                                <RefreshCw className="w-3.5 h-3.5 shrink-0" /> Sync Pending
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-5 px-6 text-xs font-bold text-slate-500 shrink-0">
                                                        {new Date(t.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </td>
                                                    <td className="py-5 px-6 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {!t.sesSynced && (
                                                                <button 
                                                                    onClick={() => handleSync(t.id)}
                                                                    className="w-8 h-8 flex items-center justify-center text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer shrink-0"
                                                                    title="Force Sync with SES"
                                                                >
                                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => {
                                                                    setPreviewContent(t.content);
                                                                    setPreviewTitle(t.name);
                                                                    setPreviewOpen(true);
                                                                }}
                                                                className="w-8 h-8 flex items-center justify-center text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors cursor-pointer shrink-0"
                                                                title="Preview Template"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                onClick={() => navigate(`/dashboard/email/edit/${t.id}`)}
                                                                className="w-8 h-8 flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors cursor-pointer shrink-0"
                                                                title="Edit Design"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDelete(t.id)}
                                                                className="w-8 h-8 flex items-center justify-center text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors cursor-pointer shrink-0"
                                                                title="Delete"
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
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-8 max-w-2xl min-w-0">
                        <div className="flex items-center gap-3 mb-4 min-w-0">
                            <span className="relative flex h-3 w-3 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                            </span>
                            <h3 className="text-lg font-bold text-slate-900 m-0 truncate">Verified Sender Settings</h3>
                        </div>
                        <p className="text-xs text-slate-500 mb-8 leading-relaxed m-0">
                            Your "From" address must be verified in your AWS SES account to ensure delivery. Professional identities increase open rates and build trust.
                        </p>

                        {showVerifyAlert && (
                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex gap-4 mb-8 items-start relative min-w-0 shadow-2xs">
                                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <div className="min-w-0 text-xs">
                                    <h4 className="text-sm font-bold text-blue-900 m-0 mb-1 truncate">Identity Sync Started</h4>
                                    <p className="font-medium text-blue-800 m-0 mb-2 truncate max-w-full">We've requested AWS SES to verify your email address.</p>
                                    <p className="font-bold text-slate-900 m-0 mb-2 leading-relaxed">
                                        Action Required: Please check your inbox ({fromEmail}) and click the verification link from AWS.
                                    </p>
                                    <p className="font-bold text-blue-600 m-0 truncate">Until verified, automated emails from this address will not be delivered.</p>
                                </div>
                                <button onClick={() => setShowVerifyAlert(false)} className="absolute top-4 right-4 text-blue-400 hover:text-blue-600 bg-white/80 p-1.5 rounded-lg hover:bg-white cursor-pointer shrink-0">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <form onSubmit={handleSyncIdentity} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Display Name</label>
                                    <input 
                                        required 
                                        type="text"
                                        placeholder="e.g. Acme Marketing"
                                        value={fromName}
                                        onChange={e => setFromName(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Sender Email</label>
                                    <input 
                                        required 
                                        type="email"
                                        placeholder="hello@yourdomain.com"
                                        value={fromEmail}
                                        onChange={e => setFromEmail(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                                    />
                                </div>
                            </div>
                            
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 hover:-translate-y-0.5 cursor-pointer"
                            >
                                {loading ? 'Syncing...' : 'Sync Sender Identity'}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Custom Tailwind Slide-over Drawer for Preview Modal */}
            {previewOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" onClick={() => setPreviewOpen(false)} />
                    <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                        <div className="w-screen max-w-2xl bg-slate-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-white shrink-0 shadow-xs">
                                <div className="min-w-0">
                                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">Template Live Preview</span>
                                    <h2 className="text-lg font-bold text-slate-900 m-0 truncate">{previewTitle}</h2>
                                </div>
                                <button onClick={() => setPreviewOpen(false)} className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all shadow-2xs cursor-pointer shrink-0">
                                    <X className="w-4 h-4 shrink-0" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-hidden p-6 md:p-8">
                                <div className="w-full h-full max-w-2xl mx-auto bg-white shadow-lg overflow-hidden rounded-2xl border border-slate-200/80">
                                    <iframe 
                                        srcDoc={previewContent}
                                        title="Email Preview"
                                        className="w-full h-full border-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Email;
