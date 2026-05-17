import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';
import { message } from 'antd';
import { Camera, X, UploadCloud, Trash2, Lock, User, Save, Info } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface ProfileDrawerProps {
    open: boolean;
    onClose: () => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ open, onClose }) => {
    const { user, setUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [logoBase64, setLogoBase64] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [formData, setFormData] = useState({ name: '', password: '' });

    useEffect(() => {
        if (open && user) {
            setLogoBase64(user.logoUrl || null);
            setFormData({ name: user.name || '', password: '' });
        }
    }, [open, user]);

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
            message.success('Profile updated successfully');
            setFormData(prev => ({ ...prev, password: '' }));
            onClose();
        } catch (e: any) {
            message.error(e.response?.data?.error || 'Failed to update profile');
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

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="w-full max-w-md h-full bg-white shadow-2xl relative z-10 flex flex-col animate-in slide-in-from-right duration-300 transform transition-transform">
                
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                />

                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-lg font-extrabold text-slate-900">My Profile</h2>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-6">
                        
                        {/* Avatar Header */}
                        <div className="flex flex-col items-center mb-8">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                {logoBase64 ? (
                                    <img 
                                        src={logoBase64} 
                                        alt="Avatar" 
                                        className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg shadow-slate-200/50 group-hover:opacity-80 transition-opacity" 
                                    />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-lg shadow-slate-200/50 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                                        <User className="w-10 h-10 text-slate-400" />
                                    </div>
                                )}
                                <div className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full border-2 border-white flex items-center justify-center text-white shadow-md transform group-hover:scale-110 transition-transform">
                                    <Camera className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="mt-4 text-center">
                                <h3 className="text-lg font-bold text-slate-900">{user?.name || user?.username}</h3>
                                <p className="text-sm font-medium text-slate-500">@{user?.username}</p>
                            </div>
                        </div>

                        <hr className="border-slate-100 mb-8" />

                        {/* Form */}
                        <form id="profile-form" onSubmit={handleUpdate} className="space-y-6">
                            
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Display Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Your Name or Brand"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-slate-400"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Profile Photo</label>
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
                                >
                                    <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2 group-hover:text-primary transition-colors" />
                                    <p className="text-sm font-medium text-slate-600 group-hover:text-primary">Click to upload photo</p>
                                    <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 5MB</p>
                                </div>
                                {logoBase64 && (
                                    <div className="flex items-center gap-4 mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <img src={logoBase64} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm" />
                                        <button 
                                            type="button"
                                            onClick={() => setLogoBase64(null)}
                                            className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Remove Photo
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Change Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Leave blank to keep current"
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-slate-400"
                                    />
                                </div>
                                {formData.password && formData.password.length < 6 && (
                                    <p className="text-[10px] font-medium text-red-500 mt-1">Password must be at least 6 characters</p>
                                )}
                            </div>
                        </form>

                        {/* Account Details Footer */}
                        <div className="mt-10 p-5 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                                <Info className="w-4 h-4" /> Account Details
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-slate-500">System Role</span>
                                    <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">{user?.role}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-slate-500">Member Since</span>
                                    <span className="font-bold text-slate-900">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-white shrink-0">
                    <button
                        form="profile-form"
                        type="submit"
                        disabled={loading || (!!formData.password && formData.password.length < 6)}
                        className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> Save Profile Changes
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};
