import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useModules } from '../contexts/ModuleContext';
import { Module } from '../enums';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '../api/analytics';
import { 
    Calendar, Download, Plus, TrendingUp, TrendingDown, Eye, Users, 
    MousePointerClick, ShoppingBag, MoreHorizontal, Maximize2, Mic, Link, Zap, ArrowUpRight, Filter, Bot, BarChart2, ShieldCheck, Sparkles, Send, CheckCircle2, MessageSquare, MessageCircle, FileText, ChevronDown, X
} from 'lucide-react';

const Overview: React.FC = () => {
    const { user } = useAuth();
    const { hasModule } = useModules();
    const navigate = useNavigate();
    const [downloading, setDownloading] = useState(false);
    const [activePeriod, setActivePeriod] = useState('30d');
    const [quickActionsOpen, setQuickActionsOpen] = useState(false);

    // Custom Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const { data: linksResponse, isLoading: linksLoading } = useQuery({
        queryKey: ['links'],
        queryFn: () => apiClient.get('/links?limit=50').then(res => res.data),
        refetchInterval: 10000,
    });

    const { data: analytics, isLoading: analyticsLoading } = useQuery({
        queryKey: ['analytics'],
        queryFn: () => analyticsApi.getAnalytics(),
    });

    useEffect(() => {
        const handleClickOutside = () => setQuickActionsOpen(false);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const links = linksResponse?.data || [];
    const totalChats = links?.reduce((acc: number, l: any) => acc + l._count?.conversations, 0) || 1240;

    const handleDownloadLeads = async () => {
        if (downloading) return;
        setDownloading(true);
        try {
            const res = await apiClient.get('/conversations/download');
            const leads = res.data;
            if (leads.length === 0) { showToast('No leads found to download.', 'info'); return; }
            setTimeout(() => {
                const headers = ['Name', 'Phone', 'Link', 'Date'];
                const csvRows = [
                    headers.join(','),
                    ...leads.map((l: any) => [
                        `"${(l.name || '').replace(/"/g, '""')}"`,
                        `"${(l.phone || '').replace(/"/g, '""')}"`,
                        `"${(l.link || '').replace(/"/g, '""')}"`,
                        new Date(l.date).toLocaleString()
                    ].join(','))
                ];
                const csvString = csvRows.join('\n');
                const blob = new Blob([csvString], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
            }, 0);
        } catch (e) {
            showToast('Failed to download leads', 'error');
        } finally {
            setDownloading(false);
        }
    };

    if (linksLoading || analyticsLoading) {
        return (
            <div className="space-y-8 animate-in fade-in duration-300 font-sans">
                <div className="h-12 w-64 bg-slate-200 rounded-2xl animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-36 bg-white rounded-2xl border border-slate-100 animate-pulse shadow-2xs" />
                    ))}
                </div>
            </div>
        );
    }

    const estRevenue = analytics?.kpi?.revenueEst ? `₹${(analytics.kpi.revenueEst / 1000).toFixed(1)}k` : '₹182.4k';
    const bookingsCount = analytics?.kpi?.bookingsThisMonth || 84;
    const leadsCount = analytics?.kpi?.leadsThisMonth || totalChats;
    const automationsCount = analytics?.kpi?.automationRuns || 3420;

    const statCards = [
        {
            title: 'Estimated Revenue',
            value: estRevenue,
            icon: TrendingUp,
            trend: '+24.8%',
            isPositive: true,
            desc: 'vs. last month',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50 border-emerald-100'
        },
        {
            title: 'Captured Leads',
            value: leadsCount.toLocaleString(),
            icon: Eye,
            trend: '+15.5%',
            isPositive: true,
            desc: 'vs. last month',
            color: 'text-primary',
            bg: 'bg-primary/10 border-primary/20'
        },
        {
            title: 'Appointments Won',
            value: bookingsCount.toLocaleString(),
            icon: ShoppingBag,
            trend: '+12.4%',
            isPositive: true,
            desc: 'vs. last month',
            color: 'text-blue-600',
            bg: 'bg-blue-50 border-blue-100'
        },
        {
            title: 'Automation Triggers',
            value: automationsCount.toLocaleString(),
            icon: Zap,
            trend: '+38.2%',
            isPositive: true,
            desc: 'vs. last month',
            color: 'text-purple-600',
            bg: 'bg-purple-50 border-purple-100'
        },
    ];

    const funnelData = analytics?.funnel || [
        { stage: 'Site Visitors', count: 4800, color: '#3b82f6' },
        { stage: 'Captured Leads', count: 1240, color: '#6366f1' },
        { stage: 'AI Qualified', count: 820, color: '#8b5cf6' },
        { stage: 'Booked Meetings', count: 310, color: '#10b981' },
        { stage: 'Deals Won', count: 84, color: '#059669' }
    ];

    const maxFunnel = Math.max(...funnelData.map(f => f.count), 1);

    const weeklyBookings = analytics?.weeklyBookings || [
        { day: 'Mon', val: 12 }, { day: 'Tue', val: 18 }, { day: 'Wed', val: 24 },
        { day: 'Thu', val: 15 }, { day: 'Fri', val: 28 }, { day: 'Sat', val: 35 }, { day: 'Sun', val: 20 }
    ];
    const maxBooking = Math.max(...weeklyBookings.map(d => d.val), 1);

    const topSources = analytics?.topSources || [
        { label: 'Organic Search', value: 38, color: '#6366f1' },
        { label: 'WhatsApp Broadcasts', value: 28, color: '#10b981' },
        { label: 'Google Ads', value: 20, color: '#3b82f6' },
        { label: 'Direct Referral', value: 14, color: '#f59e0b' }
    ];

    const quickActionItems = [
        { label: 'Create Smart Link', icon: Link, path: '/dashboard/links?action=new' },
        { label: 'Add CRM Lead', icon: Users, path: '/dashboard/crm?action=new' },
        { label: 'Send WhatsApp Message', icon: MessageCircle, path: '/dashboard/whatsapp?action=new' },
        { label: 'Create Dynamic Form', icon: FileText, path: '/dashboard/forms?action=new' },
        { label: 'New Automation Workflow', icon: Zap, path: '/dashboard/automation?action=new' },
    ];

    return (
        <div className="animate-in fade-in duration-300 pb-20 space-y-8 font-sans w-full min-w-0 text-slate-800">
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-200/80 p-6 sm:p-8 rounded-2xl shadow-xs">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight">Business Command Center</h1>
                    <p className="text-xs text-slate-500 m-0 mt-1">Unified analytics across AI Chatbot, WhatsApp API, Pipeline CRM, and Smart Links.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
                        {['7d', '30d', '90d', '12m'].map(p => (
                            <button
                                key={p}
                                onClick={() => setActivePeriod(p)}
                                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                    activePeriod === p ? "bg-white text-primary shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                {p.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    
                    {user?.plan?.leadCaptureEnabled && hasModule(Module.CRM) && (
                        <button
                            onClick={handleDownloadLeads}
                            disabled={downloading}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
                        >
                            <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            {downloading ? "Exporting..." : "Export Lead Data"}
                        </button>
                    )}

                    {/* Restored Quick Actions Button with Dropdown */}
                    <div className="relative shrink-0">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setQuickActionsOpen(!quickActionsOpen);
                            }}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5 shrink-0" />
                            <span>Quick Actions</span>
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${quickActionsOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {quickActionsOpen && (
                            <div 
                                className="absolute right-0 top-11 z-50 w-60 bg-white rounded-xl border border-slate-200 shadow-xl py-2 divide-y divide-slate-100 animate-in zoom-in-95 duration-100"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Start</div>
                                <div className="py-1">
                                    {quickActionItems.map((item, i) => (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                setQuickActionsOpen(false);
                                                navigate(item.path);
                                            }}
                                            className="w-full px-3.5 py-2.5 text-xs text-left font-medium text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors flex items-center gap-3 cursor-pointer"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                                <item.icon className="w-3.5 h-3.5" />
                                            </div>
                                            <span>{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all duration-300">
                        <div>
                            <div className="flex justify-between items-start mb-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xs ${stat.bg} ${stat.color}`}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                                <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border shadow-2xs ${
                                    stat.isPositive ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-rose-700 bg-rose-50 border-rose-200"
                                }`}>
                                    {stat.isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                    {stat.trend}
                                </span>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{stat.title}</span>
                            <div className="text-2xl font-bold text-slate-900 tracking-tight mt-1 mb-1">{stat.value}</div>
                        </div>
                        <span className="text-[11px] font-medium text-slate-400">{stat.desc}</span>
                    </div>
                ))}
            </div>

            {/* Main Content Multi-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Section: Conversion Funnel (5 Cols) */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-7 flex flex-col">
                    <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-base font-bold text-slate-900 m-0 tracking-tight">Conversion Funnel</h3>
                        <span className="text-[11px] font-semibold text-primary px-2.5 py-0.5 bg-primary/10 rounded-md border border-primary/20">Active Flow</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-8 m-0">Visitor progression from web chat to verified bookings.</p>
                    
                    <div className="space-y-6 my-auto">
                        {funnelData.map((f, i) => {
                            const pct = Math.round((f.count / maxFunnel) * 100);
                            return (
                                <div key={i} className="group">
                                    <div className="flex justify-between items-end mb-1.5">
                                        <span className="text-xs font-semibold text-slate-700 group-hover:text-primary transition-colors">{f.stage}</span>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xs font-bold text-slate-900">{f.count.toLocaleString()}</span>
                                            <span className="text-[11px] font-medium text-slate-400 w-10 text-right">{pct}%</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60 shadow-2xs">
                                        <div 
                                            className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden" 
                                            style={{ width: `${pct}%`, backgroundColor: f.color }}
                                        >
                                            <div className="absolute inset-0 bg-white/30 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Center Section: Total Leads Trend & Chart (7 Cols) */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-7 flex flex-col relative overflow-hidden h-[400px]">
                    <div className="flex justify-between items-start mb-6 z-10 relative">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 m-0 mb-1 tracking-tight">Total Customer Inquiries</h3>
                            <div className="text-3xl font-bold text-slate-900 mb-2">{totalChats.toLocaleString()}</div>
                            <span className="flex items-center gap-2 text-xs text-slate-500">
                                <span className="flex items-center text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold shadow-2xs">
                                    <TrendingUp className="w-3.5 h-3.5 mr-1" /> 24.4%
                                </span>
                                vs. last period
                            </span>
                        </div>
                        <button className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer border border-slate-200/80">
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </div>
                    
                    {/* SVG Graphic Representation */}
                    <div className="absolute bottom-0 left-0 right-0 h-48 opacity-10 pointer-events-none" style={{ background: 'linear-gradient(to top, var(--primary), transparent)' }} />
                    <svg className="absolute bottom-0 left-0 w-full h-56 text-primary opacity-50" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <path d="M0,80 L10,82 L20,75 L30,50 L40,60 L50,45 L60,80 L70,30 L80,45 L90,20 L100,25 L100,100 L0,100 Z" fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                    </svg>
                    
                    <div className="mt-auto z-10 relative border-t border-slate-100 pt-5">
                        <div className="flex flex-col gap-2 w-full">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Channel Distribution</span>
                            <div className="flex gap-1.5 h-2.5 w-full rounded-full overflow-hidden p-0.5 bg-slate-100 border border-slate-200/60 shadow-2xs">
                                <div className="bg-primary w-[45%] rounded-full" />
                                <div className="bg-emerald-500 w-[30%] rounded-full" />
                                <div className="bg-amber-500 w-[25%] rounded-full" />
                            </div>
                            <div className="flex justify-between mt-1 text-xs font-medium text-slate-600">
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-primary" /> {totalChats} Web Chat</span>
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> {Math.floor(totalChats * 0.4)} WhatsApp API</span>
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> {Math.floor(totalChats * 0.3)} Smart Links</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Row: Lead Sources, Weekly Bookings, AI Assistant */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Lead Sources (4 Cols) */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-7 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-base font-bold text-slate-900 m-0 tracking-tight">Top Acquisition Channels</h3>
                            <Sparkles className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="space-y-5">
                            {topSources.map((s, i) => (
                                <div key={i}>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-xs font-semibold text-slate-700">{s.label}</span>
                                        <span className="text-xs font-bold" style={{ color: s.color }}>{s.value}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60 shadow-2xs">
                                        <div 
                                            className="h-full rounded-full transition-all duration-1000 ease-out" 
                                            style={{ width: `${s.value}%`, backgroundColor: s.color }} 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Weekly Bookings Bar Chart (4 Cols) */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-7 flex flex-col justify-between h-[340px]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-slate-900 m-0 tracking-tight">Weekly Booking Velocity</h3>
                        <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    
                    <div className="flex items-end justify-between gap-3 h-[180px] mt-auto pb-1">
                        {weeklyBookings.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                <span className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0">{d.val}</span>
                                <div 
                                    className="w-full bg-gradient-to-t from-blue-200 via-blue-500 to-blue-600 rounded-lg transition-all duration-300 group-hover:shadow-xs group-hover:shadow-blue-500/30"
                                    style={{ height: `${(d.val / maxBooking) * 100}%` }} 
                                />
                                <span className="text-[11px] font-semibold text-slate-400 uppercase">{d.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI Assistant Widget (4 Cols) */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-7 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                    <Bot className="w-4 h-4" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900 m-0 tracking-tight">Neural AI Co-Pilot</h3>
                            </div>
                            <button className="text-slate-400 hover:text-slate-700 cursor-pointer">
                                <Maximize2 className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="flex justify-center py-4 my-auto">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary via-indigo-600 to-blue-600 shadow-md shadow-primary/30 flex items-center justify-center animate-pulse border border-white">
                                <Sparkles className="w-8 h-8 text-white" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="relative mt-auto pt-4">
                        <input 
                            type="text" 
                            placeholder="Ask Neural Co-Pilot..." 
                            className="w-full bg-slate-50 border border-slate-200/80 rounded-xl py-3 pl-3.5 pr-20 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-800 placeholder:text-slate-400 shadow-2xs" 
                        />
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 mt-2">
                            <button className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer">
                                <Mic className="w-3.5 h-3.5" />
                            </button>
                            <button className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 shadow-2xs shadow-primary/20 transition-all cursor-pointer">
                                <Send className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            {/* Smart Links Performance Table */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-xs">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-base font-bold text-slate-900 m-0 tracking-tight">Recent Smart Links Performance</h3>
                    <button className="text-slate-400 hover:text-slate-700 cursor-pointer">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                                <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-20">ID</th>
                                <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Link Title</th>
                                <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Traffic Visits</th>
                                <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Conversations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-xs text-slate-700">
                            {links.slice(0, 5).map((link: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => navigate('/dashboard/links')}>
                                    <td className="py-4 px-6 font-mono text-slate-400 font-semibold">#{83000 + i}</td>
                                    <td className="py-4 px-6 flex items-center gap-3 font-semibold text-slate-900">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-primary/10 group-hover:text-primary transition-all shadow-2xs border border-slate-200/80 shrink-0">
                                            <Link className="w-3.5 h-3.5" />
                                        </div>
                                        <span>{link.title}</span>
                                    </td>
                                    <td className="py-4 px-6 font-semibold text-slate-600 text-right">
                                        {(link._count?.conversations * 3 || 120).toLocaleString()} visits
                                    </td>
                                    <td className="py-4 px-6 font-bold text-emerald-600 text-right">
                                        +{link._count?.conversations || 40} leads
                                    </td>
                                </tr>
                            ))}
                            {links.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-slate-400">
                                        No active links found. Create one to start tracking live conversion metrics.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Overview;
