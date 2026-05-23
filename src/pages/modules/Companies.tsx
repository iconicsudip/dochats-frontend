import React, { useState, useEffect } from 'react';
import { Pagination } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi, CrmLead } from '../../api/crm';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../api/apiClient';
import { 
    Building2, Search, ExternalLink, Users, DollarSign, TrendingUp, 
    RefreshCw, LayoutGrid, List, Plus, X, Edit3, Globe, User, Briefcase, 
    Tag, MapPin, Clock, FileText, Linkedin, AlertCircle 
} from 'lucide-react';

interface CompanyAccount {
    name: string;
    domain: string | null;
    contacts: string[];
    totalValue: number;
    leadIds: string[];
    owner?: string;
    industry?: string;
    type?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    employees?: number;
    revenue?: number;
    timezone?: string;
    description?: string;
    linkedin?: string;
}

const INDUSTRIES = [
    'SaaS / Software', 'Healthcare / Biotech', 'E-commerce / Retail', 
    'Financial Services / Fintech', 'Manufacturing / Logistics', 
    'Real Estate / Construction', 'Consulting / Agency', 
    'Education / Edtech', 'Technology / Hardware', 'Other'
];

const COMPANY_TYPES = ['Prospect', 'Partner', 'Reseller', 'Vendor', 'Customer'];

