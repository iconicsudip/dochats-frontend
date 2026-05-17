import React, { useState, useEffect } from 'react';
import { Pagination } from 'antd';
import { crmApi, CrmLead } from '../../api/crm';
import { useAuth } from '../../contexts/AuthContext';
import { 
    DollarSign, Search, RefreshCw, Briefcase, CheckCircle, Clock, 
    Flame, Phone, Mail, Plus, X, Edit3, ExternalLink, User, AlertCircle 
} from 'lucide-react';

interface DealItem {
    id: string;
    leadId: string;
    leadName: string;
    company: string;
    title: string;
    value: number;
    stage: string;
    assignedTo?: string;
    createdAt?: string;
    isPrimary: boolean;
}

const STAGE_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; icon: any }> = {
    new: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'New Lead', icon: Flame },
    contacted: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Contacted', icon: Phone },
    qualified: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', label: 'Qualified', icon: CheckCircle },
    proposal: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Proposal', icon: Mail },
    won: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Won', icon: CheckCircle },
    lost: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', label: 'Lost', icon: Clock },
};

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];

const Deals: React.FC = () => {
    const { user } = useAuth();
    const isSubUser = user?.role === 'SUB_USER';
    const [deals, setDeals] = useState<DealItem[]>([]);
    const [leads, setLeads] = useState<CrmLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStage, setFilterStage] = useState('all');

    // Pagination & Summary State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [summary, setSummary] = useState<{ totalDeals: number; totalPipeline: number; wonPipeline: number }>({ totalDeals: 0, totalPipeline: 0, wonPipeline: 0 });

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Modal State
    const [modalType, setModalType] = useState<'add_deal' | 'edit_deal' | null>(null);
    const [selectedDeal, setSelectedDeal] = useState<DealItem | null>(null);

    // Form States
    const [dealTitle, setDealTitle] = useState('');
    const [dealValue, setDealValue] = useState<number>(0);
    const [dealStage, setDealStage] = useState<string>('NEW');
    const [associatedLeadId, setAssociatedLeadId] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [dealRes, leadData] = await Promise.all([
                crmApi.getDeals({ page, limit: pageSize, search: searchTerm }),
                crmApi.getLeads()
            ]);
            setDeals(dealRes.data || dealRes || []);
            if (dealRes.summary) {
                setSummary(dealRes.summary);
                setTotal(dealRes.total || 0);
            } else {
                const arr = Array.isArray(dealRes) ? dealRes : (dealRes.data || []);
                setTotal(arr.length);
                const totalPipe = arr.reduce((acc: number, d: any) => acc + (d.value || 0), 0);
                const wonPipe = arr.filter((d: any) => (d.stage || '').toLowerCase() === 'won').reduce((acc: number, d: any) => acc + (d.value || 0), 0);
                setSummary({ totalDeals: arr.length, totalPipeline: totalPipe, wonPipeline: wonPipe });
            }
            setLeads(leadData);
        } catch (error) {
            console.error('Error fetching deals:', error);
            showToast("Failed to fetch deals data", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timer);
    }, [page, pageSize, searchTerm, filterStage]);

    // Filter by stage locally if needed (search is server-side)
    const filteredDeals = deals.filter(d => {
        return filterStage === 'all' || (d.stage || 'new').toLowerCase() === filterStage.toLowerCase();
    });

    // Handle Add Deal
    const handleAddDeal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dealTitle.trim() || !associatedLeadId) {
            showToast("Deal title and associated contact are required", "error");
            return;
        }

        try {
            const lead = leads.find(l => l.id === associatedLeadId);
            if (!lead) return;

            const existingAssoc: any = lead.associations || {};
            const existingDeals = existingAssoc.deals || [];
            const newDealObj = { 
                id: 'deal-' + Date.now(), 
                title: dealTitle.trim(), 
                amount: Number(dealValue) || 0, 
                stage: dealStage.toUpperCase() 
            };

            await crmApi.updateAssociations(lead.id, {
                ...existingAssoc,
                deals: [...existingDeals, newDealObj]
            });

            // Add activity timeline
            await crmApi.updateLead(lead.id, {
                newActivityItem: {
                    id: 'act-' + Date.now(),
                    type: 'MEETING',
                    title: `New opportunity created: ${dealTitle.trim()}`,
                    description: `Deal value set to ₹${(Number(dealValue) || 0).toLocaleString('en-IN')} in stage ${dealStage.toUpperCase()}`,
                    date: new Date().toISOString()
                }
            });

            showToast("New deal opportunity created successfully!");
            setModalType(null);
            setDealTitle('');
            setDealValue(0);
            setAssociatedLeadId('');
            fetchData();
        } catch (err) {
            showToast("Failed to create deal", "error");
        }
    };

    // Handle Edit Deal
    const handleEditDeal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDeal) return;

        try {
            const lead = leads.find(l => l.id === selectedDeal.leadId);
            if (!lead) return;

            if (selectedDeal.isPrimary) {
                await crmApi.updateLead(lead.id, { 
                    value: Number(dealValue) || 0, 
                    status: dealStage.toUpperCase() as any 
                });
            } else {
                const assoc: any = lead.associations || {};
                const dList = (assoc.deals || []).map((d: any) => 
                    d.id === selectedDeal.id || d.title === selectedDeal.title
                        ? { ...d, title: dealTitle.trim(), amount: Number(dealValue) || 0, stage: dealStage.toUpperCase() }
                        : d
                );
                await crmApi.updateAssociations(lead.id, { ...assoc, deals: dList });
            }

            await crmApi.updateLead(lead.id, {
                newActivityItem: {
                    id: 'act-' + Date.now(),
                    type: 'NOTE',
                    title: `Opportunity updated: ${dealTitle.trim()}`,
                    description: `Deal value: ₹${Number(dealValue).toLocaleString('en-IN')} | Stage: ${dealStage.toUpperCase()}`,
                    date: new Date().toISOString()
                }
            });

            showToast("Deal details updated successfully!");
            setModalType(null);
            fetchData();
        } catch (err) {
            showToast("Failed to update deal", "error");
        }
    };

    // Quick Stage Change
    const handleStageChange = async (deal: DealItem, newStage: string) => {
        try {
            const lead = leads.find(l => l.id === deal.leadId);
            if (!lead) return;

            if (deal.isPrimary) {
                await crmApi.updateStatus(lead.id, newStage.toUpperCase());
            } else {
                const assoc: any = lead.associations || {};
                const dList = (assoc.deals || []).map((d: any) => 
                    d.id === deal.id || d.title === deal.title
                        ? { ...d, stage: newStage.toUpperCase() }
                        : d
                );
                await crmApi.updateAssociations(lead.id, { ...assoc, deals: dList });
            }

            // Log activity
            await crmApi.updateLead(lead.id, {
                newActivityItem: {
                    id: 'act-' + Date.now(),
                    type: 'NOTE',
                    title: `Deal stage changed: ${deal.title}`,
                    description: `Moved from ${deal.stage} to ${newStage.toUpperCase()}`,
                    date: new Date().toISOString()
                }
            });

            showToast(`Deal moved to ${newStage.toUpperCase()}`);
            fetchData();
        } catch (err) {
            showToast("Failed to update deal stage", "error");
        }
    };

    const openEditDrawer = (deal: DealItem) => {
        setSelectedDeal(deal);
        setDealTitle(deal.title);
        setDealValue(deal.value || 0);
        setDealStage(deal.stage?.toUpperCase() || 'NEW');
        setAssociatedLeadId(deal.leadId);
        setModalType('edit_deal');
    };

    return (
        <div className="space-y-8 font-sans pb-12">
            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-slate-900 text-white shadow-2xl text-xs font-semibold animate-in slide-in-from-bottom-4 duration-200 border border-slate-700">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-emerald-400' : toast.type === 'error' ? 'bg-red-400' : 'bg-blue-400'}`} />
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs font-sans">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight">Deals & Pipeline Opportunities</h1>
                        <p className="text-xs text-slate-500 m-0 mt-0.5">
                            Manage active deals, revenue opportunities, and deal closure velocity.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={() => { setDealTitle(''); setDealValue(0); setDealStage('NEW'); setAssociatedLeadId(leads[0]?.id || ''); setModalType('add_deal'); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs transition-all shadow-sm shadow-primary/30 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Create Deal
                    </button>
                    <button 
                        onClick={() => { setPage(1); fetchData(); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs border border-slate-200 transition-all cursor-pointer shadow-2xs"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider m-0">Total Deals</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0">{summary.totalDeals}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                        <Briefcase className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider m-0">Total Pipeline Value</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono m-0">₹{summary.totalPipeline.toLocaleString('en-IN')}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-2xs">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider m-0">Closed Won Revenue</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono m-0">₹{summary.wonPipeline.toLocaleString('en-IN')}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                        <CheckCircle className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative flex-1 w-full font-sans">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Search deals by title, contact, or company..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs focus:border-primary"
                    />
                </div>
                <select
                    value={filterStage}
                    onChange={(e) => { setFilterStage(e.target.value); setPage(1); }}
                    className="w-full sm:w-56 bg-white border border-slate-200 rounded-2xl px-4 py-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs focus:border-primary cursor-pointer text-slate-700"
                >
                    <option value="all">All Stages</option>
                    <option value="new">New Lead</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal">Proposal</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                </select>
            </div>

            {/* Main Content Table */}
            {loading && deals.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
                    <div className="w-10 h-10 border-3 border-slate-200 border-t-primary rounded-full animate-spin mb-3" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loading Deals...</span>
                </div>
            ) : filteredDeals.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-8 text-center">
                    <Briefcase className="w-12 h-12 text-slate-300 mb-3" />
                    <h3 className="text-base font-bold text-slate-800 m-0">No deals found</h3>
                    <p className="text-xs font-medium text-slate-500 m-0 mt-1 max-w-sm">
                        {searchTerm || filterStage !== 'all' ? "No matching deals found for your filter criteria." : "No deals or opportunities have been recorded yet in your CRM."}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden font-sans">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/75 border-b border-slate-100 font-sans">
                                    <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Deal Title</th>
                                    <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contact / Company</th>
                                    <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Deal Stage</th>
                                    <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Value</th>
                                    <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Deal Type</th>
                                    <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-medium font-sans">
                                {filteredDeals.map((d) => {
                                    const stKey = (d.stage || 'new').toLowerCase();
                                    const conf = STAGE_CONFIG[stKey] || STAGE_CONFIG.new;
                                    return (
                                        <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group font-sans">
                                            <td className="py-3.5 px-6 font-semibold text-slate-900 text-xs">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center font-bold text-purple-700 shadow-2xs shrink-0 text-xs">
                                                        <Briefcase className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-semibold text-slate-900">{d.title}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-6">
                                                <div className="font-semibold text-slate-800 text-xs">{d.leadName}</div>
                                                {d.company && <div className="text-[11px] font-medium text-slate-500">{d.company}</div>}
                                            </td>
                                            <td className="py-3.5 px-6">
                                                <select
                                                    value={d.stage?.toUpperCase() || 'NEW'}
                                                    onChange={e => handleStageChange(d, e.target.value)}
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${conf.bg} ${conf.text} ${conf.border} focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs uppercase tracking-wider cursor-pointer`}
                                                >
                                                    {STAGES.map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-3.5 px-6 font-bold text-emerald-600 text-xs font-mono">
                                                ₹{(d.value || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td className="py-3.5 px-6">
                                                {d.isPrimary ? (
                                                    <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded text-[11px] font-semibold inline-flex items-center shadow-2xs">
                                                        Primary Deal
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-medium inline-flex items-center">
                                                        Associated Deal
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => openEditDrawer(d)}
                                                        className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-xl border border-slate-200/80 transition-all cursor-pointer shadow-2xs"
                                                        title="Edit Deal"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {total > pageSize && (
                        <div className="py-4 px-6 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
                            <Pagination 
                                current={page} 
                                pageSize={pageSize} 
                                total={total} 
                                onChange={(p, s) => { setPage(p); setPageSize(s); }} 
                                showSizeChanger={false} 
                            />
                        </div>
                    )}
                </div>
            )}

            {/* HubSpot Slide-Over Drawer: Create / Edit Deal */}
            {modalType && (
                <div className="fixed inset-0 z-[200] flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
                    <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-300">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0 bg-white">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center font-bold shadow-lg shrink-0">
                                    <Briefcase className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold tracking-tight text-slate-900 m-0">
                                        {modalType === 'add_deal' ? 'Create Opportunity' : 'Edit Opportunity'}
                                    </h3>
                                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Enter deal valuation, contact linkage, and pipeline stage</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setModalType(null)} 
                                    className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Drawer Scrollable Body */}
                        <form onSubmit={modalType === 'add_deal' ? handleAddDeal : handleEditDeal} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Briefcase className="w-4 h-4 text-slate-400" />
                                    Opportunity Title *
                                </label>
                                <input 
                                    type="text"
                                    required
                                    placeholder="e.g. Enterprise License Expansion"
                                    value={dealTitle}
                                    onChange={e => setDealTitle(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <DollarSign className="w-4 h-4 text-slate-400" />
                                    Deal Value (₹) *
                                </label>
                                <input 
                                    type="number"
                                    required
                                    min={0}
                                    placeholder="e.g. 150000"
                                    value={dealValue || ''}
                                    onChange={e => setDealValue(Number(e.target.value))}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <CheckCircle className="w-4 h-4 text-slate-400" />
                                        Pipeline Stage
                                    </label>
                                    <select
                                        value={dealStage}
                                        onChange={e => setDealStage(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all cursor-pointer text-slate-800"
                                    >
                                        {STAGES.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <User className="w-4 h-4 text-slate-400" />
                                        Associated Contact *
                                    </label>
                                    <select
                                        required
                                        disabled={modalType === 'edit_deal'}
                                        value={associatedLeadId}
                                        onChange={e => setAssociatedLeadId(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all cursor-pointer text-slate-800 disabled:opacity-60"
                                    >
                                        <option value="">-- Select Contact --</option>
                                        {leads.map(l => (
                                            <option key={l.id} value={l.id}>{l.name} ({l.company || 'Individual'})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Drawer Footer Buttons */}
                            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white pb-2">
                                <button 
                                    type="button" 
                                    onClick={() => setModalType(null)} 
                                    className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-xs transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold text-xs transition-all shadow-md shadow-primary/30 cursor-pointer flex items-center gap-2"
                                >
                                    <Briefcase className="w-4 h-4" />
                                    {modalType === 'add_deal' ? 'Create Opportunity' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Deals;
