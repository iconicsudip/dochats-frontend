import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import { 
    CreditCard, Calendar, Clock, AlertTriangle, Zap, CheckCircle2, History, ChevronLeft, ChevronRight 
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { APP_NAME } from '../constants/brand';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

declare global {
    interface Window {
        Razorpay: any;
    }
}

const Billing: React.FC = () => {
    const queryClient = useQueryClient();
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 10;

    // Toast Notification State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
    const showToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setToast({ message: msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const { data: status, isLoading: statusLoading } = useQuery({
        queryKey: ['billing-status'],
        queryFn: () => apiClient.get('/billing/status').then(res => res.data),
    });

    const { data: historyResponse, isLoading: historyLoading } = useQuery({
        queryKey: ['billing-history', page],
        queryFn: () => apiClient.get(`/billing/history?page=${page}&limit=${pageSize}`).then(res => res.data),
    });
    const history = historyResponse?.data || [];
    const total = historyResponse?.total || 0;
    const totalPages = Math.ceil(total / pageSize);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        return () => { document.body.removeChild(script); };
    }, []);

    const handlePayNow = async (subscriptionId?: string) => {
        try {
            setPaymentLoading(true);

            const { data: order } = await apiClient.post('/billing/create-order', { subscriptionId });

            const options = {
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: APP_NAME,
                description: `${status.billingCycle === 'YEARLY' ? 'Yearly' : 'Monthly'} Subscription`,
                order_id: order.orderId,
                handler: async (response: any) => {
                    try {
                        await apiClient.post('/billing/verify-payment', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });
                        showToast('Payment successful! Your subscription is now active.', 'success');
                        queryClient.invalidateQueries({ queryKey: ['billing-status'] });
                        queryClient.invalidateQueries({ queryKey: ['billing-history'] });
                    } catch {
                        showToast('Payment verification failed. Please contact support.', 'error');
                    }
                },
                prefill: {},
                theme: {
                    color: '#5c59f2'
                },
                modal: {
                    ondismiss: () => {
                        setPaymentLoading(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', () => {
                showToast('Payment failed. Please try again.', 'error');
                setPaymentLoading(false);
            });
            rzp.open();
            setPaymentLoading(false);
        } catch (e) {
            console.error(e);
            showToast('Failed to initiate payment', 'error');
            setPaymentLoading(false);
        }
    };

    const sub = status?.subscription;
    const isOverdue = sub?.isOverdue;
    const showWarning = sub?.showWarning;

    const getStatusBadge = (s: string) => {
        const map: Record<string, string> = {
            ACTIVE: "bg-emerald-50 text-emerald-600 border-emerald-200",
            OVERDUE: "bg-red-50 text-red-600 border-red-200",
            EXPIRED: "bg-slate-100 text-slate-500 border-slate-200",
            PAID: "bg-emerald-50 text-emerald-600 border-emerald-200",
            PENDING: "bg-amber-50 text-amber-600 border-amber-200",
            FAILED: "bg-red-50 text-red-600 border-red-200"
        };
        return map[s] || "bg-slate-100 text-slate-500 border-slate-200";
    };

    if (statusLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 bg-slate-100 rounded-lg w-48 mb-6" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
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
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-xs shrink-0">
                        <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight">Billing & Subscription</h1>
                        <p className="text-xs font-semibold text-slate-500 m-0 mt-0.5">Manage your subscription and view payment history.</p>
                    </div>
                </div>
            </div>

            {/* Alerts */}
            {isOverdue && (
                <div className="mb-8 p-5 rounded-2xl border border-red-200 bg-red-50/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-red-900 m-0">Subscription Expired</h3>
                            <p className="text-xs font-semibold text-red-700 m-0 mt-0.5">Your subscription has expired. Please make the payment to continue using all features.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handlePayNow()}
                        disabled={paymentLoading}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/20 transition-all shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                        {paymentLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        Pay Now
                    </button>
                </div>
            )}

            {showWarning && !isOverdue && sub && (
                <div className="mb-8 p-5 rounded-2xl border border-amber-200 bg-amber-50/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-amber-900 m-0">Expires in {sub.daysRemaining} day{sub.daysRemaining > 1 ? 's' : ''}</h3>
                            <p className="text-xs font-semibold text-amber-700 m-0 mt-0.5">Your subscription is about to expire. Renew early to maintain uninterrupted access.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handlePayNow()}
                        disabled={paymentLoading}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                    >
                        {paymentLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        Renew Now
                    </button>
                </div>
            )}

            {/* Plan Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {status?.billingCycle === 'YEARLY' ? 'Yearly' : 'Monthly'} Plan
                            </span>
                            <span className={cn("px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wide", getStatusBadge(sub?.status || 'EXPIRED'))}>
                                {sub?.status || 'Inactive'}
                            </span>
                        </div>
                        <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                            ₹{(sub?.amount || status?.defaultAmount || 0).toLocaleString()}
                        </div>
                    </div>
                    {status?.breakdown && (
                        <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500">
                                <span>Base Plan</span>
                                <span className="text-slate-700">₹{status.breakdown.basePrice.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500">
                                <span>{status.breakdown.linksCount} Smart Links (₹{status.breakdown.linkPrice}/ea)</span>
                                <span className="text-slate-700">₹{status.breakdown.totalLinksPrice.toLocaleString()}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Days Remaining</span>
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className={cn("text-3xl font-extrabold tracking-tight font-mono", isOverdue ? "text-red-600" : "text-slate-900")}>
                            {sub?.daysRemaining ?? 0}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">days</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Billing Period</span>
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                            <Calendar className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate">
                        {sub ? `${new Date(sub.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} — ${new Date(sub.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'N/A'}
                    </div>
                </div>
            </div>

            {/* Pay Early Action */}
            {!isOverdue && !showWarning && sub && (
                <div className="mb-8 p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 m-0 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-primary" /> Pay Early & Extend
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 m-0 mt-1 max-w-xl leading-relaxed">
                            Pay before your period ends. Your new {status?.billingCycle === 'YEARLY' ? '365' : '30'}-day period will start from today without losing active service.
                        </p>
                    </div>
                    <button
                        onClick={() => handlePayNow()}
                        disabled={paymentLoading}
                        className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0 w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer font-bold"
                    >
                        {paymentLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        Extend Subscription
                    </button>
                </div>
            )}

            {/* No Active Subscription Case */}
            {!status?.hasSubscription && !sub && (
                <div className="mb-8 p-8 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-blue-500/10 border border-primary/20 rounded-3xl text-center shadow-xs">
                    <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md shadow-primary/30">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">No Active Subscription</h2>
                    <p className="text-xs font-semibold text-slate-600 mb-6 max-w-md mx-auto">
                        Start your subscription for ₹{(status?.defaultAmount || 999).toLocaleString()}/month to unlock full customer engagement capabilities.
                    </p>
                    <button
                        onClick={() => handlePayNow()}
                        disabled={paymentLoading}
                        className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50 cursor-pointer"
                    >
                        {paymentLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        Subscribe Now
                    </button>
                </div>
            )}

            {/* History Table */}
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                    <History className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-bold text-slate-900 m-0">Payment History</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200 text-xs">
                                <th className="py-3.5 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Billing Period</th>
                                <th className="py-3.5 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                                <th className="py-3.5 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subscription Status</th>
                                <th className="py-3.5 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Payment Status</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs font-medium text-slate-700 divide-y divide-slate-100">
                            {historyLoading ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-slate-400 font-semibold">
                                        <div className="inline-block w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin mb-2" />
                                        <div>Loading payment history...</div>
                                    </td>
                                </tr>
                            ) : history.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-16 text-center text-slate-400 font-semibold">
                                        No payment history available
                                    </td>
                                </tr>
                            ) : (
                                history.map((record: any) => {
                                    const payStatus = record.payment?.status || 'PENDING';
                                    return (
                                        <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-4 px-6 font-bold text-slate-900">
                                                {new Date(record.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                {' → '}
                                                {new Date(record.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="py-4 px-6 font-bold text-primary">
                                                ₹{record.amount}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={cn("inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wide", getStatusBadge(record.status))}>
                                                    {record.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wide max-w-max", getStatusBadge(payStatus))}>
                                                            {payStatus}
                                                        </span>
                                                        {payStatus === 'PENDING' && (
                                                            <button
                                                                onClick={() => handlePayNow(record.id)}
                                                                disabled={paymentLoading}
                                                                className="px-2 py-0.5 bg-primary hover:bg-primary-hover text-white text-[10px] font-bold rounded-md uppercase tracking-wider cursor-pointer select-none transition-colors border-0 disabled:opacity-50 flex items-center justify-center"
                                                            >
                                                                {paymentLoading ? '...' : 'Pay Now'}
                                                            </button>
                                                        )}
                                                    </div>
                                                    {record.payment?.paidAt && (
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            {new Date(record.payment.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
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
                {totalPages > 1 && (
                    <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50/50">
                        <span className="text-xs font-medium text-slate-500">
                            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} entries
                        </span>
                        <div className="flex gap-1.5">
                            <button 
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" /> Prev
                            </button>
                            <button 
                                onClick={() => setPage(p => p + 1)}
                                disabled={page >= totalPages}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                Next <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {toast && (
                <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-xl animate-in slide-in-from-bottom-4 duration-300">
                    <div className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        toast.type === 'success' ? "bg-emerald-400" :
                        toast.type === 'error' ? "bg-red-400" : "bg-amber-400"
                    )} />
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
};

export default Billing;
