import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Pagination } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { crmApi, CrmLead, ActivityItem } from '../../api/crm';
import { ContactDrawerForm } from '../../components/crm/ContactDrawerForm';
import {
    Activity, Plus, Search, User, Phone, Mail, MessageCircle, Calendar,
    DollarSign, MoreHorizontal, Eye, Download, Flame, Clock, CheckCircle,
    LayoutGrid, List, X, Building2, Tag, ArrowLeft, ShieldAlert, Sparkles, Filter, 
    ChevronRight, ChevronDown, Check, UploadCloud, RefreshCw, FileSpreadsheet, 
    Layers, Bot, Share2, FileText, SlidersHorizontal, Trash2, Edit3, UserCheck, 
    Briefcase, MapPin, TrendingUp, Send, MessageSquare, AlertCircle, ChevronUp,
    Copy, ExternalLink, ThumbsUp, ThumbsDown, CheckSquare, Settings, Paperclip, CheckCircle2
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

const LIFECYCLE_STAGES = ['Lead', 'MQL', 'SQL', 'Customer', 'Evangelist'];

const SAMPLE_CSV = `name,phone,email,company,jobTitle,city,industry,value,lifecycleStage,status\nRahul Sharma,+919876543210,rahul@apexcorp.com,Apex Corp,VP Marketing,Mumbai,SaaS,50000,SQL,NEW\nPriya Nair,+919876543211,priya@innovate.io,Innovate.io,Founder,Bangalore,Technology,120000,MQL,CONTACTED\nVikram Rathore,+919876543212,vikram@healthmax.com,HealthMax,Director,Delhi,Healthcare,85000,Customer,WON`;

const CRM: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; username: string }[]>([]);

    const [view, setView] = useState<'pipeline' | 'list' | 'detail'>('list');
    const [leads, setLeads] = useState<CrmLead[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterLifecycle, setFilterLifecycle] = useState<string>('all');
    const [selectedListTab, setSelectedListTab] = useState<string>('all');
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [total, setTotal] = useState<number>(0);
    const [summary, setSummary] = useState<{ total: number; won: number; totalValue: number; customers: number; conversionRate: number }>({
        total: 0, won: 0, totalValue: 0, customers: 0, conversionRate: 0
    });

    // Custom Sorting State
    const [sortField, setSortField] = useState<'name' | 'value' | 'lastActivity'>('createdAt' as any);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Multi-Select Checkboxes
    const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

    // Column Visibility State
    const [columnVisibility, setColumnVisibility] = useState({
        name: true, phone: true, email: true, company: true, jobTitle: true,
        lifecycleStage: true, status: true, value: true, lastActivity: true, source: false, assignedTo: true
    });
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);

    // Dashboard Widgets Customization State
    const [activeWidgets, setActiveWidgets] = useState({
        pipelineStats: true, revenueSummary: true, topCompanies: true, syncTracker: true
    });
    const [showWidgetSettings, setShowWidgetSettings] = useState(false);

    // Drawer / Modal States
    const [drawerType, setDrawerType] = useState<'none' | 'add' | 'import' | 'edit'>('none');
    const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
    const [activeDossierTab, setActiveDossierTab] = useState<'about' | 'activities' | 'revenue'>('about');

    // Right-column panel state: Tickets
    const [tickets, setTickets] = useState<{ id: string; title: string; priority: 'Low' | 'Medium' | 'High'; status: 'Open' | 'Closed'; date: string }[]>([]);
    const [showAddTicket, setShowAddTicket] = useState(false);
    const [newTicketTitle, setNewTicketTitle] = useState('');
    const [newTicketPriority, setNewTicketPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');

    // Right-column panel state: Attachments
    const [attachments, setAttachments] = useState<{ id: string; name: string; size: string; date: string; url: string }[]>([]);
    const attachmentInputRef = React.useRef<HTMLInputElement>(null);

    // Right-column panel state: Deals (additional deals beyond the primary)
    const [deals, setDeals] = useState<{ id: string; title: string; value: number; stage: string; date: string }[]>([]);
    const [showAddDeal, setShowAddDeal] = useState(false);
    const [newDealTitle, setNewDealTitle] = useState('');
    const [newDealValue, setNewDealValue] = useState('');
    const [newDealStage, setNewDealStage] = useState('New');

    // Activity Form inside Dossier
    const [newActivityType, setNewActivityType] = useState<'NOTE' | 'EMAIL' | 'CALL' | 'MEETING' | 'TASK'>('NOTE');
    const [activityTitle, setActivityTitle] = useState('');
    const [activityDesc, setActivityDesc] = useState('');
    const [activityDueDate, setActivityDueDate] = useState('');

    // AI Dossier Assistant Chat State
    const [askAiModal, setAskAiModal] = useState(false);
    const [aiQuery, setAiQuery] = useState('');
    const [aiChatLog, setAiChatLog] = useState<{ query: string; response: string }[]>([
        { query: "What is the key revenue opportunity for this contact?", response: "Based on recent interactions, this contact has a demonstrated software budget and is actively evaluating Q3 vendors. Direct follow-up via phone is recommended." }
    ]);

    // Copy Feedback State
    const [copiedEmail, setCopiedEmail] = useState(false);

    // Import / Sync State
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState(0);
    const [importHistory, setImportHistory] = useState<{ file: string; date: string; records: number; status: string }[]>([
        { file: "enterprise_leads_q2.csv", date: "2026-05-10", records: 45, status: "Success" },
        { file: "marketing_webinar_attendees.xlsx", date: "2026-05-02", records: 112, status: "Success" }
    ]);

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Custom Dropdown State
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [actionsDropdownOpen, setActionsDropdownOpen] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'new') {
            setDrawerType('add');
        }
    }, [location.search]);

    const { data: teamMembersData } = useQuery({
        queryKey: ['sub-users', 50],
        queryFn: () => apiClient.get('/auth/sub-users?limit=50').then(res => res.data?.data || [])
    });

    useEffect(() => {
        if (teamMembersData) setTeamMembers(teamMembersData);
    }, [teamMembersData]);

    const { data: leadsData, isLoading: loadingLeads } = useQuery({
        queryKey: ['leads', page, pageSize, searchTerm, filterStatus, view],
        queryFn: () => crmApi.getLeads({
            page: view === 'pipeline' ? undefined : page,
            limit: view === 'pipeline' ? undefined : pageSize,
            search: searchTerm,
            status: filterStatus === 'all' ? undefined : filterStatus.toUpperCase()
        }),
    });

    useEffect(() => {
        if (leadsData) {
            const data = leadsData;
            if (data && data.data) {
                setLeads(data.data.map((l: any) => ({ 
                    ...l, 
                    lastActivity: l.updatedAt ? l.updatedAt.split('T')[0] : 'Just now' 
                })));
                setTotal(data.total || 0);
                if (data.summary) setSummary(data.summary);
            } else if (Array.isArray(data)) {
                setLeads(data.map((l: any) => ({ 
                    ...l, 
                    lastActivity: l.updatedAt ? l.updatedAt.split('T')[0] : 'Just now' 
                })));
                setTotal(data.length);
                const won = data.filter((l: any) => l.status === 'WON').length;
                const totalVal = data.reduce((a: any, l: any) => a + (l.value || 0), 0);
                const cust = data.filter((l: any) => (l.lifecycleStage || '').toLowerCase() === 'customer').length;
                const conv = data.length > 0 ? Math.round((won / data.length) * 100) : 0;
                setSummary({ total: data.length, won, totalValue: totalVal, customers: cust, conversionRate: conv });
            }
        }
    }, [leadsData]);

    const createLeadMutation = useMutation({
        mutationFn: (data: Partial<CrmLead>) => crmApi.createLead(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] })
    });

    const updateLeadMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => crmApi.updateLead(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
    });

    const deleteLeadsMutation = useMutation({
        mutationFn: (ids: string[]) => crmApi.deleteLeads(ids),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] })
    });

    const bulkCreateMutation = useMutation({
        mutationFn: (data: Partial<CrmLead>[]) => crmApi.bulkCreate(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] })
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => crmApi.updateStatus(id, status),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] })
    });

    const teamMembersMap = React.useMemo(() => {
        const map: Record<string, string> = {};
        if (user?.id) {
            map[user.id] = `👑 ${user.name || user.username || 'Workspace Owner'}`;
        }
        teamMembers.forEach(m => {
            map[m.id] = `👤 ${m.name || m.username}`;
        });
        return map;
    }, [user, teamMembers]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest('.col-dropdown-toggle')) {
                setShowColumnDropdown(false);
            }
            if (!(e.target as HTMLElement).closest('.widget-dropdown-toggle')) {
                setShowWidgetSettings(false);
            }
            if (!(e.target as HTMLElement).closest('.action-dropdown-container')) {
                setOpenDropdownId(null);
                setActionsDropdownOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);


    const toggleSelectAll = (filteredList: CrmLead[]) => {
        if (selectedLeadIds.length === filteredList.length) {
            setSelectedLeadIds([]);
        } else {
            setSelectedLeadIds(filteredList.map(l => l.id));
        }
    };

    const toggleSelectLead = (id: string) => {
        setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const sortedLeads = [...leads].sort((a, b) => {
        let aValue: any = a[sortField] || '';
        let bValue: any = b[sortField] || '';

        if (sortField === 'value') {
            aValue = Number(a.value) || 0;
            bValue = Number(b.value) || 0;
        } else if (sortField === 'name') {
            aValue = (a.name || '').toLowerCase();
            bValue = (b.name || '').toLowerCase();
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const filteredLeads = sortedLeads.filter(l => {
        const matchesSearch = (l.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (l.phone || '').includes(searchTerm) || 
            (l.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (l.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (l.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === 'all' || l.status.toLowerCase() === filterStatus.toLowerCase();
        const matchesLifecycle = filterLifecycle === 'all' || (l.lifecycleStage || 'Lead').toLowerCase() === filterLifecycle.toLowerCase();

        let matchesListTab = true;
        if (selectedListTab === 'Customer') matchesListTab = (l.lifecycleStage || '').toLowerCase() === 'customer';
        if (selectedListTab === 'MQL') matchesListTab = (l.lifecycleStage || '').toLowerCase() === 'mql';
        if (selectedListTab === 'SQL') matchesListTab = (l.lifecycleStage || '').toLowerCase() === 'sql';
        if (selectedListTab === 'newsletter') matchesListTab = !!l.communicationSubs?.newsletter;
        if (selectedListTab === 'high-value') matchesListTab = l.value >= 50000;

        return matchesSearch && matchesStatus && matchesLifecycle && matchesListTab;
    });

    const handleAddContactSubmit = async (data: Partial<CrmLead>) => {
        try {
            const newLead = await createLeadMutation.mutateAsync({
                ...data,
                preferredChannels: ['Email', 'WhatsApp', 'Phone']
            });
            setLeads(prev => [newLead, ...prev]);
            setDrawerType('none');
            showToast('Contact created successfully', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to create contact', 'error');
        }
    };

    const handleUpdateContactSubmit = async (data: Partial<CrmLead>) => {
        if (!selectedLead) return;
        try {
            const updated = await updateLeadMutation.mutateAsync({ id: selectedLead.id, data });
            setSelectedLead(updated);
            setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
            setDrawerType('none');
            showToast('Contact updated successfully', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to update contact', 'error');
        }
    };

    const handleAddActivity = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedLead) return;

        const newItem: ActivityItem = {
            id: 'act-' + Date.now(),
            type: newActivityType,
            title: activityTitle || `${newActivityType} Logged`,
            description: activityDesc,
            date: new Date().toISOString(),
            status: 'PENDING',
            dueDate: activityDueDate || undefined
        };

        try {
            const updated = await updateLeadMutation.mutateAsync({ id: selectedLead.id, data: { newActivityItem: newItem } });
            setSelectedLead(updated);
            setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
            setActivityTitle('');
            setActivityDesc('');
            setActivityDueDate('');
            showToast('Activity logged successfully', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to log activity', 'error');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedLeadIds.length === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedLeadIds.length} selected contacts?`)) return;

        try {
            await deleteLeadsMutation.mutateAsync(selectedLeadIds);
            showToast(`Successfully deleted ${selectedLeadIds.length} contacts`, 'success');
            setSelectedLeadIds([]);
            if (selectedLead && selectedLeadIds.includes(selectedLead.id)) {
                setView('list');
                setSelectedLead(null);
            }
        } catch (error) {
            console.error(error);
            showToast('Failed to delete selected contacts', 'error');
        }
    };

    const handleExportCSV = () => {
        if (filteredLeads.length === 0) return;
        const headers = ['Contact Name', 'Phone', 'Email', 'Company', 'Job Title', 'City', 'Lifecycle Stage', 'Pipeline Status', 'Deal Value', 'Lead Source', 'Last Active'];
        const csvRows = [
            headers.join(','),
            ...filteredLeads.map(l => [
                `"${(l.name || '').replace(/"/g, '""')}"`,
                `"${(l.phone || '').replace(/"/g, '""')}"`,
                `"${(l.email || '').replace(/"/g, '""')}"`,
                `"${(l.company || '').replace(/"/g, '""')}"`,
                `"${(l.jobTitle || '').replace(/"/g, '""')}"`,
                `"${(l.city || '').replace(/"/g, '""')}"`,
                l.lifecycleStage || 'Lead',
                l.status,
                l.value,
                `"${(l.source || '').replace(/"/g, '""')}"`,
                l.lastActivity
            ].join(','))
        ];
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `crm_contacts_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
    };

    const handleDownloadSampleCSV = () => {
        const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'crm_import_sample_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const simulateFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportProgress(10);
        const interval = setInterval(() => {
            setImportProgress(prev => {
                if (prev >= 90) {
                    clearInterval(interval);
                    setTimeout(async () => {
                        setImporting(false);
                        setImportProgress(0);
                        const simulatedContacts: Partial<CrmLead>[] = [
                            { name: "Ananya Deshmukh", phone: "+91 9988776655", email: "ananya@finserve.com", company: "FinServe India", jobTitle: "Chief Revenue Officer", city: "Pune", value: 75000, lifecycleStage: "SQL", status: "QUALIFIED" },
                            { name: "Siddharth Verma", phone: "+91 9988776656", email: "siddharth@logistics.ai", company: "Logistics AI", jobTitle: "Director of Ops", city: "Hyderabad", value: 45000, lifecycleStage: "MQL", status: "CONTACTED" },
                            { name: "Meera Menon", phone: "+91 9988776657", email: "meera@biotech.org", company: "BioTech Global", jobTitle: "Head of Research", city: "Chennai", value: 95000, lifecycleStage: "Customer", status: "WON" }
                        ];
                        try {
                            await bulkCreateMutation.mutateAsync(simulatedContacts);
                            showToast(`Successfully imported ${simulatedContacts.length} contacts from ${file.name}!`, 'success');
                            setImportHistory(prevHistory => [{ file: file.name, date: new Date().toISOString().split('T')[0], records: simulatedContacts.length, status: "Success" }, ...prevHistory]);
                            setDrawerType('none');
                        } catch (err) {
                            showToast('Import execution error', 'error');
                        }
                    }, 500);
                    return 100;
                }
                return prev + 20;
            });
        }, 300);
    };

    const moveLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus.toUpperCase() as any } : l));
        if (selectedLead?.id === leadId) setSelectedLead(prev => prev ? { ...prev, status: newStatus.toUpperCase() as any } : null);
        setOpenDropdownId(null);
        try {
            await updateStatusMutation.mutateAsync({ id: leadId, status: newStatus.toUpperCase() });
            showToast(`Contact moved to ${newStatus}`, 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to update status', 'error');
        }
    };

    const handleSort = (field: 'name' | 'value' | 'lastActivity') => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const formatAssignedTo = (assignedTo?: string) => {
        if (!assignedTo) return 'Unassigned';
        return assignedTo.length > 12 ? `${assignedTo.substring(0, 10)}...` : assignedTo;
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
        showToast("Copied to clipboard", 'success');
    };

    return (
        <div className="animate-in fade-in duration-300 pb-20 font-sans w-full min-w-0 text-slate-800">
            {/* Custom Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-slate-900 text-white shadow-2xl text-xs font-semibold animate-in slide-in-from-bottom-4 duration-200 border border-slate-700">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-emerald-400' : toast.type === 'error' ? 'bg-red-400' : 'bg-blue-400'}`} />
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* View Switch Logic */}
            {view === 'detail' && selectedLead ? (
                /* 🌟 SPECTACULAR 3-COLUMN HUBSPOT-STYLE CONTACT DETAILS VIEW 🌟 */
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Top Action Nav Bar */}
                    <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-2xs flex items-center justify-between">
                        <button 
                            onClick={() => setView('list')}
                            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                        >
                            <ArrowLeft className="w-4 h-4 text-slate-500" />
                            <span>Back to Contacts</span>
                        </button>
                        
                        <div className="flex items-center gap-3 action-dropdown-container relative">
                            <button 
                                onClick={() => setDrawerType('edit')}
                                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            >
                                <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                                <span>Edit Record</span>
                            </button>

                            <div className="relative">
                                <button 
                                    onClick={() => setActionsDropdownOpen(!actionsDropdownOpen)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                                >
                                    <span>Actions</span>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                {actionsDropdownOpen && (
                                    <div className="absolute right-0 top-11 z-40 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 animate-in zoom-in-95 duration-150">
                                        <button 
                                            onClick={() => {
                                                copyToClipboard(window.location.href);
                                                setActionsDropdownOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                        >
                                            <Share2 className="w-3.5 h-3.5 text-slate-400" /> <span>Copy Record Link</span>
                                        </button>
                                        <button 
                                            onClick={() => {
                                                handleExportCSV();
                                                setActionsDropdownOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                        >
                                            <Download className="w-3.5 h-3.5 text-slate-400" /> <span>Export VCard</span>
                                        </button>
                                        <div className="border-t border-slate-100 my-1" />
                                        <button 
                                            onClick={async () => {
                                                if (window.confirm("Delete this contact record?")) {
                                                    await deleteLeadsMutation.mutateAsync([selectedLead.id]);
                                                    showToast("Contact deleted", 'success');
                                                    setView('list');
                                                }
                                            }}
                                            className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-red-500" /> <span>Delete Contact</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 3-COLUMN GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        
                        {/* LEFT COLUMN: Sticky Profile & Key Information (3/12) */}
                        <div className="lg:col-span-3 space-y-6">
                            {/* Profile Header Card */}
                            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-blue-500/10 via-primary/10 to-purple-500/10" />
                                <div className="relative pt-4">
                                    <div className="w-20 h-20 rounded-2xl bg-primary text-white flex items-center justify-center font-extrabold text-3xl mx-auto shadow-md mb-4 border-2 border-white">
                                        {selectedLead.name.charAt(0)}
                                    </div>
                                    <h2 className="text-base font-extrabold text-slate-900 m-0 mb-1">{selectedLead.name}</h2>
                                    <p className="text-xs font-semibold text-slate-500 m-0 mb-3">{selectedLead.jobTitle || 'Executive'} at {selectedLead.company || 'DoConnect Partner'}</p>
                                    
                                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-primary bg-primary/5 border border-primary/20 py-1.5 px-3 rounded-xl mb-6 w-fit mx-auto shadow-2xs">
                                        <span>{selectedLead.email || 'no-email@partner.com'}</span>
                                        <button onClick={() => copyToClipboard(selectedLead.email || '')} className="text-slate-400 hover:text-primary cursor-pointer p-0.5">
                                            {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>

                                    {/* Circular Quick Touchpoint Action Pills */}
                                    <div className="flex items-center justify-center gap-2.5 pt-4 border-t border-slate-100">
                                        {[
                                            { label: 'Note', icon: FileText, act: 'NOTE', color: 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200' },
                                            { label: 'Email', icon: Mail, act: 'EMAIL', color: 'hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200', link: `mailto:${selectedLead.email}` },
                                            { label: 'Call', icon: Phone, act: 'CALL', color: 'hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200', link: `tel:${selectedLead.phone}` },
                                            { label: 'Task', icon: CheckSquare, act: 'TASK', color: 'hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200' },
                                            { label: 'Meeting', icon: Calendar, act: 'MEETING', color: 'hover:bg-pink-50 hover:text-pink-600 hover:border-pink-200' },
                                        ].map((btn, idx) => (
                                            <div key={idx} className="flex flex-col items-center gap-1.5 group cursor-pointer">
                                                <button 
                                                    onClick={() => {
                                                        if (btn.link) window.open(btn.link);
                                                        setNewActivityType(btn.act as any);
                                                        setActiveDossierTab('activities');
                                                    }}
                                                    className={`w-11 h-11 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-600 transition-all shadow-2xs group-hover:scale-105 ${btn.color}`}
                                                >
                                                    <btn.icon className="w-4 h-4 transition-transform" />
                                                </button>
                                                <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors">{btn.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Key Information Accordion */}
                            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4 font-medium">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                    <h3 className="text-xs font-bold text-slate-900 m-0 uppercase tracking-wider">Key Information</h3>
                                    <button onClick={() => setDrawerType('edit')} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 cursor-pointer">
                                        <Settings className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                <div className="space-y-3.5 text-xs">
                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Assigned Owner / Sub-User</span>
                                        {user?.role === 'SUB_USER' ? (
                                            <div className="mt-1 px-2.5 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 w-full">
                                                <User className="w-3.5 h-3.5 shrink-0" />
                                                <span className="truncate">{teamMembersMap[selectedLead.assignedTo || ''] || 'Workspace Owner'}</span>
                                            </div>
                                        ) : (
                                            <select
                                                value={selectedLead.assignedTo || user?.id || ''}
                                                onChange={async (e) => {
                                                    const newOwner = e.target.value;
                                                    try {
                                                        const updated = await updateLeadMutation.mutateAsync({ id: selectedLead.id, data: { assignedTo: newOwner } });
                                                        setSelectedLead(updated);
                                                        setLeads(prev => prev.map(l => l.id === selectedLead.id ? updated : l));
                                                        showToast("Record successfully assigned to team member!", "success");
                                                    } catch (err) {
                                                        showToast("Failed to assign record", "error");
                                                    }
                                                }}
                                                className="w-full mt-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl px-2.5 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-2xs"
                                            >
                                                <option value={user?.id || ''}>👑 {user?.name || user?.username || 'Workspace Owner'} (You)</option>
                                                {teamMembers.map(m => (
                                                    <option key={m.id} value={m.id}>👤 {m.name || m.username}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</span>
                                        <div className="font-bold text-slate-900 truncate">{selectedLead.email || '--'}</div>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Phone Number</span>
                                        <div className="font-bold text-slate-900 font-mono">{selectedLead.phone || '--'}</div>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Preferred Channels</span>
                                        <div className="flex gap-1.5 mt-1">
                                            {(selectedLead.preferredChannels || ['Email', 'WhatsApp']).map((ch, idx) => (
                                                <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px] border border-slate-200">
                                                    {ch}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Favorite Content Topics</span>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(selectedLead.favoriteTopics || ['AI Automation', 'Cloud Sync']).map((t, idx) => (
                                                <span key={idx} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[10px] border border-primary/20">
                                                    #{t}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Lead Status</span>
                                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px] uppercase tracking-wider inline-block mt-0.5">
                                            {selectedLead.status}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Create Date</span>
                                        <div className="font-bold text-slate-700 font-mono">{new Date(selectedLead.createdAt || Date.now()).toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* MIDDLE COLUMN: Main Content Workspace (6/12) */}
                        <div className="lg:col-span-6 space-y-6">
                            {/* Navigation Tabs Header */}
                            <div className="bg-white border border-slate-200/80 rounded-2xl p-2 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto">
                                <div className="flex items-center gap-1.5">
                                    {[
                                        { key: 'about', label: 'About' },
                                        { key: 'activities', label: `Activities (${(selectedLead.activityTimeline || []).length})` },
                                        { key: 'revenue', label: 'Revenue' },
                                    ].map(tab => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveDossierTab(tab.key as any)}
                                            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                activeDossierTab === tab.key 
                                                    ? "bg-slate-900 text-white shadow-2xs" 
                                                    : "hover:bg-slate-100 text-slate-600"
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                <button 
                                    onClick={() => showToast("Workspace dashboard customized", "info")}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-bold text-xs shrink-0 border border-slate-200/60 shadow-2xs cursor-pointer ml-auto"
                                >
                                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Customize</span>
                                </button>
                            </div>

                            {/* TAB 1: ABOUT */}
                            {activeDossierTab === 'about' && (
                                <div className="space-y-6 animate-in fade-in duration-200 font-medium">
                                    {/* Contact Profile Box */}
                                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                            <h3 className="text-xs font-bold text-slate-900 m-0 uppercase tracking-wider">Contact profile</h3>
                                            <button onClick={() => setDrawerType('edit')} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 cursor-pointer">
                                                <Settings className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs font-medium">
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Company name</span>
                                                <div className="font-bold text-slate-900">{selectedLead.company || 'HubSpot'}</div>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Street address</span>
                                                <div className="font-bold text-slate-900">{selectedLead.address || '--'}</div>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">City</span>
                                                <div className="font-bold text-slate-900">{selectedLead.city || 'Brisbane'}</div>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">State/Region</span>
                                                <div className="font-bold text-slate-900">--</div>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</span>
                                                <div className="font-bold text-slate-900">{selectedLead.email || 'emailmaria@hubspot.com'}</div>
                                            </div>
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Postal code</span>
                                                <div className="font-bold text-slate-900">--</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Enrollments / Communication Subscriptions */}
                                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4 font-medium">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                            <h3 className="text-xs font-bold text-slate-900 m-0 uppercase tracking-wider">Communication subscriptions</h3>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/60">
                                            <div className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                                            <span className="text-xs text-slate-700 font-semibold">Use subscription types to manage the communications this contact receives from you.</span>
                                        </div>
                                        <div>
                                            <button 
                                                onClick={() => showToast("Communication subscriptions active", "success")} 
                                                className="text-primary hover:text-primary-hover font-bold text-xs underline bg-transparent border-0 p-0 cursor-pointer"
                                            >
                                                View subscriptions
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: ACTIVITIES TIMELINE FEED */}
                            {activeDossierTab === 'activities' && (
                                <div className="space-y-6 animate-in fade-in duration-200 font-medium">
                                    {/* Activity Logging Form */}
                                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
                                        <div className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center justify-between">
                                            <span>Log New Touchpoint or Task</span>
                                            <div className="flex gap-1.5">
                                                {(['NOTE', 'EMAIL', 'CALL', 'MEETING', 'TASK'] as const).map(act => (
                                                    <button
                                                        key={act}
                                                        type="button"
                                                        onClick={() => setNewActivityType(act)}
                                                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                                                            newActivityType === act 
                                                                ? "bg-primary text-white shadow-2xs" 
                                                                : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                                                        }`}
                                                    >
                                                        {act}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <form onSubmit={handleAddActivity} className="space-y-3 font-medium">
                                            <input
                                                type="text"
                                                required
                                                placeholder={`${newActivityType} summary or title...`}
                                                value={activityTitle}
                                                onChange={e => setActivityTitle(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                                            />
                                            <textarea
                                                rows={3}
                                                placeholder="Detailed notes, discussion items, or next action steps..."
                                                value={activityDesc}
                                                onChange={e => setActivityDesc(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all custom-scrollbar resize-none"
                                            />
                                            {(newActivityType === 'MEETING' || newActivityType === 'TASK') && (
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Scheduled / Due Date</label>
                                                    <input
                                                        type="date"
                                                        value={activityDueDate}
                                                        onChange={e => setActivityDueDate(e.target.value)}
                                                        className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex justify-end">
                                                <button
                                                    type="submit"
                                                    className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                                                >
                                                    Save {newActivityType} Record
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    <div className="space-y-4 font-medium">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Chronological Touchpoint History</div>
                                        <div className="space-y-3">
                                            {(selectedLead.activityTimeline || [
                                                { id: '1', type: 'TASK', title: 'Prepare quotation breakdown', description: 'Requested formal enterprise pricing tiers.', date: new Date().toISOString() },
                                                { id: '2', type: 'CALL', title: 'Introductory Discovery Call', description: 'Discussed messaging API throughput and cloud security specifications.', date: new Date(Date.now() - 86400000).toISOString() },
                                            ]).map((item: any, idx: number) => (
                                                <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                                                        item.type === 'EMAIL' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                                                        item.type === 'CALL' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                                                        item.type === 'MEETING' ? 'bg-purple-50 text-purple-600 border border-purple-200' :
                                                        item.type === 'TASK' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                                        'bg-slate-100 text-slate-700 border border-slate-200'
                                                    }`}>
                                                        {item.type.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h4 className="text-xs font-bold text-slate-900 m-0 truncate">{item.title}</h4>
                                                            <span className="text-[11px] font-semibold text-slate-400 shrink-0 font-mono">{new Date(item.date).toLocaleDateString()}</span>
                                                        </div>
                                                        {item.description && (
                                                            <p className="text-xs text-slate-600 m-0 leading-relaxed font-normal">{item.description}</p>
                                                        )}
                                                        {item.dueDate && (
                                                            <div className="mt-2 text-[11px] font-bold text-emerald-600 flex items-center gap-1 font-mono">
                                                                <Calendar className="w-3.5 h-3.5" /> Due: {item.dueDate}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: REVENUE OPPORTUNITIES */}
                            {activeDossierTab === 'revenue' && (
                                <div className="space-y-6 animate-in fade-in duration-200 font-medium">
                                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs flex items-center justify-between">
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pipeline Deal Opportunity</div>
                                            <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono mt-1">₹{(Number(selectedLead.value) || 0).toLocaleString()}</div>
                                        </div>
                                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold text-2xl font-mono">
                                            ₹
                                        </div>
                                    </div>

                                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                                        <div className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">Active Pipeline Stages</div>
                                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex items-center justify-between">
                                            <div>
                                                <div className="text-xs font-bold text-slate-900">Software Subscription & Implementation</div>
                                                <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Stage: {selectedLead.status}</div>
                                            </div>
                                            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-xs font-mono shadow-2xs">
                                                ₹{(Number(selectedLead.value) || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Associations & Connected Objects (3/12) */}
                        <div className="lg:col-span-3 space-y-6 font-medium">
                            {/* Companies Card */}
                            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                    <h3 className="text-xs font-bold text-slate-900 m-0 uppercase tracking-wider">Companies (1)</h3>
                                    <button onClick={() => showToast("Add company modal", "info")} className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary-hover cursor-pointer bg-transparent border-0 p-0">
                                        <Plus className="w-3.5 h-3.5" /> <span>Add</span>
                                    </button>
                                </div>

                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-orange-500 text-white font-extrabold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                                            H
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                <span>HubSpot</span>
                                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold">Primary</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-slate-600 space-y-1">
                                        <div>Company Domain Name: <a href="https://hubspot.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold inline-flex items-center gap-1">hubspot.com <ExternalLink className="w-2.5 h-2.5" /></a></div>
                                        <div>Phone: <span className="font-mono text-slate-400">--</span></div>
                                    </div>
                                    <div>
                                        <button onClick={() => showToast("Association label customized", "success")} className="text-[11px] font-bold text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer">
                                            Add association label
                                        </button>
                                    </div>
                                    <button onClick={() => showToast("Showing all companies", "info")} className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5">
                                        <span>View all associated Companies</span>
                                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                    </button>
                                </div>

                                {/* Deals Card - Functional */}
                                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                        <h3 className="text-xs font-bold text-slate-900 m-0 uppercase tracking-wider">
                                            Deals ({deals.length + 1})
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setShowAddDeal(!showAddDeal)}
                                                className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary-hover cursor-pointer bg-transparent border-0 p-0"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> <span>Add</span>
                                            </button>
                                            <button className="p-1 hover:bg-slate-100 rounded text-slate-400 cursor-pointer">
                                                <Settings className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Primary deal from lead value */}
                                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-bold text-slate-900 truncate mr-2">
                                                {selectedLead.company || 'Primary'} Opportunity
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                                                {selectedLead.status}
                                            </span>
                                        </div>
                                        <div className="text-lg font-extrabold text-emerald-600 font-mono">
                                            ₹{(Number(selectedLead.value) || 0).toLocaleString()}
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-semibold">
                                            {selectedLead.lifecycleStage || 'Lead'} • {new Date(selectedLead.createdAt || Date.now()).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {deals.map(deal => (
                                        <div key={deal.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="text-xs font-bold text-slate-800 truncate mr-2">{deal.title}</div>
                                                <button
                                                    onClick={() => setDeals(prev => prev.filter(d => d.id !== deal.id))}
                                                    className="p-0.5 hover:bg-red-50 rounded text-slate-300 hover:text-red-400 cursor-pointer shrink-0"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="font-extrabold text-emerald-600 text-xs font-mono">₹{deal.value.toLocaleString()}</span>
                                                <span className="text-[10px] text-slate-400 font-semibold">{deal.stage}</span>
                                            </div>
                                        </div>
                                    ))}

                                    {showAddDeal && (
                                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                                            <input
                                                type="text"
                                                placeholder="Deal title..."
                                                value={newDealTitle}
                                                onChange={e => setNewDealTitle(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    placeholder="Value (₹)"
                                                    value={newDealValue}
                                                    onChange={e => setNewDealValue(e.target.value)}
                                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                />
                                                <select
                                                    value={newDealStage}
                                                    onChange={e => setNewDealStage(e.target.value)}
                                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
                                                >
                                                    {['New','Contacted','Qualified','Proposal','Won','Lost'].map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (!newDealTitle.trim()) return;
                                                        setDeals(prev => [...prev, { id: Date.now().toString(), title: newDealTitle, value: Number(newDealValue) || 0, stage: newDealStage, date: new Date().toLocaleDateString() }]);
                                                        setNewDealTitle(''); setNewDealValue(''); setNewDealStage('New'); setShowAddDeal(false);
                                                        showToast('Deal added', 'success');
                                                    }}
                                                    className="flex-1 py-1.5 bg-primary text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-primary-hover transition-colors"
                                                >
                                                    Save Deal
                                                </button>
                                                <button onClick={() => setShowAddDeal(false)} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-50">
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Tickets Card - Functional */}
                                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                        <h3 className="text-xs font-bold text-slate-900 m-0 uppercase tracking-wider">
                                            Tickets ({tickets.length})
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setShowAddTicket(!showAddTicket)} className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary-hover cursor-pointer bg-transparent border-0 p-0">
                                                <Plus className="w-3.5 h-3.5" /> <span>Add</span>
                                            </button>
                                            <button className="p-1 hover:bg-slate-100 rounded text-slate-400 cursor-pointer">
                                                <Settings className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {tickets.length > 0 ? (
                                        <div className="space-y-2">
                                            {tickets.map(ticket => (
                                                <div key={ticket.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${ticket.priority === 'High' ? 'bg-red-500' : ticket.priority === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-bold text-slate-800 truncate">{ticket.title}</div>
                                                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{ticket.priority} • {ticket.date}</div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ticket.status === 'Open' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                                            {ticket.status}
                                                        </span>
                                                        <button onClick={() => setTickets(prev => prev.filter(t => t.id !== ticket.id))} className="p-0.5 hover:bg-red-50 rounded text-slate-300 hover:text-red-400 cursor-pointer">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        !showAddTicket && (
                                            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1.5">
                                                <AlertCircle className="w-7 h-7 text-slate-300 mx-auto" />
                                                <div className="text-[11px] text-slate-400 font-semibold">No tickets yet. Click Add to create one.</div>
                                            </div>
                                        )
                                    )}

                                    {showAddTicket && (
                                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                                            <input
                                                type="text"
                                                placeholder="Describe the issue..."
                                                value={newTicketTitle}
                                                onChange={e => setNewTicketTitle(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                            <select
                                                value={newTicketPriority}
                                                onChange={e => setNewTicketPriority(e.target.value as any)}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer"
                                            >
                                                <option value="Low">Low Priority</option>
                                                <option value="Medium">Medium Priority</option>
                                                <option value="High">High Priority</option>
                                            </select>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (!newTicketTitle.trim()) return;
                                                        setTickets(prev => [...prev, { id: Date.now().toString(), title: newTicketTitle, priority: newTicketPriority, status: 'Open', date: new Date().toLocaleDateString() }]);
                                                        setNewTicketTitle(''); setShowAddTicket(false);
                                                        showToast('Ticket created', 'success');
                                                    }}
                                                    className="flex-1 py-1.5 bg-primary text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-primary-hover transition-colors"
                                                >
                                                    Create Ticket
                                                </button>
                                                <button onClick={() => setShowAddTicket(false)} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-50">
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Attachments Card - Functional */}
                                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                        <h3 className="text-xs font-bold text-slate-900 m-0 uppercase tracking-wider">
                                            Attachments ({attachments.length})
                                        </h3>
                                        <button onClick={() => attachmentInputRef.current?.click()} className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary-hover cursor-pointer bg-transparent border-0 p-0">
                                            <Paperclip className="w-3.5 h-3.5" /> <span>Add</span>
                                        </button>
                                        <input
                                            ref={attachmentInputRef}
                                            type="file"
                                            className="hidden"
                                            multiple
                                            onChange={e => {
                                                const files = Array.from(e.target.files || []);
                                                const newAtts = files.map(f => ({
                                                    id: Date.now() + f.name,
                                                    name: f.name,
                                                    size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${(f.size / 1024).toFixed(0)} KB`,
                                                    date: new Date().toLocaleDateString(),
                                                    url: URL.createObjectURL(f)
                                                }));
                                                setAttachments(prev => [...prev, ...newAtts]);
                                                showToast(`${files.length} file(s) attached`, 'success');
                                                e.target.value = '';
                                            }}
                                        />
                                    </div>

                                    {attachments.length > 0 ? (
                                        <div className="space-y-2">
                                            {attachments.map(att => (
                                                <div key={att.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-primary/30 transition-colors group">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                                        <FileText className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-slate-800 hover:text-primary truncate block transition-colors">
                                                            {att.name}
                                                        </a>
                                                        <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{att.size} • {att.date}</div>
                                                    </div>
                                                    <button onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))} className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded text-slate-300 hover:text-red-400 cursor-pointer transition-all">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => attachmentInputRef.current?.click()}
                                            className="p-5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-1.5 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group"
                                        >
                                            <Paperclip className="w-7 h-7 text-slate-300 group-hover:text-primary/50 mx-auto transition-colors" />
                                            <div className="text-[11px] text-slate-400 font-semibold">Click to upload files</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                    </div>

                    {/* Ask AI Interactive Modal */}
                    {askAiModal && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-in fade-in p-4">
                            <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold border border-primary/20">
                                            <Bot className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 m-0">Ask Breeze AI Assistant</h3>
                                            <p className="text-xs text-slate-500 m-0 font-medium">Inquiring about {selectedLead.name}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setAskAiModal(false)} className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="p-6 space-y-4 max-h-80 overflow-y-auto custom-scrollbar font-medium">
                                    {aiChatLog.map((log, idx) => (
                                        <div key={idx} className="space-y-2 text-xs">
                                            <div className="bg-slate-100 text-slate-800 p-3.5 rounded-2xl rounded-tr-xs font-semibold ml-auto max-w-[85%]">
                                                {log.query}
                                            </div>
                                            <div className="bg-primary/10 border border-primary/20 text-slate-900 p-3.5 rounded-2xl rounded-tl-xs font-medium mr-auto max-w-[85%] leading-relaxed">
                                                {log.response}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    if (!aiQuery) return;
                                    const query = aiQuery;
                                    setAiQuery('');
                                    setAiChatLog(prev => [...prev, { query, response: `Analyzing record timeline... For ${selectedLead.name}, immediate follow-up via WhatsApp on ${selectedLead.phone} is confirmed to yield a 40% higher conversion probability.` }]);
                                }} className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Ask AI what to do next with this contact..."
                                        value={aiQuery}
                                        onChange={e => setAiQuery(e.target.value)}
                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    />
                                    <button
                                        type="submit"
                                        className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                                    >
                                        <span>Ask</span> <Send className="w-3.5 h-3.5" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Premium Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-2xs w-full min-w-0">
                        <div className="min-w-0">
                            <div className="flex items-center gap-3 mb-1 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                    <Activity className="w-5 h-5 text-primary" />
                                </div>
                                <h1 className="text-xl font-bold tracking-tight text-slate-900 m-0 truncate">CRM & Contacts</h1>
                            </div>
                            <p className="text-xs font-semibold text-slate-500 m-0 mt-1 truncate">Manage customer relationships, multi-stage pipelines, AI intelligence insights, and omni-channel interactions.</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
                            <div className="relative widget-dropdown-toggle">
                                <button
                                    onClick={() => setShowWidgetSettings(!showWidgetSettings)}
                                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-all cursor-pointer"
                                >
                                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Dashboard</span>
                                </button>
                                {showWidgetSettings && (
                                    <div className="absolute right-0 top-11 z-30 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 space-y-3 animate-in zoom-in-95 duration-100">
                                        <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2">Customize Widgets</div>
                                        {[
                                            { key: 'pipelineStats', label: 'Pipeline KPI Counters' },
                                            { key: 'revenueSummary', label: 'Revenue & Deal Value' },
                                            { key: 'topCompanies', label: 'Top Account Metrics' },
                                            { key: 'syncTracker', label: 'External App Sync Engine' }
                                        ].map(item => (
                                            <label key={item.key} className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer p-1 hover:bg-slate-50 rounded-lg">
                                                <span>{item.label}</span>
                                                <input
                                                    type="checkbox"
                                                    checked={(activeWidgets as any)[item.key]}
                                                    onChange={(e) => setActiveWidgets(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                                    className="rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                                                />
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={() => setDrawerType('import')}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                            >
                                <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                                <span>Import & Sync</span>
                            </button>

                            <button 
                                onClick={handleExportCSV}
                                disabled={filteredLeads.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                                <Download className="w-3.5 h-3.5 text-slate-500" />
                                <span>Export CSV</span>
                            </button>

                            <button 
                                onClick={() => setDrawerType('add')}
                                className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Create Contact</span>
                            </button>
                        </div>
                    </div>

                    {/* Configurable Widgets Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8 w-full min-w-0">
                        {activeWidgets.pipelineStats && (
                            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs min-w-0">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total CRM Records</span>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100">
                                        <User className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{summary.total}</div>
                                <div className="text-[11px] font-semibold text-slate-500 mt-2">All contacts & leads in database</div>
                            </div>
                        )}

                        {activeWidgets.revenueSummary && (
                            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs min-w-0">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pipeline Revenue</span>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100">
                                        <DollarSign className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">₹{(summary.totalValue / 1000).toFixed(0)}K</div>
                                <div className="text-[11px] font-semibold text-emerald-600 mt-2 flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5" /> <span>{summary.conversionRate}% deal win rate</span>
                                </div>
                            </div>
                        )}

                        {activeWidgets.topCompanies && (
                            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs min-w-0">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Closed Customers</span>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-50 text-purple-600 border border-purple-100">
                                        <UserCheck className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{summary.customers}</div>
                                <div className="text-[11px] font-semibold text-slate-500 mt-2">Active customer relationships</div>
                            </div>
                        )}

                        {activeWidgets.syncTracker && (
                            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs min-w-0">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Omni-Sync Engine</span>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100">
                                        <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
                                    </div>
                                </div>
                                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">4 Live</div>
                                <div className="text-[11px] font-semibold text-slate-500 mt-2">HubSpot, Salesforce & Sheets</div>
                            </div>
                        )}
                    </div>

                    {/* Smart Segmentation Tabs */}
                    <div className="flex items-center gap-2 mb-4 bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto custom-scrollbar w-full min-w-0">
                        {[
                            { key: 'all', label: 'All Contacts', icon: Layers },
                            { key: 'Customer', label: 'Customers', icon: UserCheck },
                            { key: 'SQL', label: 'SQLs', icon: Flame },
                            { key: 'MQL', label: 'MQLs', icon: Activity },
                            { key: 'newsletter', label: 'Newsletter Subscribers', icon: Mail },
                            { key: 'high-value', label: 'High Value (₹50k+)', icon: DollarSign }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => { setSelectedListTab(tab.key); setPage(1); }}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                                    selectedListTab === tab.key 
                                        ? "bg-slate-900 text-white shadow-2xs font-bold" 
                                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                                }`}
                            >
                                <tab.icon className={`w-4 h-4 shrink-0 ${selectedListTab === tab.key ? 'text-primary' : 'text-slate-400'}`} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Controls & Search Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs w-full min-w-0">
                        <div className="relative flex-1 min-w-[260px]">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 shrink-0" />
                            <input
                                type="text"
                                placeholder="Search contacts, company, title..."
                                value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative w-44">
                                <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 z-10 shrink-0" />
                                <select
                                    value={filterLifecycle}
                                    onChange={e => { setFilterLifecycle(e.target.value); setPage(1); }}
                                    className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none relative"
                                >
                                    <option value="all">All Lifecycle</option>
                                    {LIFECYCLE_STAGES.map(stage => (
                                        <option key={stage} value={stage}>{stage}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative w-44">
                                <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 z-10 shrink-0" />
                                <select
                                    value={filterStatus}
                                    onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                                    className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer appearance-none relative"
                                >
                                    <option value="all">All Pipeline Stages</option>
                                    {PIPELINE_STAGES.map(s => (
                                        <option key={s.key} value={s.key}>{s.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 shrink-0">
                                {(['list', 'pipeline'] as const).map(v => (
                                    <button
                                        key={v}
                                        onClick={() => setView(v)}
                                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                            view === v ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-900 font-medium"
                                        }`}
                                    >
                                        {v === 'list' ? <List className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
                                        <span>{v === 'list' ? 'Table' : 'Kanban'}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {selectedLeadIds.length > 0 && (
                        <div className="flex items-center justify-between p-4 mb-6 bg-primary/10 border border-primary/20 rounded-2xl animate-in zoom-in-95 duration-200 text-xs font-semibold text-slate-900 shadow-2xs">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
                                    {selectedLeadIds.length}
                                </div>
                                <span>Contacts Selected</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleBulkDelete}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-colors border border-red-200 cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> <span>Bulk Delete</span>
                                </button>
                                <button
                                    onClick={() => setSelectedLeadIds([])}
                                    className="text-slate-500 hover:text-slate-700 underline text-xs cursor-pointer"
                                >
                                    Deselect All
                                </button>
                            </div>
                        </div>
                    )}

                    {view === 'list' ? (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden w-full">
                            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs font-semibold text-slate-600">
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                                            onChange={() => toggleSelectAll(filteredLeads)}
                                            className="rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                                        />
                                        <span className="text-slate-700 font-bold">Select All</span>
                                    </label>
                                    <span className="text-slate-300">|</span>
                                    <span>Showing {filteredLeads.length} contacts on this page (Total: {total})</span>
                                </div>

                                <div className="relative col-dropdown-toggle">
                                    <button
                                        onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 transition-all cursor-pointer shadow-2xs"
                                    >
                                        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Columns</span>
                                    </button>
                                    {showColumnDropdown && (
                                        <div className="absolute right-0 top-9 z-30 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 space-y-2 animate-in zoom-in-95 duration-100">
                                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">Toggle Visibility</div>
                                            {Object.keys(columnVisibility).map(colKey => (
                                                <label key={colKey} className="flex items-center justify-between text-xs font-semibold text-slate-700 p-1 hover:bg-slate-50 rounded cursor-pointer capitalize">
                                                    <span>{colKey.replace(/([A-Z])/g, ' $1')}</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={(columnVisibility as any)[colKey]}
                                                        onChange={(e) => setColumnVisibility(prev => ({ ...prev, [colKey]: e.target.checked }))}
                                                        className="rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-x-auto min-h-[380px]">
                                <table className="w-full text-left border-collapse min-w-[1000px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 select-none">
                                            <th className="py-3.5 px-4 w-12 text-center"></th>
                                            {columnVisibility.name && (
                                                <th 
                                                    onClick={() => handleSort('name')}
                                                    className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-900"
                                                >
                                                    <div className="flex items-center gap-1">Contact Details {sortField === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}</div>
                                                </th>
                                            )}
                                            {columnVisibility.company && <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Company / Title</th>}
                                            {columnVisibility.phone && <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact Channels</th>}
                                            {columnVisibility.lifecycleStage && <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lifecycle Stage</th>}
                                            {columnVisibility.status && <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pipeline Stage</th>}
                                            {columnVisibility.value && (
                                                <th 
                                                    onClick={() => handleSort('value')}
                                                    className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-900"
                                                >
                                                    <div className="flex items-center gap-1">Deal Value {sortField === 'value' && (sortDirection === 'asc' ? '▲' : '▼')}</div>
                                                </th>
                                            )}
                                            {columnVisibility.lastActivity && (
                                                <th 
                                                    onClick={() => handleSort('lastActivity')}
                                                    className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-900"
                                                >
                                                    <div className="flex items-center gap-1">Last Active {sortField === 'lastActivity' && (sortDirection === 'asc' ? '▲' : '▼')}</div>
                                                </th>
                                            )}
                                            {columnVisibility.source && <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lead Source</th>}
                                            {columnVisibility.assignedTo && <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned Owner</th>}
                                            <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs font-medium">
                                        {filteredLeads.map(lead => {
                                            const isSelected = selectedLeadIds.includes(lead.id);
                                            const config = STATUS_CONFIG[lead.status.toLowerCase() as LeadStatus] || STATUS_CONFIG.new;
                                            return (
                                                <tr 
                                                    key={lead.id} 
                                                    className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${isSelected ? 'bg-primary/5' : ''}`}
                                                    onClick={() => navigate(`/dashboard/crm/contact/${lead.id}`)}
                                                >
                                                    <td className="py-4 px-4 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleSelectLead(lead.id)}
                                                            className="rounded border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                                                        />
                                                    </td>

                                                    {columnVisibility.name && (
                                                        <td className="py-4 px-6 min-w-[220px]">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-800 shrink-0 shadow-2xs">
                                                                    {(lead.name || '?').charAt(0)}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="font-bold text-slate-900 group-hover:text-primary transition-colors truncate text-sm">{lead.name}</div>
                                                                    <div className="text-xs text-slate-400 truncate flex items-center gap-1">
                                                                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> <span>{lead.city || 'Bangalore'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    )}

                                                    {columnVisibility.company && (
                                                        <td className="py-4 px-6">
                                                            <div className="font-bold text-slate-900 truncate">{lead.company || lead.industry || 'Apex Corp'}</div>
                                                            <div className="text-xs text-slate-400 truncate">{lead.jobTitle || 'Executive'}</div>
                                                        </td>
                                                    )}

                                                    {columnVisibility.phone && (
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-1.5 font-mono text-slate-900 font-bold mb-0.5">
                                                                <Phone className="w-3 h-3 text-slate-400 shrink-0" /> <span>{lead.phone}</span>
                                                            </div>
                                                            {lead.email && (
                                                                <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate">
                                                                    <Mail className="w-3 h-3 shrink-0" /> <span className="truncate">{lead.email}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                    )}

                                                    {columnVisibility.lifecycleStage && (
                                                        <td className="py-4 px-6">
                                                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 inline-block shadow-2xs">
                                                                {lead.lifecycleStage || 'Lead'}
                                                            </span>
                                                        </td>
                                                    )}

                                                    {columnVisibility.status && (
                                                        <td className="py-4 px-6">
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border shadow-2xs ${config.bg} ${config.color} ${config.border}`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                                                                <span>{config.label}</span>
                                                            </span>
                                                        </td>
                                                    )}

                                                    {columnVisibility.value && (
                                                        <td className="py-4 px-6 font-mono font-bold text-slate-900">
                                                            ₹{(Number(lead.value) || 0).toLocaleString()}
                                                        </td>
                                                    )}

                                                    {columnVisibility.lastActivity && (
                                                        <td className="py-4 px-6 text-slate-500 font-semibold font-mono">
                                                            {lead.lastActivity}
                                                        </td>
                                                    )}

                                                    {columnVisibility.source && (
                                                        <td className="py-4 px-6 text-slate-600 font-semibold">
                                                            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-primary" /> {lead.source || 'Direct'}</span>
                                                        </td>
                                                    )}

                                                    {columnVisibility.assignedTo && (
                                                        <td className="py-4 px-6 text-xs font-semibold text-slate-700 truncate max-w-[140px]">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 font-bold truncate max-w-full shadow-2xs">
                                                                <User className="w-3.5 h-3.5 shrink-0" />
                                                                <span className="truncate">{teamMembersMap[lead.assignedTo || ''] || '👑 Workspace Owner'}</span>
                                                            </span>
                                                        </td>
                                                    )}

                                                    <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center justify-end gap-1.5 action-dropdown-container relative">
                                                            <button 
                                                                onClick={() => navigate(`/dashboard/crm/contact/${lead.id}`)}
                                                                className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg transition-all shadow-2xs cursor-pointer"
                                                                title="View Dossier"
                                                            >
                                                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                                                            </button>

                                                            <div className="relative">
                                                                <button
                                                                    onClick={() => setOpenDropdownId(openDropdownId === lead.id ? null : lead.id)}
                                                                    className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg transition-all shadow-2xs cursor-pointer"
                                                                >
                                                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                                                </button>

                                                                {openDropdownId === lead.id && (
                                                                    <div className="absolute right-0 top-10 z-30 w-48 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 animate-in zoom-in-95 duration-100 text-left">
                                                                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Move Stage</div>
                                                                        {PIPELINE_STAGES.map(s => (
                                                                            <button
                                                                                key={s.key}
                                                                                onClick={() => moveLeadStatus(lead.id, s.key)}
                                                                                className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 flex items-center gap-2 cursor-pointer ${lead.status.toLowerCase() === s.key ? 'text-primary font-bold bg-primary/5' : 'text-slate-700'}`}
                                                                            >
                                                                                <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s.key].dot}`} />
                                                                                <span>{s.label}</span>
                                                                            </button>
                                                                        ))}
                                                                        <div className="border-t border-slate-100 my-1" />
                                                                        <button
                                                                            onClick={async (e) => {
                                                                                e.stopPropagation();
                                                                                if (window.confirm("Delete this contact record?")) {
                                                                                    await deleteLeadsMutation.mutateAsync([lead.id]);
                                                                                    showToast("Contact deleted", 'success');
                                                                                }
                                                                            }}
                                                                            className="w-full text-left px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                                            <span>Delete</span>
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredLeads.length === 0 && (
                                            <tr>
                                                <td colSpan={10} className="py-16 text-center text-slate-500 font-semibold bg-slate-50/50">
                                                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                                    <div className="text-sm font-bold text-slate-800">No contacts found matching search / filters</div>
                                                    <div className="text-xs text-slate-400 mt-1">Try clearing filters or click "Create Contact" above.</div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {total > pageSize && (
                                <div className="py-4 px-6 bg-white border-t border-slate-100 flex justify-end items-center shadow-xs">
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
                    ) : (
                        /* Kanban Pipeline View */
                        <div className="flex gap-5 overflow-x-auto pb-8 pt-2 px-1 custom-scrollbar min-h-[500px] w-full snap-x">
                            {PIPELINE_STAGES.map(stage => {
                                const stageLeads = filteredLeads.filter(l => l.status.toLowerCase() === stage.key);
                                const stageTotal = stageLeads.reduce((a, b) => a + b.value, 0);
                                const cfg = STATUS_CONFIG[stage.key];

                                return (
                                    <div 
                                        key={stage.key}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = 'move';
                                        }}
                                        onDrop={async (e) => {
                                            e.preventDefault();
                                            const leadId = e.dataTransfer.getData('text/plain');
                                            if (leadId) {
                                                await moveLeadStatus(leadId, stage.key);
                                            }
                                        }}
                                        className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3 flex flex-col w-[280px] shrink-0 snap-center shadow-2xs h-full min-h-[500px]"
                                    >
                                        <div className={`p-3.5 rounded-xl bg-white border border-slate-200/80 mb-4 ${cfg.accentBorder} shadow-2xs`}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                                                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                                                    <span className="uppercase tracking-wider">{stage.label}</span>
                                                </div>
                                                <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-extrabold text-xs">
                                                    {stageLeads.length}
                                                </span>
                                            </div>
                                            <div className="text-xs font-bold text-slate-500 font-mono">
                                                ₹{(stageTotal / 1000).toFixed(0)}K Total Value
                                            </div>
                                        </div>

                                        <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 pb-4">
                                            {stageLeads.map(lead => (
                                                <div
                                                    key={lead.id}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.setData('text/plain', lead.id);
                                                        e.dataTransfer.effectAllowed = 'move';
                                                    }}
                                                    onClick={() => navigate(`/dashboard/crm/contact/${lead.id}`)}
                                                    className="bg-white p-4 rounded-xl border border-slate-200 hover:border-primary/40 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group shrink-0 shadow-2xs"
                                                >
                                                    <div className="flex items-start justify-between gap-2 mb-2.5">
                                                        <div className="font-bold text-slate-900 group-hover:text-primary transition-colors text-sm truncate">
                                                            {lead.name}
                                                        </div>
                                                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold text-[10px] shrink-0 uppercase tracking-wider">
                                                            {lead.lifecycleStage || 'Lead'}
                                                        </span>
                                                    </div>

                                                    <div className="text-xs font-semibold text-slate-500 mb-3 truncate flex items-center gap-1.5">
                                                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                                                        <span className="truncate">{lead.company || lead.industry || 'Apex Corp'}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                                        <span className="font-extrabold text-emerald-600 text-xs font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                                            ₹{(Number(lead.value) || 0).toLocaleString()}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                                            <Clock className="w-3 h-3" /> {new Date(lead.lastActivity || lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            {stageLeads.length === 0 && (
                                                <div className="py-8 mt-2 text-center border-2 border-dashed border-slate-200/80 rounded-xl text-[11px] font-semibold text-slate-400 bg-white/50">
                                                    No contacts in {stage.label}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Modals & Slide-Overs for Create Contact & Import */}
            {drawerType === 'import' && (
                <div className="fixed inset-0 z-[200] flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-300">
                    <div 
                        className="w-full max-w-xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 overflow-hidden text-xs"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100 shrink-0">
                                    <UploadCloud className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold tracking-tight text-slate-900 m-0">Import & Synchronize Data</h2>
                                    <div className="text-xs font-semibold text-slate-500 mt-0.5">Ingest CSV/Excel records or establish real-time API integrations.</div>
                                </div>
                            </div>
                            <button onClick={() => setDrawerType('none')} className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar leading-relaxed">
                            {/* CSV Upload Box */}
                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 hover:border-primary/40 transition-all cursor-pointer relative group">
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={simulateFileImport}
                                    disabled={importing}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                />
                                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 mx-auto mb-3 shadow-2xs group-hover:text-primary group-hover:scale-105 transition-all">
                                    <FileSpreadsheet className="w-6 h-6" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 mb-1">Upload CSV or Excel Spreadsheet</h3>
                                <p className="text-xs text-slate-500 max-w-md mx-auto m-0 font-medium">Drag and drop your contact export file here, or click to browse. Formats supported: .csv, .xls, .xlsx</p>
                                
                                {importing && (
                                    <div className="mt-6 max-w-xs mx-auto space-y-2 animate-in fade-in">
                                        <div className="flex justify-between text-xs font-bold text-primary">
                                            <span>Simulating Data Ingestion...</span>
                                            <span>{importProgress}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                            <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${importProgress}%` }} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Template Download */}
                            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200/80 rounded-2xl font-medium">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
                                    <div>
                                        <div className="text-xs font-bold text-blue-900">Need a sample import schema?</div>
                                        <div className="text-[11px] text-blue-700 font-semibold">Download our pre-formatted CSV template with standard fields.</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleDownloadSampleCSV}
                                    className="px-4 py-2 bg-white hover:bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-200 shadow-2xs transition-all cursor-pointer text-xs shrink-0"
                                >
                                    Download Template
                                </button>
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setDrawerType('none')} className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs">
                                Close Hub
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ContactDrawerForm
                isOpen={drawerType === 'add'}
                mode="add"
                onClose={() => setDrawerType('none')}
                onSubmit={handleAddContactSubmit}
                userRole={user?.role}
                userId={user?.id}
                teamMembers={teamMembers}
            />

            <ContactDrawerForm
                isOpen={drawerType === 'edit' && !!selectedLead}
                mode="edit"
                initialData={selectedLead}
                onClose={() => setDrawerType('none')}
                onSubmit={handleUpdateContactSubmit}
                userRole={user?.role}
                userId={user?.id}
                teamMembers={teamMembers}
            />
        </div>
    );
};

export default CRM;
