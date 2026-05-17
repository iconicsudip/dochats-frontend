import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { crmApi, CrmLead } from '../../api/crm';
import {
    Activity, Plus, Search, User, Phone, Mail, MessageCircle, Calendar,
    DollarSign, MoreHorizontal, Eye, Download, Flame, Clock, CheckCircle,
    LayoutGrid, List, X, Building2, Tag, ArrowRight, ShieldAlert, Sparkles, Filter, ChevronRight, ChevronDown
} from 'lucide-react';

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';

const STATUS_CONFIG: Record<LeadStatus, { color: string; bg: string; border: string; label: string; icon: any; dot: string; accentBorder: string }> = {
    new: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'New Leads', icon: Flame, dot: 'bg-blue-500', accentBorder: 'border-t-2 border-t-blue-500' },
    contacted: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Contacted', icon: Phone, dot: 'bg-amber-500', accentBorder: 'border-t-2 border-t-amber-500' },
    qualified: { color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', label: 'Qualified', icon: CheckCircle, dot: 'bg-indigo-500', accentBorder: 'border-t-2 border-t-indigo-500' },
    proposal: { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Proposal', icon: Mail, dot: 'bg-purple-500', accentBorder: 'border-t-2 border-t-purple-500' },
    won: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Won', icon: CheckCircle, dot: 'bg-emerald-500', accentBorder: 'border-t-2 border-t-emerald-500' },
    lost: { color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', label: 'Lost', icon: Clock, dot: 'bg-slate-500', accentBorder: 'border-t-2 border-t-slate-400' },
};

const PIPELINE_STAGES: { key: LeadStatus; label: string }[] = [
    { key: 'new', label: 'New Leads' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'qualified', label: 'Qualified' },
    { key: 'proposal', label: 'Proposal' },
    { key: 'won', label: 'Won' },
    { key: 'lost', label: 'Lost' },
];

const CRM: React.FC = () => {
    const [view, setView] = useState<'pipeline' | 'list'>('pipeline');
    const [leads, setLeads] = useState<CrmLead[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    
    // Drawer States
    const [drawerType, setDrawerType] = useState<'none' | 'add' | 'detail'>('none');
    const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);

    // Custom Toast Notification State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Custom Dropdown State for Kanban Cards and Table Rows
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

    // Drag and Drop State
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
    const [activeDropStage, setActiveDropStage] = useState<string | null>(null);

    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'new') {
            setDrawerType('add');
        }
    }, [location.search]);

    useEffect(() => {
        fetchLeads();
    }, []);

    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const fetchLeads = async () => {
        try {
            const data = await crmApi.getLeads();
            setLeads(data.map(l => ({ ...l, lastActivity: l.updatedAt ? l.updatedAt.split('T')[0] : 'Just now' })));
        } catch (error) {
            console.error(error);
        }
    };

    const filteredLeads = leads.filter(l => {
        const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.phone.includes(searchTerm) || (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = filterStatus === 'all' || l.status.toLowerCase() === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: leads.length,
        won: leads.filter(l => l.status === 'WON').length,
        totalValue: leads.reduce((a, l) => a + l.value, 0),
        conversionRate: Math.round((leads.filter(l => l.status === 'WON').length / (leads.length || 1)) * 100),
    };

    const handleAddLead = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const values = {
            name: formData.get('name') as string,
            phone: formData.get('phone') as string,
            email: formData.get('email') as string,
            value: Number(formData.get('value')),
            industry: formData.get('industry') as string,
            source: formData.get('source') as string,
        };
        try {
            await crmApi.createLead(values);
            setDrawerType('none');
            showToast('Lead created successfully', 'success');
            fetchLeads();
        } catch (error) {
            console.error(error);
            showToast('Failed to create lead', 'error');
        }
    };

    const handleExportCSV = () => {
        if (filteredLeads.length === 0) return;
        const headers = ['Lead Name', 'Phone Number', 'Email Address', 'Deal Value', 'Pipeline Status', 'Industry', 'Lead Source', 'Last Active'];
        const csvRows = [
            headers.join(','),
            ...filteredLeads.map(l => [
                `"${(l.name || '').replace(/"/g, '""')}"`,
                `"${(l.phone || '').replace(/"/g, '""')}"`,
                `"${(l.email || '').replace(/"/g, '""')}"`,
                l.value,
                l.status,
                `"${(l.industry || '').replace(/"/g, '""')}"`,
                `"${(l.source || '').replace(/"/g, '""')}"`,
                l.lastActivity
            ].join(','))
        ];
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `crm_pipeline_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
    };

    const moveLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus.toUpperCase() as any } : l));
        if (selectedLead?.id === leadId) setSelectedLead(prev => prev ? { ...prev, status: newStatus.toUpperCase() as any } : null);
        setOpenDropdownId(null);
        try {
            await crmApi.updateStatus(leadId, newStatus.toUpperCase());
            showToast(`Lead moved to ${newStatus}`, 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to update status', 'error');
            fetchLeads();
        }
    };

    const formatAssignedTo = (assignedTo?: string) => {
        if (!assignedTo) return 'Unassigned';
        if (assignedTo.length > 12) {
            return `${assignedTo.substring(0, 10)}...`;
        }
        return assignedTo;
    };

    return (
        <div className="animate-in fade-in duration-300 pb-20 font-sans w-full min-w-0 text-slate-800">
            {/* Custom Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 text-white shadow-xl text-sm font-medium animate-in slide-in-from-bottom-4 duration-200">
                    <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Header section - Minimal Enterprise SaaS Aesthetic */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs w-full min-w-0">
                <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                            <Activity className="w-5 h-5 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight truncate">CRM & Pipeline</h1>
                    </div>
                    <p className="text-xs text-slate-500 m-0 truncate">Track incoming leads, manage multi-stage deals, and close business with clean enterprise boards.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
                    <button 
                        onClick={handleExportCSV}
                        disabled={filteredLeads.length === 0}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all w-full sm:w-auto shadow-2xs cursor-pointer disabled:opacity-50 shrink-0"
                    >
                        <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Export CSV</span>
                    </button>
                    <button 
                        onClick={() => setDrawerType('add')}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all w-full sm:w-auto shrink-0 cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span>Add New Lead</span>
                    </button>
                </div>
            </div>

            {/* Stats Row - Calm Grayscale Surfaces */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 w-full min-w-0">
                {[
                    { label: 'Active Pipeline Leads', value: stats.total, color: 'text-slate-900', bg: 'bg-slate-100/80 border-slate-200', icon: User },
                    { label: 'Closed Won Deals', value: stats.won, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', icon: CheckCircle },
                    { label: 'Total Deal Value', value: `₹${(stats.totalValue / 1000).toFixed(0)}K`, color: 'text-slate-900', bg: 'bg-slate-100/80 border-slate-200', icon: DollarSign },
                    { label: 'Conversion Win Rate', value: `${stats.conversionRate}%`, color: 'text-primary', bg: 'bg-primary/10 border-primary/20', icon: Activity },
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all min-w-0">
                        <div className="flex justify-between items-center mb-3 min-w-0">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">{s.label}</span>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${s.bg}`}>
                                <s.icon className={`w-4 h-4 shrink-0 ${s.color}`} />
                            </div>
                        </div>
                        <div className="text-2xl font-bold text-slate-900 tracking-tight truncate">{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Controls Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs w-full min-w-0">
                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 min-w-0">
                    <div className="relative w-full sm:w-72 min-w-0">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all min-w-0"
                        />
                    </div>
                    <div className="relative w-full sm:w-56 shrink-0">
                        <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10 shrink-0" />
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none relative"
                        >
                            <option value="all">All Pipeline Stages</option>
                            {PIPELINE_STAGES.map(s => (
                                <option key={s.key} value={s.key}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto shrink-0 border border-slate-200/60">
                    {(['pipeline', 'list'] as const).map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                view === v ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900"
                            }`}
                        >
                            {v === 'pipeline' ? <LayoutGrid className="w-3.5 h-3.5 shrink-0" /> : <List className="w-3.5 h-3.5 shrink-0" />}
                            {v === 'pipeline' ? 'Kanban Board' : 'Table View'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Views */}
            {view === 'pipeline' ? (
                /* Jira/Linear-Style Kanban Board Container */
                <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar items-start min-h-[600px] w-full min-w-0">
                    {PIPELINE_STAGES.map(stage => {
                        const stageLeads = filteredLeads.filter(l => l.status.toLowerCase() === stage.key.toLowerCase());
                        const config = STATUS_CONFIG[stage.key];
                        const colTotalValue = stageLeads.reduce((a, b) => a + b.value, 0);
                        const isDropActive = activeDropStage === stage.key;

                        return (
                            /* Linear Column Container: HTML5 Drop Zone */
                            <div 
                                key={stage.key} 
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    if (activeDropStage !== stage.key) setActiveDropStage(stage.key);
                                }}
                                onDragLeave={(e) => {
                                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                        setActiveDropStage(null);
                                    }
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setActiveDropStage(null);
                                    if (draggedLeadId) {
                                        moveLeadStatus(draggedLeadId, stage.key);
                                        setDraggedLeadId(null);
                                    }
                                }}
                                className={`min-w-[310px] w-[310px] shrink-0 bg-slate-50 rounded-2xl border transition-all duration-200 flex flex-col h-[650px] overflow-hidden shadow-2xs ${
                                    isDropActive ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-slate-200/80'
                                }`}
                            >
                                {/* Linear Column Header */}
                                <div className="p-4 bg-white border-b border-slate-200 flex flex-col gap-2 shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${config.dot}`} />
                                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">{stage.label}</span>
                                        </div>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                            {stageLeads.length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px] font-medium text-slate-500 pt-1">
                                        <span>Estimated Total</span>
                                        <span className="text-slate-900 font-semibold font-mono">₹{(colTotalValue / 1000).toFixed(0)}k</span>
                                    </div>
                                </div>
                                
                                {/* Linear Scrollable Column Body */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                                    {stageLeads.map(lead => (
                                        <div 
                                            key={lead.id} 
                                            draggable
                                            onDragStart={(e) => {
                                                setDraggedLeadId(lead.id);
                                                e.dataTransfer.effectAllowed = 'move';
                                            }}
                                            onDragEnd={() => {
                                                setDraggedLeadId(null);
                                                setActiveDropStage(null);
                                            }}
                                            className={`bg-white rounded-xl p-4 border border-slate-200 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing group relative flex flex-col gap-3.5 ${config.accentBorder} ${
                                                draggedLeadId === lead.id ? 'opacity-40 ring-2 ring-primary/50' : ''
                                            }`}
                                            onClick={() => { setSelectedLead(lead); setDrawerType('detail'); }}
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                                                        {lead.name.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="text-xs font-bold text-slate-900 leading-tight m-0 group-hover:text-primary transition-colors truncate">{lead.name}</h4>
                                                        <span className="text-[11px] text-slate-400 block truncate">{lead.industry || 'General Industry'}</span>
                                                    </div>
                                                </div>
                                                
                                                {/* Pure React State Dropdown Menu */}
                                                <div className="relative shrink-0">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenDropdownId(openDropdownId === lead.id ? null : lead.id);
                                                        }}
                                                        className="text-slate-400 hover:text-slate-800 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                                                    >
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </button>
                                                    
                                                    {openDropdownId === lead.id && (
                                                        <div 
                                                            className="absolute right-0 top-7 z-30 w-44 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 divide-y divide-slate-100 animate-in zoom-in-95 duration-100"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Move to stage</div>
                                                            {PIPELINE_STAGES.filter(s => s.key !== stage.key).map(s => (
                                                                <button
                                                                    key={s.key}
                                                                    onClick={() => moveLeadStatus(lead.id, s.key as LeadStatus)}
                                                                    className="w-full px-3 py-1.5 text-xs text-left font-medium text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors flex items-center justify-between cursor-pointer"
                                                                >
                                                                    <span>{s.label}</span>
                                                                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                                <div className="flex items-center gap-1.5 truncate">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    <span className="truncate">{lead.phone}</span>
                                                </div>
                                                <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                                                    ₹{(lead.value / 1000).toFixed(0)}k
                                                </span>
                                            </div>
                                            
                                            <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-medium">
                                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold truncate max-w-[120px]">
                                                    {lead.source || 'Direct'}
                                                </span>
                                                <span className="flex items-center gap-1 shrink-0">
                                                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                                    <span>{lead.lastActivity}</span>
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {/* Empty Drop Area if No Cards */}
                                    {stageLeads.length === 0 && (
                                        <div className={`h-28 border border-dashed rounded-xl flex flex-col items-center justify-center text-center p-4 transition-all ${
                                            isDropActive ? 'border-primary bg-primary/10 text-primary' : 'border-slate-300 bg-white/50 text-slate-400'
                                        }`}>
                                            <Tag className="w-4 h-4 mb-1" />
                                            <span className="text-xs font-medium">{isDropActive ? 'Drop card to move' : 'Drop cards here'}</span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Linear Column Footer / Quick Add Button */}
                                <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                                    <button 
                                        onClick={() => setDrawerType('add')} 
                                        className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5 text-slate-500 shrink-0" /> <span>Quick Add Lead</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden w-full">
                    <div className="overflow-x-auto min-h-[360px]">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lead Info</th>
                                    <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact Details</th>
                                    <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pipeline Stage</th>
                                    <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Deal Value</th>
                                    <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Activity</th>
                                    <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {filteredLeads.map(lead => {
                                    const config = STATUS_CONFIG[lead.status.toLowerCase() as LeadStatus];
                                    return (
                                        <tr 
                                            key={lead.id} 
                                            className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                            onClick={() => { setSelectedLead(lead); setDrawerType('detail'); }}
                                        >
                                            <td className="py-4 px-6 min-w-[200px]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0">
                                                        {lead.name.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-slate-900 group-hover:text-primary transition-colors truncate">{lead.name}</div>
                                                        <div className="text-slate-400 truncate">{lead.industry || 'Unknown'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 min-w-[180px]">
                                                <div className="text-slate-800 font-medium flex items-center gap-1.5 truncate">
                                                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" /> <span className="truncate">{lead.phone}</span>
                                                </div>
                                                {lead.email && <div className="text-slate-500 flex items-center gap-1.5 mt-0.5 truncate"><Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> <span className="truncate">{lead.email}</span></div>}
                                            </td>
                                            <td className="py-4 px-6 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <div className="relative inline-block">
                                                    <button
                                                        onClick={() => setOpenDropdownId(openDropdownId === `stage-${lead.id}` ? null : `stage-${lead.id}`)}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border shadow-2xs transition-all hover:opacity-90 cursor-pointer ${config.bg} ${config.color} ${config.border}`}
                                                    >
                                                        <config.icon className="w-3.5 h-3.5 shrink-0" />
                                                        <span>{config.label}</span>
                                                        <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
                                                    </button>
                                                    
                                                    {openDropdownId === `stage-${lead.id}` && (
                                                        <div className="absolute left-0 top-9 z-30 w-44 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 divide-y divide-slate-100 animate-in zoom-in-95 duration-100">
                                                            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Change Stage</div>
                                                            {PIPELINE_STAGES.map(s => (
                                                                <button
                                                                    key={s.key}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        moveLeadStatus(lead.id, s.key as LeadStatus);
                                                                    }}
                                                                    className={`w-full px-3 py-2 text-xs text-left font-medium hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                                                                        lead.status.toLowerCase() === s.key ? 'text-primary font-bold bg-primary/5' : 'text-slate-700'
                                                                    }`}
                                                                >
                                                                    <span>{s.label}</span>
                                                                    {lead.status.toLowerCase() === s.key && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 shrink-0">
                                                <span className="font-bold text-slate-900 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200 shadow-2xs font-mono">
                                                    ₹{lead.value.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-slate-500 font-medium shrink-0">
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" /> <span>{lead.lastActivity}</span>
                                                </span>
                                            </td>
                                            <td className="py-4 px-6" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => window.open(`tel:${lead.phone}`)}
                                                        title="Phone Call"
                                                        className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200 hover:text-slate-900 transition-colors shrink-0 shadow-2xs cursor-pointer"
                                                    >
                                                        <Phone className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => window.open(`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`)}
                                                        title="WhatsApp Chat"
                                                        className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center hover:bg-emerald-100 transition-colors shrink-0 shadow-2xs cursor-pointer"
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => { setSelectedLead(lead); setDrawerType('detail'); }}
                                                        title="View Dossier"
                                                        className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0 shadow-2xs cursor-pointer"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredLeads.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center">
                                            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-3 border border-slate-200">
                                                <Search className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <h4 className="text-sm font-bold text-slate-800 m-0 mb-1">No leads found</h4>
                                            <p className="text-xs text-slate-500 m-0 max-w-sm mx-auto">Try adjusting your search query or pipeline filter above.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Custom Sliding Drawer Overlay for Add Lead and Lead Dossier (Replacing Ant Design Drawer) */}
            {drawerType !== 'none' && (
                <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
                        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full animate-in slide-in-from-right duration-300">
                            {drawerType === 'add' && (
                                <>
                                    <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white shrink-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                                +
                                            </div>
                                            <h2 className="text-base font-bold text-slate-900 m-0 tracking-tight">Add Pipeline Lead</h2>
                                        </div>
                                        <button onClick={() => setDrawerType('none')} className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                        <form id="crm-add-form" onSubmit={handleAddLead} className="space-y-5 text-xs">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name *</label>
                                                    <input required name="name" type="text" placeholder="Rahul Sharma" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-xs" />
                                                </div>
                                                <div>
                                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Phone Number *</label>
                                                    <input required name="phone" type="text" placeholder="+91 98765 43210" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-xs" />
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
                                                <input name="email" type="email" placeholder="email@example.com" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-xs" />
                                            </div>
                                            
                                            <div>
                                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Deal Value (₹)</label>
                                                <input name="value" type="number" defaultValue="15000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-emerald-700 text-xs" />
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Industry Sector</label>
                                                    <select name="industry" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all cursor-pointer text-xs">
                                                        <option value="Real Estate">Real Estate</option>
                                                        <option value="Healthcare">Healthcare</option>
                                                        <option value="SaaS">SaaS</option>
                                                        <option value="Retail">Retail</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Lead Source</label>
                                                    <select name="source" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all cursor-pointer text-xs">
                                                        <option value="Direct">Direct</option>
                                                        <option value="WhatsApp">WhatsApp</option>
                                                        <option value="Smart Link">Smart Link</option>
                                                        <option value="Referral">Referral</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </form>
                                    </div>
                                    
                                    <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                                        <button type="button" onClick={() => setDrawerType('none')} className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer">
                                            Cancel
                                        </button>
                                        <button form="crm-add-form" type="submit" className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer">
                                            Add New Lead
                                        </button>
                                    </div>
                                </>
                            )}

                            {drawerType === 'detail' && selectedLead && (() => {
                                const config = STATUS_CONFIG[selectedLead.status.toLowerCase() as LeadStatus];
                                return (
                                    <>
                                        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white shrink-0">
                                            <div className="min-w-0">
                                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">Lead Dossier</span>
                                                <h2 className="text-lg font-bold text-slate-900 m-0 tracking-tight truncate">{selectedLead.name}</h2>
                                            </div>
                                            <button onClick={() => setDrawerType('none')} className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shrink-0">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        
                                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50">
                                            <div className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                                                <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl font-bold text-slate-800 shrink-0">
                                                    {selectedLead.name.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-base font-bold text-slate-900 m-0 mb-1 truncate">{selectedLead.industry || 'General Industry'}</h3>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-semibold border shadow-2xs ${config.bg} ${config.color} ${config.border}`}>
                                                            {config.label}
                                                        </span>
                                                        <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md text-xs font-medium border border-slate-200 shadow-2xs truncate">
                                                            Source: {selectedLead.source || 'Direct'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">Deal Details</h3>
                                                <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-2xs text-xs">
                                                    <div className="flex items-center justify-between p-3.5 px-4 min-w-0">
                                                        <div className="flex items-center gap-2.5 text-slate-500 shrink-0">
                                                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                            <span className="font-semibold text-slate-600">Phone Number</span>
                                                        </div>
                                                        <span className="font-bold text-slate-900 font-mono truncate ml-2">{selectedLead.phone}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between p-3.5 px-4 min-w-0">
                                                        <div className="flex items-center gap-2.5 text-slate-500 shrink-0">
                                                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                            <span className="font-semibold text-slate-600">Email Address</span>
                                                        </div>
                                                        <span className="font-semibold text-slate-800 truncate ml-2">{selectedLead.email || 'Not provided'}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between p-3.5 px-4">
                                                        <div className="flex items-center gap-2.5 text-slate-500 shrink-0">
                                                            <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                            <span className="font-semibold text-slate-600">Deal Value</span>
                                                        </div>
                                                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-mono shrink-0">
                                                            ₹{selectedLead.value.toLocaleString()}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between p-3.5 px-4 min-w-0">
                                                        <div className="flex items-center gap-2.5 text-slate-500 shrink-0">
                                                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                            <span className="font-semibold text-slate-600">Assigned To</span>
                                                        </div>
                                                        <span className="font-semibold text-slate-900 truncate ml-2">
                                                            {formatAssignedTo(selectedLead.assignedTo)}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between p-3.5 px-4">
                                                        <div className="flex items-center gap-2.5 text-slate-500 shrink-0">
                                                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                            <span className="font-semibold text-slate-600">Date Captured</span>
                                                        </div>
                                                        <span className="font-semibold text-slate-700 shrink-0">
                                                            {selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleDateString() : 'Just now'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {selectedLead.notes && (
                                                <div className="space-y-2">
                                                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
                                                        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Agent Notes
                                                    </h3>
                                                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                                                        <p className="text-xs font-normal text-slate-700 m-0 leading-relaxed">{selectedLead.notes}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Direct Contact</span>
                                            <div className="flex items-center gap-2.5 shrink-0">
                                                <button 
                                                    onClick={() => window.open(`tel:${selectedLead.phone}`)} 
                                                    title="Direct Phone Call"
                                                    className="w-10 h-10 rounded-xl bg-primary hover:bg-primary-hover text-white flex items-center justify-center transition-all shadow-xs cursor-pointer shrink-0"
                                                >
                                                    <Phone className="w-4 h-4 shrink-0" />
                                                </button>
                                                <button 
                                                    onClick={() => window.open(`https://wa.me/${selectedLead.phone.replace(/[^0-9]/g, '')}`)} 
                                                    title="WhatsApp Message"
                                                    className="w-10 h-10 rounded-xl bg-[#25d366] hover:bg-[#25d366]/90 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer shrink-0"
                                                >
                                                    <MessageCircle className="w-4 h-4 shrink-0" />
                                                </button>
                                                {selectedLead.email && (
                                                    <button 
                                                        onClick={() => window.open(`mailto:${selectedLead.email}`)} 
                                                        title="Send Email"
                                                        className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer shrink-0"
                                                    >
                                                        <Mail className="w-4 h-4 shrink-0" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CRM;
