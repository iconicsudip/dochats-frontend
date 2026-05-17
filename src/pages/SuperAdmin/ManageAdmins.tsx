import React, { useState, useEffect, useRef } from 'react';
import { 
    Users, Plus, Edit2, Trash2, Shield, Link as LinkIcon, 
    UploadCloud, X, CreditCard, Box, CheckCircle 
} from 'lucide-react';
import apiClient from '../../api/apiClient';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const ManageAdmins: React.FC = () => {
    const [admins, setAdmins] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<any>(null);
    const [logoBase64, setLogoBase64] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        username: '',
        name: '',
        planType: 'available',
        billingCycle: 'MONTHLY',
        planId: '',
        subUsersLimit: 0,
        linksLimit: 0,
        subscriptionAmount: 0,
        password: ''
    });

    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    // Custom Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchAdmins = async (currentPage: number = 1) => {
        setLoading(true);
        try {
            const [adminRes, planRes] = await Promise.all([
                apiClient.get(`/super-admin/admins?page=${currentPage}&limit=15`),
                apiClient.get('/super-admin/plans')
            ]);
            setAdmins(adminRes.data?.data || adminRes.data);
            setTotal(adminRes.data?.total || 0);
            setPlans(planRes.data);
        } catch (e) {
            showToast('Failed to fetch data', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmins(page);
    }, [page]);

    const handleSaveAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const data = {
                ...formData,
                logoUrl: logoBase64,
                billingCycle: formData.billingCycle || 'MONTHLY'
            };
            if (editingAdmin) {
                await apiClient.put(`/super-admin/admins/${editingAdmin.id}`, data);
                showToast('Admin updated successfully', 'success');
            } else {
                await apiClient.post('/super-admin/admins', data);
                showToast('Admin created successfully', 'success');
            }
            setIsModalOpen(false);
            setEditingAdmin(null);
            setLogoBase64(null);
            fetchAdmins(page);
        } catch (e: any) {
            showToast(e.response?.data?.error || 'Failed to save admin', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditAdmin = (admin: any) => {
        setEditingAdmin(admin);
        setLogoBase64(admin.logoUrl);
        setFormData({
            username: admin.username,
            name: admin.name || '',
            planType: admin.planId ? 'available' : 'custom',
            subscriptionAmount: admin.subscriptionAmount || 0,
            planId: admin.planId || '',
            subUsersLimit: admin.subUsersLimit || 0,
            linksLimit: admin.linksLimit || 0,
            billingCycle: admin.billingCycle || 'MONTHLY',
            password: ''
        });
        setIsModalOpen(true);
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size / 1024 / 1024 > 5) {
            showToast('Image must be smaller than 5MB!', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDeleteAdmin = async (id: string) => {
        if (!window.confirm('Are you sure? This will delete the admin and all their associated links and sub-users.')) return;
        try {
            await apiClient.delete(`/super-admin/admins/${id}`);
            showToast('Admin deleted', 'success');
            fetchAdmins();
        } catch (e) {
            showToast('Failed to delete admin', 'error');
        }
    };

    const handlePlanSelectChange = (planId: string) => {
        const plan = plans.find(p => p.id === planId);
        if (plan) {
            const cycle = formData.billingCycle || 'MONTHLY';
            setFormData(prev => ({
                ...prev,
                planId: plan.id,
                subUsersLimit: plan.subUsersLimit,
                linksLimit: plan.linksLimit,
                subscriptionAmount: cycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice
            }));
        }
    };

    const handleBillingCycleChange = (cycle: string) => {
        const planId = formData.planId;
        if (planId && formData.planType === 'available') {
            const plan = plans.find(p => p.id === planId);
            if (plan) {
                setFormData(prev => ({
                    ...prev,
                    billingCycle: cycle,
                    subscriptionAmount: cycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice
                }));
                return;
            }
        }
        setFormData(prev => ({ ...prev, billingCycle: cycle }));
    };

    return (
        <div className="pb-20 animate-in fade-in duration-500 font-sans text-slate-800">
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white border border-slate-200/80 p-6 sm:p-8 rounded-2xl shadow-xs">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-2xs">
                            <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 m-0">Manage Administrators</h1>
                    </div>
                    <p className="text-xs text-slate-500 m-0">Create and monitor all admin accounts across the system.</p>
                </div>

                <button
                    onClick={() => {
                        setEditingAdmin(null);
                        setLogoBase64(null);
                        setFormData({
                            username: '', name: '', planType: 'available', billingCycle: 'MONTHLY',
                            planId: '', subUsersLimit: 0, linksLimit: 0, subscriptionAmount: 0, password: ''
                        });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all w-full md:w-auto cursor-pointer"
                >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Create New Admin</span>
                </button>
            </div>

            {/* Table Container */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Admin</th>
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sub-Users</th>
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Links</th>
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Plan & Limits</th>
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Monthly Plan</th>
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
                                        <p className="text-xs text-slate-400 mt-4">Loading admins...</p>
                                    </td>
                                </tr>
                            ) : admins.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-2xs">
                                            <Users className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-700 mb-1">No admins found</h3>
                                        <p className="text-xs text-slate-500">Create the first administrator account to get started.</p>
                                    </td>
                                </tr>
                            ) : (
                                admins.map(admin => {
                                    const isCustom = !admin.planId;
                                    const amount = admin.subscriptionAmount || (admin.billingCycle === 'YEARLY' ? admin.plan?.yearlyPrice : admin.plan?.monthlyPrice) || 0;
                                    
                                    return (
                                        <tr key={admin.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    {admin.logoUrl ? (
                                                        <img src={admin.logoUrl} alt="logo" className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20 shadow-2xs shrink-0">
                                                            {(admin.name || admin.username).charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="text-xs font-semibold text-slate-900">{admin.name || admin.username}</div>
                                                        <div className="text-[11px] text-slate-500">@{admin.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-xs">
                                                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {admin.subUsers?.length || 0}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-1.5 text-slate-600 font-semibold text-xs">
                                                    <LinkIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {admin.links?.length || 0}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div>
                                                    <span className={cn(
                                                        "inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border",
                                                        isCustom ? "bg-purple-50 text-purple-600 border-purple-100" 
                                                        : admin.plan?.name === 'Basic' ? "bg-blue-50 text-blue-600 border-blue-100" 
                                                        : "bg-amber-50 text-amber-600 border-amber-100"
                                                    )}>
                                                        {admin.plan?.name || 'Custom Plan'}
                                                    </span>
                                                    <div className="text-[11px] mt-1.5 text-slate-500 flex items-center gap-2">
                                                        <span className="flex items-center gap-1"><Users className="w-3 h-3 shrink-0" /> {admin.subUsersLimit || admin.subUsers?.length || 0}</span>
                                                        <span className="text-slate-300">|</span>
                                                        <span className="flex items-center gap-1"><LinkIcon className="w-3 h-3 shrink-0" /> {admin.linksLimit || admin.links?.length || 0}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="text-xs font-bold text-primary">₹{amount.toLocaleString()}</div>
                                                <div className="text-[11px] text-slate-400">{admin.billingCycle}</div>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    <button 
                                                        onClick={() => handleEditAdmin(admin)}
                                                        className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDeleteAdmin(admin.id)}
                                                        className="w-8 h-8 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center hover:bg-red-100 transition-colors shadow-2xs cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > 15 && (
                    <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                        <span className="text-xs text-slate-500">
                            Showing {((page - 1) * 15) + 1} to {Math.min(page * 15, total)} of {total} entries
                        </span>
                        <div className="flex gap-1.5">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                            >
                                Prev
                            </button>
                            <button 
                                onClick={() => setPage(p => p + 1)}
                                disabled={page * 15 >= total}
                                className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                            <h2 className="text-lg font-bold text-slate-900 m-0 tracking-tight">
                                {editingAdmin ? "Edit Admin Account" : "Create Admin Account"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveAdmin} className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 text-xs">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider">Username *</label>
                                        <input 
                                            required
                                            disabled={!!editingAdmin}
                                            value={formData.username}
                                            onChange={e => setFormData({...formData, username: e.target.value})}
                                            type="text" 
                                            placeholder="admin_name" 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all disabled:bg-slate-100 disabled:text-slate-400" 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider">Display Name</label>
                                        <input 
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            type="text" 
                                            placeholder="Personal or Brand Name" 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                                        />
                                    </div>
                                </div>

                                <hr className="border-slate-100" />

                                <div className="space-y-4">
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider">Configuration Type</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div 
                                            onClick={() => setFormData({...formData, planType: 'available'})}
                                            className={cn(
                                                "border rounded-xl p-4 cursor-pointer transition-all flex items-center gap-3",
                                                formData.planType === 'available' ? "border-primary bg-primary/5 shadow-2xs" : "border-slate-200 bg-white hover:border-slate-300"
                                            )}
                                        >
                                            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0", formData.planType === 'available' ? "border-primary" : "border-slate-300")}>
                                                {formData.planType === 'available' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900">Available Plan</div>
                                                <div className="text-[11px] text-slate-500">Select from pre-defined plans</div>
                                            </div>
                                        </div>
                                        <div 
                                            onClick={() => setFormData({...formData, planType: 'custom'})}
                                            className={cn(
                                                "border rounded-xl p-4 cursor-pointer transition-all flex items-center gap-3",
                                                formData.planType === 'custom' ? "border-primary bg-primary/5 shadow-2xs" : "border-slate-200 bg-white hover:border-slate-300"
                                            )}
                                        >
                                            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0", formData.planType === 'custom' ? "border-primary" : "border-slate-300")}>
                                                {formData.planType === 'custom' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-900">Custom Configuration</div>
                                                <div className="text-[11px] text-slate-500">Set manual limits and pricing</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider">Billing Cycle *</label>
                                        <select 
                                            required
                                            value={formData.billingCycle}
                                            onChange={e => handleBillingCycleChange(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all cursor-pointer"
                                        >
                                            <option value="MONTHLY">Monthly</option>
                                            <option value="YEARLY">Yearly</option>
                                        </select>
                                    </div>

                                    {formData.planType === 'available' && (
                                        <div className="space-y-1.5">
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider">Select Plan *</label>
                                            <select 
                                                required
                                                value={formData.planId}
                                                onChange={e => handlePlanSelectChange(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all cursor-pointer"
                                            >
                                                <option value="" disabled>Select a plan</option>
                                                {plans.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name} (Monthly: ₹{p.monthlyPrice} / Yearly: ₹{p.yearlyPrice})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {formData.planType === 'custom' && (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-1.5">
                                                <label className="block font-bold text-slate-700 uppercase tracking-wider">Sub-Users Limit *</label>
                                                <input 
                                                    required type="number" min="0"
                                                    value={formData.subUsersLimit}
                                                    onChange={e => setFormData({...formData, subUsersLimit: Number(e.target.value)})}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block font-bold text-slate-700 uppercase tracking-wider">Links Limit *</label>
                                                <input 
                                                    required type="number" min="0"
                                                    value={formData.linksLimit}
                                                    onChange={e => setFormData({...formData, linksLimit: Number(e.target.value)})}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider">Subscription Amount (₹) *</label>
                                            <input 
                                                required type="number" min="0"
                                                value={formData.subscriptionAmount}
                                                onChange={e => setFormData({...formData, subscriptionAmount: Number(e.target.value)})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                                            />
                                        </div>
                                    </>
                                )}

                                <hr className="border-slate-100" />

                                <div className="space-y-1.5">
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider">Admin Logo</label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
                                    >
                                        <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2 group-hover:text-primary transition-colors" />
                                        <p className="font-semibold text-slate-600 group-hover:text-primary">Click to upload logo</p>
                                    </div>
                                    {logoBase64 && (
                                        <div className="flex items-center gap-4 mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <img src={logoBase64} alt="preview" className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs" />
                                            <button 
                                                type="button"
                                                onClick={() => setLogoBase64(null)}
                                                className="font-bold text-red-500 hover:text-red-600 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Remove Logo
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider">
                                        {editingAdmin ? "Update Password (leave blank to keep)" : "Initial Password *"}
                                    </label>
                                    <input 
                                        required={!editingAdmin}
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                        type="password" 
                                        placeholder="******" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                                    />
                                    {formData.password && formData.password.length < 6 && (
                                        <p className="text-[11px] text-red-500 mt-1 font-medium">Password must be at least 6 characters</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-6 sm:-mx-8 sm:-mb-8 sm:p-6 shrink-0">
                                <button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)} 
                                    className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={submitting || (!!formData.password && formData.password.length < 6)}
                                    className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    {submitting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />}
                                    <span>{editingAdmin ? "Save Changes" : "Create Account"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageAdmins;
