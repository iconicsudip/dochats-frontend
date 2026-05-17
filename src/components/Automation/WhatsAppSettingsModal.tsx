import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface WhatsAppSettingsModalProps {
    open: boolean;
    saving: boolean;
    initialValues: any;
    onCancel: () => void;
    onFinish: (vals: any) => void;
}

const WhatsAppSettingsModal: React.FC<WhatsAppSettingsModalProps> = ({
    open, saving, initialValues, onCancel, onFinish
}) => {
    const [formData, setFormData] = useState({
        apiKey: '',
        phoneNumberId: '',
        businessAccountId: ''
    });

    useEffect(() => {
        if (open && initialValues) {
            setFormData({
                apiKey: initialValues.apiKey || '',
                phoneNumberId: initialValues.phoneNumberId || '',
                businessAccountId: initialValues.businessAccountId || ''
            });
        }
    }, [open, initialValues]);

    if (!open) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onFinish(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-900">WhatsApp Settings</h2>
                    <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Meta Access Token *</label>
                        <input 
                            required 
                            type="password"
                            value={formData.apiKey}
                            onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number ID *</label>
                        <input 
                            required 
                            type="text"
                            value={formData.phoneNumberId}
                            onChange={(e) => setFormData({...formData, phoneNumberId: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Business Account ID *</label>
                        <input 
                            required 
                            type="text"
                            value={formData.businessAccountId}
                            onChange={(e) => setFormData({...formData, businessAccountId: e.target.value})}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" 
                        />
                    </div>
                    
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                        <button 
                            type="button" 
                            onClick={onCancel} 
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all disabled:opacity-50"
                        >
                            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Config
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WhatsAppSettingsModal;
