import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';
import { Role } from '../enums';
import { Plug, User, Lock, ArrowRight, ShieldCheck, Zap, Globe, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const Auth: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);

    // Toast Notification State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
    const showToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setToast({ message: msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const onFinish = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await apiClient.post('/auth/login', formData);
            login(res.data.token, res.data.user);
            showToast(`Welcome back, ${res.data.user.username}!`, 'success');

            setTimeout(() => {
                if (res.data.user.role === Role.SUB_USER) {
                    navigate('/dashboard/chat');
                } else {
                    navigate('/dashboard');
                }
            }, 800);
        } catch (err: any) {
            showToast(err.response?.data?.error || 'Authentication failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-white font-sans selection:bg-primary/30 text-slate-800">
            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 flex flex-col p-8 sm:p-12 md:p-20 justify-center relative z-10 animate-in fade-in slide-in-from-left-4 duration-700">
                <div className="max-w-sm w-full mx-auto flex flex-col h-full justify-center">
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
                            <Plug className="w-5 h-5 text-white" strokeWidth={2.5} />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight m-0">DoConnect</h1>
                    </div>

                    {/* Heading */}
                    <div className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 m-0 mb-2 tracking-tight">Welcome back</h2>
                        <p className="text-xs font-semibold text-slate-500 m-0">
                            Enter your credentials to access your workspace.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={onFinish} className="space-y-4 text-xs">
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Username</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    required
                                    type="text"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="Enter your username"
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                                <a href="#" className="text-xs font-bold text-primary hover:text-primary-hover transition-colors">Forgot password?</a>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    required
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
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

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-6 cursor-pointer"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span>Sign in to workspace</span>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="pt-12 text-center">
                        <p className="text-xs font-medium text-slate-500 m-0">
                            Don't have an account? <a href="#" className="font-bold text-slate-900 hover:text-primary transition-colors">Contact sales</a>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side - Visual */}
            <div className="hidden lg:flex w-1/2 bg-slate-50 relative overflow-hidden items-center justify-center p-12">
                {/* Abstract Pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at center, #000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />

                {/* Content */}
                <div className="relative z-10 max-w-lg w-full">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md flex flex-col gap-3 transform -rotate-1 hover:rotate-0 transition-transform duration-500 animate-in fade-in slide-in-from-right-8 delay-150">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <Zap className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 m-0 mb-1">Unified Intelligence</h3>
                                <p className="text-xs text-slate-500 m-0 leading-relaxed">Centralize your CRM, smart links, and automated chats in one powerful operating system.</p>
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md flex flex-col gap-3 transform rotate-2 hover:rotate-0 transition-transform duration-500 animate-in fade-in slide-in-from-right-8 delay-300">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 m-0 mb-1">Enterprise Grade</h3>
                                <p className="text-xs text-slate-500 m-0 leading-relaxed">Bank-level security and reliable infrastructure.</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md flex flex-col gap-3 transform -rotate-2 hover:rotate-0 transition-transform duration-500 animate-in fade-in slide-in-from-right-8 delay-500">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 m-0 mb-1">Global Reach</h3>
                                <p className="text-xs text-slate-500 m-0 leading-relaxed">Connect with customers anywhere, effortlessly.</p>
                            </div>
                        </div>
                    </div>
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

export default Auth;
