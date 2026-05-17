import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import apiClient from '../../api/apiClient';
import { moduleConfigApi } from '../../api/moduleConfig';
import {
    Layout, Users, MessageSquare, BarChart3, Calendar,
    TrendingUp, Zap, PieChart, Link as LinkIcon, ShieldCheck,
    CreditCard, Settings, CheckCircle2, FormInput, MessageCircle, Mail, X
} from 'lucide-react';
import { Module, ModuleLabel } from '../../enums';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const ALL_MODULES: { key: Module; icon: React.ReactNode; color: string; desc: string }[] = [
    { key: Module.LIVE_CHAT, icon: <MessageSquare className="w-5 h-5 text-purple-500" />, color: 'border-purple-200 bg-purple-50 text-purple-700', desc: 'Real-time chat with visitors' },
    { key: Module.CRM, icon: <TrendingUp className="w-5 h-5 text-purple-500" />, color: 'border-purple-200 bg-purple-50 text-purple-700', desc: 'Pipeline, leads, deals' },
    { key: Module.BOOKINGS, icon: <Calendar className="w-5 h-5 text-blue-500" />, color: 'border-blue-200 bg-blue-50 text-blue-700', desc: 'Appointments & reservations' },
    { key: Module.AUTOMATION, icon: <Zap className="w-5 h-5 text-amber-500" />, color: 'border-amber-200 bg-amber-50 text-amber-700', desc: 'Workflow automation engine' },
    { key: Module.ANALYTICS, icon: <PieChart className="w-5 h-5 text-cyan-500" />, color: 'border-cyan-200 bg-cyan-50 text-cyan-700', desc: 'Reports & insights' },
    { key: Module.LINKS, icon: <LinkIcon className="w-5 h-5 text-pink-500" />, color: 'border-pink-200 bg-pink-50 text-pink-700', desc: 'Smart link management' },
    { key: Module.SUB_USERS, icon: <Users className="w-5 h-5 text-indigo-500" />, color: 'border-indigo-200 bg-indigo-50 text-indigo-700', desc: 'Team & agent access' },
    { key: Module.BILLING, icon: <CreditCard className="w-5 h-5 text-slate-500" />, color: 'border-slate-200 bg-slate-50 text-slate-700', desc: 'Billing & subscriptions' },
    { key: Module.PLANS, icon: <ShieldCheck className="w-5 h-5 text-amber-500" />, color: 'border-amber-200 bg-amber-50 text-amber-700', desc: 'Plan management' },
    { key: Module.FORMS, icon: <FormInput className="w-5 h-5 text-emerald-500" />, color: 'border-emerald-200 bg-emerald-50 text-emerald-700', desc: 'Dynamic form creation' },
    { key: Module.WHATSAPP, icon: <MessageCircle className="w-5 h-5 text-green-500" />, color: 'border-green-200 bg-green-50 text-green-700', desc: 'WhatsApp Meta Business Hub' },
    { key: Module.EMAIL, icon: <Mail className="w-5 h-5 text-blue-500" />, color: 'border-blue-200 bg-blue-50 text-blue-700', desc: 'Drag-and-Drop Email Marketing' },
];

