import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';
import { message } from 'antd';
import { Camera, UploadCloud, Trash2, Lock, User, Save, Info, Shield, Key, Bell, CreditCard, Laptop } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const Settings: React.FC = () => {
    const { user, setUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [logoBase64, setLogoBase64] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
    
    const [formData, setFormData] = useState({ name: '', password: '' });

    useEffect(() => {
        if (user) {
            setLogoBase64(user.logoUrl || null);
            setFormData({ name: user.name || '', password: '' });
        }
    }, [user]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload: any = {
                name: formData.name,
                logoUrl: logoBase64,
            };
            if (formData.password) {
                payload.password = formData.password;
            }
            const res = await apiClient.put('/auth/update-me', payload);
            setUser({ ...user, ...res.data });
            message.success('Account settings updated successfully');
            setFormData(prev => ({ ...prev, password: '' }));
        } catch (e: any) {
            message.error(e.response?.data?.error || 'Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size / 1024 / 1024 > 5) {
            message.error('Image must be smaller than 5MB!');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(file);

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <User className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900 m-0 tracking-tight">Workspace & Account Settings</h1>
                </div>
                <p className="text-sm text-slate-500 m-0">Manage your profile credentials, security preferences, and organization settings.</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-200/80 rounded-2xl mb-8 w-full max-w-md border border-slate-300/50 shadow-2xs">
                {[
                    { id: 'profile', label: 'My Profile', icon: User },
                    { id: 'security', label: 'Security', icon: Shield },
                    { id: 'preferences', label: 'Preferences', icon: Laptop },
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id as any)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-extrabold transition-all cursor-pointer",
                            activeTab === t.id ? "bg-white text-slate-900 shadow-sm font-black" : "text-slate-600 hover:text-slate-900"
                        )}
                    >
                        <t.icon className={cn("w-4 h-4", activeTab === t.id ? "text-primary" : "text-slate-500")} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Hidden Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
            />

            {/* Tab Contents */}
            {activeTab === 'profile' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-slate-100">
                            <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
                                {logoBase64 ? (
                                    <img 
                                        src={logoBase64} 
                                        alt="Avatar" 
                                        className="w-28 h-28 rounded-3xl object-cover border-4 border-white shadow-xl shadow-slate-200 group-hover:opacity-80 transition-opacity" 
                                    />
                                ) : (
                                    <div className="w-28 h-28 rounded-3xl bg-slate-100 border-4 border-white shadow-xl shadow-slate-200 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                                        <User className="w-12 h-12 text-slate-400" />
                                    </div>
                                )}
                                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-2xl border-2 border-white flex items-center justify-center text-white shadow-lg transform group-hover:scale-110 transition-transform">
                                    <Camera className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="text-center sm:text-left">
                                <h3 className="text-xl font-extrabold text-slate-900 m-0">{user?.name || user?.username}</h3>
                                <p className="text-sm font-bold text-slate-400 m-0 mt-0.5">@{user?.username}</p>
                                <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
                                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-extrabold rounded-lg border border-primary/20">
                                        {user?.role}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <form id="profile-form" onSubmit={handleUpdate} className="space-y-6 pt-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">Display Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Your Name or Brand"
                                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:text-slate-400"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">Username Handle</label>
                                    <input
                                        type="text"
                                        disabled
                                        value={user?.username || ''}
                                        className="w-full px-4 py-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">Profile Avatar Image</label>
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full border-2 border-dashed border-slate-200/80 rounded-3xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group bg-slate-50/50"
                                >
                                    <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3 group-hover:text-primary transition-colors" />
                                    <p className="text-sm font-bold text-slate-700 m-0 group-hover:text-primary">Click to upload photo</p>
                                    <p className="text-xs font-medium text-slate-400 m-0 mt-1">Supports PNG, JPG, GIF up to 5MB</p>
                                </div>
                                {logoBase64 && (
                                    <div className="flex items-center justify-between mt-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <img src={logoBase64} alt="preview" className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs" />
                                            <span className="text-xs font-bold text-slate-600">Custom Profile Picture</span>
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setLogoBase64(null)}
                                            className="text-xs font-extrabold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 px-4 py-2 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                                        >
                                            <Trash2 className="w-4 h-4" /> Remove Photo
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-slate-100 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-2xl text-sm font-extrabold shadow-lg shadow-primary/20 transition-all flex items-center gap-2 hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                                    style={{ color: '#ffffff' }}
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" /> Save Profile Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-slate-100/80 border border-slate-200/80 rounded-3xl p-6 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                                <Info className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-extrabold text-slate-900 m-0 mb-0.5">Workspace Account Status</h4>
                                <p className="text-xs font-medium text-slate-500 m-0">Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '2026'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-600 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs">
                            Role: <span className="text-primary font-black uppercase">{user?.role}</span>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'security' && (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm space-y-8 animate-in fade-in duration-300">
                    <div>
                        <h3 className="text-lg font-extrabold text-slate-900 m-0 mb-1">Password Credentials</h3>
                        <p className="text-sm text-slate-500 m-0">Ensure your account is using a long, secure password to stay protected.</p>
                    </div>

                    <form onSubmit={handleUpdate} className="space-y-6">
                        <div className="max-w-md space-y-2">
                            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="Enter new strong password"
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:text-slate-400"
                                />
                            </div>
                            {formData.password && formData.password.length < 6 && (
                                <p className="text-xs font-bold text-rose-500 mt-1">Password must be at least 6 characters</p>
                            )}
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                            <button
                                type="submit"
                                disabled={loading || (!!formData.password && formData.password.length < 6)}
                                className="px-8 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-2xl text-sm font-extrabold shadow-lg shadow-primary/20 transition-all flex items-center gap-2 hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
                                style={{ color: '#ffffff' }}
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Key className="w-4 h-4" /> Update Password
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'preferences' && (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm space-y-8 animate-in fade-in duration-300">
                    <div>
                        <h3 className="text-lg font-extrabold text-slate-900 m-0 mb-1">Notification & UI Preferences</h3>
                        <p className="text-sm text-slate-500 m-0">Customize how DoConnect behaves and delivers alert notifications.</p>
                    </div>

                    <div className="space-y-6">
                        {[
                            { title: 'Email Notifications', desc: 'Receive daily digests and lead alerts directly to your registered email.', active: true },
                            { title: 'Desktop Push Alerts', desc: 'Notify instantly in browser when a visitor initiates a live web chat.', active: true },
                            { title: 'Weekly Analytics Reports', desc: 'Send automated summary reports of conversions and booking trends.', active: false },
                        ].map((pref, i) => (
                            <div key={i} className="flex items-start justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50/80 gap-4">
                                <div>
                                    <h4 className="text-sm font-extrabold text-slate-900 m-0 mb-1">{pref.title}</h4>
                                    <p className="text-xs text-slate-500 m-0 leading-relaxed">{pref.desc}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => message.success('Preferences saved')}
                                    className={cn(
                                        "w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer border",
                                        pref.active ? "bg-primary border-primary/20" : "bg-slate-200 border-slate-300"
                                    )}
                                >
                                    <div className={cn(
                                        "w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform",
                                        pref.active ? "right-0.5" : "left-0.5"
                                    )} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;
