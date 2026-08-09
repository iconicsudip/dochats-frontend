import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi, CrmLead } from '../../api/crm';
import { ContactDrawerForm } from '../../components/crm/ContactDrawerForm';
import { bookingsApi, Booking } from '../../api/bookings';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../enums';
import { 
    ArrowLeft, Edit3, Trash2, Copy, FileText, Mail, Phone, Calendar, 
    CheckSquare, Building2, Briefcase, LifeBuoy, ShoppingBag, Plus, 
    X, CheckCircle2, Clock, AlertCircle, ExternalLink, Paperclip, 
    ChevronDown, Settings, ShieldAlert, Sparkles, UserCheck, User 
} from 'lucide-react';

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];
const LIFECYCLE_STAGES = ['Lead', 'MQL', 'SQL', 'Customer', 'Evangelist'];
const INDUSTRIES = ['SaaS', 'Healthcare', 'Real Estate', 'Retail', 'Finance', 'Technology', 'Manufacturing', 'E-commerce'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const TKT_STATUSES = ['Open', 'In Progress', 'Resolved'];
const ORDER_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

const ContactDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const isSubUser = user?.role === Role.SUB_USER;

    const [lead, setLead] = useState<CrmLead | null>(null);
    const [orders, setOrders] = useState<Booking[]>([]);
    const [subUsersList, setSubUsersList] = useState<{ id: string; name: string; email: string }[]>([]);
    const [activeTab, setActiveTab] = useState<'about' | 'activities' | 'revenue'>('about');

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const [modalType, setModalType] = useState<'edit_contact' | 'add_company' | 'add_deal' | 'add_ticket' | 'add_order' | 'add_activity' | null>(null);
    const [editForm, setEditForm] = useState<Partial<CrmLead>>({});
    const [workspaceCompanies, setWorkspaceCompanies] = useState<any[]>([]);
    const [addCompanyMode, setAddCompanyMode] = useState<'select' | 'new'>('select');
    const [selectedCompanyKey, setSelectedCompanyKey] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [companyDomain, setCompanyDomain] = useState('');
    const [dealTitle, setDealTitle] = useState('');
    const [dealValue, setDealValue] = useState<number>(0);
    const [dealStage, setDealStage] = useState('NEW');
    const [ticketTitle, setTicketTitle] = useState('');
    const [ticketPriority, setTicketPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
    const [ticketStatus, setTicketStatus] = useState<'Open' | 'In Progress' | 'Resolved'>('Open');
    const [orderTitle, setOrderTitle] = useState('');
    const [orderAmount, setOrderAmount] = useState<number>(0);
    const [orderStatus, setOrderStatus] = useState<'pending' | 'confirmed' | 'completed' | 'cancelled'>('confirmed');
    const [activityType, setActivityType] = useState<'NOTE' | 'EMAIL' | 'CALL' | 'MEETING' | 'TASK'>('NOTE');
    const [activityTitle, setActivityTitle] = useState('');
    const [activityDesc, setActivityDesc] = useState('');

    const { data: teamMembersData } = useQuery({
        queryKey: ['sub-users', 50],
        queryFn: () => apiClient.get('/auth/sub-users?limit=50').then(res => res.data.subUsers || []),
        enabled: !isSubUser
    });

    const { data: contactData, isLoading: loadingContact } = useQuery({
        queryKey: ['contact', id],
        queryFn: async () => {
            if (!id) return null;
            const [data, bookingsRes, compRes] = await Promise.all([
                crmApi.getLead(id),
                bookingsApi.getBookings({ limit: 100 }),
                crmApi.getCompanies({ limit: 100 })
            ]);
            return { data, bookingsList: bookingsRes?.data || bookingsRes || [], compList: compRes?.data || compRes || [] };
        },
        enabled: !!id
    });

    useEffect(() => {
        if (teamMembersData) setSubUsersList(teamMembersData);
    }, [teamMembersData]);

    useEffect(() => {
        if (contactData) {
            const { data, bookingsList, compList } = contactData;
            setLead(data);
            setEditForm(data);
            setWorkspaceCompanies(compList);
            const contactOrders = bookingsList.filter((b: Booking) => b.leadId === data.id || b.clientName.toLowerCase() === data.name.toLowerCase());
            setOrders(contactOrders);
        }
    }, [contactData]);

    const updateLeadMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => crmApi.updateLead(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contact', id] })
    });
    
    const deleteLeadsMutation = useMutation({
        mutationFn: (ids: string[]) => crmApi.deleteLeads(ids),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contact', id] });
        }
    });

    const updateAssociationsMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => crmApi.updateAssociations(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contact', id] })
    });

    const createBookingMutation = useMutation({
        mutationFn: (data: any) => bookingsApi.createBooking(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contact', id] })
    });

    const updateBookingStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => bookingsApi.updateStatus(id, status),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contact', id] })
    });

    const handleCopyEmail = () => {
        if (lead?.email) {
            navigator.clipboard.writeText(lead.email);
            showToast("Copied email to clipboard", "success");
        }
    };

    const handleAssignTeamMember = async (newAssignee: string) => {
        if (!lead || isSubUser) return;
        try {
            await updateLeadMutation.mutateAsync({ id: lead.id, data: { assignedTo: newAssignee || undefined } });
            showToast("Successfully assigned record to team member!", "success");
        } catch (err) {
            showToast("Failed to assign record", "error");
        }
    };

    const handleDeleteContact = async () => {
        if (!lead || isSubUser) return;
        if (window.confirm("Are you sure you want to permanently delete this contact record?")) {
            try {
                await deleteLeadsMutation.mutateAsync([lead.id]);
                showToast("Contact deleted successfully", "success");
                navigate('/dashboard/crm');
            } catch (err) {
                showToast("Failed to delete contact", "error");
            }
        }
    };

    const handleUpdateContactSubmit = async (data: Partial<CrmLead>) => {
        if (!lead) return;
        const payload = { ...data };
        if (isSubUser) delete payload.assignedTo;
        try {
            await updateLeadMutation.mutateAsync({ id: lead.id, data: payload });
            showToast("Contact updated successfully!");
            setModalType(null);
        } catch (err) {
            showToast("Failed to update contact", "error");
        }
    };

    const handleAddCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lead) return;
        const assoc: any = lead.associations || {};
        const comps = assoc.companies || [];
        let newComp: any = null;
        if (addCompanyMode === 'select') {
            if (!selectedCompanyKey) { showToast("Please select a company", "error"); return; }
            const found = workspaceCompanies.find(c => c.name === selectedCompanyKey);
            newComp = { name: selectedCompanyKey, domain: found?.domain || null };
        } else {
            if (!companyName.trim()) { showToast("Company name is required", "error"); return; }
            newComp = { name: companyName.trim(), domain: companyDomain.trim() || null };
        }
        const exists = comps.some((c: any) => c.name?.toLowerCase() === newComp.name.toLowerCase());
        const updatedComps = exists ? comps : [...comps, newComp];
        try {
            await updateAssociationsMutation.mutateAsync({ id: lead.id, data: { ...assoc, companies: updatedComps } });
            await updateLeadMutation.mutateAsync({ id: lead.id, data: { newActivityItem: { id: 'act-' + Date.now(), type: 'NOTE', title: `Associated with ${newComp.name}`, description: `Attached to account ${newComp.name}`, date: new Date().toISOString() } } });
            showToast("Company added successfully!");
            setModalType(null);
        } catch (err) { showToast("Failed to add company", "error"); }
    };

    const handleAddDeal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lead || !dealTitle.trim()) return;
        const assoc: any = lead.associations || {};
        const newDeal = { id: 'deal-' + Date.now(), title: dealTitle.trim(), amount: Number(dealValue) || 0, stage: dealStage.toUpperCase() };
        try {
            await updateAssociationsMutation.mutateAsync({ id: lead.id, data: { ...assoc, deals: [...(assoc.deals || []), newDeal] } });
            showToast("Deal created!");
            setModalType(null);
        } catch (err) { showToast("Failed to create deal", "error"); }
    };

    const handleAddTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lead || !ticketTitle.trim()) return;
        const assoc: any = lead.associations || {};
        const newTkt = { id: 'tkt-' + Date.now(), title: ticketTitle.trim(), priority: ticketPriority, status: ticketStatus, date: new Date().toLocaleDateString('en-GB') };
        try {
            await updateAssociationsMutation.mutateAsync({ id: lead.id, data: { ...assoc, tickets: [...(assoc.tickets || []), newTkt] } });
            showToast("Ticket created!");
            setModalType(null);
        } catch (err) { showToast("Failed to create ticket", "error"); }
    };

    const handleAddOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lead || !orderTitle.trim()) return;
        const payload = { clientName: lead.name, email: lead.email, service: orderTitle.trim(), status: orderStatus.toUpperCase(), leadId: lead.id };
        try {
            await createBookingMutation.mutateAsync(payload);
            showToast("Order booked!");
            setModalType(null);
        } catch (err) { showToast("Failed to place order", "error"); }
    };

    const handleAddActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lead || !activityTitle.trim()) return;
        try {
            await updateLeadMutation.mutateAsync({ id: lead.id, data: { newActivityItem: { id: 'act-' + Date.now(), type: activityType, title: activityTitle.trim(), description: activityDesc.trim(), date: new Date().toISOString() } } });
            showToast("Activity logged!");
            setModalType(null);
        } catch (err) { showToast("Failed to log activity", "error"); }
    };

    const handleUpdateDealStage = async (idx: number, newStage: string) => {
        if (!lead || isSubUser) return;
        const assoc: any = lead.associations || {};
        const dList = [...(assoc.deals || [])];
        if (dList[idx]) {
            dList[idx].stage = newStage;
            try {
                await updateAssociationsMutation.mutateAsync({ id: lead.id, data: { ...assoc, deals: dList } });
                showToast(`Opportunity stage updated to ${newStage}`);
            } catch (err) {
                showToast("Failed to update opportunity", "error");
            }
        }
    };

    const handleUpdateTicket = async (idx: number, field: 'priority' | 'status', val: string) => {
        if (!lead || isSubUser) return;
        const assoc: any = lead.associations || {};
        const tList = [...(assoc.tickets || [])];
        if (tList[idx]) {
            tList[idx][field] = val;
            try {
                await updateAssociationsMutation.mutateAsync({ id: lead.id, data: { ...assoc, tickets: tList } });
                showToast(`Ticket ${field} updated to ${val}`);
            } catch (err) {
                showToast("Failed to update ticket", "error");
            }
        }
    };

    const handleUpdateOrderStatus = async (orderId: string, status: string) => {
        return (
            <div className="h-96 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs font-sans">
                <div className="w-10 h-10 border-3 border-slate-200 border-t-primary rounded-full animate-spin mb-3" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loading Contact Profile...</span>
            </div>
        );
    }

    if (!lead) {
        return (
            <div className="h-96 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-8 text-center font-sans">
                <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-800 m-0">Contact Not Found</h3>
                <p className="text-xs font-medium text-slate-500 m-0 mt-1 max-w-sm">The record you are looking for does not exist or has been deleted.</p>
                <button onClick={() => navigate('/dashboard/crm')} className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer">
                    Back to CRM
                </button>
            </div>
        );
    }

    const assocData: any = lead.associations || {};
    const companiesList = assocData.companies || [];
    const dealsList = assocData.deals || [];
    const ticketsList = assocData.tickets || [];
    const timeline = lead.activityTimeline || [];

    const unifiedCompanies: any[] = [];
    if (lead.company) {
        unifiedCompanies.push({
            name: lead.company,
            domain: companiesList.find((c: any) => c.name?.toLowerCase() === lead.company?.toLowerCase())?.domain || null,
            phone: lead.phone || '--',
            isPrimary: true
        });
    }
    for (const c of companiesList) {
        if (lead.company && c.name?.toLowerCase() === lead.company.toLowerCase()) continue;
        unifiedCompanies.push({
            name: c.name,
            domain: c.domain || null,
            phone: '--',
            isPrimary: false
        });
    }

    const totalRevenue = orders.filter(o => o.status.toLowerCase() === 'completed').reduce((sum, o) => {
        const match = (o.notes || '').match(/Amount:\s*₹?(\d+)/);
        const val = match ? Number(match[1]) : 0;
        return sum + val;
    }, 0);

    const activeAssignee = subUsersList.find(su => su.id === lead.assignedTo);

    return (
        <div className="space-y-8 font-sans pb-16">
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

            {/* Navigation Toolbar */}
            <div className="flex items-center justify-between bg-white px-6 py-4 rounded-3xl border border-slate-200/80 shadow-2xs">
                <button onClick={() => navigate('/dashboard/crm')} className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors bg-transparent border-0 p-0 cursor-pointer">
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to CRM Contacts</span>
                </button>

                <div className="flex items-center gap-3">
                    {!isSubUser && (
                        <>
                            <button onClick={() => setModalType('edit_contact')} className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs border border-slate-200 transition-all cursor-pointer shadow-2xs">
                                <Edit3 className="w-3.5 h-3.5" /> Edit Record
                            </button>
                            <button onClick={handleDeleteContact} className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold text-xs border border-red-200 transition-all cursor-pointer shadow-2xs">
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* DOSSIER GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
                {/* LEFT SIDEBAR: Contact Identity Card & Quick Actions (3/12) */}
                <div className="lg:col-span-3 space-y-6 font-sans">
                    {/* Identity Card */}
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-primary/20 via-indigo-500/10 to-purple-500/20" />
                        
                        <div className="relative pt-6">
                            <div className="w-24 h-24 rounded-3xl bg-slate-900 text-white font-extrabold text-3xl flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xl">
                                {lead.name.substring(0, 1).toUpperCase()}
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 m-0 tracking-tight">{lead.name}</h2>
                            <p className="text-xs font-medium text-slate-500 m-0 mt-1">{lead.jobTitle || 'Executive Contact'} • {lead.company || 'Independent'}</p>

                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 text-left">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400 font-semibold flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email</span>
                                    <button onClick={handleCopyEmail} className="font-bold text-slate-800 hover:text-primary flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer">
                                        <span className="max-w-[130px] truncate">{lead.email}</span>
                                        <Copy className="w-3 h-3 text-slate-400" />
                                    </button>
                                </div>
                                {lead.phone && (
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-400 font-semibold flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</span>
                                        <a href={`tel:${lead.phone}`} className="font-bold text-slate-800 hover:text-primary max-w-[130px] truncate">{lead.phone}</a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-2">
                            <button onClick={() => { setActivityType('NOTE'); setModalType('add_activity'); }} className="px-3 py-2.5 bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-700 rounded-xl text-xs font-bold transition-all border border-slate-200/80 shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer">
                                <span>📝</span> Note
                            </button>
                            <button onClick={() => { setActivityType('CALL'); setModalType('add_activity'); }} className="px-3 py-2.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-bold transition-all border border-slate-200/80 shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer">
                                <span>📞</span> Call
                            </button>
                            <button onClick={() => { setActivityType('EMAIL'); setModalType('add_activity'); }} className="px-3 py-2.5 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-xl text-xs font-bold transition-all border border-slate-200/80 shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer">
                                <span>✉️</span> Email
                            </button>
                            <button onClick={() => { setActivityType('MEETING'); setModalType('add_activity'); }} className="px-3 py-2.5 bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-700 rounded-xl text-xs font-bold transition-all border border-slate-200/80 shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer">
                                <span>🤝</span> Meet
                            </button>
                        </div>
                    </div>

                    {/* Ownership & Key Info Card */}
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4 font-sans">
                        <h3 className="text-xs font-bold text-slate-900 m-0 uppercase tracking-wider">Record Assignment</h3>
                        
                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Record Owner</label>
                            {isSubUser ? (
                                <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span>{user?.name || user?.email} (You)</span>
                                </div>
                            ) : (
                                <select 
                                    value={lead.assignedTo || ''}
                                    onChange={(e) => handleAssignTeamMember(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-2xs"
                                >
                                    <option value="">Unassigned (Admin Pool)</option>
                                    {subUsersList.map(su => (
                                        <option key={su.id} value={su.id}>{su.name || su.email}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="pt-3 border-t border-slate-100">
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lifecycle Stage</label>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-extrabold uppercase tracking-wider">
                                <span>{lead.status || 'NEW'}</span>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-100">
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lead Source</label>
                            <span className="text-xs font-semibold text-slate-600">{lead.source || 'Organic Search'}</span>
                        </div>
                    </div>
                </div>

                {/* CENTER AREA: Tab Navigation & Details (6/12) */}
                <div className="lg:col-span-6 space-y-6 font-sans">
                    <div className="flex border-b border-slate-200 gap-4 sm:gap-8 px-2 font-sans overflow-x-auto">
                        <button 
                            onClick={() => setActiveTab('about')}
                            className={`pb-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer bg-transparent p-0 whitespace-nowrap shrink-0 ${activeTab === 'about' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                        >
                            About
                        </button>
                        <button 
                            onClick={() => setActiveTab('activities')}
                            className={`pb-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer bg-transparent p-0 whitespace-nowrap shrink-0 ${activeTab === 'activities' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                        >
                            <span className="hidden sm:inline">Activity Timeline </span>Timeline <span className="hidden sm:inline">({timeline.length})</span><span className="sm:hidden">({timeline.length})</span>
                        </button>
                        <button 
                            onClick={() => setActiveTab('revenue')}
                            className={`pb-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer bg-transparent p-0 whitespace-nowrap shrink-0 ${activeTab === 'revenue' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                        >
                            Orders ({orders.length})
                        </button>
                    </div>

                    {/* TAB CONTENT: About */}
                    {activeTab === 'about' && (
                        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="text-xs font-bold text-slate-900 m-0 uppercase tracking-wider">Contact Overview</h3>
                                {!isSubUser && (
                                    <button onClick={() => setModalType('edit_contact')} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer">
                                        <Edit3 className="w-3.5 h-3.5" /> Edit Properties
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</span>
                                    <span className="text-sm font-bold text-slate-900">{lead.name}</span>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Company / Organization</span>
                                    <span className="text-sm font-bold text-slate-900">{lead.company || '--'}</span>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email Address</span>
                                    <span className="text-sm font-semibold text-slate-800">{lead.email}</span>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone Number</span>
                                    <span className="text-sm font-semibold text-slate-800">{lead.phone || '--'}</span>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pipeline Currency Value</span>
                                    <span className="text-sm font-extrabold text-emerald-600 font-mono">₹{(Number(lead.value) || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div>
                                    <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Creation Date</span>
                                    <span className="text-sm font-semibold text-slate-800">{new Date(lead.createdAt || Date.now()).toLocaleDateString('en-GB')}</span>
                                </div>
                            </div>

                            {/* Form Submission Data — shown when added via Dynamic Form */}
                            {lead.source === 'Dynamic Form' && (() => {
                                // Parse form data from notes field
                                let formTitle = '';
                                let formFields: Record<string, any> = {};
                                try {
                                    const notes = lead.notes || '';
                                    const titleMatch = notes.match(/Automatically added from form:\s*(.+?)\.\s*Response ID:/);
                                    if (titleMatch) formTitle = titleMatch[1].trim();
                                    const jsonMatch = notes.match(/FormData:\s*(\{[\s\S]+\})/);
                                    if (jsonMatch) formFields = JSON.parse(jsonMatch[1]);
                                } catch {}

                                const entries = Object.entries(formFields).filter(([k]) =>
                                    !['name', 'full_name', 'first_name', 'phone', 'phone_number', 'whatsapp_number', 'email', 'email_address'].includes(k)
                                );

                                if (entries.length === 0) return null;

                                const toLabel = (key: string) =>
                                    key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                                const renderValue = (val: any) => {
                                    if (val === null || val === undefined || val === '') return <span className="text-slate-400 font-mono">—</span>;
                                    if (Array.isArray(val)) {
                                        if (val.length === 0) return <span className="text-slate-400 font-mono">—</span>;
                                        // Check if it's file/image array
                                        if (val[0]?.key || val[0]?.url) {
                                            return (
                                                <div className="flex flex-wrap gap-2">
                                                    {val.map((f: any, i: number) => (
                                                        <a key={i} href={f.url || f.key} target="_blank" rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-primary hover:underline">
                                                            <Paperclip className="w-3 h-3" /> {f.name || `File ${i + 1}`}
                                                        </a>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return (
                                            <div className="flex flex-wrap gap-1.5">
                                                {val.map((v: any, i: number) => (
                                                    <span key={i} className="px-2.5 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-bold">{String(v)}</span>
                                                ))}
                                            </div>
                                        );
                                    }
                                    if (typeof val === 'object') {
                                        return <pre className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(val, null, 2)}</pre>;
                                    }
                                    // Check if it looks like a date string
                                    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
                                        try {
                                            return <span className="text-sm font-semibold text-slate-800">{new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>;
                                        } catch {}
                                    }
                                    return <span className="text-sm font-semibold text-slate-800">{String(val)}</span>;
                                };

                                return (
                                    <div className="border-t border-slate-100 pt-5 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider m-0">
                                                Form Submission Data
                                            </h4>
                                            {formTitle && (
                                                <span className="ml-auto px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold flex items-center gap-1">
                                                    <FileText className="w-3 h-3" /> {formTitle}
                                                </span>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {entries.map(([key, val]) => (
                                                <div key={key} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
                                                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{toLabel(key)}</span>
                                                    {renderValue(val)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}


                    {/* TAB CONTENT: Activities Timeline */}
                    {activeTab === 'activities' && (
                        <div className="space-y-6">
                            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
                                <h3 className="text-xs font-bold text-slate-900 m-0 uppercase tracking-wider border-b border-slate-100 pb-3">Log Interaction Note</h3>
                                <form onSubmit={handleAddActivity} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <select
                                            value={activityType}
                                            onChange={e => setActivityType(e.target.value as any)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all cursor-pointer text-slate-800"
                                        >
                                            <option value="NOTE">📝 Note / Observation</option>
                                            <option value="CALL">📞 Phone Call</option>
                                            <option value="EMAIL">✉️ Email Follow-up</option>
                                            <option value="MEETING">🤝 Meeting / Demo</option>
                                            <option value="TASK">📌 Action Task</option>
                                        </select>
                                        <input 
                                            type="text"
                                            required
                                            placeholder="Activity title / summary..."
                                            value={activityTitle}
                                            onChange={e => setActivityTitle(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all text-slate-800"
                                        />
                                    </div>
                                    <textarea 
                                        rows={3}
                                        placeholder="Detailed discussion notes or action items..."
                                        value={activityDesc}
                                        onChange={e => setActivityDesc(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all custom-scrollbar text-slate-800"
                                    />
                                    <div className="text-right">
                                        <button type="submit" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-purple-600/30 cursor-pointer flex items-center gap-2 inline-flex">
                                            <span>⚡</span> Submit Activity Log
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-6 font-sans">
                                <h3 className="text-xs font-bold text-slate-900 m-0 uppercase tracking-wider border-b border-slate-100 pb-3">Activity History</h3>
                                {timeline.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400 font-semibold text-xs">No activity timeline items recorded for this contact yet.</div>
                                ) : (
                                    <div className="space-y-4">
                                        {timeline.map((act) => (
                                            <div key={act.id} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                                                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                                    {act.type === 'NOTE' ? '📝' : act.type === 'CALL' ? '📞' : act.type === 'EMAIL' ? '✉️' : act.type === 'MEETING' ? '🤝' : '📌'}
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-bold text-slate-900 text-xs m-0">{act.title}</h4>
                                                        <span className="text-[10px] font-semibold text-slate-400">{new Date(act.date).toLocaleDateString('en-GB')} at {new Date(act.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    <p className="text-xs font-medium text-slate-600 m-0">{act.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT: Orders & Revenue */}
                    {activeTab === 'revenue' && (
                        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h3 className="text-xs font-bold text-slate-900 m-0 uppercase tracking-wider">Associated Sales Orders ({orders.length})</h3>
                                {!isSubUser && (
                                    <button onClick={() => setModalType('add_order')} className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-xl font-bold text-xs shadow-sm shadow-primary/30 cursor-pointer">
                                        <Plus className="w-3.5 h-3.5" /> Place Order
                                    </button>
                                )}
                            </div>

                            {orders.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 font-semibold text-xs">No completed sales transactions or orders found for this contact.</div>
                            ) : (
                                <div className="space-y-3">
                                    {orders.map(ord => (
                                        <div key={ord.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl font-sans">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shadow-2xs">
                                                    <ShoppingBag className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-extrabold text-slate-900 text-sm">{ord.service || 'Standard Package'}</div>
                                                    <div className="text-[11px] font-semibold text-slate-400">{new Date(ord.date).toLocaleDateString('en-GB')} at {ord.time || '10:00'}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <select
                                                    value={ord.status.toLowerCase()}
                                                    disabled={isSubUser}
                                                    onChange={e => handleUpdateOrderStatus(ord.id, e.target.value)}
                                                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-2xs cursor-pointer uppercase tracking-wider disabled:opacity-75"
                                                >
                                                    {ORDER_STATUSES.map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* RIGHT SIDEBAR: Connected Objects & Associations (3/12) */}
                <div className="lg:col-span-3 space-y-6 font-sans">
                    {/* Companies Card */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4 font-sans">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 font-sans">
                            <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider m-0">Companies ({unifiedCompanies.length})</h3>
                            {!isSubUser && (
                                <button onClick={() => { setAddCompanyMode('select'); if(workspaceCompanies.length > 0) setSelectedCompanyKey(workspaceCompanies[0].name); setModalType('add_company'); }} className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer">
                                    <Plus className="w-3.5 h-3.5" /> <span>+ Add</span>
                                </button>
                            )}
                        </div>

                        {unifiedCompanies.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-xs font-sans font-medium">No associated companies. Click + Add to attach an organization.</div>
                        ) : (
                            unifiedCompanies.map((comp: any, idx: number) => (
                                <div key={idx} className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3 font-sans">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-orange-500 text-white font-extrabold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                                            {comp.name.substring(0, 1).toUpperCase()}
                                        </div>
                                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                                            <span className="truncate">{comp.name}</span>
                                            {comp.isPrimary && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold">Primary</span>}
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-slate-600 space-y-1 font-sans">
                                        <div>Company Domain Name: {comp.domain ? <a href={`https://${comp.domain}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold inline-flex items-center gap-0.5">{comp.domain} <ExternalLink className="w-2.5 h-2.5" /></a> : <span className="text-slate-400 font-mono">--</span>}</div>
                                        <div>Phone: <span className="text-slate-500">{comp.phone || '--'}</span></div>
                                    </div>
                                    <div className="pt-1">
                                        <button onClick={() => showToast('Association label selector opened', 'info')} className="text-[11px] font-bold text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer">
                                            + Add association label
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}

                        <button onClick={() => navigate('/dashboard/crm/companies')} className="w-full py-2.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 border border-slate-200/80 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs font-sans">
                            View all associated Companies <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    {/* Deals Card */}
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-xs font-bold text-slate-900 m-0 uppercase tracking-wider">Deals ({dealsList.length + 1})</h3>
                            {!isSubUser && (
                                <button onClick={() => setModalType('add_deal')} className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer">
                                    <Plus className="w-3.5 h-3.5" /> <span>Add</span>
                                </button>
                            )}
                        </div>

                        {/* Primary Opportunity */}
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2 font-sans">
                            <div className="flex items-center justify-between">
                                <div className="text-xs font-extrabold text-slate-900 truncate mr-2">{lead.company || 'Primary'} Opportunity</div>
                                <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-[10px] uppercase tracking-wider">
                                    {lead.status}
                                </span>
                            </div>
                            <div className="text-lg font-extrabold text-emerald-600 font-mono">₹{(Number(lead.value) || 0).toLocaleString('en-IN')}</div>
                        </div>

                        {/* Associated Deals */}
                        {dealsList.map((d: any, idx: number) => (
                            <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="text-xs font-bold text-slate-900 truncate mr-2">{d.title}</div>
                                    <select
                                        value={d.stage?.toUpperCase() || 'NEW'}
                                        disabled={isSubUser}
                                        onChange={e => handleUpdateDealStage(idx, e.target.value)}
                                        className="px-2 py-1 rounded-xl text-[10px] font-extrabold bg-white border border-slate-200 text-slate-700 shadow-2xs cursor-pointer uppercase tracking-wider disabled:opacity-75"
                                    >
                                        {STAGES.map(s => (<option key={s} value={s}>{s}</option>))}
                                    </select>
                                </div>
                                <div className="font-extrabold text-emerald-600 text-sm font-mono">₹{(Number(d.amount) || 0).toLocaleString('en-IN')}</div>
                            </div>
                        ))}
                    </div>

                    {/* Tickets Card */}
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-2xs space-y-4 font-sans">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="text-xs font-bold text-slate-900 m-0 uppercase tracking-wider">Tickets ({ticketsList.length})</h3>
                            {!isSubUser && (
                                <button onClick={() => setModalType('add_ticket')} className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer">
                                    <Plus className="w-3.5 h-3.5" /> <span>Add</span>
                                </button>
                            )}
                        </div>

                        {ticketsList.length === 0 ? (
                            <div className="py-6 text-center text-slate-400 font-semibold text-xs">No open support tickets.</div>
                        ) : (
                            <div className="space-y-2">
                                {ticketsList.map((t: any, idx: number) => (
                                    <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 font-sans">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-bold text-slate-900 truncate mr-2">{t.title}</div>
                                            <select
                                                value={t.priority}
                                                disabled={isSubUser}
                                                onChange={e => handleUpdateTicket(idx, 'priority', e.target.value)}
                                                className="px-2 py-1 rounded-xl text-[10px] font-extrabold bg-white border border-slate-200 text-slate-700 shadow-2xs cursor-pointer disabled:opacity-75"
                                            >
                                                {PRIORITIES.map(p => (<option key={p} value={p}>{p}</option>))}
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-[10px] font-semibold text-slate-400">{t.date || '17/05/2026'}</span>
                                            <select
                                                value={t.status}
                                                disabled={isSubUser}
                                                onChange={e => handleUpdateTicket(idx, 'status', e.target.value)}
                                                className="px-2 py-1 rounded-xl text-[10px] font-extrabold bg-blue-50 border border-blue-200 text-blue-700 shadow-2xs cursor-pointer disabled:opacity-75"
                                            >
                                                {TKT_STATUSES.map(s => (<option key={s} value={s}>{s}</option>))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    
                </div>
            </div>

            {/* HubSpot Slide-Over Drawer: Modals & Slide-over Forms */}
            {modalType && modalType !== 'edit_contact' && (
                <div className="fixed inset-0 z-[200] flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
                    <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-300">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-900 text-white shrink-0 font-sans">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center font-bold shadow-lg shrink-0">
                                    {modalType === 'add_company' && <Building2 className="w-6 h-6" />}
                                    {modalType === 'add_deal' && <Briefcase className="w-6 h-6" />}
                                    {modalType === 'add_ticket' && <LifeBuoy className="w-6 h-6" />}
                                    {modalType === 'add_order' && <ShoppingBag className="w-6 h-6" />}
                                    {modalType === 'add_activity' && <Clock className="w-6 h-6" />}
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-lg m-0 tracking-tight">
                                        {modalType === 'add_company' ? 'Attach Company Account' :
                                         modalType === 'add_deal' ? 'Create Deal Opportunity' :
                                         modalType === 'add_ticket' ? 'Log Support Ticket' :
                                         modalType === 'add_order' ? 'Place Sales Order' : 'Log Quick Activity'}
                                    </h3>
                                    <p className="text-xs text-slate-400 m-0 mt-0.5">
                                        Enter association details and lifecycle parameters
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <a 
                                    href="#customize" 
                                    onClick={(e) => { e.preventDefault(); showToast("Form schema customization available in settings", "info"); }}
                                    className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" /> Edit this form
                                </a>
                                <button 
                                    onClick={() => setModalType(null)} 
                                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Form Body */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar text-xs font-sans">

                            {/* Add Company Form / Selection */}
                            {modalType === 'add_company' && (
                                <div className="space-y-6 font-sans">
                                    <div className="flex border-b border-slate-200 gap-6 font-sans">
                                        <button 
                                            type="button"
                                            onClick={() => setAddCompanyMode('select')}
                                            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer bg-transparent p-0 ${addCompanyMode === 'select' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                                        >
                                            Select Existing Company
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setAddCompanyMode('new')}
                                            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer bg-transparent p-0 ${addCompanyMode === 'new' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                                        >
                                            Create New Company
                                        </button>
                                    </div>

                                    <form onSubmit={handleAddCompany} className="space-y-6 font-sans">
                                        {addCompanyMode === 'select' ? (
                                            <div className="space-y-6 font-sans">
                                                <div>
                                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 text-xs">Select Organization *</label>
                                                    {workspaceCompanies.length === 0 ? (
                                                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs font-medium font-sans">
                                                            No existing companies found in workspace. Please use "Create New Company" tab.
                                                        </div>
                                                    ) : (
                                                        <select
                                                            value={selectedCompanyKey}
                                                            onChange={e => setSelectedCompanyKey(e.target.value)}
                                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all cursor-pointer"
                                                        >
                                                            {workspaceCompanies.map((c, idx) => (
                                                                <option key={idx} value={c.name}>{c.name} {c.domain ? `(${c.domain})` : ''}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6 font-sans">
                                                <div>
                                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 text-xs">Company Name *</label>
                                                    <input 
                                                        type="text"
                                                        required={addCompanyMode === 'new'}
                                                        placeholder="e.g. BioTech Global"
                                                        value={companyName}
                                                        onChange={e => setCompanyName(e.target.value)}
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 text-xs">Domain Name (Optional)</label>
                                                    <input 
                                                        type="text"
                                                        placeholder="e.g. biotech.org"
                                                        value={companyDomain}
                                                        onChange={e => setCompanyDomain(e.target.value)}
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white pb-2 font-sans">
                                            <button type="button" onClick={() => setModalType(null)} className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-xs transition-all cursor-pointer">
                                                Cancel
                                            </button>
                                            <button type="submit" className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold text-xs transition-all shadow-md shadow-primary/30 cursor-pointer flex items-center gap-2">
                                                <Building2 className="w-4 h-4" /> Attach Company
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Add Deal Form */}
                            {modalType === 'add_deal' && (
                                <form onSubmit={handleAddDeal} className="space-y-6">
                                    <div>
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Opportunity Title *</label>
                                        <input 
                                            type="text"
                                            required
                                            placeholder="e.g. Enterprise SLA Agreement"
                                            value={dealTitle}
                                            onChange={e => setDealTitle(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 font-sans">
                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Deal Value (₹) *</label>
                                            <input 
                                                type="number"
                                                required
                                                min={0}
                                                value={dealValue || ''}
                                                onChange={e => setDealValue(Number(e.target.value))}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Initial Stage</label>
                                            <select
                                                value={dealStage}
                                                onChange={e => setDealStage(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all cursor-pointer"
                                            >
                                                {STAGES.map(s => (<option key={s} value={s}>{s}</option>))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white pb-2 font-sans">
                                        <button type="button" onClick={() => setModalType(null)} className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-xs transition-all cursor-pointer">
                                            Cancel
                                        </button>
                                        <button type="submit" className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold text-xs transition-all shadow-md shadow-primary/30 cursor-pointer flex items-center gap-2">
                                            <Briefcase className="w-4 h-4" /> Create Opportunity
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Add Ticket Form */}
                            {modalType === 'add_ticket' && (
                                <form onSubmit={handleAddTicket} className="space-y-6">
                                    <div>
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Issue Subject / Title *</label>
                                        <input 
                                            type="text"
                                            required
                                            placeholder="e.g. Webhook Authentication Error"
                                            value={ticketTitle}
                                            onChange={e => setTicketTitle(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Priority</label>
                                            <select
                                                value={ticketPriority}
                                                onChange={e => setTicketPriority(e.target.value as any)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all cursor-pointer"
                                            >
                                                {PRIORITIES.map(p => (<option key={p} value={p}>{p}</option>))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Status</label>
                                            <select
                                                value={ticketStatus}
                                                onChange={e => setTicketStatus(e.target.value as any)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all cursor-pointer"
                                            >
                                                {TKT_STATUSES.map(s => (<option key={s} value={s}>{s}</option>))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white pb-2">
                                        <button type="button" onClick={() => setModalType(null)} className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-xs transition-all cursor-pointer">
                                            Cancel
                                        </button>
                                        <button type="submit" className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold text-xs transition-all shadow-md shadow-primary/30 cursor-pointer flex items-center gap-2">
                                            <LifeBuoy className="w-4 h-4" /> Log Support Ticket
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Add Order Form */}
                            {modalType === 'add_order' && (
                                <form onSubmit={handleAddOrder} className="space-y-6 font-sans">
                                    <div>
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Order Title / Service Name *</label>
                                        <input 
                                            type="text"
                                            required
                                            placeholder="e.g. Premium Consulting Package"
                                            value={orderTitle}
                                            onChange={e => setOrderTitle(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Amount (₹) *</label>
                                            <input 
                                                type="number"
                                                required
                                                min={0}
                                                value={orderAmount || ''}
                                                onChange={e => setOrderAmount(Number(e.target.value))}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Status</label>
                                            <select
                                                value={orderStatus}
                                                onChange={e => setOrderStatus(e.target.value as any)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all cursor-pointer uppercase tracking-wider"
                                            >
                                                {ORDER_STATUSES.map(s => (<option key={s} value={s}>{s}</option>))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white pb-2">
                                        <button type="button" onClick={() => setModalType(null)} className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-xs transition-all cursor-pointer">
                                            Cancel
                                        </button>
                                        <button type="submit" className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold text-xs transition-all shadow-md shadow-primary/30 cursor-pointer flex items-center gap-2">
                                            <ShoppingBag className="w-4 h-4" /> Place Sales Order
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Add Quick Activity Form */}
                            {modalType === 'add_activity' && (
                                <form onSubmit={handleAddActivity} className="space-y-6 font-sans">
                                    <div>
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Activity Type</label>
                                        <select
                                            value={activityType}
                                            onChange={e => setActivityType(e.target.value as any)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all cursor-pointer"
                                        >
                                            <option value="NOTE">📝 Note / Observation</option>
                                            <option value="CALL">📞 Phone Call</option>
                                            <option value="EMAIL">✉️ Email Follow-up</option>
                                            <option value="MEETING">🤝 Meeting / Demo</option>
                                            <option value="TASK">📌 Action Task</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Summary / Title *</label>
                                        <input 
                                            type="text"
                                            required
                                            placeholder="e.g. Discovery Call with Decision Maker"
                                            value={activityTitle}
                                            onChange={e => setActivityTitle(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Detailed Notes</label>
                                        <textarea 
                                            rows={4}
                                            placeholder="Enter meeting notes, follow-up requirements, or key observations..."
                                            value={activityDesc}
                                            onChange={e => setActivityDesc(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all custom-scrollbar"
                                        />
                                    </div>
                                    <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white pb-2 font-sans">
                                        <button type="button" onClick={() => setModalType(null)} className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-xs transition-all cursor-pointer">
                                            Cancel
                                        </button>
                                        <button type="submit" className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-xs transition-all shadow-md shadow-purple-600/30 cursor-pointer flex items-center gap-2">
                                            <Clock className="w-4 h-4" /> Log Activity
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Add/Edit Contact Drawer Form Component */}
            <ContactDrawerForm
                isOpen={modalType === 'edit_contact' && !!lead}
                mode="edit"
                initialData={lead || undefined}
                onClose={() => setModalType(null)}
                onSubmit={handleUpdateContactSubmit}
                userRole={user?.role}
                userId={user?.id}
                teamMembers={subUsersList}
            />
        </div>
    );
};

export default ContactDetail;
