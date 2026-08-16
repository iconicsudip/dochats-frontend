import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { formsApi } from '../api/forms';
import { CheckCircle2, Loader2, AlertCircle, X, Heart, Star, Calendar as CalendarIcon, Home, Smile, ArrowRight, ArrowLeft, Upload, Trash2, Check, FileText, ChevronDown, Search } from 'lucide-react';
import { Calendar, DatePicker, ConfigProvider } from 'antd';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { APP_NAME } from '../constants/brand';

type StepDef = { id: string; title: string; description: string; dependsOnFieldId?: string; showWhenValue?: string };

const { RangePicker } = DatePicker;

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const getColSpanClass = (span?: number) => {
    switch (span) {
        case 2: return 'col-span-12 md:col-span-2';
        case 3: return 'col-span-12 md:col-span-3';
        case 4: return 'col-span-12 md:col-span-4';
        case 6: return 'col-span-12 md:col-span-6';
        case 8: return 'col-span-12 md:col-span-8';
        case 9: return 'col-span-12 md:col-span-9';
        default: return 'col-span-12';
    }
};

interface PublicFormProps {
    previewData?: any;
    onClosePreview?: () => void;
}

const PublicForm: React.FC<PublicFormProps> = ({ previewData, onClosePreview }) => {
    const { id } = useParams();
    const [form, setForm] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchParams] = useSearchParams();
    const isEmbed = searchParams.get('embed') === 'true';
    const customWidth = searchParams.get('width');

    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    // Custom Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        if (previewData) {
            setForm(previewData);
            
            // Initialize form data
            const initialData: Record<string, any> = {};
            previewData.fields.forEach((field: any) => {
                if (field.type === 'image') {
                    initialData[field.label] = [];
                } else {
                    initialData[field.label] = '';
                }
            });
            setFormData(initialData);
            setLoading(false);
        } else if (id) {
            fetchForm();
        }
    }, [id, previewData]);

    const fetchForm = async () => {
        try {
            const res = await formsApi.getForm(id!);
            setForm(res.data);
            
            // Initialize form data
            const initialData: Record<string, any> = {};
            res.data.fields.forEach((field: any) => {
                if (field.type === 'image') {
                    initialData[field.label] = [];
                } else {
                    initialData[field.label] = '';
                }
            });
            setFormData(initialData);
        } catch (e: any) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const validateField = (field: any, value: any) => {
        if (field.required) {
            if (field.type === 'image') {
                if (!value || !Array.isArray(value) || value.length === 0) {
                    return `${field.label} is required`;
                }
            } else if (!value) {
                return `${field.label} is required`;
            }
        }

        if (value && field.validation && field.type !== 'image') {
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
            const cleanPhone = value.toString().replace(/\s/g, '').replace(/^\+91/, '');
            if (!/^\d{10}$/.test(cleanPhone)) {
                return 'Please enter a valid 10-digit phone number';
            }
        }

        return '';
    };

    const validateStepFields = (stepId: string) => {
        let hasErrors = false;
        const newErrors: Record<string, string> = {};
        
        const stepFields = form.fields.filter((field: any) => {
            const fStepId = field.stepId || (steps[0] ? steps[0].id : '');
            return fStepId === stepId;
        });

        stepFields.forEach((field: any) => {
            const error = validateField(field, formData[field.label]);
            if (error) {
                newErrors[field.label] = error;
                hasErrors = true;
            }
        });

        if (hasErrors) {
            setErrors(prev => ({ ...prev, ...newErrors }));
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (isMultistep) {
            const allSteps = form?.design?.steps || [];
            const currentStep = allSteps[currentStepIndex];
            const isValid = validateStepFields(currentStep.id);
            if (!isValid) {
                showToast('Please fill out all required fields correctly.', 'error');
                return;
            }
            // Find next visible step index
            let nextIdx = currentStepIndex + 1;
            while (nextIdx < allSteps.length) {
                const nextStep = allSteps[nextIdx];
                const depField = nextStep.dependsOnFieldId
                    ? form.fields.find((f: any) => f.id === nextStep.dependsOnFieldId)
                    : null;
                const isVisible = !depField || !nextStep.showWhenValue ||
                    formData[depField.label] === nextStep.showWhenValue;
                if (isVisible) break;
                nextIdx++;
            }
            if (nextIdx < allSteps.length) {
                setCurrentStepIndex(nextIdx);
            }
        }
    };

    const handleBack = () => {
        const allSteps = form?.design?.steps || [];
        // Find previous visible step index
        let prevIdx = currentStepIndex - 1;
        while (prevIdx >= 0) {
            const prevStep = allSteps[prevIdx];
            const depField = prevStep.dependsOnFieldId
                ? form.fields.find((f: any) => f.id === prevStep.dependsOnFieldId)
                : null;
            const isVisible = !depField || !prevStep.showWhenValue ||
                formData[depField.label] === prevStep.showWhenValue;
            if (isVisible) break;
            prevIdx--;
        }
        if (prevIdx >= 0) {
            setCurrentStepIndex(prevIdx);
        }
    };

    const getVisitorNameAndPhone = () => {
        let name = '';
        let phone = '';

        // Find Name field: look for type text with 'name' in label, or fallback to first text field
        const nameField = form?.fields?.find((f: any) => f.type === 'text' && f.label.toLowerCase().includes('name'))
            || form?.fields?.find((f: any) => f.type === 'text');
        if (nameField) {
            name = formData[nameField.label] || '';
        }

        // Find Phone field: type tel, number with 'phone' in label, fallback to first tel field
        const phoneField = form?.fields?.find((f: any) => (f.type === 'tel' || f.type === 'number') && f.label.toLowerCase().includes('phone'))
            || form?.fields?.find((f: any) => f.type === 'tel')
            || form?.fields?.find((f: any) => f.label.toLowerCase().includes('phone') || f.label.toLowerCase().includes('number'));
        if (phoneField) {
            phone = formData[phoneField.label] || '';
        }

        return { name, phone };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        if (e) e.preventDefault();
        
        // Validate all fields
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
            showToast('Please complete all required fields.', 'error');
            return;
        }

        setSubmitting(true);
        try {
            if (previewData) {
                // In preview mode, simulate submission
                await new Promise(resolve => setTimeout(resolve, 800));
                setSubmitted(true);
                showToast('Form submission simulated successfully!', 'success');
            } else {
                await formsApi.submitResponse(id!, formData);
                setSubmitted(true);
                showToast('Form submitted successfully!', 'success');
                
                if (isEmbed) {
                    window.parent.postMessage({ type: 'LEAD_CAPTURE_SUCCESS' }, '*');
                }
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
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <span className="text-xs text-slate-500 font-bold tracking-wider uppercase">Loading Form...</span>
                </div>
            </div>
        );
    }

    if (!form) {
        return (
            <div className={cn("flex flex-col items-center justify-center min-h-screen text-center p-6", isEmbed ? "bg-transparent" : "bg-slate-50")}>
                <AlertCircle className="w-16 h-16 text-slate-300 mb-4 animate-bounce" />
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Form Not Found</h2>
                <p className="text-slate-500 max-w-sm text-xs font-semibold leading-relaxed">The form you are looking for does not exist or has been removed.</p>
            </div>
        );
    }

    // Dynamic configuration variables
    const primaryColor = form?.design?.primaryColor || '#2563eb';
    const formBackgroundColor = form?.design?.formBackgroundColor || '#ffffff';
    const bgColor = form?.design?.backgroundColor || (isEmbed ? 'transparent' : '#f8fafc');
    const textColor = form?.design?.textColor || '#0f172a';
    const formTextColor = form?.design?.formTextColor || '#1e293b';
    const frameBorderColor = form?.design?.frameBorderColor || '#e2e8f0';
    const inputBackgroundColor = form?.design?.inputBackgroundColor || '#f8fafc';
    const inputBorderColor = form?.design?.inputBorderColor || '#e2e8f0';
    const inputTextColor = form?.design?.inputTextColor || '#0f172a';
    const titleColor = form?.design?.titleColor || form?.design?.textColor || '#0f172a';
    const descriptionColor = form?.design?.descriptionColor || form?.design?.textColor || '#64748b';
    const showTitle = form?.design?.showTitle !== false;
    const showDescription = form?.design?.showDescription !== false;
    const steps = form?.design?.steps || [];
    const isMultistep = form?.design?.isMultistep && steps.length > 0;
    const layout = form?.design?.layout || 'default';
    const submitButtonText = form?.design?.submitButtonText || (isMultistep ? 'Book Appointment' : 'Submit Response');
    const currentStep = isMultistep ? steps[currentStepIndex] : null;

    // Filter fields to render based on multi-step or single-step
    const isStepVisible = (step: any): boolean => {
        if (!step.dependsOnFieldId || !step.showWhenValue) return true;
        const depField = form.fields.find((f: any) => f.id === step.dependsOnFieldId);
        if (!depField) return true;
        return formData[depField.label] === step.showWhenValue;
    };

    const visibleSteps = isMultistep ? steps.filter(isStepVisible) : [];

    const renderedFields = isMultistep
        ? form.fields.filter((field: any) => {
            const fStepId = field.stepId || (steps[0] ? steps[0].id : '');
            return fStepId === currentStep?.id;
          })
        : form.fields;

    // Check if the current step is a summary step
    const isSummaryStep = isMultistep && currentStep?.id?.includes('summary');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldLabel: string, isMultiple: boolean) => {
        const files = e.target.files;
        if (!files) return;

        const readPromises = Array.from(files).map(file => {
            return new Promise<{ base64: string; name: string; type: string; size: number }>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve({
                        base64: reader.result as string,
                        name: file.name,
                        type: file.type,
                        size: file.size
                    });
                };
                reader.readAsDataURL(file);
            });
        });

        Promise.all(readPromises).then(newFiles => {
            setFormData(prev => {
                const currentFiles = prev[fieldLabel] || [];
                const updated = isMultiple ? [...currentFiles, ...newFiles] : [newFiles[0]];
                return { ...prev, [fieldLabel]: updated };
            });
            if (errors[fieldLabel]) {
                setErrors(prev => ({ ...prev, [fieldLabel]: '' }));
            }
        });
    };

    const removeFile = (fieldLabel: string, indexToRemove: number) => {
        setFormData(prev => {
            const currentFiles = prev[fieldLabel] || [];
            const updated = currentFiles.filter((_: any, idx: number) => idx !== indexToRemove);
            return { ...prev, [fieldLabel]: updated };
        });
    };

    const renderThankYouIcon = (iconName: string, color: string) => {
        const props = { className: "w-12 h-12 mx-auto", style: { color } };
        switch (iconName) {
            case 'heart': return <Heart {...props} />;
            case 'star': return <Star {...props} />;
            case 'calendar': return <CalendarIcon {...props} />;
            case 'home': return <Home {...props} />;
            case 'smile': return <Smile {...props} />;
            default: return <CheckCircle2 {...props} />;
        }
    };

    const renderThankYouSummary = () => {
        return (
            <div className="border rounded-2xl p-5 text-left my-6 space-y-3 font-sans" style={{ backgroundColor: inputBackgroundColor, borderColor: inputBorderColor }}>
                <span className="font-bold text-xs uppercase tracking-wider block border-b pb-2" style={{ color: titleColor, borderColor: inputBorderColor }}>
                    Booking Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {form.fields.map((f: any) => {
                        const val = formData[f.label];
                        if (!val || (Array.isArray(val) && val.length === 0)) return null;
                        if (f.type === 'image') {
                            return (
                                <div key={f.id} className="sm:col-span-2 space-y-1.5">
                                    <span className="font-bold block" style={{ color: descriptionColor }}>{f.label}:</span>
                                    <div className="flex gap-2 flex-wrap">
                                        {val.map((img: any, idx: number) => (
                                            <img key={idx} src={img.base64} alt="reference" className="w-12 h-12 object-cover rounded-xl border" style={{ borderColor: inputBorderColor }} />
                                        ))}
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div key={f.id} className="space-y-0.5">
                                <span className="font-bold block" style={{ color: descriptionColor }}>{f.label}:</span>
                                <span className="font-semibold" style={{ color: inputTextColor }}>{val}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (submitted) {
        const thankYouConfig = form.design?.thankYouPage;
        if (thankYouConfig && thankYouConfig.template === 'custom') {
            return (
                <div className={cn("flex items-center justify-center min-h-screen p-6", isEmbed ? "bg-transparent" : "")} style={{ backgroundColor: !isEmbed ? bgColor : undefined }}>
                    <div className="rounded-3xl border shadow-xl p-10 max-w-lg w-full text-center animate-in zoom-in-95 duration-500 text-xs font-semibold" style={{ backgroundColor: formBackgroundColor, borderColor: frameBorderColor }}>
                        {thankYouConfig.blocks.filter((b: any) => b.visible).map((block: any) => {
                            switch (block.type) {
                                case 'icon':
                                    return (
                                        <div key={block.id} className="mb-6 flex justify-center">
                                            <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xs border" style={{ backgroundColor: inputBackgroundColor, borderColor: inputBorderColor }}>
                                                {renderThankYouIcon(block.value, block.color)}
                                            </div>
                                        </div>
                                    );
                                case 'title':
                                    return (
                                        <h2 key={block.id} className="text-2xl font-extrabold mb-3 tracking-tight" style={{ color: titleColor }}>
                                            {block.value}
                                        </h2>
                                    );
                                case 'message':
                                    return (
                                        <p key={block.id} className="leading-relaxed max-w-sm mx-auto mb-4" style={{ color: descriptionColor }}>
                                            {block.value}
                                        </p>
                                    );
                                case 'booking_summary':
                                    return (
                                        <div key={block.id}>
                                            {renderThankYouSummary()}
                                        </div>
                                    );
                                case 'button':
                                    return (
                                        <button 
                                            key={block.id}
                                            onClick={() => {
                                                if (block.url) {
                                                    window.open(block.url, '_blank');
                                                } else {
                                                    setSubmitted(false);
                                                    setCurrentStepIndex(0);
                                                    const resetData: Record<string, any> = {};
                                                    form.fields.forEach((field: any) => {
                                                        if (field.type === 'image') {
                                                            resetData[field.label] = [];
                                                        } else {
                                                            resetData[field.label] = '';
                                                        }
                                                    });
                                                    setFormData(resetData);
                                                }
                                            }}
                                            className="w-full py-3.5 bg-primary hover:opacity-90 text-white rounded-xl font-bold transition-all shadow-md mt-4 cursor-pointer text-xs uppercase tracking-wider"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            {block.label || 'Done'}
                                        </button>
                                    );
                                case 'connect_whatsapp':
                                    return (
                                        <button 
                                            key={block.id}
                                            onClick={() => {
                                                if (previewData) {
                                                    showToast('Simulated WhatsApp redirect', 'info');
                                                } else {
                                                    const cleanUrl = block.url?.trim();
                                                    if (cleanUrl) {
                                                        let url = cleanUrl;
                                                        if (!url.startsWith('http') && !url.startsWith('//')) {
                                                            const cleanNum = url.replace(/\D/g, '');
                                                            url = `https://wa.me/${cleanNum}`;
                                                        }
                                                        window.open(url, '_blank');
                                                    }
                                                }
                                            }}
                                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md mt-4 cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                                        >
                                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.328 0 11.859 0c3.166.001 6.141 1.233 8.375 3.469 2.235 2.237 3.465 5.212 3.462 8.377-.003 6.535-5.328 11.86-11.859 11.86-2.004-.001-3.973-.51-5.716-1.48L0 24zm6.59-4.846c1.6.95 3.1 1.45 4.6 1.452 5.4 0 9.8-4.4 9.803-9.8.002-2.6-1.01-5.07-2.85-6.91-1.85-1.83-4.3-2.84-6.91-2.84-5.4 0-9.8 4.4-9.8 9.8-.001 1.7.46 3.3 1.35 4.74l-.99 3.6 3.7-.97zm10.4-3.5c-.3-.15-1.7-.85-2.0-.95-.3-.1-.5-.15-.7.15-.2.3-.75.95-.9.1-.15-.15-.3-.45-.3-.45 0-1.7-.6-3.2-1.95-1.16-1-1.95-2.3-2.2-2.7-.2-.3-.02-.45.13-.6.13-.13.3-.35.45-.5.15-.15.2-.25.3-.45.1-.2.05-.4-.02-.55-.07-.15-.7-1.7-.95-2.3-.3-.6-.6-.5-.8-.5-.2 0-.4 0-.6 0-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7 0 1.6 1.2 3.1 1.35 3.3.15.2 2.35 3.6 5.7 5.03.8.34 1.43.55 1.9.7.8.25 1.5.2 2.1.1.65-.1 1.7-.7 2.0-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3z"/></svg>
                                            <span>{block.label || 'Message on WhatsApp'}</span>
                                        </button>
                                    );
                                case 'connect_livechat':
                                    return (
                                        <button 
                                            key={block.id}
                                            onClick={() => {
                                                const { name, phone } = getVisitorNameAndPhone();
                                                const slug = block.slug;
                                                const sourceTitle = form.title || 'Form';
                                                
                                                if (previewData) {
                                                    showToast(`Simulated Live Chat redirect to smart link: ${slug}`, 'info');
                                                } else {
                                                    if (slug) {
                                                        const url = `/chat/${slug}?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}&source=${encodeURIComponent(sourceTitle)}`;
                                                        window.location.href = url;
                                                    } else {
                                                        showToast('No smart chat link selected', 'error');
                                                    }
                                                }
                                            }}
                                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md mt-4 cursor-pointer text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                            <span>{block.label || 'Connect via Live Chat'}</span>
                                        </button>
                                    );
                                default:
                                    return null;
                            }
                        })}
                    </div>
                </div>
            );
        }

        return (
            <div className={cn("flex items-center justify-center min-h-screen p-6", isEmbed ? "bg-transparent" : "bg-slate-50")}>
                <div className="rounded-3xl border border-slate-200 shadow-xl p-10 max-w-md w-full text-center animate-in zoom-in-95 duration-500 text-xs" style={{ backgroundColor: formBackgroundColor }}>
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Thank You!</h2>
                    <p className="text-slate-500 mb-8 font-semibold leading-relaxed">
                        Your response has been successfully submitted to <strong className="text-slate-700">{form.owner.name}</strong>.
                    </p>
                    <button 
                        onClick={() => {
                            setSubmitted(false);
                            setCurrentStepIndex(0);
                            const resetData: Record<string, any> = {};
                            form.fields.forEach((field: any) => {
                                if (field.type === 'image') {
                                    resetData[field.label] = [];
                                } else {
                                    resetData[field.label] = '';
                                }
                            });
                            setFormData(resetData);
                        }}
                        className="w-full py-3 bg-primary hover:opacity-90 text-white rounded-xl font-bold shadow-md transition-all cursor-pointer uppercase tracking-wider"
                        style={{ backgroundColor: primaryColor }}
                    >
                        Submit Another Response
                    </button>
                </div>
            </div>
        );
    }

    const renderInput = (field: any) => {
        const value = formData[field.label];
        const error = errors[field.label];
        const hasError = !!error;

        const parentField = field.dependsOnFieldId 
            ? form.fields.find((f: any) => f.id === field.dependsOnFieldId)
            : null;
        const parentValue = parentField ? (formData[parentField.label] || '') : '';
        const isDisabled = !!parentField && !parentValue;

        const isHorizontal = layout === 'horizontal';
        const isBlueBorderField = isHorizontal && field.label.toLowerCase() !== 'select city';

        const baseInputClasses = cn(
            "w-full rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-2 transition-all font-semibold shadow-2xs",
            isDisabled
                ? (isEmbed
                    ? "bg-[#1f2c34] border border-[#2d383f] text-slate-500 cursor-not-allowed opacity-60"
                    : "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                  )
                : (hasError 
                    ? "bg-red-500/10 border border-red-500/50 text-red-700 focus:ring-red-500/20" 
                    : (isEmbed 
                        ? "bg-[#2a3942] border border-[#3b4a54] text-white placeholder-[#8696a0] focus:ring-[#00a884]/40" 
                        : isBlueBorderField
                            ? "bg-white border-2 border-[#1e88e5] text-slate-800 placeholder-slate-400 focus:ring-[#1e88e5]/20 focus:border-[#1e88e5]"
                            : "custom-form-input border text-slate-800 placeholder-slate-400 focus:ring-primary/20"
                      )
                  )
        );

        switch (field.type) {
            case 'textarea':
                return (
                    <textarea 
                        className={cn(baseInputClasses, "min-h-[100px] resize-y")}
                        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                        value={value || ''}
                        onChange={e => {
                            setFormData({...formData, [field.label]: e.target.value});
                            if (error) setErrors({...errors, [field.label]: ''});
                        }}
                    />
                );
            case 'select':
                let filteredOptions = field.options || [];
                if (parentField) {
                    filteredOptions = (field.options || []).filter((opt: string) => {
                        const parts = opt.split('|');
                        const optionParent = parts[1] ? parts[1].trim() : null;
                        if (!optionParent) return true; // Show general options with no parent tag
                        return parentValue === optionParent;
                    });
                }

                return (
                    <div className="relative w-full">
                        <select 
                            className={cn(baseInputClasses, "appearance-none cursor-pointer pr-10")}
                            value={value || ''}
                            disabled={isDisabled}
                            onChange={e => {
                                const newValue = e.target.value;
                                const updatedFormData: Record<string, any> = { ...formData, [field.label]: newValue };
                                
                                // Recursively reset all child fields that depend on this field
                                const resetDependents = (fieldId: string) => {
                                    form.fields.forEach((f: any) => {
                                        if (f.dependsOnFieldId === fieldId) {
                                            updatedFormData[f.label] = '';
                                            resetDependents(f.id);
                                        }
                                    });
                                };
                                resetDependents(field.id);

                                setFormData(updatedFormData);
                                if (error) setErrors({...errors, [field.label]: ''});
                            }}
                        >
                            <option value="">
                                {isDisabled 
                                    ? `Select ${parentField?.label || 'parent field'} first...` 
                                    : `Select ${field.label.toLowerCase()}...`
                                }
                            </option>
                            {filteredOptions.map((opt: string) => {
                                const parts = opt.split('|');
                                const val = parts[0].trim();
                                return <option key={opt} value={val}>{val}</option>;
                            })}
                        </select>
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <ChevronDown className="w-4 h-4" />
                        </span>
                    </div>
                );
            case 'tel':
                return (
                    <div className="flex">
                        <span className={cn(
                            "inline-flex items-center px-4 rounded-l-xl border border-r-0 text-xs font-bold shrink-0",
                            isEmbed ? "bg-[#182229] border-[#3b4a54] text-[#8696a0]" : "custom-form-input-addon"
                        )}>
                            +91
                        </span>
                        <input 
                            type="tel"
                            maxLength={10}
                            className={cn(baseInputClasses, "rounded-l-none")}
                            placeholder="Enter 10 digit number"
                            value={value || ''}
                            onChange={e => {
                                setFormData({...formData, [field.label]: e.target.value.replace(/\D/g, '')});
                                if (error) setErrors({...errors, [field.label]: ''});
                            }}
                        />
                    </div>
                );
            case 'date':
                return (
                    <DatePicker
                        format="DD-MM-YYYY"
                        value={value ? dayjs(value, 'YYYY-MM-DD') : null}
                        onChange={(date) => {
                            setFormData({...formData, [field.label]: date ? date.format('YYYY-MM-DD') : ''});
                            if (error) setErrors({...errors, [field.label]: ''});
                        }}
                        placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`}
                        style={{ width: '100%' }}
                        className={cn(hasError ? 'border-red-400' : isBlueBorderField ? 'border-[#1e88e5]' : '')}
                        size="large"
                        disabled={isDisabled}
                        status={hasError ? 'error' : undefined}
                    />
                );
            case 'date_time_calendar':
                const isRange = field.options?.includes('range=true');
                if (isRange) {
                    return (
                        <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs font-semibold">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Check-in & Check-out Date Range</label>
                            <RangePicker
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px' }}
                                onChange={(dates) => {
                                    if (dates && dates[0] && dates[1]) {
                                        const rangeStr = `${dates[0].format('YYYY-MM-DD')} to ${dates[1].format('YYYY-MM-DD')}`;
                                        setFormData(prev => ({ ...prev, [field.label]: rangeStr }));
                                    } else {
                                        setFormData(prev => ({ ...prev, [field.label]: '' }));
                                    }
                                    if (errors[field.label]) {
                                        setErrors(prev => ({ ...prev, [field.label]: '' }));
                                    }
                                }}
                                value={
                                    value 
                                        ? [dayjs(value.split(' to ')[0]), dayjs(value.split(' to ')[1])] 
                                        : null
                                }
                            />
                        </div>
                    );
                } else {
                    const selectedDateVal = value?.includes(' at ') ? dayjs(value.split(' at ')[0]) : dayjs();
                    const selectedSlot = value?.includes(' at ') ? value.split(' at ')[1] : '';
                    const slots = ["09:00 AM", "10:30 AM", "11:00 AM", "12:30 PM", "02:00 PM", "03:30 PM", "05:00 PM", "06:30 PM"];

                    return (
                        <div className="w-full bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs font-semibold text-xs">
                            <div className="border-b border-slate-100 pb-3 mb-4">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Appointment Date</label>
                                <div className="border border-slate-100 rounded-2xl overflow-hidden p-2 bg-slate-50/50">
                                    <Calendar 
                                        fullscreen={false} 
                                        value={selectedDateVal}
                                        onSelect={(date) => {
                                            const updatedVal = selectedSlot ? `${date.format('YYYY-MM-DD')} at ${selectedSlot}` : `${date.format('YYYY-MM-DD')}`;
                                            setFormData(prev => ({ ...prev, [field.label]: updatedVal }));
                                            if (errors[field.label]) {
                                                setErrors(prev => ({ ...prev, [field.label]: '' }));
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Available Time Slot</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {slots.map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => {
                                                const updatedVal = `${selectedDateVal.format('YYYY-MM-DD')} at ${s}`;
                                                setFormData(prev => ({ ...prev, [field.label]: updatedVal }));
                                                if (errors[field.label]) {
                                                    setErrors(prev => ({ ...prev, [field.label]: '' }));
                                                }
                                            }}
                                            className={cn(
                                                "py-2.5 px-3 rounded-xl border font-bold text-[10px] uppercase tracking-wider text-center transition-all cursor-pointer shadow-3xs",
                                                selectedSlot === s 
                                                    ? "text-white border-primary shadow-xs" 
                                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                            )}
                                            style={selectedSlot === s ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                }

            case 'image':
                const isMultiple = field.options?.includes('multiple=true');
                const fileList = Array.isArray(value) ? value : [];

                return (
                    <div className="space-y-4 font-semibold text-xs">
                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-primary/50 bg-slate-50 hover:bg-white p-6 rounded-2xl transition-all relative">
                            <input 
                                type="file" 
                                accept="image/*"
                                multiple={isMultiple}
                                id={field.id}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={e => handleFileChange(e, field.label, isMultiple)}
                            />
                            <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200/50">
                                    <Upload className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-slate-700">Click to Select Reference Image</span>
                                <span className="text-[10px] text-slate-400 font-semibold">{isMultiple ? 'Choose single or multiple files (PNG, JPG, JPEG)' : 'Choose a file (PNG, JPG, JPEG)'}</span>
                            </div>
                        </div>

                        {fileList.length > 0 && (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-3xs">
                                {fileList.map((file: any, index: number) => (
                                    <div key={index} className="relative aspect-square border rounded-xl overflow-hidden group shadow-3xs">
                                        <img src={file.base64} alt={file.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => removeFile(field.label, index)}
                                                className="w-7 h-7 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center transition-all shadow-md cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            default:
                return (
                    <input 
                        type={field.type}
                        className={baseInputClasses}
                        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                        value={value || ''}
                        onChange={e => {
                            setFormData({...formData, [field.label]: e.target.value});
                            if (error) setErrors({...errors, [field.label]: ''});
                        }}
                    />
                );
        }
    };

    const renderFormBody = () => {
        if (isSummaryStep) {
            return (
                <div className="space-y-6">
                    <div className="border border-slate-200/80 rounded-3xl p-6 md:p-8 bg-slate-50/50 shadow-2xs font-semibold text-xs space-y-4">
                        <h3 className="font-extrabold text-sm text-slate-800 border-b border-slate-200/60 pb-3 uppercase tracking-wider flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-primary" style={{ color: primaryColor }} />
                            <span>Verify Your Selection Summary</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 leading-relaxed">
                            {form.fields.map((f: any) => {
                                const val = formData[f.label];
                                if (!val || (Array.isArray(val) && val.length === 0)) return null;

                                if (f.type === 'image') {
                                    return (
                                        <div key={f.id} className="md:col-span-2 space-y-2">
                                            <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">{f.label}</span>
                                            <div className="flex gap-2.5 flex-wrap">
                                                {val.map((img: any, idx: number) => (
                                                    <div key={idx} className="w-14 h-14 rounded-xl border border-slate-200 overflow-hidden shadow-3xs relative">
                                                        <img src={img.base64} alt="summary uploaded ref" className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={f.id} className="space-y-1">
                                        <span className="font-bold text-slate-400 block uppercase tracking-wider text-[10px]">{f.label}</span>
                                        <span className="font-bold text-slate-800 text-[13px]">{val}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        }

        const isHorizontal = layout === 'horizontal';

        return (
            <div className={cn("grid grid-cols-12 gap-x-5 gap-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300", isHorizontal ? "items-end" : "")}>
                {renderedFields.map((field: any) => {
                    const colSpan = field.colSpan || 12;
                    return (
                        <div key={field.id} className={cn(getColSpanClass(colSpan), "space-y-2")}>
                            <label className="flex items-center text-[10px] font-bold uppercase tracking-wider font-sans mb-1" style={{ color: isEmbed ? '#8696a0' : (isHorizontal ? '#1e293b' : formTextColor) }}>
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            
                            {renderInput(field)}
                            
                            {errors[field.label] && (
                                <p className="text-[10px] font-bold text-red-500 mt-1.5 animate-in slide-in-from-top-1 font-sans uppercase tracking-wider">
                                    {errors[field.label]}
                                </p>
                            )}
                        </div>
                    );
                })}
                {isHorizontal && (
                    <div className="col-span-12 md:col-span-2 space-y-2">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider font-sans shadow-md text-white"
                            style={{ backgroundColor: primaryColor, height: '42px', boxShadow: `0 4px 12px ${primaryColor}40` }}
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin text-current" />
                            ) : (
                                <>
                                    <Search className="w-4 h-4 shrink-0" />
                                    <span>Search</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderNavigationControls = () => {
        if (!isMultistep) {
            return (
                <div className={cn("pt-6 mt-8 border-t", isEmbed ? "border-[#2a3942] pb-6" : "border-slate-100")}>
                    <button
                        type="submit"
                        disabled={submitting}
                        className={cn(
                            "w-full flex items-center justify-center py-3.5 rounded-xl font-bold text-xs transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider font-sans shadow-md",
                            isEmbed ? "bg-[#00a884] text-black font-extrabold" : "text-white font-semibold"
                        )}
                        style={!isEmbed ? { backgroundColor: primaryColor, boxShadow: `0 10px 25px -5px ${primaryColor}40` } : undefined}
                    >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin text-current" /> : submitButtonText}
                    </button>
                    {form?.design?.footerDisclaimer && (
                        <p className="mt-4 text-center text-xs text-slate-500 font-medium px-4">
                            {form.design.footerDisclaimer}
                        </p>
                    )}
                </div>
            );
        }

        // isLastStep: no more visible steps after current index
        const allSteps = form?.design?.steps || [];
        const isLastStep = !allSteps.slice(currentStepIndex + 1).some((s: any) => isStepVisible(s));

        return (
            <div className="pt-6 mt-8 border-t border-slate-100 flex gap-4">
                {currentStepIndex > 0 && (
                    <button
                        type="button"
                        onClick={handleBack}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer uppercase tracking-wider"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                    </button>
                )}
                {isLastStep ? (
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-white font-bold rounded-xl text-xs transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer uppercase tracking-wider shadow-md"
                        style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px -5px ${primaryColor}40` }}
                    >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin text-current" /> : (
                            <>
                                <span>{submitButtonText}</span>
                                <Check className="w-3.5 h-3.5" />
                            </>
                        )}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleNext}
                        className="flex-1 flex items-center justify-center gap-1.5 py-3 text-white font-bold rounded-xl text-xs transition-all hover:opacity-90 cursor-pointer uppercase tracking-wider shadow-md"
                        style={{ backgroundColor: primaryColor, boxShadow: `0 10px 25px -5px ${primaryColor}40` }}
                    >
                        <span>Next: {allSteps.slice(currentStepIndex + 1).find((s: any) => isStepVisible(s))?.title || 'Continue'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        );
    };

    // Main Renderer based on chosen layout (default vs premium vertical split layout)
    const renderContent = () => {
        if (isMultistep && layout === 'custom') {
            // Premium Sidebar Layout (vertical steps sidebar and right forms container)
            return (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                    {/* Left Steps Sidebar */}
                    <div className="md:col-span-4 border rounded-3xl p-6 shadow-md space-y-4" style={{ backgroundColor: formBackgroundColor, borderColor: frameBorderColor }}>
                        <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-4">
                            <span className="font-extrabold text-slate-800 text-[13px] uppercase tracking-wider">{form?.design?.stepsSidebarTitle || 'Booking Steps'}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Step {visibleSteps.findIndex((s: StepDef) => s.id === currentStep?.id) + 1} of {visibleSteps.length}</span>
                        </div>
                        <div className="flex flex-col gap-4 font-semibold text-xs">
                            {visibleSteps.map((step: any, idx: number) => {
                                const isActive = currentStep?.id === step.id;
                                const visibleIdx = visibleSteps.findIndex((s: StepDef) => s.id === step.id);
                                const isCompleted = visibleSteps.slice(0, visibleIdx).some((s: StepDef) => s.id === currentStep?.id)
                                    ? false
                                    : visibleIdx < visibleSteps.findIndex((s: StepDef) => s.id === currentStep?.id);

                                return (
                                    <div key={step.id} className="flex gap-3.5 items-start">
                                        <div className="shrink-0 flex items-center justify-center mt-0.5">
                                            {isCompleted ? (
                                                <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-3xs animate-in zoom-in-50">
                                                    <Check className="w-3 h-3" />
                                                </div>
                                            ) : (
                                                <div 
                                                    className={cn(
                                                        "w-6 h-6 rounded-full border flex items-center justify-center font-bold text-[10px] transition-all shadow-3xs",
                                                        isActive 
                                                            ? "bg-primary border-primary text-white scale-110 shadow-sm animate-pulse" 
                                                            : "bg-slate-50 border-slate-200 text-slate-400"
                                                    )}
                                                    style={isActive ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                                                >
                                                    {idx + 1}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-0.5">
                                            <span 
                                                className={cn(
                                                    "block font-bold transition-colors",
                                                    isActive ? "" : isCompleted ? "opacity-75" : "opacity-50"
                                                )}
                                                style={{ color: titleColor }}
                                            >
                                                {step.title}
                                            </span>
                                            {step.description && (
                                                <span className="block text-[10px] font-medium leading-normal opacity-75" style={{ color: descriptionColor }}>{step.description}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Form Fields Container */}
                    <div className="md:col-span-8 border rounded-3xl p-6 md:p-8 shadow-md" style={{ backgroundColor: formBackgroundColor, borderColor: frameBorderColor }}>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="border-b border-slate-100 pb-4 mb-4">
                                <h3 className="text-sm font-extrabold uppercase tracking-wider m-0" style={{ color: titleColor }}>
                                    {currentStep?.title}
                                </h3>
                                {currentStep?.description && (
                                    <p className="text-[10px] font-bold uppercase tracking-wider mt-1 m-0 opacity-75" style={{ color: descriptionColor }}>{currentStep?.description}</p>
                                )}
                            </div>

                            {renderFormBody()}
                            {renderNavigationControls()}
                        </form>
                    </div>
                </div>
            );
        }

        // Default layout (centered card with stepper at top if multistep)
        return (
            <div className={cn("rounded-3xl", isEmbed ? "p-2 bg-transparent shadow-none border-none" : "shadow-xl border p-8 md:p-10")} style={!isEmbed ? { backgroundColor: formBackgroundColor, borderColor: frameBorderColor } : undefined}>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {isMultistep && (
                        <div className="border-b border-slate-100 pb-5 mb-6 text-xs font-semibold">
                            {/* Horizontal Progress Stepper */}
                            <div className="flex items-center justify-between gap-2 mb-4">
                                {visibleSteps.map((step: any, idx: number) => (
                                    <React.Fragment key={step.id}>
                                        <div className="flex items-center gap-2">
                                            <div 
                                                className={cn(
                                                    "w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] border shadow-3xs",
                                                    currentStep?.id === step.id
                                                        ? "text-white border-primary" 
                                                        : visibleSteps.findIndex((s: StepDef) => s.id === currentStep?.id) > idx
                                                            ? "bg-emerald-50 border-emerald-200 text-emerald-600" 
                                                            : "bg-slate-50 border-slate-200 text-slate-400"
                                                )}
                                                style={currentStep?.id === step.id ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                                            >
                                                {visibleSteps.findIndex((s: StepDef) => s.id === currentStep?.id) > idx ? <Check className="w-2.5 h-2.5" /> : idx + 1}
                                            </div>
                                            <span className={cn(
                                                "hidden sm:inline font-bold",
                                                currentStep?.id === step.id ? "" : "opacity-50"
                                            )} style={{ color: titleColor }}>
                                                {step.title}
                                            </span>
                                        </div>
                                        {idx < visibleSteps.length - 1 && (
                                            <div className={cn(
                                                "h-[2px] flex-1 rounded",
                                                visibleSteps.findIndex((s: StepDef) => s.id === currentStep?.id) > idx ? "bg-emerald-200" : "bg-slate-100"
                                            )} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                            <div className="text-center font-bold uppercase tracking-wider text-[9px] text-slate-400">
                                {currentStep?.title} &middot; Step {visibleSteps.findIndex((s: StepDef) => s.id === currentStep?.id) + 1} of {visibleSteps.length}
                            </div>
                        </div>
                    )}

                    {renderFormBody()}
                    {renderNavigationControls()}
                </form>
            </div>
        );
    };

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: primaryColor,
                    borderRadius: 12,
                    borderRadiusLG: 12,
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 12,
                    controlHeight: 42,
                    colorBgContainer: isEmbed ? '#2a3942' : inputBackgroundColor,
                    colorText: isEmbed ? '#ffffff' : textColor,
                    colorTextPlaceholder: isEmbed ? '#8696a0' : '#94a3b8',
                    colorBorder: isEmbed ? '#3b4a54' : inputBorderColor,
                    colorBorderSecondary: isEmbed ? '#3b4a54' : inputBorderColor,
                },
            }}
        >
            <style>{`
                .custom-form-input {
                    background-color: ${inputBackgroundColor} !important;
                    border-color: ${inputBorderColor} !important;
                    color: ${inputTextColor} !important;
                }
                .custom-form-input::placeholder {
                    color: ${inputTextColor} !important;
                    opacity: 0.6 !important;
                }
                .custom-form-input:focus {
                    background-color: #ffffff !important;
                    border-color: ${primaryColor} !important;
                }
                .custom-form-input-addon {
                    background-color: ${inputBackgroundColor} !important;
                    border-color: ${inputBorderColor} !important;
                    color: ${inputTextColor} !important;
                }
            `}</style>
            <div 
                className="min-h-screen flex" 
                style={{ 
                    backgroundColor: bgColor,
                    padding: isEmbed ? '1rem 1rem 3rem 1rem' : '3rem 1rem',
                }}
            >
                {previewData && onClosePreview && (
                    <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                        <button
                            type="button"
                            onClick={onClosePreview}
                            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900/90 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-lg border border-slate-700/50 backdrop-blur-xs transition-all cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" />
                            <span>Close Preview</span>
                        </button>
                    </div>
                )}
                <div 
                    className={cn("mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans flex flex-col justify-center w-full", !customWidth && "max-w-4xl")}
                    style={customWidth ? { maxWidth: customWidth } : undefined}
                >
                    {/* Custom Toast Notification */}
                    {toast && (
                        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 text-white shadow-xl text-xs font-semibold animate-in slide-in-from-bottom-4 duration-200">
                            <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : toast.type === 'error' ? 'bg-red-400' : 'bg-blue-400'}`} />
                            <span>{toast.message}</span>
                            <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <div className={cn("text-center mb-8", isEmbed ? "mb-4" : "mb-10")}>
                        {form.owner?.logoUrl && (
                            <img src={form.owner.logoUrl} alt={form.owner.name} className="h-16 mx-auto mb-5 rounded-lg shadow-sm" />
                        )}
                        {showTitle && (
                            <h1 className="text-2xl font-extrabold tracking-tight mb-2 font-sans" style={{ color: titleColor }}>
                                {form.title}
                            </h1>
                        )}
                        {showDescription && form.description && (
                            <p className="text-xs opacity-75 font-sans font-bold uppercase tracking-wider" style={{ color: descriptionColor }}>
                                {form.description}
                            </p>
                        )}
                    </div>

                    {renderContent()}

                    {!isEmbed && (
                        <div className="text-center mt-12 text-xs text-slate-400 font-bold uppercase tracking-widest">
                            Powered by <strong className="text-slate-700 tracking-wider">{APP_NAME} Business OS</strong>
                        </div>
                    )}
                </div>
            </div>
        </ConfigProvider>
    );
};

export default PublicForm;
