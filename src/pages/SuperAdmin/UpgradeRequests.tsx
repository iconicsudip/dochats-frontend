import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { Check, X, Zap, Clock, User, ShieldAlert, ArrowUpRight } from 'lucide-react';
import apiClient from '../../api/apiClient';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

dayjs.extend(relativeTime);

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const UpgradeRequests: React.FC = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/super-admin/upgrade-requests');
            setRequests(res.data);
        } catch (e) {
            message.error('Failed to fetch upgrade requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        setProcessingId(id);
        try {
            await apiClient.post(`/super-admin/upgrade-requests/${id}/handle`, { status });
            message.success(`Request ${status.toLowerCase()} successfully`);
            fetchRequests();
        } catch (e: any) {
            message.error(e.response?.data?.error || 'Action failed');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="pb-20 animate-in fade-in duration-500 font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Zap className="w-6 h-6 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 m-0">Upgrade Requests</h1>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">Review and approve plan change requests from your administrative users.</p>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Admin Details</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Plan</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Requested Plan</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Request Date</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
                                        <p className="text-sm text-slate-400 mt-4">Loading upgrade requests...</p>
                                    </td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-200">
                                            <ShieldAlert className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-700 mb-1">No upgrade requests</h3>
                                        <p className="text-sm text-slate-500">All administrative tier requests have been processed.</p>
                                    </td>
                                </tr>
                            ) : (
                                requests.map(req => {
                                    return (
                                        <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    {req.user?.logoUrl ? (
                                                        <img src={req.user.logoUrl} alt="logo" className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm" />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20 shadow-sm">
                                                            {(req.user?.name || req.user?.username || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="text-sm font-bold text-slate-900">{req.user?.name || req.user?.username}</div>
                                                        <div className="text-[11px] font-medium text-slate-500">@{req.user?.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={cn(
                                                    "inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold border",
                                                    req.user?.plan ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-purple-50 text-purple-600 border-purple-200"
                                                )}>
                                                    {req.user?.plan?.name || 'Custom / None'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6">
                                                {req.plan ? (
                                                    <div>
                                                        <div className="text-sm font-bold text-primary flex items-center gap-1">
                                                            {req.plan.name} <ArrowUpRight className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                                {req.billingCycle}
                                                            </span>
                                                            <span className="text-xs font-extrabold text-slate-700">
                                                                ₹{(req.billingCycle === 'YEARLY' ? req.plan.yearlyPrice : req.plan.monthlyPrice).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="bg-purple-50 text-purple-600 border border-purple-200 px-2 py-1 rounded-md text-[10px] font-extrabold">
                                                        CUSTOM REQUEST
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500" title={dayjs(req.createdAt).format('LLL')}>
                                                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {dayjs(req.createdAt).fromNow()}
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={cn(
                                                    "inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold border",
                                                    req.status === 'APPROVED' ? "bg-green-50 text-green-600 border-green-200"
                                                    : req.status === 'REJECTED' ? "bg-red-50 text-red-600 border-red-200"
                                                    : "bg-amber-50 text-amber-600 border-amber-200"
                                                )}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                {req.status === 'PENDING' && (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            disabled={processingId === req.id}
                                                            onClick={() => handleAction(req.id, 'APPROVED')}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm shadow-green-500/20 disabled:opacity-50"
                                                        >
                                                            {processingId === req.id ? (
                                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            ) : <Check className="w-3.5 h-3.5" />} Approve
                                                        </button>
                                                        <button
                                                            disabled={processingId === req.id}
                                                            onClick={() => handleAction(req.id, 'REJECTED')}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                                                        >
                                                            <X className="w-3.5 h-3.5" /> Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UpgradeRequests;
