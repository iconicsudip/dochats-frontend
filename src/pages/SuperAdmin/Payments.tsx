import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../api/apiClient';
import { 
    CreditCard, DollarSign, CheckCircle2, AlertCircle, Wallet, Search, Calendar, User, Copy, Check, Filter
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const Payments: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const pageSize = 15;

    const { data: response, isLoading } = useQuery({
        queryKey: ['all-payments', currentPage, searchTerm, statusFilter],
        queryFn: () => apiClient.get(`/billing/all-payments?page=${currentPage}&limit=${pageSize}&search=${searchTerm}&status=${statusFilter}`).then(res => res.data),
    });

    const stats = response?.stats || {};
    const paginatedPayments = response?.data || [];
    const totalPayments = response?.total || 0;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(text);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getSubscriptionStyle = (status: string) => {
        const map: Record<string, string> = {
            ACTIVE: "bg-emerald-50 text-emerald-600 border-emerald-200",
            OVERDUE: "bg-red-50 text-red-600 border-red-200",
            EXPIRED: "bg-slate-100 text-slate-500 border-slate-200",
        };
        return map[status] || "bg-slate-100 text-slate-500 border-slate-200";
    };

    const getPaymentStyle = (status: string) => {
        const map: Record<string, string> = {
            PAID: "bg-emerald-50 text-emerald-600 border-emerald-200",
            PENDING: "bg-amber-50 text-amber-600 border-amber-200",
            FAILED: "bg-red-50 text-red-600 border-red-200",
        };
        return map[status] || "bg-amber-50 text-amber-600 border-amber-200";
    };

    const totalPages = Math.ceil(totalPayments / pageSize);

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 bg-slate-100 rounded-lg w-48 mb-6" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-32 bg-slate-100 rounded-2xl" />
                    ))}
                </div>
                <div className="h-96 bg-slate-100 rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="pb-20 font-sans text-slate-800 animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-xs">
                        <CreditCard className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 m-0">Payment Management</h1>
                </div>
                <p className="text-sm text-slate-500 mt-2">Track all admin payments, subscription statuses, and revenue analytics.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Revenue</span>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900">₹{(stats.totalRevenue || 0).toLocaleString()}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Plans</span>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900">{stats.activeSubscriptions || 0}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending / Overdue</span>
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900">{stats.pendingPayments || 0}</div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Bills Generated</span>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                            <Wallet className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900">{stats.totalBills || 0}</div>
                </div>
            </div>

            {/* Payments Table Container */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
                {/* Search & Filter Bar */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 m-0">All Admin Payments</h2>
                        <p className="text-xs text-slate-500 m-0 mt-0.5">{totalPayments} record{totalPayments !== 1 ? 's' : ''} found</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-60">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search admin..."
                                value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs"
                            />
                        </div>

                        <div className="relative w-full sm:w-44">
                            <select
                                value={statusFilter}
                                onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer shadow-2xs"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="PAID">Paid</option>
                                <option value="PENDING">Pending</option>
                                <option value="ACTIVE">Active Plan</option>
                                <option value="OVERDUE">Overdue</option>
                                <option value="EXPIRED">Expired</option>
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[950px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Admin</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Billing Period</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Subscription</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Payment Status</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Razorpay ID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {totalPayments === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-400 text-sm font-medium">
                                        No payments match your filters
                                    </td>
                                </tr>
                            ) : (
                                paginatedPayments.map((record: any) => {
                                    const payStatus = record.payment?.status || 'UNPAID';
                                    const rpId = record.payment?.razorpayPaymentId;

                                    return (
                                        <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    {record.admin?.logoUrl ? (
                                                        <img src={record.admin.logoUrl} alt="logo" className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20 shadow-sm shrink-0">
                                                            {(record.admin?.name || record.admin?.username || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900">{record.admin?.name || record.admin?.username}</div>
                                                        <div className="text-[11px] font-medium text-slate-500">@{record.admin?.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                                    <div>
                                                        <div className="text-xs font-bold text-slate-800">
                                                            {new Date(record.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 font-medium">
                                                            to {new Date(record.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <div className="text-sm font-extrabold text-slate-900">₹{record.amount}</div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={cn("inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wide", getSubscriptionStyle(record.subscriptionStatus))}>
                                                    {record.subscriptionStatus}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={cn("inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wide", getPaymentStyle(payStatus))}>
                                                        {payStatus}
                                                    </span>
                                                    {record.payment?.paidAt && (
                                                        <span className="text-[10px] text-slate-400 font-medium" title={new Date(record.payment.paidAt).toLocaleString('en-IN')}>
                                                            {new Date(record.payment.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                {rpId ? (
                                                    <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/60 max-w-max">
                                                        <span className="truncate max-w-[150px]" title={rpId}>{rpId}</span>
                                                        <button 
                                                            onClick={() => copyToClipboard(rpId)}
                                                            className="text-slate-400 hover:text-primary transition-colors p-0.5"
                                                            title="Copy ID"
                                                        >
                                                            {copiedId === rpId ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 font-medium">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50/50">
                        <span className="text-xs font-medium text-slate-500">
                            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalPayments)} of {totalPayments} entries
                        </span>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                            >
                                Prev
                            </button>
                            <button 
                                onClick={() => setCurrentPage(p => p + 1)}
                                disabled={currentPage >= totalPages}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Payments;