const Companies: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const isSubUser = user?.role === 'SUB_USER';
    const [companies, setCompanies] = useState<CompanyAccount[]>([]);
    const [leads, setLeads] = useState<CrmLead[]>([]);
    const [subUsersList, setSubUsersList] = useState<{ id: string; name: string; email: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

    // Pagination & Summary State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [summary, setSummary] = useState<{ totalCompanies: number; totalPipeline: number; avgAccountValue: number }>({
        totalCompanies: 0, totalPipeline: 0, avgAccountValue: 0
    });

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Modal / Drawer State
    const [modalType, setModalType] = useState<'add_company' | 'edit_company' | null>(null);
    const [selectedCompany, setSelectedCompany] = useState<CompanyAccount | null>(null);

    // Form States
    const [companyName, setCompanyName] = useState('');
    const [companyDomain, setCompanyDomain] = useState('');
    const [associatedLeadId, setAssociatedLeadId] = useState('');
    const [companyOwner, setCompanyOwner] = useState('');
    const [companyIndustry, setCompanyIndustry] = useState('SaaS / Software');
    const [companyType, setCompanyType] = useState('Prospect');
    const [companyCity, setCompanyCity] = useState('');
    const [companyState, setCompanyState] = useState('');
    const [companyPostalCode, setCompanyPostalCode] = useState('');
    const [companyEmployees, setCompanyEmployees] = useState<number | string>('');
    const [companyRevenue, setCompanyRevenue] = useState<number | string>('');
    const [companyTimezone, setCompanyTimezone] = useState('UTC+5:30 (IST)');
    const [companyDescription, setCompanyDescription] = useState('');
    const [companyLinkedin, setCompanyLinkedin] = useState('');

    const { data: teamMembersData } = useQuery({
        queryKey: ['sub-users', 50],
        queryFn: () => apiClient.get('/auth/sub-users?limit=50').then(res => res.data.subUsers || []),
        enabled: !isSubUser
    });

    useEffect(() => {
        if (teamMembersData) setSubUsersList(teamMembersData);
    }, [teamMembersData]);

    const { data: compData, isLoading: loadingCompanies } = useQuery({
        queryKey: ['companies', page, pageSize, searchTerm],
        queryFn: async () => {
            const [compRes, leadData] = await Promise.all([
                crmApi.getCompanies({ page, limit: pageSize, search: searchTerm }),
                crmApi.getLeads()
            ]);
            return { compRes, leadData };
        }
    });

    useEffect(() => {
        if (compData) {
            const { compRes, leadData } = compData;
            setCompanies(compRes.data || compRes || []);
            if (compRes.summary) {
                setSummary(compRes.summary);
                setTotal(compRes.total || 0);
            } else {
                const arr = Array.isArray(compRes) ? compRes : (compRes.data || []);
                setTotal(arr.length);
                const totalPipe = arr.reduce((acc: number, c: any) => acc + (c.totalValue || 0), 0);
                const avgVal = arr.length > 0 ? Math.round(totalPipe / arr.length) : 0;
                setSummary({ totalCompanies: arr.length, totalPipeline: totalPipe, avgAccountValue: avgVal });
            }
            setLeads(leadData);
        }
    }, [compData]);

    const updateAssociationsMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => crmApi.updateAssociations(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] })
    });

    const updateLeadMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => crmApi.updateLead(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companies'] })
    });

    // Local filter if needed
    const filteredCompanies = companies.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.domain && c.domain.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const isDomainValid = !companyDomain || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(companyDomain.trim());

    // Handle Add Company
    const handleAddCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyName.trim()) {
            showToast("Company name is required", "error");
            return;
        }

        if (!isDomainValid) {
            showToast("Please enter a valid domain format", "error");
            return;
        }

        if (!associatedLeadId) {
            showToast("Please select an associated contact", "error");
            return;
        }

        try {
            const lead = leads.find(l => l.id === associatedLeadId);
            if (!lead) return;

            const existingAssoc: any = lead.associations || {};
            const existingCompanies = existingAssoc.companies || [];
            const newCompanyObj = { 
                name: companyName.trim(), 
                domain: companyDomain.trim() || null,
                owner: companyOwner || undefined,
                industry: companyIndustry,
                type: companyType,
                city: companyCity.trim(),
                state: companyState.trim(),
                postalCode: companyPostalCode.trim(),
                employees: Number(companyEmployees) || 0,
                revenue: Number(companyRevenue) || 0,
                timezone: companyTimezone,
                description: companyDescription.trim(),
                linkedin: companyLinkedin.trim()
            };

            await updateAssociationsMutation.mutateAsync({
                id: lead.id,
                data: {
                    ...existingAssoc,
                    companies: [...existingCompanies, newCompanyObj]
                }
            });

            // Also update lead's primary company field & add activity
            await updateLeadMutation.mutateAsync({
                id: lead.id,
                data: {
                    company: companyName.trim(),
                    newActivityItem: {
                        id: 'act-' + Date.now(),
                        type: 'NOTE',
                        title: `Associated with company ${companyName.trim()}`,
                        description: `Contact attached to key account ${companyName.trim()}${companyDomain ? ` (${companyDomain})` : ''}`,
                        date: new Date().toISOString()
                    }
                }
            });

            showToast("Company key account created successfully!");
            setModalType(null);
        } catch (err) {
            showToast("Failed to create company", "error");
        }
    };

    // Handle Edit Company
    const handleEditCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCompany) return;

        if (!isDomainValid) {
            showToast("Please enter a valid domain format", "error");
            return;
        }

        const updatedFields = {
            name: companyName.trim(),
            domain: companyDomain.trim() || null,
            owner: companyOwner || undefined,
            industry: companyIndustry,
            type: companyType,
            city: companyCity.trim(),
            state: companyState.trim(),
            postalCode: companyPostalCode.trim(),
            employees: Number(companyEmployees) || 0,
            revenue: Number(companyRevenue) || 0,
            timezone: companyTimezone,
            description: companyDescription.trim(),
            linkedin: companyLinkedin.trim()
        };

        try {
            for (const leadId of selectedCompany.leadIds) {
                const lead = leads.find(l => l.id === leadId);
                if (lead) {
                    const assoc: any = lead.associations || {};
                    const comps = (assoc.companies || []).map((c: any) => 
                        c.name.toLowerCase() === selectedCompany.name.toLowerCase()
                            ? { ...c, ...updatedFields }
                            : c
                    );
                    await updateAssociationsMutation.mutateAsync({ id: leadId, data: { ...assoc, companies: comps } });
                    if (lead.company?.toLowerCase() === selectedCompany.name.toLowerCase()) {
                        await updateLeadMutation.mutateAsync({ 
                            id: leadId,
                            data: {
                                company: companyName.trim(),
                                industry: companyIndustry,
                                city: companyCity.trim()
                            }
                        });
                    }
                }
            }
            showToast("Company details updated successfully!");
            setModalType(null);
        } catch (err) {
            showToast("Failed to update company", "error");
        }
    };

    const openCreateDrawer = () => {
        setCompanyName('');
        setCompanyDomain('');
        setAssociatedLeadId(leads[0]?.id || '');
        setCompanyOwner('');
        setCompanyIndustry('SaaS / Software');
        setCompanyType('Prospect');
        setCompanyCity('');
        setCompanyState('');
        setCompanyPostalCode('');
        setCompanyEmployees('');
        setCompanyRevenue('');
        setCompanyTimezone('UTC+5:30 (IST)');
        setCompanyDescription('');
        setCompanyLinkedin('');
        setModalType('add_company');
    };

    const openEditDrawer = (comp: CompanyAccount) => {
        setSelectedCompany(comp);
        setCompanyName(comp.name);
        setCompanyDomain(comp.domain || '');
        setCompanyOwner(comp.owner || '');
        setCompanyIndustry(comp.industry || 'SaaS / Software');
        setCompanyType(comp.type || 'Prospect');
        setCompanyCity(comp.city || '');
        setCompanyState(comp.state || '');
        setCompanyPostalCode(comp.postalCode || '');
        setCompanyEmployees(comp.employees || '');
        setCompanyRevenue(comp.revenue || '');
        setCompanyTimezone(comp.timezone || 'UTC+5:30 (IST)');
        setCompanyDescription(comp.description || '');
        setCompanyLinkedin(comp.linkedin || '');
        setAssociatedLeadId(comp.leadIds[0] || leads[0]?.id || '');
        setModalType('edit_company');
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
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-2xs">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight">Companies & Key Accounts</h1>
                        <p className="text-xs text-slate-500 m-0 mt-0.5">
                            Manage organizations, accounts, and cumulative pipeline values across your CRM.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button 
                        onClick={openCreateDrawer}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs transition-all shadow-sm shadow-primary/30 cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        Create Company
                    </button>
                    <button 
                        onClick={() => { setPage(1); queryClient.invalidateQueries({ queryKey: ['companies'] }); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs border border-slate-200 transition-all cursor-pointer shadow-2xs"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
                        <button 
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === 'table' ? 'bg-white text-primary font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white text-primary font-bold shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider m-0">Total Accounts</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0">{summary.totalCompanies}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                        <Building2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider m-0">Pipeline Value</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono m-0">₹{(summary.totalPipeline ?? 0).toLocaleString('en-IN')}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider m-0">Avg. Account Value</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono m-0">₹{(summary.avgAccountValue ?? 0).toLocaleString('en-IN')}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-2xs">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filter toolbar */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md font-sans">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Search by company name or domain..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs focus:border-primary"
                    />
                </div>
            </div>

            {/* Main Content */}
            {loading && companies.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
                    <div className="w-10 h-10 border-3 border-slate-200 border-t-primary rounded-full animate-spin mb-3" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loading Accounts...</span>
                </div>
            ) : filteredCompanies.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-8 text-center">
                    <Building2 className="w-12 h-12 text-slate-300 mb-3" />
                    <h3 className="text-base font-bold text-slate-800 m-0">No companies found</h3>
                    <p className="text-xs font-medium text-slate-500 m-0 mt-1 max-w-sm">
                        {searchTerm ? `No matching accounts found for "${searchTerm}"` : "No companies or organizations have been recorded yet in your CRM."}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {viewMode === 'table' ? (
                        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden font-sans">
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/75 border-b border-slate-100 font-sans">
                                            <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Company</th>
                                            <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Domain</th>
                                            <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Industry & City</th>
                                            <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contacts</th>
                                            <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Value</th>
                                            <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs font-medium font-sans">
                                        {filteredCompanies.map((c, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group font-sans">
                                                <td className="py-3.5 px-6 font-semibold text-slate-900 text-xs">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-slate-700 shadow-2xs shrink-0 text-xs">
                                                            {c.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-slate-900">{c.name}</div>
                                                            {c.type && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">{c.type}</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-6 font-medium text-slate-600">
                                                    {c.domain ? (
                                                        <a 
                                                            href={`https://${c.domain}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-xs"
                                                        >
                                                            {c.domain}
                                                            <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-slate-400">--</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-6">
                                                    <div className="font-semibold text-slate-800 text-xs">{c.industry || 'Technology'}</div>
                                                    {c.city && <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3 shrink-0" />{c.city}{c.state ? `, ${c.state}` : ''}</div>}
                                                </td>
                                                <td className="py-3.5 px-6">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {c.contacts.map((contact, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-xs font-medium inline-flex items-center gap-1">
                                                                <Users className="w-3 h-3 text-slate-400" />
                                                                {contact}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-6 font-bold text-emerald-600 text-xs font-mono">
                                                    ₹{(c.totalValue ?? 0).toLocaleString('en-IN')}
                                                </td>
                                                <td className="py-3.5 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => openEditDrawer(c)}
                                                            className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-xl border border-slate-200/80 transition-all cursor-pointer shadow-2xs"
                                                            title="Edit Company"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
                            {filteredCompanies.map((c, idx) => (
                                <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between group relative font-sans">
                                    <div className="absolute top-6 right-6 flex items-center gap-1.5">
                                        <button onClick={() => openEditDrawer(c)} className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-500 hover:text-blue-700 rounded-xl border border-slate-200 transition-all cursor-pointer shadow-2xs" title="Edit">
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="space-y-3 font-sans">
                                        <div className="flex items-center gap-3 pr-16">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-slate-700 shadow-2xs text-sm shrink-0">
                                                {c.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="truncate">
                                                <h3 className="font-semibold text-slate-900 m-0 text-sm truncate">{c.name}</h3>
                                                {c.domain ? (
                                                    <a href={`https://${c.domain}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary inline-flex items-center gap-1 hover:underline mt-0.5 truncate">
                                                        {c.domain}
                                                        <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-slate-400 font-medium block mt-0.5">No domain</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-xs font-medium text-slate-600 flex items-center gap-2">
                                            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span>{c.industry || 'Technology'}</span>
                                            {c.type && <span className="ml-auto px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">{c.type}</span>}
                                        </div>
                                        {c.city && (
                                            <div className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span>{c.city}{c.state ? `, ${c.state}` : ''}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-slate-100 pt-3">
                                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Associated Contacts ({c.contacts.length})</span>
                                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                                                {c.contacts.map((contact, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-xs font-medium inline-flex items-center gap-1">
                                                        <Users className="w-3 h-3 text-slate-400" />
                                                        {contact}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-auto">
                                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pipeline Value</span>
                                        <span className="text-base font-bold text-emerald-600">₹{(c.totalValue ?? 0).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {total > pageSize && (
                        <div className="py-4 px-6 border-t border-slate-100 flex items-center justify-end bg-slate-50/50 rounded-2xl border">
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

            {/* HubSpot Slide-Over Drawer: Create / Edit Company */}
            {modalType && (
                <div className="fixed inset-0 z-[200] flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
                    <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-300">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center font-bold shadow-lg shrink-0">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold tracking-tight text-slate-900 m-0">
                                        {modalType === 'add_company' ? 'Create Company' : 'Edit Company'}
                                    </h3>
                                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Enter organization attributes and account info</p>
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
                        <form onSubmit={modalType === 'add_company' ? handleAddCompany : handleEditCompany} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar text-xs">
                            {/* Company domain name */}
                            <div>
                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Globe className="w-4 h-4 text-slate-400" />
                                    Company domain name *
                                </label>
                                <input 
                                    type="text"
                                    placeholder="e.g. hubspot.com"
                                    value={companyDomain}
                                    onChange={e => setCompanyDomain(e.target.value)}
                                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl font-semibold text-sm focus:outline-none focus:ring-2 transition-all ${!isDomainValid ? 'border-red-400 focus:ring-red-400/20 bg-red-50/30' : 'border-slate-200 focus:ring-primary/20 focus:bg-white focus:border-primary'}`}
                                />
                                {!isDomainValid && (
                                    <div className="flex items-center gap-2 p-3 mt-2 bg-red-50 border border-red-200 text-red-700 rounded-xl font-semibold animate-in fade-in">
                                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                        <span>Not a valid domain. Please enter a valid format (e.g. example.com).</span>
                                    </div>
                                )}
                            </div>

                            {/* Company name */}
                            <div>
                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Building2 className="w-4 h-4 text-slate-400" />
                                    Company name *
                                </label>
                                <input 
                                    type="text"
                                    required
                                    placeholder="e.g. HubSpot, Inc."
                                    value={companyName}
                                    onChange={e => setCompanyName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                />
                            </div>

                            {/* Associated Lead (Required for linkage) */}
                            <div>
                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-slate-400" />
                                    Associated Contact / Lead *
                                </label>
                                <select
                                    required
                                    disabled={modalType === 'edit_company'}
                                    value={associatedLeadId}
                                    onChange={e => setAssociatedLeadId(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all cursor-pointer text-slate-800 disabled:opacity-60"
                                >
                                    <option value="">-- Select Contact --</option>
                                    {leads.map(l => (
                                        <option key={l.id} value={l.id}>{l.name} ({l.email || l.phone})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Company owner */}
                            <div>
                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <User className="w-4 h-4 text-slate-400" />
                                    Company owner
                                </label>
                                {isSubUser ? (
                                    <div className="w-full px-4 py-3 bg-purple-50 border border-purple-200 rounded-2xl font-bold text-purple-700 text-sm">
                                        Assigned to You ({user?.email})
                                    </div>
                                ) : (
                                    <select
                                        value={companyOwner}
                                        onChange={e => setCompanyOwner(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all cursor-pointer text-slate-800"
                                    >
                                        <option value="">Unassigned (Admin Only)</option>
                                        {subUsersList.map(su => (
                                            <option key={su.id} value={su.id}>{su.name} ({su.email})</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Industry & Type */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Briefcase className="w-4 h-4 text-slate-400" />
                                        Industry
                                    </label>
                                    <select
                                        value={companyIndustry}
                                        onChange={e => setCompanyIndustry(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all cursor-pointer text-slate-800"
                                    >
                                        {INDUSTRIES.map(ind => (
                                            <option key={ind} value={ind}>{ind}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Tag className="w-4 h-4 text-slate-400" />
                                        Type
                                    </label>
                                    <select
                                        value={companyType}
                                        onChange={e => setCompanyType(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all cursor-pointer text-slate-800"
                                    >
                                        {COMPANY_TYPES.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* City, State, Postal Code */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                        City
                                    </label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. Austin"
                                        value={companyCity}
                                        onChange={e => setCompanyCity(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">State / Region</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. TX"
                                        value={companyState}
                                        onChange={e => setCompanyState(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">Postal Code</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. 73301"
                                        value={companyPostalCode}
                                        onChange={e => setCompanyPostalCode(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                    />
                                </div>
                            </div>

                            {/* Employees & Revenue */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <Users className="w-4 h-4 text-slate-400" />
                                        No. of Employees
                                    </label>
                                    <input 
                                        type="number"
                                        min={0}
                                        placeholder="e.g. 250"
                                        value={companyEmployees}
                                        onChange={e => setCompanyEmployees(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <DollarSign className="w-4 h-4 text-slate-400" />
                                        Annual Revenue (₹)
                                    </label>
                                    <input 
                                        type="number"
                                        min={0}
                                        placeholder="e.g. 5000000"
                                        value={companyRevenue}
                                        onChange={e => setCompanyRevenue(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                    />
                                </div>
                            </div>

                            {/* Timezone */}
                            <div>
                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    Time zone
                                </label>
                                <input 
                                    type="text"
                                    placeholder="e.g. UTC+5:30 (IST)"
                                    value={companyTimezone}
                                    onChange={e => setCompanyTimezone(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-slate-400" />
                                    Description
                                </label>
                                <textarea 
                                    rows={3}
                                    placeholder="Enter organization background, business goals, or account strategy..."
                                    value={companyDescription}
                                    onChange={e => setCompanyDescription(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all custom-scrollbar"
                                />
                            </div>

                            {/* LinkedIn Page */}
                            <div>
                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Linkedin className="w-4 h-4 text-slate-400" />
                                    LinkedIn company page
                                </label>
                                <input 
                                    type="text"
                                    placeholder="e.g. linkedin.com/company/hubspot"
                                    value={companyLinkedin}
                                    onChange={e => setCompanyLinkedin(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                />
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
                                    disabled={!isDomainValid}
                                    className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-2xl font-bold text-xs transition-all shadow-md shadow-primary/30 cursor-pointer flex items-center gap-2"
                                >
                                    <Building2 className="w-4 h-4" />
                                    {modalType === 'add_company' ? 'Create Company' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Companies;
