import React, { useState, useEffect, useRef } from 'react';
import { whatsappApi, WhatsAppTemplate, WhatsAppPhone } from '../../api/whatsapp';
import { useAuth } from '../../contexts/AuthContext';
import { 
    MessageCircle, Plus, Trash2, RefreshCw, Phone, FileText, 
    ShieldCheck, Zap, Send, Info, BarChart2, User, Globe, Mail, 
    Building2, Facebook, Download, X, CheckCircle2, Sparkles, Bot
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const WhatsApp: React.FC = () => {
    const { user, updateMe } = useAuth();
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [phones, setPhones] = useState<WhatsAppPhone[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('1');
    const sessionInfoRef = useRef<{ waba_id?: string, phone_number_id?: string, business_id?: string }>({});

    // Custom Toast Notification State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Form States
    const [msgForm, setMsgForm] = useState({ phoneNumberId: '', to: '', templateName: '', variables: '' });
    const [profileForm, setProfileForm] = useState({ email: '', websites: '', address: '', description: '', about: '', vertical: 'OTHER' });
    const [templateForm, setTemplateForm] = useState({ name: '', category: 'UTILITY', header: '', body: '', footer: '' });

    const isConnected = user?.whatsappConfig?.isConnected;
    const configId = import.meta.env.VITE_META_CONFIG_ID;

    useEffect(() => {
        if (isConnected) {
            fetchData();
        }
    }, [isConnected]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tData, pData, aData] = await Promise.all([
                whatsappApi.getTemplates().catch(() => []),
                whatsappApi.getPhones().catch(() => []),
                whatsappApi.getAnalytics().catch(() => null)
            ]);
            setTemplates(tData);
            setPhones(pData);
            setAnalytics(aData);

            if (pData.length > 0) {
                const profData = await whatsappApi.getProfile(pData[0].id).catch(() => null);
                setProfile(profData);
                if (profData) {
                    setProfileForm({
                        email: profData.email || '',
                        websites: profData.websites?.[0] || '',
                        address: profData.address || '',
                        description: profData.description || '',
                        about: profData.about || '',
                        vertical: profData.vertical || 'OTHER'
                    });
                }
                
                // Set default sender if empty
                if (!msgForm.phoneNumberId) {
                    setMsgForm(prev => ({ ...prev, phoneNumberId: pData[0].id }));
                }
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!msgForm.phoneNumberId || !msgForm.to || !msgForm.templateName) {
            showToast("Please fill all required fields", "error");
            return;
        }

        setSending(true);
        try {
            const components = msgForm.variables ? [
                {
                    type: 'body',
                    parameters: msgForm.variables.split(',').map((v: string) => ({ type: 'text', text: v.trim() }))
                }
            ] : [];

            await whatsappApi.sendMessage({
                to: msgForm.to,
                templateName: msgForm.templateName,
                components,
                phoneNumberId: msgForm.phoneNumberId
            });
            showToast('Message sent successfully!', 'success');
            setMsgForm(prev => ({ ...prev, to: '', variables: '' }));
        } catch (error: any) {
            showToast(error.response?.data?.error?.message || 'Failed to send message', 'error');
        } finally {
            setSending(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phones.length === 0) return;
        setLoading(true);
        try {
            await whatsappApi.updateProfile(phones[0].id, {
                ...profileForm,
                websites: profileForm.websites ? [profileForm.websites] : []
            });
            showToast('Profile updated successfully!', 'success');
            fetchData();
        } catch (error) {
            showToast('Failed to update profile', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleFBMessage = (event: MessageEvent) => {
            if (!event.origin.endsWith('facebook.com')) return;
            try {
                let rawData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                const data = Array.isArray(rawData) ? rawData[0] : rawData;

                if (data.type === 'WA_EMBEDDED_SIGNUP') {
                    if (data.event === 'FINISH') {
                        const { phone_number_id, waba_id, business_id } = data.data;
                        sessionInfoRef.current = { waba_id, phone_number_id, business_id };
                    } else if (data.event === 'CANCEL') {
                        showToast(`Signup abandoned`, 'warning');
                    } else if (data.event === 'ERROR') {
                        showToast(`Signup error: ${data.data?.error_message || 'Unknown error'}`, 'error');
                    }
                }
            } catch (e) { }
        };

        window.addEventListener('message', handleFBMessage);
        return () => window.removeEventListener('message', handleFBMessage);
    }, []);

    const handleConnect = () => {
        // @ts-ignore
        if (!window.FB) {
            showToast('Facebook SDK failed to load. Please disable ad-blockers.', 'error');
            return;
        }

        // @ts-ignore
        window.FB.login((response: any) => {
            if (response.authResponse) {
                const code = response.authResponse.code;
                const { waba_id, phone_number_id, business_id } = sessionInfoRef.current;
                
                whatsappApi.handleCallback(code, waba_id, phone_number_id, business_id).then((res) => {
                    showToast('Account linked successfully!', 'success');
                    updateMe({ whatsappConfig: res.data });
                }).catch(() => {
                    showToast('Failed to link account', 'error');
                });
            } else {
                showToast('Signup cancelled or failed', 'error');
            }
        }, {
            config_id: configId,
            response_type: 'code',
            override_default_response_type: true,
            extras: { feature: 'whatsapp_embedded_signup', sessionInfoVersion: '3', version: 'v4', setup: {} }
        });
    };

    const handleDeleteTemplate = async (name: string) => {
        if (!window.confirm('Are you sure you want to delete this template?')) return;
        try {
            await whatsappApi.deleteTemplate(name);
            showToast('Template deleted', 'success');
            fetchData();
        } catch (error) {
            showToast('Failed to delete template', 'error');
        }
    };

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const components = [{ type: 'BODY', text: templateForm.body }];
            if (templateForm.header) components.unshift({ type: 'HEADER', format: 'TEXT', text: templateForm.header } as any);
            if (templateForm.footer) components.push({ type: 'FOOTER', text: templateForm.footer } as any);

            await whatsappApi.createTemplate({
                name: templateForm.name,
                category: templateForm.category,
                language: 'en_US',
                components
            });

            showToast('Template submitted for approval', 'success');
            setCreateDrawerOpen(false);
            setTemplateForm({ name: '', category: 'UTILITY', header: '', body: '', footer: '' });
            fetchData();
        } catch (error) {
            showToast('Failed to create template', 'error');
        }
    };

    const exportTemplatesCSV = () => {
        if (templates.length === 0) return;
        const headers = ['Template Name', 'Status', 'Category', 'Language'];
        const rows = [
            headers.join(','),
            ...templates.map(t => [
                `"${t.name}"`,
                t.status,
                t.category,
                t.language
            ].join(','))
        ];
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `whatsapp_templates_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
    };

    const tabs = [
        { id: '1', label: 'Overview', icon: BarChart2 },
        { id: '2', label: 'Templates', icon: FileText },
        { id: '3', label: 'Direct Message', icon: Send },
        { id: '4', label: 'Business Profile', icon: User },
        { id: '5', label: 'Phone Numbers', icon: Phone },
    ];

    return (
        <div className="animate-in fade-in duration-500 pb-20 font-sans w-full min-w-0">
            {/* Custom Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 text-white shadow-xl text-sm font-medium animate-in slide-in-from-bottom-4 duration-200">
                    <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : toast.type === 'warning' ? 'bg-amber-400' : 'bg-red-400'}`} />
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs w-full min-w-0">
                <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                            <MessageCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight truncate">WhatsApp Business API</h1>
                    </div>
                    <p className="text-xs text-slate-500 m-0 truncate">Manage your official Meta WhatsApp Business Account, verify numbers, and create approved message templates.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3 shrink-0">
                    {!isConnected ? (
                        <button 
                            onClick={handleConnect}
                            className="flex items-center justify-center gap-2.5 px-5 py-2.5 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white rounded-xl text-xs font-semibold shadow-xs transition-all w-full sm:w-auto cursor-pointer shrink-0"
                        >
                            <Facebook className="w-3.5 h-3.5 fill-white shrink-0" />
                            Connect with Facebook
                        </button>
                    ) : (
                        <button 
                            onClick={() => setCreateDrawerOpen(true)}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-semibold shadow-xs transition-all w-full sm:w-auto shrink-0 cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            Create Template
                        </button>
                    )}
                </div>
            </div>

            {!isConnected ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full min-w-0">
                    {/* Onboarding Hero Box */}
                    <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-[#0f1d18] rounded-2xl p-8 sm:p-12 text-center overflow-hidden shadow-xl border border-slate-800">
                        {/* Background glowing blobs */}
                        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
                        
                        <div className="relative z-10 max-w-2xl mx-auto min-w-0">
                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-6">
                                <Sparkles className="w-3.5 h-3.5" /> Official Meta Tech Integration
                            </span>

                            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-6 border border-emerald-500/30 shadow-lg shadow-emerald-500/20">
                                <MessageCircle className="w-8 h-8 text-emerald-400" />
                            </div>

                            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
                                Transform Customer Communication
                            </h2>
                            <p className="text-slate-400 text-xs sm:text-sm mb-8 leading-relaxed max-w-xl mx-auto">
                                Link your official WhatsApp Business Account in 3 minutes to start broadcasting verified templates, handling incoming inquiries in a shared inbox, and building smart automation workflows.
                            </p>

                            <button 
                                onClick={handleConnect}
                                className="inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white rounded-xl text-xs font-bold shadow-md shadow-[#1877F2]/30 transition-all cursor-pointer"
                            >
                                <Facebook className="w-4 h-4 fill-white shrink-0" />
                                Connect with Facebook
                            </button>

                            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 mt-10 text-xs font-semibold text-slate-400 pt-8 border-t border-slate-800/80">
                                <div className="flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" /> End-to-End Encrypted
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Zap className="w-4 h-4 text-amber-400 shrink-0" /> Instant Cloud API Setup
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" /> Verified Green Tick Eligible
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bento Feature Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full min-w-0">
                        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 border border-blue-100 shadow-2xs">
                                <Zap className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">Automated Templates</h3>
                            <p className="text-slate-500 text-xs leading-relaxed m-0">
                                Send order updates, boarding passes, appointment reminders, and one-time verification codes instantly at scale.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 border border-emerald-100 shadow-2xs">
                                <MessageCircle className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">2-Way Live Chat</h3>
                            <p className="text-slate-500 text-xs leading-relaxed m-0">
                                Handle real-time customer conversations through your centralized team inbox with multi-agent collision handling.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 mb-4 border border-purple-100 shadow-2xs">
                                <Bot className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 mb-2 tracking-tight">Smart AI Bot Triggers</h3>
                            <p className="text-slate-500 text-xs leading-relaxed m-0">
                                Construct intelligent reply trees, automate lead capture forms, and route complex inquiries to human agents seamlessly.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {/* Navigation Tabs */}
                    <div className="flex overflow-x-auto custom-scrollbar gap-2 mb-8 bg-slate-100 p-1 rounded-xl w-fit max-w-full min-w-0 border border-slate-200/60">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer shrink-0",
                                    activeTab === tab.id 
                                        ? "bg-white text-slate-900 shadow-2xs font-bold" 
                                        : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <tab.icon className={cn("w-3.5 h-3.5 shrink-0", activeTab === tab.id ? "text-primary" : "")} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab 1: Overview */}
                    {activeTab === '1' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 w-full min-w-0">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all min-w-0">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Templates</span>
                                        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shrink-0">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{templates.length}</div>
                                </div>
                                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all min-w-0">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Numbers</span>
                                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0">
                                            <Phone className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{phones.length}</div>
                                </div>
                                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all min-w-0">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Account WABA ID</span>
                                        <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100 shrink-0">
                                            <ShieldCheck className="w-4 h-4" />
                                        </div>
                                    </div>
                                    <div className="text-xs font-bold text-slate-700 font-mono mt-1 truncate bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80">
                                        {user?.whatsappConfig?.wabaId || 'Not Configured'}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden w-full min-w-0">
                                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                                            <BarChart2 className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900 m-0 tracking-tight truncate">Usage & Delivery Analytics</h3>
                                    </div>
                                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-semibold text-[11px] rounded-md shrink-0 border border-slate-200">Live Meta Feed</span>
                                </div>
                                <div className="p-12 flex flex-col items-center justify-center text-center min-w-0">
                                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-3 border border-slate-200 shrink-0">
                                        <BarChart2 className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-800 mb-1 truncate">Awaiting Message Activity</h4>
                                    <p className="text-xs text-slate-500 max-w-md m-0 leading-relaxed">
                                        Once your automated broadcasts and live chats process through the API, detailed delivery, read rates, and cost analytics will populate here automatically.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Templates */}
                    {activeTab === '2' && (
                        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500 w-full min-w-0">
                            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 w-full min-w-0">
                                <div className="min-w-0">
                                    <h3 className="text-base font-bold text-slate-900 m-0 tracking-tight truncate">Message Templates</h3>
                                    <p className="text-xs text-slate-500 m-0 mt-0.5 truncate">Official Meta pre-approved message blocks for customer broadcasting.</p>
                                </div>
                                <div className="flex items-center gap-2.5 shrink-0">
                                    <button 
                                        onClick={exportTemplatesCSV} 
                                        disabled={templates.length === 0} 
                                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all shadow-2xs disabled:opacity-50 cursor-pointer shrink-0"
                                    >
                                        <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" /> Export CSV
                                    </button>
                                    <button 
                                        onClick={fetchData} 
                                        disabled={loading} 
                                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-all shadow-2xs disabled:opacity-50 hover:border-slate-300 cursor-pointer shrink-0"
                                    >
                                        <RefreshCw className={cn("w-3.5 h-3.5 shrink-0", loading && "animate-spin")} /> Sync Meta
                                    </button>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className="bg-slate-50/80 border-b border-slate-200/80">
                                            <th className="py-3 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Template Name</th>
                                            <th className="py-3 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                            <th className="py-3 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</th>
                                            <th className="py-3 px-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs font-medium">
                                        {templates.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-12 text-center text-slate-500">
                                                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2 shrink-0" />
                                                    <p className="font-bold text-slate-700 m-0 mb-1">No templates synchronized</p>
                                                    <p className="text-xs text-slate-400 m-0">Create a new template using the button above to begin.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            templates.map(t => (
                                                <tr key={t.name} className="hover:bg-slate-50/80 transition-colors group">
                                                    <td className="py-4 px-5 font-bold text-slate-900 flex items-center gap-2.5">
                                                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                                                            <FileText className="w-3.5 h-3.5 shrink-0" />
                                                        </div>
                                                        <span className="truncate max-w-xs">{t.name}</span>
                                                    </td>
                                                    <td className="py-4 px-5 shrink-0">
                                                        <span className={cn(
                                                            "px-2.5 py-1 rounded-md text-xs font-semibold border inline-flex items-center gap-1.5 shadow-2xs",
                                                            t.status === 'APPROVED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                            t.status === 'PENDING' ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                            "bg-red-50 text-red-700 border-red-200"
                                                        )}>
                                                            <span className={cn(
                                                                "w-1.5 h-1.5 rounded-full shrink-0",
                                                                t.status === 'APPROVED' ? "bg-emerald-500" : t.status === 'PENDING' ? "bg-amber-500" : "bg-red-500"
                                                            )} />
                                                            {t.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-5 shrink-0">
                                                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                                                            {t.category}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-5 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button 
                                                                title="Send Template Broadcast"
                                                                onClick={() => { setActiveTab('3'); setMsgForm(prev => ({ ...prev, templateName: t.name })); }}
                                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition-colors cursor-pointer shrink-0 border border-primary/20 shadow-2xs"
                                                            >
                                                                <Send className="w-3 h-3 shrink-0" /> Send
                                                            </button>
                                                            <button 
                                                                title="Delete Template"
                                                                onClick={() => handleDeleteTemplate(t.name)}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer shrink-0 border border-transparent hover:border-red-200"
                                                            >
                                                                <Trash2 className="w-4 h-4 shrink-0" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Direct Message */}
                    {activeTab === '3' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500 w-full min-w-0">
                            <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden min-w-0">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                    <div className="min-w-0">
                                        <h3 className="text-base font-bold text-slate-900 m-0 tracking-tight truncate">Direct Template Dispatch</h3>
                                        <p className="text-xs text-slate-500 m-0 mt-0.5 truncate">Send instant verified WhatsApp notifications directly to any customer.</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                                        <Send className="w-4 h-4 shrink-0" />
                                    </div>
                                </div>
                                <form onSubmit={handleSendMessage} className="p-6 space-y-5 text-xs font-medium">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">From Number *</label>
                                            <select 
                                                required 
                                                value={msgForm.phoneNumberId} 
                                                onChange={e => setMsgForm({...msgForm, phoneNumberId: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all appearance-none pr-10 cursor-pointer text-xs"
                                            >
                                                <option value="">Select sender phone number</option>
                                                {phones.map(p => (
                                                    <option key={p.id} value={p.id}>{p.verified_name} ({p.display_phone_number})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Recipient Phone *</label>
                                            <input 
                                                required 
                                                type="text" 
                                                placeholder="e.g. 919876543210 (include country code)" 
                                                value={msgForm.to}
                                                onChange={e => setMsgForm({...msgForm, to: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-xs" 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Select Approved Template *</label>
                                        <select 
                                            required 
                                            value={msgForm.templateName} 
                                            onChange={e => setMsgForm({...msgForm, templateName: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all appearance-none pr-10 cursor-pointer text-xs"
                                        >
                                            <option value="">Select an approved template from Meta</option>
                                            {templates.filter(t => t.status === 'APPROVED').map(t => (
                                                <option key={t.name} value={t.name}>{t.name} ({t.category})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider m-0">Template Variable Values (Optional)</label>
                                            <span className="text-[11px] font-semibold text-slate-400">Comma separated for {"{{1}}, {{2}}"}</span>
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Sudip Das, Order #9923, Tomorrow 5 PM" 
                                            value={msgForm.variables}
                                            onChange={e => setMsgForm({...msgForm, variables: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-xs" 
                                        />
                                    </div>
                                    <div className="pt-4 border-t border-slate-100">
                                        <button 
                                            type="submit" 
                                            disabled={sending}
                                            className="w-full flex items-center justify-center gap-2 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                                        >
                                            {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" /> : <Send className="w-4 h-4 shrink-0" />}
                                            Dispatch WhatsApp Message
                                        </button>
                                    </div>
                                </form>
                            </div>
                            
                            <div className="lg:col-span-4 space-y-6 min-w-0">
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-2xs">
                                    <div className="flex items-center gap-2.5 mb-3 text-slate-800">
                                        <div className="w-8 h-8 rounded-xl bg-slate-200/80 flex items-center justify-center text-slate-700 border border-slate-300/80 shrink-0">
                                            <Info className="w-4 h-4 shrink-0" />
                                        </div>
                                        <h4 className="text-sm font-bold m-0">Meta Dispatch Rules</h4>
                                    </div>
                                    <ul className="space-y-3 text-xs text-slate-600 list-none p-0 m-0">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                            <span>Only <strong className="text-slate-900 font-bold">Approved</strong> templates can initiate a new 24-hour business conversation.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                            <span>Phone numbers must include country code without "+" or leading zeroes (e.g., 91987654...).</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                            <span>Variable parameters must precisely match the positional order in your template definition.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab 4: Business Profile */}
                    {activeTab === '4' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500 w-full min-w-0">
                            <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden min-w-0">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50 min-w-0">
                                    <h3 className="text-base font-bold text-slate-900 m-0 tracking-tight truncate">Official WhatsApp Business Profile</h3>
                                    <p className="text-xs text-slate-500 m-0 mt-0.5 truncate">This information displays publicly inside WhatsApp when customers view your business info.</p>
                                </div>
                                <form onSubmit={handleUpdateProfile} className="p-6 space-y-5 text-xs">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Public Email</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 shrink-0" />
                                                <input 
                                                    type="email" 
                                                    value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})}
                                                    placeholder="contact@business.com" 
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-xs" 
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Official Website</label>
                                            <div className="relative">
                                                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 shrink-0" />
                                                <input 
                                                    type="url" 
                                                    value={profileForm.websites} onChange={e => setProfileForm({...profileForm, websites: e.target.value})}
                                                    placeholder="https://www.business.com" 
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-xs" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Physical Business Address</label>
                                        <input 
                                            type="text" 
                                            value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})}
                                            placeholder="123 Innovation Way, Tech District, City, Country" 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-xs" 
                                        />
                                    </div>

                                    <div>
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Business Bio & Description</label>
                                        <textarea 
                                            rows={4} 
                                            value={profileForm.description} onChange={e => setProfileForm({...profileForm, description: e.target.value})}
                                            placeholder="Tell your customers what products or professional services you provide..." 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all resize-none text-xs" 
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">About Status Line</label>
                                            <input 
                                                type="text" 
                                                value={profileForm.about} onChange={e => setProfileForm({...profileForm, about: e.target.value})}
                                                placeholder="Official Business Account. Quick response time." 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-xs" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Industry Vertical</label>
                                            <div className="relative">
                                                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 shrink-0" />
                                                <select 
                                                    value={profileForm.vertical} onChange={e => setProfileForm({...profileForm, vertical: e.target.value})}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all appearance-none relative cursor-pointer text-xs"
                                                >
                                                    <option value="RETAIL">Retail</option>
                                                    <option value="EDUCATION">Education</option>
                                                    <option value="HEALTH">Healthcare</option>
                                                    <option value="PROF_SERVICES">Professional Services</option>
                                                    <option value="HOTEL">Hospitality</option>
                                                    <option value="OTHER">Other</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-5 border-t border-slate-100 flex justify-end">
                                        <button 
                                            type="submit" 
                                            disabled={loading}
                                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                                        >
                                            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                                            Save Business Profile
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="lg:col-span-4 min-w-0">
                                {profile && phones.length > 0 && (
                                    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6 flex flex-col items-center text-center min-w-0">
                                        <div className="w-20 h-20 rounded-2xl bg-slate-100 border-4 border-white shadow-md mb-4 overflow-hidden flex items-center justify-center text-slate-300 shrink-0">
                                            {profile.profile_picture_url ? (
                                                <img src={profile.profile_picture_url} className="w-full h-full object-cover" alt="profile" />
                                            ) : <User className="w-10 h-10 text-slate-400" />}
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900 mb-1 truncate max-w-full">{phones[0].verified_name}</h3>
                                        <p className="text-xs font-semibold text-emerald-600 mb-6 flex items-center gap-1 justify-center truncate max-w-full">
                                            <Phone className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{phones[0].display_phone_number}</span>
                                        </p>
                                        
                                        <div className="w-full space-y-3 pt-5 border-t border-slate-100 text-left min-w-0 text-xs">
                                            <div className="min-w-0">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Registered Email</div>
                                                <div className="font-semibold text-slate-800 truncate">{profile.email || 'Not configured'}</div>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Official Website</div>
                                                <div className="font-semibold text-blue-600 truncate">{profile.websites?.[0] || 'Not configured'}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Meta Industry Tag</div>
                                                <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-[11px] font-bold border border-slate-200">
                                                    {profile.vertical || 'OTHER'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab 5: Phone Numbers */}
                    {activeTab === '5' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500 w-full min-w-0">
                            {phones.length > 0 ? phones.map(phone => (
                                <div key={phone.id} className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between min-w-0">
                                    <div className="min-w-0">
                                        <div className="flex justify-between items-start mb-5 min-w-0 gap-2">
                                            <div className="min-w-0">
                                                <h3 className="text-base font-bold text-slate-900 mb-1 truncate">{phone.verified_name}</h3>
                                                <p className="text-xs font-semibold text-slate-500 m-0 truncate">{phone.display_phone_number}</p>
                                            </div>
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-md text-xs font-bold border inline-flex items-center gap-1.5 shadow-2xs shrink-0",
                                                phone.quality_rating === 'GREEN' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                                            )}>
                                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", phone.quality_rating === 'GREEN' ? "bg-emerald-500" : "bg-amber-500")} />
                                                {phone.quality_rating} Rating
                                            </span>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-3.5 mb-5 border border-slate-100 space-y-1 min-w-0 text-xs">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">Phone Number ID</div>
                                            <div className="font-mono font-bold text-slate-700 truncate">{phone.id}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2.5 pt-4 border-t border-slate-100 shrink-0">
                                        <button 
                                            onClick={() => setActiveTab('4')}
                                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                                        >
                                            Edit Profile
                                        </button>
                                        <button 
                                            onClick={() => { setActiveTab('3'); setMsgForm(prev => ({ ...prev, phoneNumberId: phone.id })); }}
                                            className="flex-1 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                                        >
                                            <Send className="w-3.5 h-3.5 shrink-0" /> Broadcast
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full py-20 bg-white rounded-2xl border border-slate-200/80 text-center shadow-xs min-w-0">
                                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-200 shrink-0">
                                        <Phone className="w-8 h-8 text-slate-400" />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-800 mb-1 truncate">No Verified Phone Numbers</h3>
                                    <p className="text-xs text-slate-500 max-w-md mx-auto m-0 leading-relaxed">
                                        Link your official Meta WhatsApp Business account via Facebook Connect above to pull active verified phone numbers.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Custom Sliding Drawer for Creating Template (Replacing Ant Design Drawer) */}
            {createDrawerOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
                        <div className="w-screen max-w-lg bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full animate-in slide-in-from-right duration-300 font-sans">
                            <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-white shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                                        +
                                    </div>
                                    <h2 className="text-base font-bold text-slate-900 m-0 tracking-tight truncate">Create WhatsApp Template</h2>
                                </div>
                                <button onClick={() => setCreateDrawerOpen(false)} className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shrink-0">
                                    <X className="w-4 h-4 shrink-0" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-xs">
                                <form id="wa-template-form" onSubmit={handleCreateTemplate} className="space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Template Name *</label>
                                            <input 
                                                required 
                                                value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})}
                                                placeholder="e.g. order_update_v1" 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all lowercase text-xs" 
                                            />
                                            <p className="text-[10px] font-semibold text-slate-400 mt-1 m-0">Lowercase & underscores only</p>
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Meta Category</label>
                                            <select 
                                                value={templateForm.category} onChange={e => setTemplateForm({...templateForm, category: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all appearance-none cursor-pointer text-xs"
                                            >
                                                <option value="MARKETING">Marketing (Offers, Promos)</option>
                                                <option value="UTILITY">Utility (Updates, Receipts)</option>
                                                <option value="AUTHENTICATION">Authentication (OTPs)</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Header Title (Optional)</label>
                                        <input 
                                            value={templateForm.header} onChange={e => setTemplateForm({...templateForm, header: e.target.value})}
                                            placeholder="e.g. Instant Booking #{{1}} Confirmation" 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-xs" 
                                        />
                                    </div>
                                    
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider m-0">Body Message Content *</label>
                                            <span className="text-[10px] font-bold text-primary">Use {"{{1}}, {{2}}"} for variables</span>
                                        </div>
                                        <textarea 
                                            required 
                                            rows={5} 
                                            value={templateForm.body} onChange={e => setTemplateForm({...templateForm, body: e.target.value})}
                                            placeholder="Hi {{1}}, your order #{{2}} is ready for dispatch." 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all resize-none leading-relaxed text-xs" 
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Footer Attribution Line (Optional)</label>
                                        <input 
                                            value={templateForm.footer} onChange={e => setTemplateForm({...templateForm, footer: e.target.value})}
                                            placeholder="e.g. DoConnect Care" 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-xs" 
                                        />
                                    </div>
                                </form>
                            </div>

                            <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                                <button type="button" onClick={() => setCreateDrawerOpen(false)} className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer">
                                    Cancel
                                </button>
                                <button form="wa-template-form" type="submit" className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer">
                                    Submit Template to Meta
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsApp;
