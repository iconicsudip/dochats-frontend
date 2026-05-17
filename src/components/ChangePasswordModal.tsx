import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';
import { message } from 'antd';
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

    if (!user || (!user.isFirstLogin && !user.mustChangePassword)) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) return message.error('Password must be at least 6 characters');

        setLoading(true);
        try {
            await apiClient.post('/auth/change-password', { newPassword: password });
            message.success('Password updated successfully');
            setUser({ ...user, isFirstLogin: false, mustChangePassword: false });
        } catch (e: any) {
            message.error(e.response?.data?.error || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" />

            {/* Modal Content */}
            <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Visual Header */}
                <div className="h-24 bg-primary/10 relative overflow-hidden flex items-center justify-center">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3" />
                    <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center z-10 border border-slate-100">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                    </div>
                </div>

                <div className="p-6 md:p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-extrabold text-slate-900 mb-1">Secure Your Account</h2>
                        <p className="text-sm font-medium text-slate-500">
                            Please set a new, secure password to continue accessing your workspace.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    required
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Minimum 6 characters"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || password.length < 6}
                            className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Confirm & Continue
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
