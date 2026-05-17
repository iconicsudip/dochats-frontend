import React, { useState, useEffect } from 'react';
import { Plus, Edit3, X, User, Building2, Briefcase } from 'lucide-react';
import { CrmLead } from '../../api/crm';

interface TeamMember {
    id: string;
    name?: string;
    username?: string;
    email?: string;
}

interface ContactDrawerFormProps {
    isOpen: boolean;
    mode: 'add' | 'edit';
    initialData?: Partial<CrmLead> | null;
    onClose: () => void;
    onSubmit: (data: Partial<CrmLead>) => Promise<void>;
    userRole?: string;
    userId?: string;
    teamMembers?: TeamMember[];
}

const PIPELINE_STAGES = [
    { key: 'NEW', label: 'New Lead' },
    { key: 'CONTACTED', label: 'Contacted' },
    { key: 'QUALIFIED', label: 'Qualified' },
    { key: 'PROPOSAL', label: 'Proposal Sent' },
    { key: 'WON', label: 'Closed Won' },
    { key: 'LOST', label: 'Closed Lost' }
];

const LIFECYCLE_STAGES = ['Lead', 'MQL', 'SQL', 'Customer', 'Evangelist'];
const INDUSTRIES = ['SaaS', 'Healthcare', 'Real Estate', 'Retail', 'Finance', 'Technology', 'Manufacturing', 'E-commerce'];
const SOURCES = ['Direct', 'WhatsApp', 'Smart Link', 'Referral'];