const ModuleManager: React.FC = () => {
    const [admins, setAdmins] = useState<any[]>([]);
    const [selectedAdmin, setSelectedAdmin] = useState<any | null>(null);
    const [configOpen, setConfigOpen] = useState(false);
    const [editModules, setEditModules] = useState<Module[]>([]);

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            const res = await apiClient.get('/super-admin/admins?limit=100');
            const data = res.data.data.map((admin: any) => {
                const custom = Array.isArray(admin.moduleConfig?.enabledModules) ? admin.moduleConfig.enabledModules : [];
                const plan = Array.isArray(admin.plan?.enabledModules) ? admin.plan.enabledModules : [];
                let combined = Array.from(new Set([...custom, ...plan]));
                
                if (combined.length === 0) {
                    combined = [
                        Module.LIVE_CHAT, Module.CRM, Module.BOOKINGS, 
                        Module.AUTOMATION, Module.ANALYTICS, Module.LINKS, 
                        Module.SUB_USERS, Module.BILLING, Module.PLANS, 
                        Module.FORMS, Module.WHATSAPP, Module.EMAIL
                    ];
                }
                
                return { ...admin, enabledModules: combined };
            });
            setAdmins(data);
        } catch (error) {
            console.error(error);
        }
    };

    const openConfig = (admin: any) => {
        setSelectedAdmin(admin);
        setEditModules([...admin.enabledModules]);
        setConfigOpen(true);
    };

    const toggleModule = (mod: Module) => {
        setEditModules(prev =>
            prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
        );
    };

    const saveModules = async () => {
        if (!selectedAdmin) return;
        try {
            await moduleConfigApi.updateAdminModules(selectedAdmin.id, editModules);
            setAdmins(prev => prev.map(a =>
                a.id === selectedAdmin.id ? { ...a, enabledModules: editModules } : a
            ));
            setConfigOpen(false);
            message.success(`Modules updated for ${selectedAdmin.name}`);
        } catch (error) {
            console.error(error);
            message.error('Failed to update modules');
        }
    };

    const PLAN_COLOR: Record<string, string> = {
        Basic: 'bg-slate-50 text-slate-700 border-slate-200',
        Pro: 'bg-blue-50 text-blue-700 border-blue-200',
        Business: 'bg-purple-50 text-purple-700 border-purple-200',
        Enterprise: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };

    const totalAdmins = admins.length;
    const avgModules = totalAdmins > 0 ? Math.round(admins.reduce((a, ad) => a + ad.enabledModules.length, 0) / totalAdmins) : 0;
    const fullAccessCount = admins.filter(a => a.enabledModules.length === ALL_MODULES.length).length;

    return (
        <div className="pb-20 animate-in fade-in duration-500 font-sans text-slate-800">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Layout className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 m-0">Module Manager</h1>
                </div>
                <p className="text-sm text-slate-500 mt-2">Control which Business OS modules each admin account can access.</p>
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <div className="text-3xl font-extrabold text-blue-600 mb-1">{totalAdmins}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Admins</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <div className="text-3xl font-extrabold text-emerald-600 mb-1">{avgModules}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Modules / Admin</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <div className="text-3xl font-extrabold text-purple-600 mb-1">{fullAccessCount}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Access Admins</div>
                </div>
            </div>

            {/* Admin Cards */}
            <div className="space-y-4">
                {admins.map(admin => {
                    const planBadgeClass = PLAN_COLOR[admin.plan?.name] || 'bg-slate-50 text-slate-700 border-slate-200';
                    return (
                        <div key={admin.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-5 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20 shrink-0">
                                        {(admin.name || admin.username || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 m-0">{admin.name || admin.username}</h3>
                                        <p className="text-xs text-slate-500 m-0 mt-0.5">@{admin.username} {admin.industry ? `· ${admin.industry}` : ''}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className={cn("px-3 py-1 rounded-lg text-xs font-bold border shadow-xs", planBadgeClass)}>
                                        {admin.plan?.name || 'No Plan'}
                                    </span>
                                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                        {admin.enabledModules?.length || 0} / {ALL_MODULES.length} modules
                                    </span>
                                    <button
                                        onClick={() => openConfig(admin)}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-colors border border-primary/20"
                                    >
                                        <Settings className="w-4 h-4" /> Configure
                                    </button>
                                </div>
                            </div>

                            {/* Active Module Tags */}
                            <div className="flex flex-wrap gap-2 mt-5">
                                {ALL_MODULES.map(m => {
                                    const active = admin.enabledModules?.includes(m.key);
                                    return (
                                        <span 
                                            key={m.key} 
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all select-none",
                                                active ? "bg-primary/5 border-primary/30 text-primary font-bold shadow-xs" : "bg-slate-50 text-slate-400 border-slate-200"
                                            )}
                                        >
                                            {active && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                                            {ModuleLabel[m.key]}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Configure Modal */}
            {configOpen && selectedAdmin && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
                            <h2 className="text-lg font-bold text-slate-900">
                                Configure Modules — {selectedAdmin.name || selectedAdmin.username}
                            </h2>
                            <button onClick={() => setConfigOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
                            <p className="text-xs font-medium text-slate-500 mb-4">
                                Toggle modules on/off for this admin. Changes apply immediately on next login.
                            </p>

                            {ALL_MODULES.map(m => {
                                const active = editModules.includes(m.key);
                                return (
                                    <div 
                                        key={m.key}
                                        onClick={() => toggleModule(m.key)}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all bg-white",
                                            active ? "border-primary bg-primary/5 shadow-xs" : "border-slate-200 hover:border-slate-300"
                                        )}
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center shrink-0">
                                                {m.icon}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{ModuleLabel[m.key]}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{m.desc}</div>
                                            </div>
                                        </div>

                                        <div className={cn(
                                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                            active ? "border-primary bg-primary text-white" : "border-slate-300 bg-white"
                                        )}>
                                            {active && <CheckCircle2 className="w-4 h-4 text-white" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end gap-3 p-5 border-t border-slate-100 shrink-0 bg-white">
                            <button 
                                type="button" 
                                onClick={() => setConfigOpen(false)} 
                                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                onClick={saveModules}
                                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all flex items-center gap-2"
                            >
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModuleManager;
