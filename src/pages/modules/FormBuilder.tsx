import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { formsApi } from '../../api/forms';

// Dnd Kit Imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Icons
import { Plus, Trash2, Save, ArrowLeft, GripVertical, Settings, Copy, Globe, Check, X } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface FormField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'email' | 'tel' | 'textarea' | 'select' | 'date';
    required: boolean;
    options?: string[];
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        patternMessage?: string;
    };
}

interface SortableItemProps {
    field: FormField;
    index: number;
    removeField: (id: string) => void;
    updateField: (id: string, updates: Partial<FormField>) => void;
}

const SortableField: React.FC<SortableItemProps> = ({ field, index, removeField, updateField }) => {
    const [showValidation, setShowValidation] = useState(false);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={cn(
            "bg-white border rounded-2xl p-5 sm:p-6 mb-4 relative transition-all shadow-xs",
            isDragging ? "border-primary shadow-xl scale-[1.02] opacity-95 ring-2 ring-primary/20" : "border-slate-200/80 hover:border-slate-300 hover:shadow-md"
        )}>
            <div className="flex justify-between items-center mb-5">
                <div className="flex items-center gap-3">
                    <div {...attributes} {...listeners} className="cursor-grab hover:bg-slate-100 p-1.5 rounded-lg -ml-1.5 text-slate-400 hover:text-slate-700 transition-colors">
                        <GripVertical className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-800 text-xs">Field #{index + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        type="button"
                        title="Custom Validation Rules"
                        onClick={() => setShowValidation(!showValidation)}
                        className={cn(
                            "p-2 rounded-xl transition-all cursor-pointer shadow-2xs",
                            showValidation ? "bg-primary/10 text-primary font-bold border border-primary/20" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 border border-slate-200/60 bg-slate-50"
                        )}
                    >
                        <Settings className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="p-2 text-rose-500 bg-rose-50 border border-rose-100 hover:bg-rose-100 hover:text-rose-700 rounded-xl transition-colors cursor-pointer shadow-2xs"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-xs">
                <div className="md:col-span-5">
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Field Label</label>
                    <input 
                        type="text"
                        value={field.label} 
                        onChange={e => updateField(field.id, { label: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-white"
                    />
                </div>
                <div className="md:col-span-4">
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Input Type</label>
                    <select 
                        value={field.type} 
                        onChange={e => updateField(field.id, { type: e.target.value as any })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-white appearance-none cursor-pointer"
                    >
                        <option value="text">Short Text</option>
                        <option value="textarea">Long Text</option>
                        <option value="email">Email</option>
                        <option value="tel">Phone</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="select">Dropdown</option>
                    </select>
                </div>
                <div className="md:col-span-3 flex items-center md:pt-6">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={field.required}
                                onChange={e => updateField(field.id, { required: e.target.checked })}
                            />
                            <div className={cn(
                                "w-10 h-6 rounded-full transition-colors relative border",
                                field.required ? "bg-primary border-primary" : "bg-slate-200 border-slate-300 group-hover:bg-slate-300"
                            )}>
                                <div className={cn(
                                    "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-2xs",
                                    field.required ? "translate-x-4.5" : "translate-x-0.5"
                                )} />
                            </div>
                        </div>
                        <span className="text-xs font-bold text-slate-700">Required</span>
                    </label>
                </div>
            </div>

            {showValidation && (
                <div className="mt-5 p-5 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in slide-in-from-top-2 shadow-2xs text-xs">
                    <span className="font-bold text-primary uppercase tracking-wider block mb-3">Custom Validation Rules</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Min Length/Value</label>
                            <input 
                                type="number" 
                                value={field.validation?.min || ''} 
                                onChange={e => updateField(field.id, { validation: { ...field.validation, min: parseInt(e.target.value) || undefined } })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-xs"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Max Length/Value</label>
                            <input 
                                type="number" 
                                value={field.validation?.max || ''} 
                                onChange={e => updateField(field.id, { validation: { ...field.validation, max: parseInt(e.target.value) || undefined } })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-xs"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Regex Pattern</label>
                            <input 
                                placeholder="e.g. ^[A-Z]+$" 
                                value={field.validation?.pattern || ''} 
                                onChange={e => updateField(field.id, { validation: { ...field.validation, pattern: e.target.value } })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-xs"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Error Message</label>
                            <input 
                                placeholder="Message to show if pattern fails" 
                                value={field.validation?.patternMessage || ''} 
                                onChange={e => updateField(field.id, { validation: { ...field.validation, patternMessage: e.target.value } })}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-xs"
                            />
                        </div>
                    </div>
                </div>
            )}

            {field.type === 'select' && (
                <div className="mt-5 pt-5 border-t border-slate-100 text-xs">
                    <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Dropdown Options (one per line)</label>
                    <textarea 
                        placeholder="Option 1&#10;Option 2" 
                        value={field.options?.join('\n') || ''}
                        onChange={e => updateField(field.id, { options: e.target.value.split('\n').filter(o => o.trim()) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-y transition-all focus:bg-white text-xs"
                    />
                </div>
            )}
        </div>
    );
};

const FormBuilder: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Custom Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Form States
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [addToCrm, setAddToCrm] = useState(false);
    const [primaryColor, setPrimaryColor] = useState('#2563eb');
    const [backgroundColor, setBackgroundColor] = useState('#f8fafc');
    const [textColor, setTextColor] = useState('#0f172a');
    
    const [fields, setFields] = useState<FormField[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [embedDrawerVisible, setEmbedDrawerVisible] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (id) {
            fetchForm();
        } else if (location.state?.template) {
            const template = location.state.template;
            setTitle(template.title || '');
            setDescription(template.description || '');
            setFields(template.fields.map((f: any) => ({ 
                ...f, 
                id: f.id || Date.now().toString() + Math.random(),
                validation: f.validation || {}
            })));
        } else {
            setFields([
                { id: '1', label: 'Full Name', type: 'text', required: true, validation: {} },
                { id: '2', label: 'Email Address', type: 'email', required: true, validation: {} }
            ]);
        }
    }, [id, location.state]);

    const fetchForm = async () => {
        setLoading(true);
        try {
            const res = await formsApi.getForm(id!);
            const data = res.data;
            setTitle(data.title || '');
            setDescription(data.description || '');
            setIsActive(data.isActive !== false);
            setAddToCrm(data.addToCrm || false);
            setPrimaryColor(data.design?.primaryColor || '#2563eb');
            setBackgroundColor(data.design?.backgroundColor || '#f8fafc');
            setTextColor(data.design?.textColor || '#0f172a');
            
            setFields(data.fields.map((f: any) => ({ ...f, validation: f.validation || {} })));
        } catch (e) {
            showToast('Failed to fetch form details', 'error');
        } finally {
            setLoading(false);
        }
    };

    const addField = () => {
        const newField: FormField = {
            id: Date.now().toString(),
            label: 'New Field',
            type: 'text',
            required: false,
            validation: {}
        };
        setFields([...fields, newField]);
    };

    const removeField = (fieldId: string) => {
        setFields(fields.filter(f => f.id !== fieldId));
    };

    const updateField = (fieldId: string, updates: Partial<FormField>) => {
        setFields(fields.map(f => f.id === fieldId ? { ...f, ...updates } : f));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setFields((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!title.trim()) {
            showToast('Form title is required', 'error');
            return;
        }

        if (fields.length === 0) {
            showToast('Please add at least one field to the form', 'warning');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                title,
                description,
                isActive,
                addToCrm,
                design: {
                    primaryColor,
                    backgroundColor,
                    textColor,
                },
                fields
            };

            if (id) {
                await formsApi.updateForm(id, payload);
                showToast('Form updated successfully', 'success');
            } else {
                await formsApi.createForm(payload);
                showToast('Form created successfully', 'success');
            }
            navigate('/dashboard/forms');
        } catch (e) {
            showToast('Failed to save form', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="pb-20 font-sans text-slate-800 animate-in fade-in duration-500">
            {/* Custom Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 text-white shadow-xl text-sm font-medium animate-in slide-in-from-bottom-4 duration-200">
                    <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : toast.type === 'error' ? 'bg-red-400' : 'bg-amber-400'}`} />
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center gap-4 mb-8 bg-white border border-slate-200/80 p-6 sm:p-8 rounded-2xl shadow-xs">
                <button 
                    onClick={() => navigate('/dashboard/forms')}
                    className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all shadow-2xs cursor-pointer shrink-0"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight">{id ? 'Edit Custom Form' : 'Create Custom Form Builder'}</h1>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5 m-0">Design and configure interactive multi-field forms for visitor lead capture.</p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                </div>
            ) : (
                <form id="form-builder-main" onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Settings Sidebar */}
                    <div className="lg:col-span-4 space-y-6 sticky top-24">
                        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden text-xs">
                            <div className="p-5 border-b border-slate-100 bg-slate-50">
                                <h2 className="font-bold text-slate-900 m-0 text-sm">Form Settings</h2>
                            </div>
                            
                            <div className="p-5 sm:p-6 space-y-5">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Form Title *</label>
                                    <input 
                                        required
                                        value={title} 
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="e.g. Lead Qualification Form" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-semibold"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Description</label>
                                    <textarea 
                                        value={description} 
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Shown below the title" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white min-h-[80px] transition-all resize-none font-semibold"
                                    />
                                </div>

                                <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <label className="font-bold text-slate-900 block">Form Access Status</label>
                                        <p className="font-semibold text-slate-500 m-0">Enable or disable form submission</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                                        <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:bg-primary transition-all border border-slate-300">
                                            <div className={cn(
                                                "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-2xs",
                                                isActive ? "translate-x-4.5" : "translate-x-0.5"
                                            )} />
                                        </div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <label className="font-bold text-slate-900 block">Auto-Sync to CRM</label>
                                        <p className="font-semibold text-slate-500 m-0">Forward captured leads to Sales Pipeline</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={addToCrm} onChange={e => setAddToCrm(e.target.checked)} />
                                        <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:bg-primary transition-all border border-slate-300">
                                            <div className={cn(
                                                "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-2xs",
                                                addToCrm ? "translate-x-4.5" : "translate-x-0.5"
                                            )} />
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden text-xs">
                            <div className="p-5 border-b border-slate-100 bg-slate-50">
                                <h2 className="font-bold text-slate-900 m-0 text-sm">Brand Styling Tokens</h2>
                            </div>
                            <div className="p-5 grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Primary</label>
                                    <div className="relative">
                                        <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10" />
                                        <div className="w-full h-10 rounded-xl border border-slate-200/80 flex items-center justify-center gap-2 overflow-hidden shadow-2xs bg-slate-50">
                                            <div className="w-6 h-6 rounded-lg shadow-2xs border border-black/10" style={{ backgroundColor: primaryColor }} />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Background</label>
                                    <div className="relative">
                                        <input type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10" />
                                        <div className="w-full h-10 rounded-xl border border-slate-200/80 flex items-center justify-center gap-2 overflow-hidden shadow-2xs bg-slate-50">
                                            <div className="w-6 h-6 rounded-lg shadow-2xs border border-black/10" style={{ backgroundColor }} />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Text Color</label>
                                    <div className="relative">
                                        <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10" />
                                        <div className="w-full h-10 rounded-xl border border-slate-200/80 flex items-center justify-center gap-2 overflow-hidden shadow-2xs bg-slate-50">
                                            <div className="w-6 h-6 rounded-lg shadow-2xs border border-black/10" style={{ backgroundColor: textColor }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {id && (
                            <button 
                                type="button"
                                onClick={() => setEmbedDrawerVisible(true)}
                                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 rounded-xl font-semibold transition-all shadow-2xs cursor-pointer text-xs"
                            >
                                <Globe className="w-3.5 h-3.5" />
                                <span>Share & Embed Form</span>
                            </button>
                        )}

                        <button 
                            type="submit"
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                        >
                            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" /> : <Save className="w-4 h-4 shrink-0" />}
                            <span>{id ? 'Update Custom Form' : 'Save Custom Form'}</span>
                        </button>
                    </div>

                    {/* Builder Canvas */}
                    <div className="lg:col-span-8">
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl shadow-xs p-6 sm:p-8 min-h-[600px] flex flex-col">
                            <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-5">
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 mb-0.5 m-0">Interactive Fields</h2>
                                    <p className="text-xs font-semibold text-slate-500 m-0">Drag and drop fields using the handle to rearrange sequence.</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={addField}
                                    className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-100 text-primary border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer shrink-0"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add New Field</span>
                                </button>
                            </div>

                            <DndContext 
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext 
                                    items={fields.map(f => f.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="flex flex-col gap-3 flex-1">
                                        {fields.map((field, index) => (
                                            <SortableField 
                                                key={field.id} 
                                                field={field} 
                                                index={index}
                                                removeField={removeField}
                                                updateField={updateField}
                                            />
                                        ))}

                                        {fields.length === 0 && (
                                            <div className="py-20 text-center border-2 border-dashed border-slate-300 rounded-2xl bg-white/80 flex-1 flex flex-col items-center justify-center">
                                                <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-400 shadow-2xs">
                                                    <Plus className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-base font-bold text-slate-800 mb-1 m-0">No fields configured</h3>
                                                <p className="text-slate-500 text-xs font-semibold m-0">Click "Add New Field" above to start constructing your form.</p>
                                            </div>
                                        )}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    </div>
                </form>
            )}

            {/* Sliding Drawer for Embed & Share */}
            {embedDrawerVisible && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-300">
                    <div 
                        className="w-full max-w-xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 overflow-hidden text-xs"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100 shadow-2xs">
                                    <Globe className="w-4 h-4" />
                                </div>
                                <h2 className="text-lg font-bold text-slate-900 m-0 tracking-tight">Share & Embed Form</h2>
                            </div>
                            <button onClick={() => setEmbedDrawerVisible(false)} className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar">
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
                                <label className="block font-bold text-slate-700 uppercase tracking-wider">Direct Public Share Link</label>
                                <p className="text-slate-500 m-0 font-semibold">Share this standalone URL anywhere to collect form submissions directly.</p>
                                <div className="flex gap-2 pt-2">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={`${window.location.origin}/f/${id}`} 
                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold focus:outline-none shadow-2xs text-xs text-slate-700"
                                    />
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/f/${id}`);
                                            showToast('Public URL copied to clipboard!', 'success');
                                        }}
                                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition-all shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer text-xs"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy URL</span>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
                                <label className="block font-bold text-slate-700 uppercase tracking-wider">Embed on your Website (Iframe)</label>
                                <p className="text-slate-500 m-0 font-semibold">Paste this raw HTML snippet directly into your website's code or CMS.</p>
                                <div className="flex flex-col gap-3 pt-2">
                                    <textarea 
                                        readOnly 
                                        value={`<iframe src="${window.location.origin}/f/${id}?embed=true" width="100%" height="600px" style="border:none; border-radius:16px;" frameborder="0"></iframe>`}
                                        className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 font-mono focus:outline-none resize-none min-h-[100px] shadow-2xs leading-relaxed font-semibold"
                                    />
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(`<iframe src="${window.location.origin}/f/${id}?embed=true" width="100%" height="600px" style="border:none; border-radius:16px;" frameborder="0"></iframe>`);
                                            showToast('Iframe embed code copied to clipboard!', 'success');
                                        }}
                                        className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy Iframe Code</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                            <button 
                                onClick={() => setEmbedDrawerVisible(false)} 
                                className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormBuilder;