export const ContactDrawerForm: React.FC<ContactDrawerFormProps> = ({
    isOpen,
    mode,
    initialData,
    onClose,
    onSubmit,
    userRole,
    userId,
    teamMembers = []
}) => {
    const [formData, setFormData] = useState<Partial<CrmLead>>({
        name: '',
        phone: '',
        email: '',
        value: 50000,
        company: 'Apex Corp',
        jobTitle: 'VP Marketing',
        city: 'Mumbai',
        status: 'NEW',
        lifecycleStage: 'SQL',
        industry: 'SaaS',
        source: 'Direct',
        assignedTo: userId || ''
    });

    const [topicsInput, setTopicsInput] = useState<string>('AI Chatbots, WhatsApp Marketing, Workflow Automation');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && initialData) {
                setFormData({
                    name: initialData.name || '',
                    phone: initialData.phone || '',
                    email: initialData.email || '',
                    value: initialData.value ?? 50000,
                    company: initialData.company || initialData.industry || '',
                    jobTitle: initialData.jobTitle || '',
                    city: initialData.city || '',
                    status: initialData.status || 'NEW',
                    lifecycleStage: initialData.lifecycleStage || 'SQL',
                    industry: initialData.industry || 'SaaS',
                    source: initialData.source || 'Direct',
                    assignedTo: initialData.assignedTo || userId || ''
                });
                setTopicsInput(initialData.favoriteTopics?.join(', ') || 'AI Chatbots, WhatsApp Marketing, Workflow Automation');
            } else {
                setFormData({
                    name: '',
                    phone: '',
                    email: '',
                    value: 50000,
                    company: 'Apex Corp',
                    jobTitle: 'VP Marketing',
                    city: 'Mumbai',
                    status: 'NEW',
                    lifecycleStage: 'SQL',
                    industry: 'SaaS',
                    source: 'Direct',
                    assignedTo: userId || ''
                });
                setTopicsInput('AI Chatbots, WhatsApp Marketing, Workflow Automation');
            }
        }
    }, [isOpen, mode, initialData, userId]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload: Partial<CrmLead> = { 
                ...formData,
                favoriteTopics: topicsInput.split(',').map(t => t.trim()).filter(Boolean)
            };
            if (userRole === 'SUB_USER') {
                delete payload.assignedTo;
            }
            await onSubmit(payload);
            onClose();
        } catch (error) {
            console.error('Error submitting form:', error);
        } finally {
            setLoading(false);
        }
    };

    const teamMembersMap = teamMembers.reduce((acc, m) => {
        acc[m.id] = m.name || m.username || m.email || 'Team Member';
        return acc;
    }, {} as Record<string, string>);

    return (
        <div className="fixed inset-0 z-[200] flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
            <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-300">
                {/* Drawer Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0 border border-primary/20">
                            {mode === 'add' ? <Plus className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight text-slate-900 m-0">
                                {mode === 'add' ? 'Create Contact Profile' : 'Edit Contact Dossier'}
                            </h2>
                            <div className="text-xs font-semibold text-slate-500 mt-0.5">
                                {mode === 'add' 
                                    ? 'Enter professional details, pipeline stages, and contact segmentation properties.'
                                    : `Modify record parameters and pipeline properties for ${formData.name || 'Contact'}.`}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar font-medium">
                    <form id="contact-drawer-form" onSubmit={handleSubmit} className="space-y-6 text-xs text-slate-800">
                        {/* Section 1: Basic Identifiers */}
                        <div className="border border-slate-200/80 rounded-2xl p-6 bg-white shadow-2xs space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-bold text-slate-800 uppercase tracking-wider">
                                <User className="w-4 h-4 text-primary" />
                                <span>Basic Identifiers</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 text-[10px]">Full Name *</label>
                                    <input 
                                        required 
                                        type="text" 
                                        placeholder="Rahul Sharma" 
                                        value={formData.name || ''} 
                                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all text-slate-800" 
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 text-[10px]">Phone Number *</label>
                                    <input 
                                        required 
                                        type="text" 
                                        placeholder="+91 98765 43210" 
                                        value={formData.phone || ''} 
                                        onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all text-slate-800 font-mono" 
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 text-[10px]">Email Address</label>
                                    <input 
                                        type="email" 
                                        placeholder="rahul@apexcorp.com" 
                                        value={formData.email || ''} 
                                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all text-slate-800" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Employment & Demographics */}
                        <div className="border border-slate-200/80 rounded-2xl p-6 bg-white shadow-2xs space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-bold text-slate-800 uppercase tracking-wider">
                                <Building2 className="w-4 h-4 text-primary" />
                                <span>Employment & Demographics</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 text-[10px]">Company Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="Apex Corp" 
                                        value={formData.company || ''} 
                                        onChange={e => setFormData(prev => ({ ...prev, company: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all text-slate-800" 
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 text-[10px]">Job Title</label>
                                    <input 
                                        type="text" 
                                        placeholder="VP Marketing" 
                                        value={formData.jobTitle || ''} 
                                        onChange={e => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all text-slate-800" 
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 text-[10px]">City / Location</label>
                                    <input 
                                        type="text" 
                                        placeholder="Mumbai" 
                                        value={formData.city || ''} 
                                        onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all text-slate-800" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Sales Pipeline & Ownership */}
                        <div className="border border-slate-200/80 rounded-2xl p-6 bg-white shadow-2xs space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xs font-bold text-slate-800 uppercase tracking-wider">
                                <Briefcase className="w-4 h-4 text-primary" />
                                <span>Sales Pipeline & Ownership</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 text-[10px]">Deal Opportunity Value (₹)</label>
                                    <input 
                                        type="number" 
                                        value={formData.value || 0} 
                                        onChange={e => setFormData(prev => ({ ...prev, value: Number(e.target.value) }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm text-emerald-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-mono" 
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 text-[10px]">Pipeline Status</label>
                                    <select 
                                        value={formData.status || 'NEW'} 
                                        onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary cursor-pointer text-slate-800"
                                    >
                                        {PIPELINE_STAGES.map(s => (<option key={s.key} value={s.key}>{s.label}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 text-[10px]">Lifecycle Stage</label>
                                    <select 
                                        value={formData.lifecycleStage || 'SQL'} 
                                        onChange={e => setFormData(prev => ({ ...prev, lifecycleStage: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary cursor-pointer text-slate-800"
                                    >
                                        {LIFECYCLE_STAGES.map(stage => (
                                            <option key={stage} value={stage}>{stage}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 text-[10px]">Industry Vertical</label>
                                    <select 
                                        value={formData.industry || 'SaaS'} 
                                        onChange={e => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary cursor-pointer text-slate-800"
                                    >
                                        {INDUSTRIES.map(ind => (<option key={ind} value={ind}>{ind}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 text-[10px]">Ingestion Source</label>
                                    <select 
                                        value={formData.source || 'Direct'} 
                                        onChange={e => setFormData(prev => ({ ...prev, source: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary cursor-pointer text-slate-800"
                                    >
                                        {SOURCES.map(src => (<option key={src} value={src}>{src}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 text-[10px]">Assigned Owner / Sub-User</label>
                                    {userRole === 'SUB_USER' ? (
                                        <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-xs font-semibold text-slate-500 cursor-not-allowed">
                                            {teamMembersMap[formData.assignedTo || ''] || 'Workspace Owner'}
                                        </div>
                                    ) : (
                                        <select 
                                            value={formData.assignedTo || userId || ''} 
                                            onChange={e => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary cursor-pointer text-slate-800"
                                        >
                                            <option value={userId || ''}>👑 Workspace Owner (You)</option>
                                            {teamMembers.map(m => (
                                                <option key={m.id} value={m.id}>👤 {m.name || m.username || m.email}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 text-[10px]">Favorite Content Topics (Comma Separated)</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Automation, AI, Marketing" 
                                        value={topicsInput} 
                                        onChange={e => setTopicsInput(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all text-slate-800" 
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Drawer Footer */}
                <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs">
                        Cancel
                    </button>
                    <button disabled={loading} form="contact-drawer-form" type="submit" className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer flex items-center gap-2">
                        {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                        {mode === 'add' ? 'Save Contact' : 'Update Profile'}
                    </button>
                </div>
            </div>
        </div>
    );
};
