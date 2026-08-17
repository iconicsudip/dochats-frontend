import React, { useState, useEffect } from 'react';
import { Check, CheckCircle2, Users, Link as LinkIcon, MessageCircle, Rocket, Zap, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const Plans: React.FC = () => {
    const { user, setUser } = useAuth();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

    // Toast Notification State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
    const showToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setToast({ message: msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/super-admin/plans');
            setPlans(res.data);
        } catch (e) {
            showToast('Failed to load plans', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleUpgradeRequest = async (plan: any) => {
        setSubmitting(true);
        try {
            await apiClient.post('/billing/request-upgrade', {
                planId: plan.id,
                billingCycle: billingCycle
            });
            showToast(`Upgrade request for ${plan.name} (${billingCycle.toLowerCase()}) submitted successfully!`, 'success');

            const userRes = await apiClient.get('/auth/me');
            setUser(userRes.data);
        } catch (e: any) {
            showToast(e.response?.data?.error || 'Failed to submit upgrade request', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCustomRequest = async () => {
        setSubmitting(true);
        try {
            await apiClient.post('/billing/request-upgrade', { planId: null });
            showToast('Custom plan request submitted successfully!', 'success');

            const userRes = await apiClient.get('/auth/me');
            setUser(userRes.data);
        } catch (e: any) {
            showToast(e.response?.data?.error || 'Failed to submit request', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-500 m-0">Loading subscription plans...</p>
            </div>
        );
    }

    return (
        <div className="pb-20 font-sans text-slate-800 animate-in fade-in duration-500 w-full min-w-0">
            {/* Title Banner */}
            <div className="text-center max-w-3xl mx-auto mb-12 pt-6">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight m-0 mb-3">
                    Choose the Right Plan for Your Business
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed m-0 mb-8">
                    Unlock advanced features, higher limits, and dedicated support to scale your customer engagement.
                </p>

                {/* Billing Cycle Toggle */}
                <div className="inline-flex items-center p-1.5 bg-slate-100/80 border border-slate-200/80 rounded-2xl shadow-2xs mx-auto">
                    <button
                        onClick={() => setBillingCycle('MONTHLY')}
                        className={cn(
                            "px-5 py-2.5 rounded-xl text-xs font-semibold transition-all select-none m-0 cursor-pointer",
                            billingCycle === 'MONTHLY' ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        Monthly Billing
                    </button>
                    <button
                        onClick={() => setBillingCycle('YEARLY')}
                        className={cn(
                            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all select-none m-0 cursor-pointer",
                            billingCycle === 'YEARLY' ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
                        )}
                    >
                        <span>Yearly Billing</span>
                        <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs">
                            20% OFF
                        </span>
                    </button>
                </div>
            </div>

            {/* Plans Grid */}
            <div className={cn(
                "grid gap-8 justify-center mx-auto w-full",
                plans.length === 1 ? "grid-cols-1 max-w-md" :
                plans.length === 2 ? "grid-cols-1 md:grid-cols-2 max-w-4xl" :
                "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-7xl"
            )}>
                {plans.map((plan) => {
                    const isCurrent = plan.id === user?.planId || (user?.plan?.name && plan.name === user?.plan?.name);
                    const isYearly = billingCycle === 'YEARLY';
                    const displayPrice = isYearly ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
                    const isUpgrade = isYearly || (plan.monthlyPrice > (user?.plan?.monthlyPrice || 0));
                    const isPending = user?.upgradeRequests?.some((r: any) => r.planId === plan.id && r.billingCycle === billingCycle);

                    return (
                        <div
                            key={plan.id}
                            className={cn(
                                "relative bg-white rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 border hover:shadow-lg",
                                isCurrent ? "border-primary shadow-md ring-2 ring-primary/20" : "border-slate-200/80 shadow-xs"
                            )}
                        >
                            {isCurrent && (
                                <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
                                    Current Plan
                                </div>
                            )}

                            <div>
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-slate-900 m-0 mb-1.5">{plan.name}</h3>
                                    <p className="text-xs text-slate-500 line-clamp-2 h-10 leading-relaxed m-0">
                                        {plan.description || "The perfect starting point for growing businesses."}
                                    </p>
                                </div>

                                <div className="mb-6">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-bold text-slate-900 tracking-tight">
                                            ₹{displayPrice.toLocaleString()}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-400">/month</span>
                                    </div>
                                    {isYearly && (
                                        <div className="text-xs font-semibold text-primary mt-1">
                                            Billed annually at ₹{plan.yearlyPrice.toLocaleString()}
                                        </div>
                                    )}
                                </div>

                                <hr className="border-slate-100 mb-6" />

                                {/* Features List */}
                                <ul className="space-y-3.5 mb-8 m-0 p-0 list-none">
                                    <li className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                                        <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                            <Users className="w-3 h-3" />
                                        </div>
                                        <span>{plan.subUsersLimit} Support Agents</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                                        <div className="w-5 h-5 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                            <LinkIcon className="w-3 h-3" />
                                        </div>
                                        {plan.pricePerLinkMonthly > 0 || plan.pricePerLinkYearly > 0 ? (
                                            <span>Unlimited Links (+₹{isYearly ? plan.pricePerLinkYearly?.toLocaleString() : plan.pricePerLinkMonthly?.toLocaleString()}/link)</span>
                                        ) : (
                                            <span>{plan.linksLimit} Dynamic Links</span>
                                        )}
                                    </li>
                                    <li className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                                        <div className="w-5 h-5 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                                            <MessageCircle className="w-3 h-3" />
                                        </div>
                                        <span>WhatsApp Redirection</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                                        <div className="w-5 h-5 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                            <Rocket className="w-3 h-3" />
                                        </div>
                                        <span>Priority Performance</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-xs text-slate-700 font-medium">
                                        <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                            <Check className="w-3 h-3" />
                                        </div>
                                        <span>Full Analytics Suite</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Action Button */}
                            <div>
                                {isCurrent && user?.billingCycle === billingCycle ? (
                                    <button 
                                        disabled 
                                        className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-semibold shadow-2xs cursor-default"
                                    >
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Active Plan
                                    </button>
                                ) : (
                                    <button
                                        disabled={submitting || isPending}
                                        onClick={() => handleUpgradeRequest(plan)}
                                        className={cn(
                                            "w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer",
                                            isUpgrade 
                                                ? "bg-primary hover:bg-primary-hover text-white" 
                                                : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                                        )}
                                    >
                                        {isPending ? (
                                            "Request Pending"
                                        ) : isCurrent && user?.billingCycle !== billingCycle ? (
                                            `Switch to ${billingCycle.toLowerCase()}`
                                        ) : (
                                            <><span>Upgrade to {plan.name}</span> <ArrowRight className="w-3.5 h-3.5 ml-1" /></>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Custom Plan Section */}
            <div className="mt-16 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-blue-500/10 p-8 sm:p-12 rounded-3xl border border-primary/20 shadow-md text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="relative z-10 max-w-2xl mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center mx-auto mb-5 shadow-md shadow-primary/30">
                        <Zap className="w-7 h-7" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 m-0 mb-3 tracking-tight">
                        Need Something Custom?
                    </h2>
                    <p className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed m-0 mb-8">
                        If our standard plans don't fit your needs, we can create a custom enterprise solution tailored exactly to your scale and operational requirements.
                    </p>
                    <button
                        disabled={submitting || user?.upgradeRequests?.some((r: any) => r.planId === null)}
                        onClick={handleCustomRequest}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl shadow-xs transition-all text-xs w-full sm:w-auto disabled:opacity-50 cursor-pointer"
                    >
                        <Rocket className="w-4 h-4" />
                        <span>
                            {user?.upgradeRequests?.some((r: any) => r.planId === null)
                                ? 'Custom Plan Request Pending'
                                : 'Request Custom Enterprise Plan'}
                        </span>
                    </button>
                </div>
            </div>

            {toast && (
                <div className="fixed bottom-5 right-5 z-[300] flex items-center gap-3 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-xl animate-in slide-in-from-bottom-4 duration-300">
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

export default Plans;
