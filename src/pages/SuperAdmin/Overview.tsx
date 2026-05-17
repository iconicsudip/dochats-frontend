import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { 
    Users, Link as LinkIcon, MessageSquare, BarChart2, Globe, User, Clock, ArrowUpRight, ShieldCheck, Activity 
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const Overview: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get('/super-admin/stats')
            .then(res => setStats(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 bg-slate-100 rounded-lg w-48 mb-6" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-32 bg-slate-100 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="pb-20 font-sans text-slate-800 animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-xs">
                        <Activity className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 m-0">System Overview</h1>
                </div>
                <p className="text-sm text-slate-500 mt-2">Global performance and resource mapping across all accounts.</p>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Admins</span>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900">{stats?.totalAdmins || 0}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Sub-Users</span>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900">{stats?.totalSubUsers || 0}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Links</span>
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                            <LinkIcon className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900">{stats?.totalLinks || 0}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversations</span>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900">{stats?.totalConversations || 0}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-2">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Messages Sent</span>
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                            <BarChart2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900">{stats?.totalMessages || 0}</div>
                </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h2 className="text-base font-bold text-slate-900 m-0 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" /> Recent System Activity
                    </h2>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Visitor</th>
                                <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Source Link</th>
                                <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last Activity Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!stats?.recentConversations || stats.recentConversations.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="py-12 text-center text-slate-400 text-sm">
                                        No recent conversation activity
                                    </td>
                                </tr>
                            ) : (
                                stats.recentConversations.map((conv: any) => (
                                    <tr key={conv.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                {conv.visitorName || 'Anonymous'}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="bg-blue-50 text-blue-600 border border-blue-200 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs">
                                                {conv.link?.title || 'Unknown Link'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-xs text-slate-500 font-medium">
                                            {new Date(conv.lastMessageAt || conv.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Super Admin Control Panel Banner */}
            <div className="bg-gradient-to-r from-primary/10 via-indigo-500/10 to-blue-500/10 p-8 rounded-3xl border border-primary/20 shadow-lg shadow-primary/5 flex flex-col md:flex-row items-start md:items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0 shadow-xl shadow-primary/30 z-10">
                    <Globe className="w-8 h-8" />
                </div>
                <div className="z-10">
                    <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                        Super Admin Control Panel <ShieldCheck className="w-5 h-5 text-primary" />
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed m-0">
                        You are currently viewing global system reports. As a Super Admin, you have the authority to manage all administrative accounts, monitor their activities, and ensure system-wide performance.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Overview;
