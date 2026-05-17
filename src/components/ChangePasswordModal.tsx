import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export const ChangePasswordModal: React.FC = () => {
    const { user, setUser } = useAuth();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Toast Notification State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
    const showToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setToast({ message: msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    if (!user || (!user.isFirstLogin && !user.mustChangePassword)) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) return showToast('Password must be at least 6 characters', 'error');

        setLoading(true);
        try {
            await apiClient.post('/auth/change-password', { newPassword: password });
            showToast('Password updated successfully', 'success');
            setTimeout(() => {
                setUser({ ...user, isFirstLogin: false, mustChangePassword: false });
            }, 1000);
        } catch (e: any) {
            showToast(e.response?.data?.error || 'Failed to update password', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 font-sans text-slate-800">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-300" />

            {/* Modal Content */}
            <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 text-xs">
                {/* Visual Header */}
                <div className="h-20 bg-primary/10 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />
                    <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center z-10 border border-slate-100 shadow-2xs">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-slate-900 m-0 mb-1 tracking-tight">Secure Your Account</h2>
                        <p className="text-xs font-semibold text-slate-500 m-0">
                            Please set a new, secure password to continue accessing your workspace.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    required
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Minimum 6 characters"
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || password.length < 6}
                            className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-4 cursor-pointer"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Confirm & Continue</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
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
