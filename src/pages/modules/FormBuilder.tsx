import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { formsApi } from '../../api/forms';
import apiClient from '../../api/apiClient';
import PublicForm from '../PublicForm';

// Dnd Kit Imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    rectSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Icons
import { Plus, Trash2, Save, ArrowLeft, GripVertical, Settings, Copy, Globe, Check, X, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

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

interface FormField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'email' | 'tel' | 'textarea' | 'select' | 'date' | 'date_time_calendar' | 'image';
    required: boolean;
    options?: string[];
    stepId?: string;
    dependsOnFieldId?: string;
    colSpan?: number;
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
    isMultistep?: boolean;
    steps?: { id: string; title: string; description: string; dependsOnFieldId?: string; showWhenValue?: string; }[];
    fields: FormField[];
}

const SortableField: React.FC<SortableItemProps> = ({ field, index, removeField, updateField, isMultistep, steps, fields }) => {
    const [showValidation, setShowValidation] = useState(false);
    const [selectedParentValue, setSelectedParentValue] = useState<string>('');
    const [newOptionText, setNewOptionText] = useState('');

    const parentField = field.dependsOnFieldId 
        ? fields.find(f => f.id === field.dependsOnFieldId)
        : null;
    
    const parentOptions = React.useMemo(() => {
        return (parentField?.options || []).map((opt: string) => opt.split('|')[0].trim());
    }, [parentField?.options]);

    useEffect(() => {
        if (field.dependsOnFieldId && parentOptions.length > 0) {
            if (!selectedParentValue || !parentOptions.includes(selectedParentValue)) {
                setSelectedParentValue(parentOptions[0]);
            }
        } else {
            setSelectedParentValue('');
        }
    }, [field.dependsOnFieldId, parentOptions, selectedParentValue]);

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
            "col-span-12 bg-white border rounded-2xl p-5 sm:p-6 mb-0 relative transition-all shadow-xs",
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

            <div className="flex flex-wrap gap-4 items-end text-xs">
                <div className="flex-1 min-w-[200px]">
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Field Label</label>
                    <input 
                        type="text"
                        value={field.label} 
                        onChange={e => updateField(field.id, { label: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-white"
                    />
                </div>
                <div className="flex-1 min-w-[160px]">
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
                        <option value="date">Simple Date</option>
                        <option value="date_time_calendar">Date & Time Calendar (Antd)</option>
                        <option value="select">Dropdown</option>
                        <option value="image">Image Upload</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[220px]">
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Field Width</label>
                    <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 w-full h-[38px] items-center">
                        {[
                            { label: '16.6%', value: 2 },
                            { label: '25%', value: 3 },
                            { label: '33%', value: 4 },
                            { label: '50%', value: 6 },
                            { label: '100%', value: 12 },
                        ].map((w) => {
                            const isSelected = (field.colSpan || 12) === w.value;
                            return (
                                <button
                                    key={w.value}
                                    type="button"
                                    onClick={() => updateField(field.id, { colSpan: w.value })}
                                    className={cn(
                                        "flex-1 text-[10px] font-extrabold py-1.5 rounded-lg transition-all cursor-pointer text-center select-none",
                                        isSelected
                                            ? "bg-white text-slate-800 shadow-2xs border border-slate-200/40"
                                            : "text-slate-500 hover:text-slate-800"
                                    )}
                                >
                                    {w.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="flex items-center h-[38px] pb-0.5 shrink-0 min-w-[100px]">
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

            {isMultistep && steps && steps.length > 0 && (
                <div className="w-full mt-4 pt-4 border-t border-slate-100">
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Assign to Step</label>
                    <select 
                        value={field.stepId || ''} 
                        onChange={e => updateField(field.id, { stepId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-white cursor-pointer"
                    >
                        <option value="">-- Choose Step --</option>
                        {steps.map(s => (
                            <option key={s.id} value={s.id}>{s.title || 'Untitled Step'}</option>
                        ))}
                    </select>
                </div>
            )}

            {field.type === 'image' && (
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={field.options?.includes('multiple=true') || false}
                                onChange={e => {
                                    const isMultiple = e.target.checked;
                                    updateField(field.id, { options: isMultiple ? ['multiple=true'] : ['multiple=false'] });
                                }}
                            />
                            <div className={cn(
                                "w-10 h-6 rounded-full transition-colors relative border",
                                field.options?.includes('multiple=true') ? "bg-primary border-primary" : "bg-slate-200 border-slate-300 group-hover:bg-slate-300"
                            )}>
                                <div className={cn(
                                    "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-2xs",
                                    field.options?.includes('multiple=true') ? "translate-x-4.5" : "translate-x-0.5"
                                )} />
                            </div>
                        </div>
                        <span className="text-xs font-bold text-slate-700">Allow Multiple Images</span>
                    </label>
                </div>
            )}

            {field.type === 'date_time_calendar' && (
                <div className="mt-4 pt-4 border-t border-slate-100 text-xs">
                    <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                            <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={field.options?.includes('range=true') || false}
                                onChange={e => {
                                    const isRange = e.target.checked;
                                    updateField(field.id, { options: isRange ? ['range=true'] : [] });
                                }}
                            />
                            <div className={cn(
                                "w-10 h-6 rounded-full transition-colors relative border",
                                field.options?.includes('range=true') ? "bg-primary border-primary" : "bg-slate-200 border-slate-300 group-hover:bg-slate-300"
                            )}>
                                <div className={cn(
                                    "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-2xs",
                                    field.options?.includes('range=true') ? "translate-x-4.5" : "translate-x-0.5"
                                )} />
                            </div>
                        </div>
                        <span className="text-xs font-bold text-slate-700">Enable Range Selection (Check-in / Check-out)</span>
                    </label>
                </div>
            )}

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

            {field.type === 'select' && (() => {
                const currentParentValueOptions = (field.options || [])
                    .filter(opt => {
                        const parts = opt.split('|');
                        return parts.length > 1 && parts[1].trim() === selectedParentValue;
                    })
                    .map(opt => opt.split('|')[0].trim());

                const updateOptionsForParent = (newItems: string[]) => {
                    const otherOptions = (field.options || []).filter(opt => {
                        const parts = opt.split('|');
                        return parts.length <= 1 || parts[1].trim() !== selectedParentValue;
                    });
                    const newParentOptions = newItems.map(item => `${item} | ${selectedParentValue}`);
                    updateField(field.id, { options: [...otherOptions, ...newParentOptions] });
                };

                return (
                    <div className="mt-5 pt-5 border-t border-slate-100 text-xs space-y-4">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Depends on Field (Conditional Render)</label>
                            <select
                                value={field.dependsOnFieldId || ''}
                                onChange={e => {
                                    updateField(field.id, { dependsOnFieldId: e.target.value || undefined, options: [] });
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-white cursor-pointer"
                            >
                                <option value="">-- No Dependency (Always Show All Options) --</option>
                                {fields
                                    .filter(f => f.type === 'select' && f.id !== field.id)
                                    .map(f => (
                                        <option key={f.id} value={f.id}>{f.label || `Field (#${fields.indexOf(f) + 1})`}</option>
                                    ))
                                }
                            </select>
                        </div>

                        {field.dependsOnFieldId ? (
                            <>
                                {parentOptions.length === 0 ? (
                                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl font-bold">
                                        Parent field has no options defined. Add options to the parent field first.
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block font-bold text-slate-700 mb-2 uppercase tracking-wider">Select Parent Option to Configure:</label>
                                            <div className="flex flex-wrap gap-2 mb-1.5">
                                                {parentOptions.map(pOpt => {
                                                    const count = (field.options || [])
                                                        .filter(opt => {
                                                            const parts = opt.split('|');
                                                            return parts.length > 1 && parts[1].trim() === pOpt;
                                                        }).length;
                                                    const isSelected = selectedParentValue === pOpt;
                                                    return (
                                                        <button
                                                            key={pOpt}
                                                            type="button"
                                                            onClick={() => setSelectedParentValue(pOpt)}
                                                            className={cn(
                                                                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer shadow-3xs",
                                                                isSelected
                                                                    ? "bg-primary border-primary text-white shadow-xs"
                                                                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                            )}
                                                        >
                                                            <span>{pOpt}</span>
                                                            <span className={cn(
                                                                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                                                isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                                                            )}>
                                                                {count}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider">Dropdown Options for "{selectedParentValue}" ({currentParentValueOptions.length})</label>
                                            <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                                                {currentParentValueOptions.map((opt, idx) => (
                                                    <div key={idx} className="flex items-center justify-between bg-white border border-slate-200/80 rounded-xl p-2.5">
                                                        <span className="font-semibold text-slate-700">{opt}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newItems = currentParentValueOptions.filter((_, i) => i !== idx);
                                                                updateOptionsForParent(newItems);
                                                            }}
                                                            className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {currentParentValueOptions.length === 0 && (
                                                    <p className="text-slate-400 text-xs italic m-0 py-2">No options added yet for this parent option.</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder={`Add option for ${selectedParentValue}...`}
                                                value={newOptionText}
                                                onChange={e => setNewOptionText(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (newOptionText.trim()) {
                                                            updateOptionsForParent([...currentParentValueOptions, newOptionText.trim()]);
                                                            setNewOptionText('');
                                                        }
                                                    }
                                                }}
                                                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-semibold"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (newOptionText.trim()) {
                                                        updateOptionsForParent([...currentParentValueOptions, newOptionText.trim()]);
                                                        setNewOptionText('');
                                                    }
                                                }}
                                                className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-all shadow-xs shrink-0 flex items-center justify-center cursor-pointer"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider">Dropdown Options ({(field.options || []).length})</label>
                                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                                        {(field.options || []).map((opt, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white border border-slate-200/80 rounded-xl p-2.5">
                                                <span className="font-semibold text-slate-700">{opt}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newOptions = (field.options || []).filter((_, i) => i !== idx);
                                                        updateField(field.id, { options: newOptions });
                                                    }}
                                                    className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                        {(field.options || []).length === 0 && (
                                            <p className="text-slate-400 text-xs italic m-0 py-2">No options added yet.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add option..."
                                        value={newOptionText}
                                        onChange={e => setNewOptionText(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (newOptionText.trim()) {
                                                    updateField(field.id, { options: [...(field.options || []), newOptionText.trim()] });
                                                    setNewOptionText('');
                                                }
                                            }
                                        }}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all font-semibold"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (newOptionText.trim()) {
                                                updateField(field.id, { options: [...(field.options || []), newOptionText.trim()] });
                                                setNewOptionText('');
                                            }
                                        }}
                                        className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition-all shadow-xs shrink-0 flex items-center justify-center cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                );
            })()}
        </div>
    );
};


interface SortableThankYouBlockProps {
    block: any;
    index: number;
    totalBlocks: number;
    updateThankYouBlock: (blockId: string, updates: any) => void;
    moveThankYouBlock: (index: number, direction: 'up' | 'down') => void;
    smartLinks: any[];
}

const SortableThankYouBlock: React.FC<SortableThankYouBlockProps> = ({
    block,
    index,
    totalBlocks,
    updateThankYouBlock,
    moveThankYouBlock,
    smartLinks
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id });

    const style = {
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
        zIndex: isDragging ? 100 : 1,
    };

    return (
        <div 
            ref={setNodeRef}
            style={style}
            className={cn(
                "bg-white border rounded-2xl p-5 relative transition-all text-xs",
                isDragging 
                    ? "border-primary shadow-xl scale-[1.02] opacity-95 ring-2 ring-primary/20" 
                    : "border-slate-200/80 hover:border-slate-300 hover:shadow-md",
                !block.visible && "opacity-60 bg-slate-50/50"
            )}
        >
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <div {...attributes} {...listeners} className="cursor-grab hover:bg-slate-100 p-1.5 rounded-lg -ml-1.5 text-slate-400 hover:text-slate-700 transition-colors">
                        <GripVertical className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] bg-slate-100 px-2.5 py-1 rounded-md">
                        {block.type === 'booking_summary' ? 'Booking Summary' : block.type}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => updateThankYouBlock(block.id, { visible: !block.visible })}
                        className={cn(
                            "p-2 rounded-xl transition-all cursor-pointer border shadow-2xs flex items-center justify-center",
                            block.visible 
                                ? "text-slate-500 hover:bg-slate-100 border-slate-200" 
                                : "text-slate-400 bg-slate-100 border-slate-300"
                        )}
                        title={block.visible ? "Hide Block" : "Show Block"}
                    >
                        {block.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveThankYouBlock(index, 'up')}
                        className="p-2 text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-40 cursor-pointer shadow-2xs"
                    >
                        <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        disabled={index === totalBlocks - 1}
                        onClick={() => moveThankYouBlock(index, 'down')}
                        className="p-2 text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-xl disabled:opacity-40 cursor-pointer shadow-2xs"
                    >
                        <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {block.type === 'icon' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">Select Icon type</label>
                            <select
                                value={block.value}
                                onChange={e => updateThankYouBlock(block.id, { value: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold"
                            >
                                <option value="check-circle">Check Circle</option>
                                <option value="heart">Heart</option>
                                <option value="star">Star</option>
                                <option value="calendar">Calendar</option>
                                <option value="home">Home / Villa</option>
                                <option value="smile">Smile</option>
                            </select>
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">Icon Color</label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="color"
                                    value={block.color || '#10b981'}
                                    onChange={e => updateThankYouBlock(block.id, { color: e.target.value })}
                                    className="w-10 h-8 rounded border cursor-pointer p-0"
                                />
                                <span className="font-semibold text-slate-600 font-mono uppercase">{block.color || '#10b981'}</span>
                            </div>
                        </div>
                    </div>
                )}

                {block.type === 'title' && (
                    <div>
                        <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">Title Text</label>
                        <input
                            type="text"
                            value={block.value}
                            onChange={e => updateThankYouBlock(block.id, { value: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                )}

                {block.type === 'message' && (
                    <div>
                        <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">Message Body Text</label>
                        <textarea
                            value={block.value}
                            onChange={e => updateThankYouBlock(block.id, { value: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold min-h-[60px] focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                    </div>
                )}

                {block.type === 'booking_summary' && (
                    <div>
                        <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">Summary Box Header</label>
                        <input
                            type="text"
                            value={block.value}
                            onChange={e => updateThankYouBlock(block.id, { value: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">This box dynamically extracts values from date/time slots and service selections to show a neat ticket preview to visitors.</p>
                    </div>
                )}

                {block.type === 'button' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">Button Label</label>
                            <input
                                type="text"
                                value={block.label || ''}
                                onChange={e => updateThankYouBlock(block.id, { label: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">Redirect URL (Leave blank to stay on page)</label>
                            <input
                                type="text"
                                value={block.url || ''}
                                placeholder="e.g. https://mywebsite.com"
                                onChange={e => updateThankYouBlock(block.id, { url: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>
                )}

                {block.type === 'connect_whatsapp' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">Button Label</label>
                            <input
                                type="text"
                                value={block.label || ''}
                                onChange={e => updateThankYouBlock(block.id, { label: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">WhatsApp Link / Phone Number</label>
                            <input
                                type="text"
                                value={block.url || ''}
                                placeholder="e.g. https://wa.me/919876543210"
                                onChange={e => updateThankYouBlock(block.id, { url: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>
                )}

                {block.type === 'connect_livechat' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">Button Label</label>
                            <input
                                type="text"
                                value={block.label || ''}
                                onChange={e => updateThankYouBlock(block.id, { label: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block font-bold text-slate-700 mb-1 uppercase tracking-wider text-[10px]">Connected Smart Link</label>
                            <select
                                value={block.slug || ''}
                                onChange={e => updateThankYouBlock(block.id, { slug: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer text-xs"
                            >
                                <option value="">-- Choose Chat Link --</option>
                                {smartLinks.map((link: any) => (
                                    <option key={link.id} value={link.slug}>{link.title || link.slug}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const FormBuilder: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    
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

    // Multi-Step / Layout / Thank You states
    const [isMultistep, setIsMultistep] = useState(false);
    const [layout, setLayout] = useState<'default' | 'custom' | 'horizontal'>('default');
    const [steps, setSteps] = useState<{ id: string; title: string; description: string; dependsOnFieldId?: string; showWhenValue?: string }[]>([]);
    const [stepsSidebarTitle, setStepsSidebarTitle] = useState('Booking Steps');
    const [submitButtonText, setSubmitButtonText] = useState('Submit Response');
    const [thankYouBlocks, setThankYouBlocks] = useState<any[]>([
        { id: 'icon', type: 'icon', value: 'check-circle', color: '#10b981', visible: true },
        { id: 'title', type: 'title', value: 'Booking Requested!', visible: true },
        { id: 'msg', type: 'message', value: 'We have received your salon treatment query. A confirmation SMS will be sent shortly.', visible: true },
        { id: 'summary', type: 'booking_summary', value: 'Show booking details', visible: true },
        { id: 'btn_whatsapp', type: 'connect_whatsapp', label: 'Message Host on WhatsApp', url: 'https://wa.me/', visible: false },
        { id: 'btn_livechat', type: 'connect_livechat', label: 'Chat Live with Host', slug: '', visible: false },
        { id: 'btn', type: 'button', label: 'Done', url: '', visible: true }
    ]);
    const [activeTab, setActiveTab] = useState<'fields' | 'thankYou'>('fields');
    const [activeStepTab, setActiveStepTab] = useState<string>('');

    // New CTA Tracking & Preview States
    const [smartLinks, setSmartLinks] = useState<any[]>([]);
    const [previewOpen, setPreviewOpen] = useState(false);

    const ensureCtaBlocks = (blocks: any[]) => {
        const updated = [...blocks];
        if (!updated.some(b => b.type === 'connect_whatsapp')) {
            const btnIdx = updated.findIndex(b => b.type === 'button');
            const block = { id: 'btn_whatsapp', type: 'connect_whatsapp', label: 'Message Host on WhatsApp', url: 'https://wa.me/', visible: false };
            if (btnIdx !== -1) updated.splice(btnIdx, 0, block);
            else updated.push(block);
        }
        if (!updated.some(b => b.type === 'connect_livechat')) {
            const btnIdx = updated.findIndex(b => b.type === 'button');
            const block = { id: 'btn_livechat', type: 'connect_livechat', label: 'Chat Live with Host', slug: '', visible: false };
            if (btnIdx !== -1) updated.splice(btnIdx, 0, block);
            else updated.push(block);
        }
        return updated;
    };

    const { data: smartLinksData } = useQuery({
        queryKey: ['smart-links'],
        queryFn: () => apiClient.get('/links?limit=500').then(res => res.data?.data || res.data || [])
    });

    useEffect(() => {
        if (smartLinksData) setSmartLinks(smartLinksData);
    }, [smartLinksData]);

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

    const { data: formData, isLoading: loadingForm } = useQuery({
        queryKey: ['form', id],
        queryFn: () => formsApi.getForm(id!),
        enabled: !!id
    });

    useEffect(() => {
        if (formData) {
            const data = formData.data;
            setTitle(data.title || '');
            setDescription(data.description || '');
            setIsActive(data.isActive !== false);
            setAddToCrm(data.addToCrm || false);
            setPrimaryColor(data.design?.primaryColor || '#2563eb');
            setBackgroundColor(data.design?.backgroundColor || '#f8fafc');
            setTextColor(data.design?.textColor || '#0f172a');
            
            const isMs = data.design?.isMultistep || false;
            const lay = data.design?.layout || 'default';
            const stps = data.design?.steps || [];
            setIsMultistep(isMs);
            setLayout(lay);
            setSteps(stps);
            setStepsSidebarTitle(data.design?.stepsSidebarTitle || 'Booking Steps');
            setSubmitButtonText(data.design?.submitButtonText || (isMs ? 'Book Appointment' : 'Submit Response'));
            if (stps.length > 0) {
                setActiveStepTab(stps[0].id);
            }
            setThankYouBlocks(ensureCtaBlocks(data.design?.thankYouPage?.blocks || []));
            setFields(data.fields.map((f: any) => ({ ...f, validation: f.validation || {} })));
            setLoading(false);
        } else if (location.state?.template) {
            const template = location.state.template;
            setTitle(template.title || '');
            setDescription(template.description || '');
            setPrimaryColor(template.design?.primaryColor || '#2563eb');
            setBackgroundColor(template.design?.backgroundColor || '#f8fafc');
            setTextColor(template.design?.textColor || '#0f172a');
            
            const isMs = template.design?.isMultistep || false;
            const lay = template.design?.layout || 'default';
            const stps = template.design?.steps || [];
            
            setIsMultistep(isMs);
            setLayout(lay);
            setSteps(stps);
            setStepsSidebarTitle(template.design?.stepsSidebarTitle || 'Booking Steps');
            setSubmitButtonText(template.design?.submitButtonText || (isMs ? 'Book Appointment' : 'Submit Response'));
            if (stps.length > 0) {
                setActiveStepTab(stps[0].id);
            }
            setThankYouBlocks(ensureCtaBlocks(template.design?.thankYouPage?.blocks || [
                { id: 'icon', type: 'icon', value: 'check-circle', color: '#10b981', visible: true },
                { id: 'title', type: 'title', value: 'Booking Requested!', visible: true },
                { id: 'msg', type: 'message', value: 'We have received your salon treatment query. A confirmation SMS will be sent shortly.', visible: true },
                { id: 'summary', type: 'booking_summary', value: 'Show booking details', visible: true },
                { id: 'btn_whatsapp', type: 'connect_whatsapp', label: 'Message Host on WhatsApp', url: 'https://wa.me/', visible: false },
                { id: 'btn_livechat', type: 'connect_livechat', label: 'Chat Live with Host', slug: '', visible: false },
                { id: 'btn', type: 'button', label: 'Done', url: '', visible: true }
            ]));

            setFields(template.fields.map((f: any) => ({ 
                ...f, 
                id: f.id || Date.now().toString() + Math.random().toString(),
                validation: f.validation || {}
            })));
        } else if (!id) {
            setFields([
                { id: '1', label: 'Full Name', type: 'text', required: true, validation: {} },
                { id: '2', label: 'Email Address', type: 'email', required: true, validation: {} }
            ]);
        }
    }, [formData, id, location.state]);

    const createFormMutation = useMutation({
        mutationFn: (data: any) => formsApi.createForm(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forms'] })
    });

    const updateFormMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => formsApi.updateForm(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forms'] })
    });

    useEffect(() => {
        if (isMultistep && steps.length === 0) {
            setSteps([
                { id: 'step-1', title: 'Step 1', description: 'Step Description' }
            ]);
            setActiveStepTab('step-1');
        }
    }, [isMultistep]);

    useEffect(() => {
        if (steps.length > 0 && (!activeStepTab || !steps.some(s => s.id === activeStepTab))) {
            setActiveStepTab(steps[0].id);
        }
    }, [steps, activeStepTab]);

    // Step Operations
    const addStep = () => {
        const newStepId = 'step-' + Math.random().toString(36).substring(2, 9);
        const newStep = {
            id: newStepId,
            title: `Step ${steps.length + 1}`,
            description: 'Step Description'
        };
        setSteps([...steps, newStep]);
        setActiveStepTab(newStepId);
    };

    const updateStep = (stepId: string, updates: Partial<{ title: string; description: string; dependsOnFieldId?: string; showWhenValue?: string }>) => {
        setSteps(steps.map(s => s.id === stepId ? { ...s, ...updates } : s));
    };

    const deleteStep = (stepId: string) => {
        if (steps.length <= 1) {
            showToast('Cannot delete the last step. A multi-step form must have at least one step.', 'warning');
            return;
        }
        const updatedSteps = steps.filter(s => s.id !== stepId);
        setSteps(updatedSteps);
        
        const fallbackStepId = updatedSteps[0].id;
        setFields(fields.map(f => f.stepId === stepId ? { ...f, stepId: fallbackStepId } : f));
        
        if (activeStepTab === stepId) {
            setActiveStepTab(fallbackStepId);
        }
        showToast('Step deleted and fields reassigned.', 'success');
    };

    const moveStep = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= steps.length) return;
        const updated = [...steps];
        const temp = updated[index];
        updated[index] = updated[newIndex];
        updated[newIndex] = temp;
        setSteps(updated);
    };

    const addField = () => {
        const newField: FormField = {
            id: Date.now().toString(),
            label: 'New Field',
            type: 'text',
            required: false,
            validation: {},
            stepId: isMultistep ? (activeStepTab || (steps[0] ? steps[0].id : undefined)) : undefined
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
                const activeField = items.find(f => f.id === active.id);
                const overField = items.find(f => f.id === over.id);
                if (!activeField || !overField) return items;

                if (isMultistep) {
                    const activeStepId = activeField.stepId || (steps[0] ? steps[0].id : '');
                    const stepFields = items.filter(f => (f.stepId || (steps[0] ? steps[0].id : '')) === activeStepId);
                    
                    const oldSubIndex = stepFields.findIndex(f => f.id === active.id);
                    const newSubIndex = stepFields.findIndex(f => f.id === over.id);
                    const movedStepFields = arrayMove(stepFields, oldSubIndex, newSubIndex);

                    const reassembled: FormField[] = [];
                    steps.forEach(s => {
                        if (s.id === activeStepId) {
                            reassembled.push(...movedStepFields);
                        } else {
                            reassembled.push(...items.filter(f => (f.stepId || (steps[0] ? steps[0].id : '')) === s.id));
                        }
                    });
                    const unmatched = items.filter(f => !steps.some(s => s.id === (f.stepId || (steps[0] ? steps[0].id : ''))));
                    reassembled.push(...unmatched);
                    return reassembled;
                } else {
                    const oldIndex = items.findIndex((item) => item.id === active.id);
                    const newIndex = items.findIndex((item) => item.id === over.id);
                    return arrayMove(items, oldIndex, newIndex);
                }
            });
        }
    };

    // Thank You Block Drag & Drop (array move)
    const handleThankYouDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setThankYouBlocks((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const updateThankYouBlock = (blockId: string, updates: any) => {
        setThankYouBlocks(thankYouBlocks.map(b => b.id === blockId ? { ...b, ...updates } : b));
    };

    const moveThankYouBlock = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= thankYouBlocks.length) return;
        const updated = [...thankYouBlocks];
        const temp = updated[index];
        updated[index] = updated[newIndex];
        updated[newIndex] = temp;
        setThankYouBlocks(updated);
    };

    const applyThankYouPreset = (type: 'salon' | 'rental' | 'restaurant' | 'general') => {
        if (type === 'salon') {
            setThankYouBlocks(ensureCtaBlocks([
                { id: 'icon', type: 'icon', value: 'check-circle', color: '#00a884', visible: true },
                { id: 'title', type: 'title', value: 'Booking Requested!', visible: true },
                { id: 'msg', type: 'message', value: 'We have received your salon treatment query. A confirmation SMS will be sent shortly.', visible: true },
                { id: 'summary', type: 'booking_summary', value: 'Show booking details', visible: true },
                { id: 'btn', type: 'button', label: 'Back to Salon Website', url: 'https://mysalon.com', visible: true }
            ]));
            showToast('Salon thank you preset applied!', 'success');
        } else if (type === 'rental') {
            setThankYouBlocks(ensureCtaBlocks([
                { id: 'icon', type: 'icon', value: 'check-circle', color: '#4f46e5', visible: true },
                { id: 'title', type: 'title', value: 'Reservation Reserved!', visible: true },
                { id: 'msg', type: 'message', value: 'Thank you for booking with us. Your room/vehicle is temporarily held pending ID verification.', visible: true },
                { id: 'summary', type: 'booking_summary', value: 'Show rental overview', visible: true },
                { id: 'btn', type: 'button', label: 'Explore Activities', url: 'https://myresort.com/activities', visible: true }
            ]));
            showToast('Rental thank you preset applied!', 'success');
        } else if (type === 'restaurant') {
            setThankYouBlocks(ensureCtaBlocks([
                { id: 'icon', type: 'icon', value: 'check-circle', color: '#e11d48', visible: true },
                { id: 'title', type: 'title', value: 'Table Reserved!', visible: true },
                { id: 'msg', type: 'message', value: 'Thank you for booking with us. We have reserved your table. See you soon!', visible: true },
                { id: 'summary', type: 'booking_summary', value: 'Show Reservation Summary', visible: true },
                { id: 'btn_whatsapp', type: 'connect_whatsapp', label: 'Message Host on WhatsApp', url: 'https://wa.me/', visible: true },
                { id: 'btn_livechat', type: 'connect_livechat', label: 'Chat Live with Host', slug: '', visible: false },
                { id: 'btn', type: 'button', label: 'Done', url: '', visible: true }
            ]));
            showToast('Restaurant thank you preset applied!', 'success');
        } else {
            setThankYouBlocks(ensureCtaBlocks([
                { id: 'icon', type: 'icon', value: 'check-circle', color: '#2563eb', visible: true },
                { id: 'title', type: 'title', value: 'Thank You!', visible: true },
                { id: 'msg', type: 'message', value: 'Your response has been submitted successfully.', visible: true },
                { id: 'summary', type: 'booking_summary', value: 'View Summary', visible: false },
                { id: 'btn', type: 'button', label: 'Submit Another Response', url: '', visible: true }
            ]));
            showToast('General thank you preset applied!', 'success');
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
                    isMultistep,
                    layout,
                    steps,
                    stepsSidebarTitle,
                    submitButtonText,
                    thankYouPage: {
                        template: 'custom',
                        blocks: thankYouBlocks
                    }
                },
                fields
            };

            if (id) {
                await updateFormMutation.mutateAsync({ id, data: payload });
                showToast('Form updated successfully', 'success');
            } else {
                await createFormMutation.mutateAsync(payload);
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

                                <div className="pt-5 border-t border-slate-100 flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <label className="font-bold text-slate-900 block">Multi-Step Form</label>
                                        <p className="font-semibold text-slate-500 m-0">Split fields across multiple wizard steps</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={isMultistep} onChange={e => setIsMultistep(e.target.checked)} />
                                        <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:bg-primary transition-all border border-slate-300">
                                            <div className={cn(
                                                "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-2xs",
                                                isMultistep ? "translate-x-4.5" : "translate-x-0.5"
                                            )} />
                                        </div>
                                    </label>
                                </div>

                                <div className="pt-5 border-t border-slate-100 space-y-2">
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider">Form Layout / Design Mode</label>
                                    <select
                                        value={layout}
                                        onChange={e => {
                                            const val = e.target.value as 'default' | 'custom' | 'horizontal';
                                            setLayout(val);
                                            if (val === 'custom' && !isMultistep) {
                                                setIsMultistep(true);
                                                showToast('Enabled Multi-Step Form for Premium Custom Layout', 'success');
                                            }
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-white appearance-none cursor-pointer"
                                    >
                                        <option value="default">Default Form Layout</option>
                                        <option value="custom">Custom Form Design (Premium Sidebar)</option>
                                    </select>
                                </div>

                                {layout === 'custom' && isMultistep && (
                                    <div className="pt-5 border-t border-slate-100 space-y-2">
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider">Steps Sidebar Title</label>
                                        <p className="text-slate-500 font-semibold m-0 text-[11px]">Customize the heading shown above the steps list (e.g. "Booking Steps", "Stay Booking Steps")</p>
                                        <input
                                            type="text"
                                            value={stepsSidebarTitle}
                                            onChange={e => setStepsSidebarTitle(e.target.value)}
                                            placeholder="e.g. Booking Steps"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-white"
                                        />
                                    </div>
                                )}

                                <div className="pt-5 border-t border-slate-100 space-y-2">
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider">Submit Button Text</label>
                                    <p className="text-slate-500 font-semibold m-0 text-[11px]">Text shown on the final submit button (e.g. "Submit Response", "Book Now", "Confirm Booking")</p>
                                    <input
                                        type="text"
                                        value={submitButtonText}
                                        onChange={e => setSubmitButtonText(e.target.value)}
                                        placeholder="e.g. Submit Response"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all focus:bg-white"
                                    />
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
                            type="button"
                            onClick={() => setPreviewOpen(true)}
                            className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-semibold transition-all shadow-2xs cursor-pointer text-xs"
                        >
                            <Eye className="w-3.5 h-3.5 shrink-0" />
                            <span>Preview Form Design</span>
                        </button>

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
                            {/* Tab Switcher */}
                            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl mb-6">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('fields')}
                                    className={cn(
                                        "flex-1 py-2 px-4 rounded-lg font-bold text-xs transition-all cursor-pointer text-center",
                                        activeTab === 'fields' 
                                            ? "bg-white text-slate-900 shadow-2xs border border-slate-200/40" 
                                            : "text-slate-500 hover:text-slate-800"
                                    )}
                                >
                                    Form Fields
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('thankYou')}
                                    className={cn(
                                        "flex-1 py-2 px-4 rounded-lg font-bold text-xs transition-all cursor-pointer text-center",
                                        activeTab === 'thankYou' 
                                            ? "bg-white text-slate-900 shadow-2xs border border-slate-200/40" 
                                            : "text-slate-500 hover:text-slate-800"
                                    )}
                                >
                                    Thank You Page Editor
                                </button>
                            </div>

                            {activeTab === 'fields' ? (
                                <>
                                    <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-5">
                                        <div>
                                            <h2 className="text-base font-bold text-slate-900 mb-0.5 m-0">Interactive Fields</h2>
                                            <p className="text-xs font-semibold text-slate-500 m-0">
                                                {isMultistep 
                                                    ? "Configure and sort fields for the active step below." 
                                                    : "Drag and drop fields using the handle to rearrange sequence."
                                                }
                                            </p>
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

                                    {isMultistep && (
                                        <div className="mb-6 p-4 bg-white border border-slate-200/80 rounded-xl space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">Form Steps</span>
                                                <button
                                                    type="button"
                                                    onClick={addStep}
                                                    className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg font-bold text-[11px] transition-all cursor-pointer"
                                                >
                                                    + Add Step
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {steps.map((step, idx) => (
                                                    <button
                                                        key={step.id}
                                                        type="button"
                                                        onClick={() => setActiveStepTab(step.id)}
                                                        className={cn(
                                                            "px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5",
                                                            activeStepTab === step.id
                                                                ? "bg-primary border-primary text-white shadow-xs animate-pulse"
                                                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                                                        )}
                                                    >
                                                        <span>{step.title || `Step ${idx + 1}`}</span>
                                                        {step.dependsOnFieldId && step.showWhenValue && (
                                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 font-bold border border-violet-200">
                                                                conditional
                                                            </span>
                                                        )}
                                                        {steps.length > 1 && (
                                                            <span 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteStep(step.id);
                                                                }}
                                                                className="hover:text-rose-200 text-slate-400 p-0.5 rounded ml-1"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>

                                            {activeStepTab && steps.find(s => s.id === activeStepTab) && (
                                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                                    <div>
                                                        <label className="block font-bold text-slate-700 mb-1">Step Title</label>
                                                        <input
                                                            type="text"
                                                            value={steps.find(s => s.id === activeStepTab)?.title || ''}
                                                            onChange={e => updateStep(activeStepTab, { title: e.target.value })}
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block font-bold text-slate-700 mb-1">Step Description</label>
                                                        <input
                                                            type="text"
                                            value={steps.find(s => s.id === activeStepTab)?.description || ''}
                                                            onChange={e => updateStep(activeStepTab, { description: e.target.value })}
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-200/40">
                                                        <button
                                                            type="button"
                                                            disabled={steps.findIndex(s => s.id === activeStepTab) === 0}
                                                            onClick={() => moveStep(steps.findIndex(s => s.id === activeStepTab), 'up')}
                                                            className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg font-semibold disabled:opacity-50 text-[11px] cursor-pointer flex items-center gap-1"
                                                        >
                                                            <ChevronUp className="w-3 h-3" /> Move Up
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={steps.findIndex(s => s.id === activeStepTab) === steps.length - 1}
                                                            onClick={() => moveStep(steps.findIndex(s => s.id === activeStepTab), 'down')}
                                                            className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg font-semibold disabled:opacity-50 text-[11px] cursor-pointer flex items-center gap-1"
                                                        >
                                                            <ChevronDown className="w-3 h-3" /> Move Down
                                                        </button>
                                                    </div>

                                                    {/* Conditional Step Visibility */}
                                                    <div className="md:col-span-2 pt-3 border-t border-slate-200/40 space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                                            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Conditional Visibility</span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-semibold m-0">Show this step only when a specific field has a certain value. Leave empty to always show.</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase tracking-wider">Show When Field</label>
                                                                <select
                                                                    value={steps.find(s => s.id === activeStepTab)?.dependsOnFieldId || ''}
                                                                    onChange={e => updateStep(activeStepTab, { dependsOnFieldId: e.target.value || undefined, showWhenValue: undefined })}
                                                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-[11px] cursor-pointer"
                                                                >
                                                                    <option value="">— Always Show (No Condition) —</option>
                                                                    {fields
                                                                        .filter(f => f.type === 'select')
                                                                        .map(f => (
                                                                            <option key={f.id} value={f.id}>{f.label || `Field #${fields.indexOf(f) + 1}`}</option>
                                                                        ))
                                                                    }
                                                                </select>
                                                            </div>
                                                            {steps.find(s => s.id === activeStepTab)?.dependsOnFieldId && (() => {
                                                                const depField = fields.find(f => f.id === steps.find(s => s.id === activeStepTab)?.dependsOnFieldId);
                                                                const depOptions = (depField?.options || []).map((o: string) => o.split('|')[0].trim());
                                                                return (
                                                                    <div>
                                                                        <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase tracking-wider">Equals Value</label>
                                                                        <select
                                                                            value={steps.find(s => s.id === activeStepTab)?.showWhenValue || ''}
                                                                            onChange={e => updateStep(activeStepTab, { showWhenValue: e.target.value || undefined })}
                                                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 font-semibold focus:outline-none focus:ring-1 focus:ring-primary text-[11px] cursor-pointer"
                                                                        >
                                                                            <option value="">— Select a value —</option>
                                                                            {depOptions.map((opt: string) => (
                                                                                <option key={opt} value={opt}>{opt}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                        {steps.find(s => s.id === activeStepTab)?.dependsOnFieldId && steps.find(s => s.id === activeStepTab)?.showWhenValue && (
                                                            <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-100 rounded-lg">
                                                                <span className="text-[10px] font-bold text-violet-700">
                                                                    ✓ This step shows only when "{fields.find(f => f.id === steps.find(s => s.id === activeStepTab)?.dependsOnFieldId)?.label}" = "{steps.find(s => s.id === activeStepTab)?.showWhenValue}"
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <DndContext 
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext 
                                            items={fields.filter(f => !isMultistep || (f.stepId || (steps[0] ? steps[0].id : '')) === activeStepTab).map(f => f.id)}
                                            strategy={rectSortingStrategy}
                                        >
                                            <div className="grid grid-cols-12 gap-5 flex-1 items-start">
                                                {fields
                                                    .filter(field => !isMultistep || (field.stepId || (steps[0] ? steps[0].id : '')) === activeStepTab)
                                                    .map((field, idx) => (
                                                        <SortableField 
                                                            key={field.id} 
                                                            field={field} 
                                                            index={fields.indexOf(field)}
                                                            removeField={removeField}
                                                            updateField={updateField}
                                                            isMultistep={isMultistep}
                                                            steps={steps}
                                                            fields={fields}
                                                        />
                                                    ))
                                                }

                                                {fields.filter(field => !isMultistep || (field.stepId || (steps[0] ? steps[0].id : '')) === activeStepTab).length === 0 && (
                                                    <div className="col-span-12 py-20 text-center border-2 border-dashed border-slate-300 rounded-2xl bg-white/80 flex-1 flex flex-col items-center justify-center">
                                                        <div className="w-12 h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-400 shadow-2xs">
                                                            <Plus className="w-6 h-6" />
                                                        </div>
                                                        <h3 className="text-base font-bold text-slate-800 mb-1 m-0">No fields in this section</h3>
                                                        <p className="text-slate-500 text-xs font-semibold m-0">Click "Add New Field" above to start adding fields to this step.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </>
                            ) : (
                                <div className="space-y-6 flex-1 flex flex-col">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-slate-200 pb-5">
                                        <div>
                                            <h2 className="text-base font-bold text-slate-900 mb-0.5 m-0">Thank You Page Template Editor</h2>
                                            <p className="text-xs font-semibold text-slate-500 m-0">Customize and reorder sections displayed to customers post-submission.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => applyThankYouPreset('salon')}
                                                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg font-bold text-[10px] cursor-pointer"
                                            >
                                                Salon Preset
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => applyThankYouPreset('rental')}
                                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded-lg font-bold text-[10px] cursor-pointer"
                                            >
                                                Rental Preset
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => applyThankYouPreset('restaurant')}
                                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg font-bold text-[10px] cursor-pointer"
                                            >
                                                Restaurant Preset
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => applyThankYouPreset('general')}
                                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg font-bold text-[10px] cursor-pointer"
                                            >
                                                General Preset
                                            </button>
                                        </div>
                                    </div>

                                    <DndContext 
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleThankYouDragEnd}
                                    >
                                        <SortableContext 
                                            items={thankYouBlocks.map(b => b.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="flex flex-col gap-4 flex-1">
                                                {thankYouBlocks.map((block, index) => (
                                                    <SortableThankYouBlock 
                                                        key={block.id}
                                                        block={block}
                                                        index={index}
                                                        totalBlocks={thankYouBlocks.length}
                                                        updateThankYouBlock={updateThankYouBlock}
                                                        moveThankYouBlock={moveThankYouBlock}
                                                        smartLinks={smartLinks}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </div>
                            )}
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

            {/* Preview Modal Dialog */}
            {previewOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 md:p-10 animate-in fade-in duration-300">
                    <div className="bg-slate-100 rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
                        {/* Preview Header */}
                        <div className="flex justify-between items-center px-6 py-4 bg-white border-b border-slate-200 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shadow-3xs">
                                    <Eye className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900 m-0 leading-tight">Live Form Preview</h2>
                                    <p className="text-[10px] text-slate-500 m-0 font-medium">Interactive sandbox simulation of the customer experience.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setPreviewOpen(false)}
                                className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all shadow-3xs cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        {/* Preview Body */}
                        <div className="flex-1 overflow-auto bg-slate-50 relative">
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-amber-500/90 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-amber-400/20 backdrop-blur-xs select-none">
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                <span>Preview Mode &middot; Submissions Simulated</span>
                            </div>
                            <PublicForm 
                                previewData={{
                                    title,
                                    description,
                                    fields,
                                    design: {
                                        primaryColor,
                                        backgroundColor,
                                        textColor,
                                        isMultistep,
                                        layout,
                                        steps,
                                        stepsSidebarTitle,
                                        submitButtonText,
                                        thankYouPage: {
                                            template: 'custom',
                                            blocks: thankYouBlocks
                                        }
                                    }
                                }}
                                onClosePreview={() => setPreviewOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormBuilder;
