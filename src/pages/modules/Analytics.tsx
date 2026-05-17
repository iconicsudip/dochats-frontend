import React, { useState, useEffect } from 'react';
import { analyticsApi, AnalyticsData } from '../../api/analytics';
import { TrendingUp, Bot, Calendar, Zap, ArrowUpRight } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const Analytics: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await analyticsApi.getAnalytics();
            setData(res);
        } catch (error) {
            console.error(error);
        }
    };

    if (!data) return (
        <div className="flex items-center justify-center h-64 animate-in fade-in">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
    );

    const maxBooking = Math.max(...data.weeklyBookings.map(d => d.val), 1);

    return (
        <div className="pb-20 font-sans text-slate-800 animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8 bg-white border border-slate-200/80 p-6 sm:p-8 rounded-2xl shadow-xs">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-200 shadow-2xs">
                        <TrendingUp className="w-5 h-5 text-amber-500" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight">Analytics</h1>
                </div>
                <p className="text-xs font-semibold text-slate-500 m-0">
                    Business performance across all modules — AI Chat, CRM, Bookings, and Automation.
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Total Revenue (est.)', value: `₹${(data.kpi.revenueEst / 1000).toFixed(1)}k`, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50 border-green-100', sub: 'This month' },
                    { label: 'Leads This Month', value: data.kpi.leadsThisMonth, icon: Bot, color: 'text-purple-500', bg: 'bg-purple-50 border-purple-100', sub: 'This month' },
                    { label: 'Bookings This Month', value: data.kpi.bookingsThisMonth, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-100', sub: 'This month' },
                    { label: 'Automation Runs', value: data.kpi.automationRuns, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-100', sub: 'This month' },
                ].map((kpi, i) => (
                    <div key={i} className={cn("bg-white rounded-2xl p-6 border shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-transform hover:-translate-y-1", kpi.bg)}>
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm", kpi.color)}>
                                <kpi.icon className="w-5 h-5" />
                            </div>
                            <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-lg border border-green-100">
                                <ArrowUpRight className="w-3 h-3" /> 12%
                            </span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{kpi.label}</span>
                        <div className={cn("text-2xl font-extrabold mb-1", kpi.color)}>{kpi.value}</div>
                        <span className="text-xs font-medium text-slate-400">{kpi.sub}</span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Funnel */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Conversion Funnel</h3>
                    <p className="text-xs font-semibold text-slate-600 mb-6">Visitor → Lead → Qualified → Booking → Won</p>
                    
                    <div className="space-y-4">
                        {data.funnel.map((f, i) => {
                            const pct = Math.round((f.count / (data.funnel[0].count || 1)) * 100);
                            return (
                                <div key={i} className="group">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-xs font-bold text-slate-700">{f.stage}</span>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xs font-extrabold" style={{ color: f.color }}>{f.count.toLocaleString()}</span>
                                            <span className="text-xs font-bold text-slate-400 w-8 text-right">{pct}%</span>
                                        </div>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden" 
                                            style={{ width: `${pct}%`, backgroundColor: f.color }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Weekly Bookings Bar Chart */}
                <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Weekly Bookings</h3>
                    
                    <div className="flex items-end justify-between gap-2 h-[180px] mt-auto pb-2">
                        {data.weeklyBookings.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                <span className="text-xs font-bold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0">{d.val}</span>
                                <div 
                                    className="w-full bg-gradient-to-t from-blue-100 to-blue-500 rounded-t-md transition-all duration-500 hover:from-blue-200 hover:to-blue-600"
                                    style={{ height: `${(d.val / maxBooking) * 100}%` }} 
                                />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">{d.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Lead Sources */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Lead Sources</h3>
                    
                    <div className="space-y-5">
                        {data.topSources.map((s, i) => (
                            <div key={i}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-slate-700">{s.label}</span>
                                    <span className="text-xs font-extrabold" style={{ color: s.color }}>{s.value}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
        </div>
    );
};

export default Analytics;
