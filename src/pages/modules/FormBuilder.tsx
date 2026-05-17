import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { formsApi } from '../../api/forms';
import { message } from 'antd'; // Keeping only message for toast

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
            "bg-white border rounded-3xl p-6 mb-5 relative transition-all shadow-sm",
            isDragging ? "border-primary shadow-2xl scale-[1.02] opacity-95 ring-2 ring-primary/20" : "border-slate-200/80 hover:border-slate-300 hover:shadow-md"
        )}>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div {...attributes} {...listeners} className="cursor-grab hover:bg-slate-100 p-2 rounded-xl -ml-2 text-slate-400 hover:text-slate-700 transition-colors">
                        <GripVertical className="w-5 h-5" />
                    </div>
                    <span className="font-extrabold text-slate-800 text-sm">Field #{index + 1}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        type="button"
                        title="Custom Validation Rules"
                        onClick={() => setShowValidation(!showValidation)}
                        className={cn(
                            "p-2.5 rounded-xl transition-all cursor-pointer shadow-2xs",
                            showValidation ? "bg-primary/10 text-primary font-black border border-primary/20" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700 border border-slate-200/60 bg-slate-50"
                        )}
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                    <button 
                        type="button"
                        onClick={() => removeField(field.id)}
                        className="p-2.5 text-rose-500 bg-rose-50 border border-rose-200 hover:bg-rose-100 hover:text-rose-700 rounded-xl transition-colors cursor-pointer shadow-2xs"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-5">
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Field Label</label>
                    <input 
                        type="text"
                        value={field.label} 
                        onChange={e => updateField(field.id, { label: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-white"
                    />
                </div>
                <div className="md:col-span-4">
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Input Type</label>
                    <select 
                        value={field.type} 
                        onChange={e => updateField(field.id, { type: e.target.value as any })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-white appearance-none cursor-pointer"
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
                <div className="md:col-span-3 flex items-center md:pt-7">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={field.required}
                                onChange={e => updateField(field.id, { required: e.target.checked })}
                            />
                            <div className={cn(
                                "w-12 h-7 rounded-full transition-colors relative border shadow-inner",
                                field.required ? "bg-primary border-primary" : "bg-slate-200 border-slate-300 group-hover:bg-slate-300"
                            )}>
                                <div className={cn(
                                    "absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-md",
                                    field.required ? "translate-x-6" : "translate-x-1"
                                )} />
                            </div>
                        </div>
                        <span className="text-sm font-extrabold text-slate-700">Required</span>
                    </label>
                </div>
            </div>

            {showValidation && (
                <div className="mt-6 p-6 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in slide-in-from-top-2 shadow-2xs">
                    <span className="text-xs font-black text-primary uppercase tracking-wider block mb-4">Custom Validation Rules</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-xs font-extrabold text-slate-700 mb-2 uppercase tracking-wider">Min Length/Value</label>
                            <input 
                                type="number" 
                                value={field.validation?.min || ''} 
                                onChange={e => updateField(field.id, { validation: { ...field.validation, min: parseInt(e.target.value) || undefined } })}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-extrabold text-slate-700 mb-2 uppercase tracking-wider">Max Length/Value</label>
                            <input 
                                type="number" 
                                value={field.validation?.max || ''} 
                                onChange={e => updateField(field.id, { validation: { ...field.validation, max: parseInt(e.target.value) || undefined } })}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-extrabold text-slate-700 mb-2 uppercase tracking-wider">Regex Pattern</label>
                            <input 
                                placeholder="e.g. ^[A-Z]+$" 
                                value={field.validation?.pattern || ''} 
                                onChange={e => updateField(field.id, { validation: { ...field.validation, pattern: e.target.value } })}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-extrabold text-slate-700 mb-2 uppercase tracking-wider">Error Message</label>
                            <input 
                                placeholder="Message to show if pattern fails" 
                                value={field.validation?.patternMessage || ''} 
                                onChange={e => updateField(field.id, { validation: { ...field.validation, patternMessage: e.target.value } })}
                                className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                    </div>
                </div>
            )}

            {field.type === 'select' && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                    <label className="block text-xs font-extrabold text-slate-700 mb-2 uppercase tracking-wider">Dropdown Options (one per line)</label>
                    <textarea 
                        placeholder="Option 1&#10;Option 2" 
                        value={field.options?.join('\n') || ''}
                        onChange={e => updateField(field.id, { options: e.target.value.split('\n').filter(o => o.trim()) })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[120px] resize-y transition-all focus:bg-white"
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
            message.error('Failed to fetch form details');
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
            return message.error('Form title is required');
        }

        if (fields.length === 0) {
            return message.warning('Please add at least one field to the form');
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
                message.success('Form updated successfully');
            } else {
                await formsApi.createForm(payload);
                message.success('Form created successfully');
            }
            navigate('/dashboard/forms');
        } catch (e) {
            message.error('Failed to save form');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={() => navigate('/dashboard/forms')}
                    className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 m-0 tracking-tight">{id ? 'Edit Custom Form' : 'Create Custom Form Builder'}</h1>
                    <p className="text-sm text-slate-500 mt-1 m-0">Design and configure interactive multi-field forms for visitor lead capture.</p>
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
                        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/80">
                                <h2 className="font-extrabold text-slate-900 m-0 text-base">Form Settings</h2>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                <div>
                                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Form Title *</label>
                                    <input 
                                        required
                                        value={title} 
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="e.g. Lead Qualification Form" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Description</label>
                                    <textarea 
                                        value={description} 
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Shown below the title" 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white min-h-[100px] transition-all resize-none"
                                    />
                                </div>

                                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <label className="text-sm font-extrabold text-slate-900 block">Form Access Status</label>
                                        <p className="text-xs font-medium text-slate-500 m-0">Enable or disable form submission</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                                        <div className="w-12 h-7 bg-slate-200 rounded-full peer peer-checked:bg-primary transition-all border border-slate-300 shadow-inner">
                                            <div className={cn(
                                                "absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-md",
                                                isActive ? "translate-x-6" : "translate-x-1"
                                            )} />
                                        </div>
                                    </label>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <label className="text-sm font-extrabold text-slate-900 block">Auto-Sync to CRM</label>
                                        <p className="text-xs font-medium text-slate-500 m-0">Forward captured leads to Sales Pipeline</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={addToCrm} onChange={e => setAddToCrm(e.target.checked)} />
                                        <div className="w-12 h-7 bg-slate-200 rounded-full peer peer-checked:bg-primary transition-all border border-slate-300 shadow-inner">
                                            <div className={cn(
                                                "absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-md",
                                                addToCrm ? "translate-x-6" : "translate-x-1"
                                            )} />
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/80">
                                <h2 className="font-extrabold text-slate-900 m-0 text-base">Brand Styling Tokens</h2>
                            </div>
                            <div className="p-6 grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">Primary</label>
                                    <div className="relative">
                                        <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10" />
                                        <div className="w-full h-12 rounded-2xl border border-slate-200/80 flex items-center justify-center gap-2 overflow-hidden shadow-2xs bg-slate-50">
                                            <div className="w-7 h-7 rounded-xl shadow-md border border-black/10" style={{ backgroundColor: primaryColor }} />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">Background</label>
                                    <div className="relative">
                                        <input type="color" value={backgroundColor} onChange={e => setBackgroundColor(e.target.value)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10" />
                                        <div className="w-full h-12 rounded-2xl border border-slate-200/80 flex items-center justify-center gap-2 overflow-hidden shadow-2xs bg-slate-50">
                                            <div className="w-7 h-7 rounded-xl shadow-md border border-black/10" style={{ backgroundColor }} />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">Text Color</label>
                                    <div className="relative">
                                        <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10" />
                                        <div className="w-full h-12 rounded-2xl border border-slate-200/80 flex items-center justify-center gap-2 overflow-hidden shadow-2xs bg-slate-50">
                                            <div className="w-7 h-7 rounded-xl shadow-md border border-black/10" style={{ backgroundColor: textColor }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {id && (
                            <button 
                                type="button"
                                onClick={() => setEmbedDrawerVisible(true)}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-2xl font-extrabold transition-all shadow-2xs cursor-pointer"
                            >
                                <Globe className="w-4 h-4" /> Share & Embed Form
                            </button>
                        )}

                        <button 
                            type="submit"
                            disabled={saving}
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl text-base font-extrabold shadow-lg shadow-primary/20 transition-all disabled:opacity-50 hover:-translate-y-0.5 cursor-pointer"
                            style={{ color: '#ffffff' }}
                        >
                            {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                            {id ? 'Update Custom Form' : 'Save Custom Form'}
                        </button>
                    </div>

                    {/* Builder Canvas */}
                    <div className="lg:col-span-8">
                        <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl shadow-sm p-6 lg:p-8 min-h-[650px] flex flex-col">
                            <div className="flex justify-between items-center mb-8 border-b border-slate-200/60 pb-6">
                                <div>
                                    <h2 className="text-xl font-extrabold text-slate-900 mb-1 m-0">Interactive Fields</h2>
                                    <p className="text-sm text-slate-500 m-0">Drag and drop fields using the handle to rearrange sequence.</p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={addField}
                                    className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 text-primary border border-slate-200 rounded-2xl text-sm font-extrabold shadow-2xs transition-all hover:border-primary/30 hover:-translate-y-0.5 cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" /> Add New Field
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
                                            <div className="py-24 text-center border-2 border-dashed border-slate-300 rounded-3xl bg-white/60 flex-1 flex flex-col items-center justify-center">
                                                <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-2xs">
                                                    <Plus className="w-8 h-8" />
                                                </div>
                                                <h3 className="text-lg font-extrabold text-slate-800 mb-1 m-0">No fields configured</h3>
                                                <p className="text-slate-500 text-sm font-medium m-0">Click "Add New Field" above to start constructing your form.</p>
                                            </div>
                                        )}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>
                    </div>
                </form>
            )}

            {/* Sliding Drawer for Embed & Share (Replaced Modal) */}
            {embedDrawerVisible && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div 
                        className="w-full max-w-xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center p-8 border-b border-slate-100 bg-slate-50/80 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold border border-blue-500/20">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-extrabold text-slate-900 m-0 tracking-tight">Share & Embed Form</h2>
                            </div>
                            <button onClick={() => setEmbedDrawerVisible(false)} className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-3">
                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">Direct Public Share Link</label>
                                <p className="text-xs text-slate-500 m-0">Share this standalone URL anywhere to collect form submissions directly.</p>
                                <div className="flex gap-2.5 pt-2">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={`${window.location.origin}/f/${id}`} 
                                        className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-700 font-bold focus:outline-none shadow-2xs"
                                    />
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/f/${id}`);
                                            message.success('Public URL copied to clipboard!');
                                        }}
                                        className="px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-2xl transition-all shadow-md shrink-0 flex items-center gap-2 cursor-pointer"
                                        style={{ color: '#ffffff' }}
                                    >
                                        <Copy className="w-4 h-4" /> Copy URL
                                    </button>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 space-y-3">
                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">Embed on your Website (Iframe)</label>
                                <p className="text-xs text-slate-500 m-0">Paste this raw HTML snippet directly into your website's code or CMS.</p>
                                <div className="flex flex-col gap-3 pt-2">
                                    <textarea 
                                        readOnly 
                                        value={`<iframe src="${window.location.origin}/f/${id}?embed=true" width="100%" height="600px" style="border:none; border-radius:16px;" frameborder="0"></iframe>`}
                                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 font-mono focus:outline-none resize-none min-h-[120px] shadow-2xs leading-relaxed"
                                    />
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(`<iframe src="${window.location.origin}/f/${id}?embed=true" width="100%" height="600px" style="border:none; border-radius:16px;" frameborder="0"></iframe>`);
                                            message.success('Iframe embed code copied to clipboard!');
                                        }}
                                        className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer"
                                        style={{ color: '#ffffff' }}
                                    >
                                        <Copy className="w-4 h-4" /> Copy Iframe Code
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
                            <button 
                                onClick={() => setEmbedDrawerVisible(false)} 
                                className="px-8 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold rounded-2xl text-sm transition-all cursor-pointer"
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
