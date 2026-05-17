import React, { useState, useEffect } from 'react';
import { Pagination } from 'antd';
import { crmApi, CrmLead } from '../../api/crm';
import { useAuth } from '../../contexts/AuthContext';
import { 
    LifeBuoy, Search, RefreshCw, AlertCircle, Clock, ShieldAlert, CheckCircle2, 
    Plus, X, Edit3 
} from 'lucide-react';

interface TicketItem {
    id: string;
    leadId: string;
    leadName: string;
    company: string;
    title: string;
    priority: 'Low' | 'Medium' | 'High';
    status: 'Open' | 'In Progress' | 'Resolved';
    assignedTo?: string;
    createdAt?: string;
}

const PRIORITY_COLORS: Record<string, { text: string; bg: string; border: string }> = {
    Low: { text: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200' },
    Medium: { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    High: { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' }
};

const STATUS_COLORS: Record<string, { text: string; bg: string; border: string }> = {
    Open: { text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    'In Progress': { text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
    Resolved: { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' }
};

const PRIORITIES: ('Low' | 'Medium' | 'High')[] = ['Low', 'Medium', 'High'];
const STATUSES: ('Open' | 'In Progress' | 'Resolved')[] = ['Open', 'In Progress', 'Resolved'];

const Tickets: React.FC = () => {
    const { user } = useAuth();
    const isSubUser = user?.role === 'SUB_USER';
    const [tickets, setTickets] = useState<TicketItem[]>([]);
    const [leads, setLeads] = useState<CrmLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    // Pagination & Summary State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [summary, setSummary] = useState<{ totalTickets: number; openTicketsCount: number; highPriorityCount: number; resolvedCount: number }>({
        totalTickets: 0, openTicketsCount: 0, highPriorityCount: 0, resolvedCount: 0
    });

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Modal State
    const [modalType, setModalType] = useState<'add_ticket' | 'edit_ticket' | null>(null);
    const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);

    // Form States
    const [ticketTitle, setTicketTitle] = useState('');
    const [ticketPriority, setTicketPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
    const [ticketStatus, setTicketStatus] = useState<'Open' | 'In Progress' | 'Resolved'>('Open');
    const [associatedLeadId, setAssociatedLeadId] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ticketRes, leadData] = await Promise.all([
                crmApi.getTickets({ page, limit: pageSize, search: searchTerm }),
                crmApi.getLeads()
            ]);
            setTickets(ticketRes.data || ticketRes || []);
            if (ticketRes.summary) {
                setSummary(ticketRes.summary);
                setTotal(ticketRes.total || 0);
            } else {
                const arr = Array.isArray(ticketRes) ? ticketRes : (ticketRes.data || []);
                setTotal(arr.length);
                const openCount = arr.filter((t: any) => t.status !== 'Resolved').length;
                const highCount = arr.filter((t: any) => t.priority === 'High' && t.status !== 'Resolved').length;
                const resCount = arr.filter((t: any) => t.status === 'Resolved').length;
                setSummary({ totalTickets: arr.length, openTicketsCount: openCount, highPriorityCount: highCount, resolvedCount: resCount });
            }
            setLeads(leadData);
        } catch (error) {
            console.error('Error fetching tickets:', error);
            showToast("Failed to fetch support tickets", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timer);
    }, [page, pageSize, searchTerm, filterPriority, filterStatus]);

    const filteredTickets = tickets.filter(t => {
        const matchesPriority = filterPriority === 'all' || t.priority.toLowerCase() === filterPriority.toLowerCase();
        const matchesStatus = filterStatus === 'all' || t.status.toLowerCase() === filterStatus.toLowerCase();
        return matchesPriority && matchesStatus;
    });

    // Handle Add Ticket
    const handleAddTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ticketTitle.trim() || !associatedLeadId) {
            showToast("Ticket subject and associated customer are required", "error");
            return;
        }

        try {
            const lead = leads.find(l => l.id === associatedLeadId);
            if (!lead) return;

            const existingAssoc: any = lead.associations || {};
            const existingTickets = existingAssoc.tickets || [];
            const newTicketObj = { 
                id: 'tkt-' + Date.now(), 
                title: ticketTitle.trim(), 
                priority: ticketPriority, 
                status: ticketStatus,
                createdAt: new Date().toLocaleDateString('en-GB')
            };

            await crmApi.updateAssociations(lead.id, {
                ...existingAssoc,
                tickets: [...existingTickets, newTicketObj]
            });

            await crmApi.updateLead(lead.id, {
                newActivityItem: {
                    id: 'act-' + Date.now(),
                    type: 'NOTE',
                    title: `Support Ticket Created: ${ticketTitle.trim()}`,
                    description: `Priority: ${ticketPriority} | Status: ${ticketStatus}`,
                    date: new Date().toISOString()
                }
            });

            showToast("New support ticket raised successfully!");
            setModalType(null);
            setTicketTitle('');
            setTicketPriority('Medium');
            setTicketStatus('Open');
            setAssociatedLeadId('');
            fetchData();
        } catch (err) {
            showToast("Failed to create ticket", "error");
        }
    };

    // Handle Edit Ticket
    const handleEditTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTicket) return;

        try {
            const lead = leads.find(l => l.id === selectedTicket.leadId);
            if (!lead) return;

            const assoc: any = lead.associations || {};
            const tList = (assoc.tickets || []).map((t: any) => 
                t.id === selectedTicket.id
                    ? { ...t, title: ticketTitle.trim(), priority: ticketPriority, status: ticketStatus }
                    : t
            );

            await crmApi.updateAssociations(lead.id, { ...assoc, tickets: tList });

            await crmApi.updateLead(lead.id, {
                newActivityItem: {
                    id: 'act-' + Date.now(),
                    type: 'NOTE',
                    title: `Ticket #${selectedTicket.id} updated`,
                    description: `Subject: ${ticketTitle.trim()} | Priority: ${ticketPriority} | Status: ${ticketStatus}`,
                    date: new Date().toISOString()
                }
            });

            showToast("Support ticket updated successfully!");
            setModalType(null);
            fetchData();
        } catch (err) {
            showToast("Failed to update ticket", "error");
        }
    };

    // Quick Attribute Change
    const handleQuickChange = async (ticket: TicketItem, field: 'priority' | 'status', value: string) => {
        try {
            const lead = leads.find(l => l.id === ticket.leadId);
            if (!lead) return;

            const assoc: any = lead.associations || {};
            const tList = (assoc.tickets || []).map((t: any) => 
                t.id === ticket.id
                    ? { ...t, [field]: value }
                    : t
            );

            await crmApi.updateAssociations(lead.id, { ...assoc, tickets: tList });

            await crmApi.updateLead(lead.id, {
                newActivityItem: {
                    id: 'act-' + Date.now(),
                    type: 'NOTE',
                    title: `Ticket ${field} updated: ${ticket.title}`,
                    description: `Updated ${field} to ${value}`,
                    date: new Date().toISOString()
                }
            });

            showToast(`Ticket ${field} updated successfully`);
            fetchData();
        } catch (err) {
            showToast(`Failed to update ticket ${field}`, "error");
        }
    };

    const openEditModal = (ticket: TicketItem) => {
        setSelectedTicket(ticket);
        setTicketTitle(ticket.title);
        setTicketPriority(ticket.priority || 'Medium');
        setTicketStatus(ticket.status || 'Open');
        setAssociatedLeadId(ticket.leadId);
        setModalType('edit_ticket');
    };

    return (
        <div className="space-y-8 font-sans pb-12">
            {toast && (
                <div className="fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-slate-900 text-white shadow-2xl text-xs font-semibold animate-in slide-in-from-bottom-4 duration-200 border border-slate-700">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-emerald-400' : toast.type === 'error' ? 'bg-red-400' : 'bg-blue-400'}`} />
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs font-sans">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
                        <LifeBuoy className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight">Customer Support & Tickets</h1>
                        <p className="text-xs text-slate-500 m-0 mt-0.5">
                            Track client inquiries, support requests, and issue resolution status.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {!isSubUser && (
                        <button 
                            onClick={() => { setTicketTitle(''); setTicketPriority('Medium'); setTicketStatus('Open'); setAssociatedLeadId(leads[0]?.id || ''); setModalType('add_ticket'); }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs transition-all shadow-sm shadow-primary/30 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            Raise Ticket
                        </button>
                    )}
                    <button 
                        onClick={() => { setPage(1); fetchData(); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs border border-slate-200 transition-all cursor-pointer shadow-2xs"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider m-0">Open & In Progress</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0">{summary.openTicketsCount}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider m-0">High Priority Issues</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0">{summary.highPriorityCount}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-2xs">
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider m-0">Resolved Tickets</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0">{summary.resolvedCount}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative flex-1 w-full font-sans">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Search tickets by subject, customer, or company..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs focus:border-primary text-slate-800"
                    />
                </div>
                <select
                    value={filterPriority}
                    onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
                    className="w-full sm:w-48 bg-white border border-slate-200 rounded-2xl px-4 py-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs focus:border-primary cursor-pointer text-slate-700"
                >
                    <option value="all">All Priorities</option>
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                </select>

                <select
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                    className="w-full sm:w-48 bg-white border border-slate-200 rounded-2xl px-4 py-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs focus:border-primary cursor-pointer text-slate-700"
                >
                    <option value="all">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="in progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                </select>
            </div>

            {loading && tickets.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
                    <div className="w-10 h-10 border-3 border-slate-200 border-t-primary rounded-full animate-spin mb-3" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loading Support Tickets...</span>
                </div>
            ) : filteredTickets.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-8 text-center">
                    <LifeBuoy className="w-12 h-12 text-slate-300 mb-3" />
                    <h3 className="text-base font-bold text-slate-800 m-0">No support tickets found</h3>
                    <p className="text-xs font-medium text-slate-500 m-0 mt-1 max-w-sm">
                        {searchTerm || filterPriority !== 'all' || filterStatus !== 'all' ? "No matching support tickets found for your filter criteria." : "No support tickets have been recorded yet in your CRM."}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden font-sans">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/75 border-b border-slate-100 font-sans">
                                    <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Issue Subject</th>
                                    <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Customer / Company</th>
                                    <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Priority</th>
                                    <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Logged Date</th>
                                    <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-medium font-sans">
                                {filteredTickets.map((t) => {
                                    const pColor = PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.Low;
                                    const sColor = STATUS_COLORS[t.status] || STATUS_COLORS.Open;
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group font-sans">
                                            <td className="py-3.5 px-6 font-semibold text-slate-900 text-xs">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center font-bold text-amber-700 shadow-2xs shrink-0 text-xs">
                                                        <AlertCircle className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-semibold text-slate-900">{t.title}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-6">
                                                <div className="font-semibold text-slate-800 text-xs">{t.leadName}</div>
                                                {t.company && <div className="text-[11px] font-medium text-slate-500">{t.company}</div>}
                                            </td>
                                            <td className="py-3.5 px-6">
                                                <select
                                                    value={t.priority}
                                                    disabled={isSubUser}
                                                    onChange={e => handleQuickChange(t, 'priority', e.target.value)}
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${pColor.bg} ${pColor.text} ${pColor.border} focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs cursor-pointer disabled:opacity-75`}
                                                >
                                                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                                                </select>
                                            </td>
                                            <td className="py-3.5 px-6">
                                                <select
                                                    value={t.status}
                                                    disabled={isSubUser}
                                                    onChange={e => handleQuickChange(t, 'status', e.target.value)}
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${sColor.bg} ${sColor.text} ${sColor.border} focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs cursor-pointer disabled:opacity-75`}
                                                >
                                                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </td>
                                            <td className="py-3.5 px-6 font-medium text-slate-500 text-xs">{t.createdAt || 'N/A'}</td>
                                            <td className="py-3.5 px-6 text-right">
                                                {!isSubUser && (
                                                    <button onClick={() => openEditModal(t)} className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-xl border border-slate-200/80 transition-all cursor-pointer shadow-2xs">
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
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

            {modalType && (
                <div className="fixed inset-0 z-[200] flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
                    <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-300">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0 bg-white">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center font-bold shadow-lg shrink-0">
                                    <LifeBuoy className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold tracking-tight text-slate-900 m-0">
                                        {modalType === 'add_ticket' ? 'Log Support Ticket' : 'Edit Ticket Details'}
                                    </h3>
                                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Enter support request and priority level</p>
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

                        {/* Scrollable Form Body */}
                        <form onSubmit={modalType === 'add_ticket' ? handleAddTicket : handleEditTicket} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    Issue Subject / Title *
                                </label>
                                <input 
                                    type="text"
                                    required
                                    placeholder="e.g. API Webhook Synchronization Failure"
                                    value={ticketTitle}
                                    onChange={e => setTicketTitle(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                />
                            </div>

                            {modalType === 'add_ticket' && (
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Associated Contact / Lead *
                                    </label>
                                    <select
                                        required
                                        value={associatedLeadId}
                                        onChange={e => setAssociatedLeadId(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all cursor-pointer"
                                    >
                                        <option value="">-- Select Contact / Lead --</option>
                                        {leads.map(l => (
                                            <option key={l.id} value={l.id}>{l.name} ({l.company || 'Individual'})</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Priority Level
                                    </label>
                                    <select
                                        value={ticketPriority}
                                        onChange={e => setTicketPriority(e.target.value as any)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all cursor-pointer"
                                    >
                                        {PRIORITIES.map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Status
                                    </label>
                                    <select
                                        value={ticketStatus}
                                        onChange={e => setTicketStatus(e.target.value as any)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all cursor-pointer"
                                    >
                                        {STATUSES.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Sticky Footer */}
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
                                    <LifeBuoy className="w-4 h-4" />
                                    {modalType === 'add_ticket' ? 'Save Ticket' : 'Update Ticket'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Tickets;
