import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import { 
    BarChart3, MessageSquare, MessageCircle, TrendingUp, ChevronLeft, ChevronRight, PieChart 
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const Reports: React.FC = () => {
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const { data: reportsResponse, isLoading } = useQuery({
        queryKey: ['link-reports', page],
        queryFn: () => apiClient.get(`/links/reports?page=${page}&limit=${pageSize}`).then(res => res.data),
    });

    const reports = reportsResponse?.data || [];
    const total = reportsResponse?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    const globalStats = reportsResponse?.globalStats || { totalConversations: 0, waRedirects: 0 };
    const totalChats = globalStats.totalConversations;
    const totalWARedirects = globalStats.waRedirects;
    const avgConversion = totalChats > 0 ? ((totalWARedirects / totalChats) * 100).toFixed(1) : '0';

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 bg-slate-100 rounded-lg w-48 mb-6" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-slate-100 rounded-2xl" />
                    ))}
                </div>
                <div className="h-64 bg-slate-100 rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="pb-20 font-sans text-slate-800 animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-xs">
                        <BarChart3 className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 m-0">Reports & Analytics</h1>
                </div>
                <p className="text-sm text-slate-500 mt-2">Track your WhatsApp redirection performance and conversation metrics.</p>
            </div>

            {/* Global Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Web Chats</span>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900">{totalChats.toLocaleString()}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">WhatsApp Redirects</span>
                        <div className="p-2 bg-green-50 text-green-600 rounded-xl border border-green-100">
                            <MessageCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900">{totalWARedirects.toLocaleString()}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg. Conversion Rate</span>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-slate-900">{avgConversion}</span>
                        <span className="text-sm font-medium text-slate-400">%</span>
                    </div>
                </div>
            </div>

            {/* Performance Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-primary" />
                    <h2 className="text-base font-bold text-slate-900 m-0">Performance by Link</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[650px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chat Link</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Total Conversations</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">WhatsApp Redirects</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Conversion Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-16 text-center text-slate-400 text-sm font-medium">
                                        No link performance data available
                                    </td>
                                </tr>
                            ) : (
                                reports.map((record: any) => (
                                    <tr key={record.id || record.slug} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="font-bold text-sm text-slate-900">{record.title}</div>
                                            <div className="text-xs text-slate-400 mt-0.5">/{record.slug}</div>
                                        </td>
                                        <td className="py-4 px-6 text-center font-extrabold text-sm text-slate-800">
                                            {record.totalConversations || 0}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold shadow-xs">
                                                <MessageCircle className="w-3.5 h-3.5 text-green-600" /> {record.waRedirects || 0}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className="inline-flex px-3 py-1 bg-primary/10 text-primary font-extrabold rounded-lg text-xs border border-primary/20">
                                                {record.conversionRate || 0}%
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50/50">
                        <span className="text-xs font-medium text-slate-500">
                            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} entries
                        </span>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors flex items-center gap-1"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" /> Prev
                            </button>
                            <button 
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= totalPages}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors flex items-center gap-1"
                            >
                                Next <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
