import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Link as LinkIcon, Check, X, Layers, Tag, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { Module, ModuleLabel } from '../../enums';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const ManagePlans: React.FC = () => {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);

    const [formData, setFormData] = useState<{
        name: string;
        order: number;
        monthlyPrice: number;
        yearlyPrice: number;
        subUsersLimit: number;
        linksLimit: number;
        pricePerLinkMonthly: number;
        pricePerLinkYearly: number;
        isPublic: boolean;
        leadCaptureEnabled: boolean;
        description: string;
        enabledModules: Module[];
    }>({
        name: '',
        order: 0,
        monthlyPrice: 0,
        yearlyPrice: 0,
        subUsersLimit: 3,
        linksLimit: 5,
        pricePerLinkMonthly: 0,
        pricePerLinkYearly: 0,
        isPublic: true,
        leadCaptureEnabled: false,
        description: '',
        enabledModules: Object.values(Module).filter(m => m !== Module.RCS)
    });

    // Custom Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/super-admin/plans');
            setPlans(res.data);
        } catch (e) {
            showToast('Failed to fetch plans', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();

        setSubmitting(true);
        try {
            if (editingPlan) {
                await apiClient.put(`/super-admin/plans/${editingPlan.id}`, formData);
                showToast('Plan updated successfully', 'success');
            } else {
                await apiClient.post('/super-admin/plans', formData);
                showToast('Plan created successfully', 'success');
            }
            setIsModalOpen(false);
            setEditingPlan(null);
            fetchPlans();
        } catch (e: any) {
            showToast(e.response?.data?.error || 'Failed to save plan', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePlan = async (id: string) => {
        if (!window.confirm('Are you sure? A plan cannot be deleted if it is currently assigned to users.')) return;
        try {
            await apiClient.delete(`/super-admin/plans/${id}`);
            showToast('Plan deleted', 'success');
            fetchPlans();
        } catch (e: any) {
            showToast(e.response?.data?.error || 'Failed to delete plan', 'error');
        }
    };

    const handleEditPlan = (plan: any) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name || '',
            order: plan.order || 0,
            monthlyPrice: plan.monthlyPrice || 0,
            yearlyPrice: plan.yearlyPrice || 0,
            subUsersLimit: plan.subUsersLimit || 0,
            linksLimit: plan.linksLimit || 0,
            pricePerLinkMonthly: plan.pricePerLinkMonthly || 0,
            pricePerLinkYearly: plan.pricePerLinkYearly || 0,
            isPublic: plan.isPublic ?? true,
            leadCaptureEnabled: plan.leadCaptureEnabled ?? false,
            description: plan.description || '',
            enabledModules: plan.enabledModules || []
        });
        setIsModalOpen(true);
    };

    const toggleModule = (mod: Module) => {
        setFormData(prev => {
            const exists = prev.enabledModules.includes(mod);
            return {
                ...prev,
                enabledModules: exists 
                    ? prev.enabledModules.filter(m => m !== mod) 
                    : [...prev.enabledModules, mod]
            };
        });
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
                            <Layers className="w-5 h-5 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 m-0">Subscription Plans</h1>
                    </div>
                    <p className="text-xs text-slate-500 m-0">Define and manage service tiers for your administrative users.</p>
                </div>

                <button
                    onClick={() => {
                        setEditingPlan(null);
                        setFormData({
                            name: '', order: plans.length, monthlyPrice: 0, yearlyPrice: 0,
                            subUsersLimit: 3, linksLimit: 5, pricePerLinkMonthly: 0, pricePerLinkYearly: 0, isPublic: true, leadCaptureEnabled: false,
                            description: '', enabledModules: Object.values(Module).filter(m => m !== Module.RCS)
                        });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all w-full md:w-auto cursor-pointer"
                >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Create New Plan</span>
                </button>
            </div>

            {/* Table Container */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[950px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-20">Order</th>
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Plan Name</th>
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Prices</th>
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Per Link</th>
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Limits</th>
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Visibility</th>
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lead Capture</th>
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Modules</th>
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Description</th>
                                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="py-20 text-center">
                                        <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
                                        <p className="text-xs text-slate-400 mt-4">Loading subscription plans...</p>
                                    </td>
                                </tr>
                            ) : plans.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-20 text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-200 shadow-2xs">
                                            <Tag className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-700 mb-1">No subscription plans</h3>
                                        <p className="text-xs text-slate-500">Create the first subscription plan tier to get started.</p>
                                    </td>
                                </tr>
                            ) : (
                                plans.map(plan => (
                                    <tr key={plan.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="py-4 px-6 text-xs font-bold text-slate-400">
                                            #{plan.order ?? 0}
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="text-xs font-semibold text-slate-900">{plan.name}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="text-xs font-semibold text-primary">Monthly: ₹{plan.monthlyPrice?.toLocaleString()}</div>
                                            <div className="text-xs font-semibold text-primary mt-0.5">Yearly: ₹{plan.yearlyPrice?.toLocaleString()}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="text-xs font-semibold text-primary">Monthly: ₹{plan.pricePerLinkMonthly?.toLocaleString()}</div>
                                            <div className="text-xs font-semibold text-primary mt-0.5">Yearly: ₹{plan.pricePerLinkYearly?.toLocaleString()}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="space-y-1 text-xs text-slate-600">
                                                <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-500 shrink-0" /> {plan.subUsersLimit} Sub-Users</div>
                                                <div className="flex items-center gap-1.5"><LinkIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" /> {plan.linksLimit} Dynamic Links</div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={cn(
                                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border",
                                                plan.isPublic ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                            )}>
                                                {plan.isPublic ? <Eye className="w-3 h-3 shrink-0" /> : <EyeOff className="w-3 h-3 shrink-0" />}
                                                {plan.isPublic ? 'Public' : 'Private'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={cn(
                                                "inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold border",
                                                plan.leadCaptureEnabled ? "bg-green-50 text-green-600 border-green-100" : "bg-slate-100 text-slate-500 border-slate-200"
                                            )}>
                                                {plan.leadCaptureEnabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-50 text-purple-600 border border-purple-100">
                                                {plan.enabledModules?.length || 0} Modules
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <p className="text-xs text-slate-500 line-clamp-2 max-w-xs m-0 leading-relaxed">
                                                {plan.description || 'No description'}
                                            </p>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex justify-end gap-1.5">
                                                <button 
                                                    onClick={() => handleEditPlan(plan)}
                                                    className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeletePlan(plan.id)}
                                                    className="w-8 h-8 rounded-xl bg-red-50 text-red-600 border border-red-100 flex items-center justify-center hover:bg-red-100 transition-colors shadow-2xs cursor-pointer"
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
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                            <h2 className="text-lg font-bold text-slate-900 m-0 tracking-tight">
                                {editingPlan ? "Edit Plan Details" : "Create New Subscription Plan"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSavePlan} className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 text-xs">
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="md:col-span-2 space-y-1.5">
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider">Plan Name *</label>
                                        <input 
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            type="text" 
                                            placeholder="e.g. Basic, Professional, Enterprise" 
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider">Display Order *</label>
                                        <input 
                                            required type="number" min="0"
                                            value={formData.order}
                                            onChange={e => setFormData({...formData, order: Number(e.target.value)})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider">Monthly Price (₹) *</label>
                                        <input 
                                            required type="number" min="0"
                                            value={formData.monthlyPrice}
                                            onChange={e => setFormData({...formData, monthlyPrice: Number(e.target.value)})}
                                            placeholder="999"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider">Yearly Price (₹) *</label>
                                        <input 
                                            required type="number" min="0"
                                            value={formData.yearlyPrice}
                                            onChange={e => setFormData({...formData, yearlyPrice: Number(e.target.value)})}
                                            placeholder="9999"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider">Per Link Price (Monthly) (₹) *</label>
                                        <input 
                                            required type="number" min="0"
                                            value={formData.pricePerLinkMonthly}
                                            onChange={e => setFormData({...formData, pricePerLinkMonthly: Number(e.target.value)})}
                                            placeholder="0"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider">Per Link Price (Yearly) (₹) *</label>
                                        <input 
                                            required type="number" min="0"
                                            value={formData.pricePerLinkYearly}
                                            onChange={e => setFormData({...formData, pricePerLinkYearly: Number(e.target.value)})}
                                            placeholder="0"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                                        />
                                    </div>
                                </div>

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

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold text-slate-900">Public Visibility</div>
                                            <div className="text-[11px] text-slate-500">Show on public pricing page</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={formData.isPublic}
                                                onChange={e => setFormData({...formData, isPublic: e.target.checked})}
                                                className="sr-only peer" 
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>

                                    <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold text-slate-900">Lead Capture</div>
                                            <div className="text-[11px] text-slate-500">Enable lead collection forms</div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={formData.leadCaptureEnabled}
                                                onChange={e => setFormData({...formData, leadCaptureEnabled: e.target.checked})}
                                                className="sr-only peer" 
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider">Description</label>
                                    <textarea 
                                        rows={3}
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                        placeholder="What's included in this plan?" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                                    />
                                </div>

                                <div className="space-y-3">
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider">Plan Modules</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                                        {Object.values(Module).filter(m => m !== Module.RCS).map(m => {
                                            const isSelected = formData.enabledModules.includes(m);
                                            return (
                                                <div 
                                                    key={m}
                                                    onClick={() => toggleModule(m)}
                                                    className={cn(
                                                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all bg-white shadow-2xs",
                                                        isSelected ? "border-primary shadow-sm" : "border-slate-200 hover:border-slate-300 opacity-70"
                                                    )}
                                                >
                                                    <div className={cn("w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0", isSelected ? "bg-primary text-white" : "border border-slate-300 bg-slate-50")}>
                                                        {isSelected && <Check className="w-3.5 h-3.5" />}
                                                    </div>
                                                    <span className="font-semibold text-slate-800 select-none">{ModuleLabel[m]}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
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
                                    disabled={submitting}
                                    className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                >
                                    {submitting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />}
                                    <span>{editingPlan ? "Update Plan" : "Create Plan"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagePlans;
