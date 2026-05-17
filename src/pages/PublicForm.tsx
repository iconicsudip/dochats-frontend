import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { formsApi } from '../api/forms';
import { CheckCircle2, Loader2, AlertCircle, X } from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const PublicForm: React.FC = () => {
    const { id } = useParams();
    const [form, setForm] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchParams] = useSearchParams();
    const isEmbed = searchParams.get('embed') === 'true';

    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Custom Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        if (id) {
            fetchForm();
        }
    }, [id]);

    const fetchForm = async () => {
        try {
            const res = await formsApi.getForm(id!);
            setForm(res.data);
            
            // Initialize form data
            const initialData: Record<string, any> = {};
            res.data.fields.forEach((field: any) => {
                initialData[field.label] = '';
            });
            setFormData(initialData);
        } catch (e: any) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const validateField = (field: any, value: any) => {
        if (field.required && !value) {
            return `${field.label} is required`;
        }

        if (value && field.validation) {
            if (field.validation.min && value.length < field.validation.min) {
                return `${field.label} must be at least ${field.validation.min} characters`;
            }
            if (field.validation.max && value.length > field.validation.max) {
                return `${field.label} cannot exceed ${field.validation.max} characters`;
            }
            if (field.validation.pattern) {
                const regex = new RegExp(field.validation.pattern);
                if (!regex.test(value)) {
                    return field.validation.patternMessage || `${field.label} is invalid`;
                }
            }
        }

        if (field.type === 'tel' && value && !field.validation?.pattern) {
            if (!/^\d{10}$/.test(value)) {
                return 'Please enter a valid 10-digit phone number';
            }
        }

        return '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate all
        let hasErrors = false;
        const newErrors: Record<string, string> = {};
        
        form.fields.forEach((field: any) => {
            const error = validateField(field, formData[field.label]);
            if (error) {
                newErrors[field.label] = error;
                hasErrors = true;
            }
        });

        if (hasErrors) {
            setErrors(newErrors);
            return;
        }

        setSubmitting(true);
        try {
            await formsApi.submitResponse(id!, formData);
            setSubmitted(true);
            showToast('Form submitted successfully!', 'success');
            
            // Notify parent window if embedded
            if (isEmbed) {
                window.parent.postMessage({ type: 'LEAD_CAPTURE_SUCCESS' }, '*');
            }
        } catch (e) {
            showToast('Failed to submit form. Please try again.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className={cn("flex items-center justify-center min-h-screen", isEmbed ? "bg-transparent" : "bg-slate-50")}>
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
        );
    }

    if (!form) {
        return (
            <div className={cn("flex flex-col items-center justify-center min-h-screen text-center p-6", isEmbed ? "bg-transparent" : "bg-slate-50")}>
                <AlertCircle className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Form Not Found</h2>
                <p className="text-slate-500 max-w-sm">The form you are looking for does not exist or has been removed.</p>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className={cn("flex items-center justify-center min-h-screen p-6", isEmbed ? "bg-transparent" : "bg-slate-50")}>
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-10 max-w-md w-full text-center animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3">Thank You!</h2>
                    <p className="text-slate-500 mb-8">
                        Your response has been successfully submitted to <strong className="text-slate-700">{form.owner.name}</strong>.
                    </p>
                    <button 
                        onClick={() => {
                            setSubmitted(false);
                            setFormData({});
                        }}
                        className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold shadow-md shadow-primary/20 transition-all"
                    >
                        Submit Another Response
                    </button>
                </div>
            </div>
        );
    }

    // Dynamic styling based on form design settings
    const primaryColor = form?.design?.primaryColor || '#2563eb';
    const bgColor = form?.design?.backgroundColor || (isEmbed ? 'transparent' : '#f8fafc');
    const textColor = form?.design?.textColor || '#0f172a';

    const renderInput = (field: any) => {
        const value = formData[field.label] || '';
        const error = errors[field.label];
        const hasError = !!error;

        const baseInputClasses = cn(
            "w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all",
            hasError 
                ? "bg-red-50 border border-red-200 text-red-900 focus:ring-red-500/20" 
                : "bg-white border border-slate-200 focus:ring-primary/20"
        );

        switch (field.type) {
            case 'textarea':
                return (
                    <textarea 
                        className={cn(baseInputClasses, "min-h-[100px] resize-y")}
                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                        value={value}
                        onChange={e => {
                            setFormData({...formData, [field.label]: e.target.value});
                            if (error) setErrors({...errors, [field.label]: ''});
                        }}
                        style={{ borderColor: !hasError ? undefined : '' }}
                    />
                );
            case 'select':
                return (
                    <select 
                        className={cn(baseInputClasses, "appearance-none")}
                        value={value}
                        onChange={e => {
                            setFormData({...formData, [field.label]: e.target.value});
                            if (error) setErrors({...errors, [field.label]: ''});
                        }}
                    >
                        <option value="">Select {field.label.toLowerCase()}...</option>
                        {field.options?.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            case 'tel':
                return (
                    <div className="flex">
                        <span className="inline-flex items-center px-4 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-500 text-sm font-medium">
                            +91
                        </span>
                        <input 
                            type="tel"
                            maxLength={10}
                            className={cn(baseInputClasses, "rounded-l-none")}
                            placeholder="Enter 10 digit number"
                            value={value}
                            onChange={e => {
                                setFormData({...formData, [field.label]: e.target.value.replace(/\D/g, '')});
                                if (error) setErrors({...errors, [field.label]: ''});
                            }}
                        />
                    </div>
                );
            case 'date':
                return (
                    <input 
                        type="date"
                        className={baseInputClasses}
                        value={value}
                        onChange={e => {
                            setFormData({...formData, [field.label]: e.target.value});
                            if (error) setErrors({...errors, [field.label]: ''});
                        }}
                    />
                );
            default:
                return (
                    <input 
                        type={field.type}
                        className={baseInputClasses}
                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                        value={value}
                        onChange={e => {
                            setFormData({...formData, [field.label]: e.target.value});
                            if (error) setErrors({...errors, [field.label]: ''});
                        }}
                    />
                );
        }
    };

    return (
        <div 
            className="min-h-screen" 
            style={{ 
                backgroundColor: bgColor,
                padding: isEmbed ? '1rem' : '3rem 1rem'
            }}
        >
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans">
                {/* Custom Toast Notification */}
                {toast && (
                    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 text-white shadow-xl text-sm font-medium animate-in slide-in-from-bottom-4 duration-200">
                        <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : toast.type === 'error' ? 'bg-red-400' : 'bg-blue-400'}`} />
                        <span>{toast.message}</span>
                        <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className={cn("text-center mb-8", isEmbed ? "mb-6" : "mb-10")}>
                    {form.owner?.logoUrl && (
                        <img src={form.owner.logoUrl} alt={form.owner.name} className="h-16 mx-auto mb-5 rounded-lg shadow-sm" />
                    )}
                    <h1 className="text-2xl font-bold tracking-tight mb-3" style={{ color: textColor }}>
                        {form.title}
                    </h1>
                    {form.description && (
                        <p className="text-sm opacity-80" style={{ color: textColor }}>
                            {form.description}
                        </p>
                    )}
                </div>

                <div 
                    className={cn(
                        "bg-white rounded-3xl", 
                        isEmbed ? "shadow-none border-none bg-transparent" : "shadow-xl border border-slate-100 p-8 md:p-10"
                    )}
                >
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {form.fields.map((field: any) => (
                            <div key={field.id} className="space-y-2">
                                <label className="flex items-center text-xs font-semibold" style={{ color: textColor }}>
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                
                                {renderInput(field)}
                                
                                {errors[field.label] && (
                                    <p className="text-xs font-bold text-red-500 mt-1.5 animate-in slide-in-from-top-1">
                                        {errors[field.label]}
                                    </p>
                                )}
                            </div>
                        ))}

                        <div className="pt-6 mt-8 border-t border-slate-100">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full flex items-center justify-center py-3.5 rounded-xl text-white font-semibold text-sm shadow-lg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 cursor-pointer"
                                style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px -5px ${primaryColor}40` }}
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Response'}
                            </button>
                        </div>
                    </form>
                </div>

                {!isEmbed && (
                    <div className="text-center mt-12 text-sm text-slate-500">
                        Powered by <strong className="text-slate-800 tracking-tight">DoConnect Business OS</strong>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicForm;
