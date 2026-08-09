import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { APP_NAME } from '../constants/brand';
import { Plug, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const ResetPassword: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') || '';
    const email = searchParams.get('email') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Toast Notification State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
    const showToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setToast({ message: msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password || !confirmPassword) {
            showToast('Please fill in all fields', 'warning');
            return;
        }

        if (password.length < 6) {
            showToast('Password must be at least 6 characters long', 'warning');
            return;
        }

        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        setLoading(true);
        try {
            await apiClient.post('/auth/reset-password', {
                username: email,
                token: token,
                newPassword: password
            });
            showToast('Password reset successfully!', 'success');
            setTimeout(() => {
                navigate('/auth');
            }, 1500);
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Failed to reset password', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white font-sans selection:bg-primary/30 text-slate-800">
            {/* Form Side */}
            <div className="w-full lg:w-1/2 flex flex-col p-8 sm:p-12 md:p-20 justify-center relative z-10 animate-in fade-in slide-in-from-left-4 duration-700">
                <div className="max-w-sm w-full mx-auto flex flex-col h-full justify-center">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
                            <Plug className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight m-0">{APP_NAME}</h1>
                    </div>

                    {/* Heading */}
                    <div className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 m-0 mb-2 tracking-tight">Reset Password</h2>
                        <p className="text-xs font-semibold text-slate-500 m-0">
                            Create a new password for your account.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={onSubmit} className="space-y-4 text-xs">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    required
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer flex items-center justify-center"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    required
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer flex items-center justify-center"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-6 cursor-pointer"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Reset password</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="pt-12 text-center">
                        <p className="text-xs font-medium text-slate-500 m-0">
                            Remember your password? <button onClick={() => navigate('/auth')} className="font-bold text-slate-900 hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0">Sign in</button>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Visual */}
            <div className="hidden lg:flex w-1/2 bg-slate-50 relative overflow-hidden items-center justify-center p-12">
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at center, #000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />
                
                <div className="relative z-10 max-w-md text-center">
                    <h3 className="text-3xl font-extrabold text-slate-900 mb-4">Secure Password Reset</h3>
                    <p className="text-sm font-semibold text-slate-500">
                        Choose a strong password containing at least 6 characters. Once reset, you will be redirected back to sign in to your workspace.
                    </p>
                </div>
            </div>

            {/* Toast Box */}
            {toast && (
                <div className={cn(
                    "fixed bottom-5 right-5 px-4 py-3 rounded-xl shadow-xl text-white text-xs font-bold z-[999] animate-in fade-in slide-in-from-bottom-5 duration-300",
                    toast.type === 'success' && "bg-emerald-600",
                    toast.type === 'error' && "bg-rose-600",
                    toast.type === 'warning' && "bg-amber-600",
                    toast.type === 'info' && "bg-blue-600"
                )}>
                    {toast.message}
                </div>
            )}
        </div>
    );
};

export default ResetPassword;
