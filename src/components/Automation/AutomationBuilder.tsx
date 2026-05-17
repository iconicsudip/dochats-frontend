import React from 'react';
import { 
    ArrowLeft, Zap, FileText, GitMerge, Plus, Copy
} from 'lucide-react';
import { TRIGGER_META, FLOW_TEMPLATES, TriggerType } from '../../constants/automation';
import AutomationNode from './AutomationNode';
import { automationApi } from '../../api/automation';
import { message } from 'antd';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface AutomationBuilderProps {
    editingRuleId: string | null;
    ruleForm: { name: string; trigger: string; delay: number; config: any };
    setRuleForm: React.Dispatch<React.SetStateAction<{ name: string; trigger: string; delay: number; config: any }>>;
    nodes: any[];
    forms: any[];
    waTemplates: any[];
    emailTemplates: any[];
    loadingWa: boolean;
    loadingEmail: boolean;
    hasWaConfig: boolean;
    exitBuilder: () => void;
    handleAdd: (e?: React.FormEvent) => void;
    setNodes: (nodes: any[]) => void;
    addNode: () => void;
    removeNode: (id: string) => void;
    updateNode: (id: string, updates: any) => void;
    applyTemplate: (template: any) => void;
}

const AutomationBuilder: React.FC<AutomationBuilderProps> = ({
    editingRuleId, ruleForm, setRuleForm, nodes, forms, waTemplates, emailTemplates, loadingWa, loadingEmail,
    hasWaConfig, exitBuilder, handleAdd, setNodes, addNode, removeNode, updateNode, applyTemplate
}) => {
    const selectedTrigger = ruleForm.trigger;
    const selectedFormId = ruleForm.config?.formId;

    const [triggerMetadata, setTriggerMetadata] = React.useState<Record<string, { variables: string[] }>>({});

    React.useEffect(() => {
        automationApi.getMetadata()
            .then(data => setTriggerMetadata(data))
            .catch(err => console.error('Failed to load trigger metadata', err));
    }, []);

    const toSnakeCase = (str: string) => str?.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^\w]/g, '') || '';

    const availableVariables = React.useMemo(() => {
        if (!selectedTrigger) return [];
        
        let vars: string[] = [];
        const standard = triggerMetadata[selectedTrigger as TriggerType]?.variables || [];

        if (selectedTrigger === TriggerType.FORM_SUBMITTED) {
            if (selectedFormId) {
                const selectedForm = forms.find(f => f.id === selectedFormId);
                if (selectedForm?.fields) {
                    const formVars = selectedForm.fields.map((f: any) => toSnakeCase(f.label));
                    vars = Array.from(new Set([...formVars, ...standard]));
                }
            }
        } else {
            vars = standard;
        }
        return vars;
    }, [selectedTrigger, selectedFormId, forms, triggerMetadata]);

    const handleTriggerChange = (val: string) => {
        setRuleForm(prev => ({ ...prev, trigger: val, config: val !== TriggerType.FORM_SUBMITTED ? { ...prev.config, formId: undefined } : prev.config }));
        
        // Clear all variable mappings when trigger changes
        const updatedNodes = nodes.map((n: any) => ({
            ...n,
            config: {
                ...n.config,
                variableMapping: {}
            }
        }));
        setNodes(updatedNodes);
    };

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={exitBuilder} 
                    className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-sm"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 m-0">
                        {editingRuleId ? 'Edit Neural Flow' : 'Create Neural Flow'}
                    </h1>
                    <p className="text-sm text-slate-500">Design an intelligent multi-path automation sequence.</p>
                </div>
            </div>

            {!editingRuleId && nodes.length <= 1 && !ruleForm.name && (
                <div className="mb-10">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-4">Or Start with an Industry Blueprint</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {FLOW_TEMPLATES.map(t => (
                            <div 
                                key={t.name}
                                onClick={() => applyTemplate(t)}
                                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group"
                            >
                                <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wide mb-3">
                                    {t.industry}
                                </span>
                                <h3 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-primary transition-colors">{t.name}</h3>
                                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{t.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <form onSubmit={handleAdd} className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Rule Name *</label>
                        <input 
                            required
                            type="text" 
                            placeholder="e.g. New Lead → Welcome Sequence" 
                            value={ruleForm.name}
                            onChange={e => setRuleForm(prev => ({...prev, name: e.target.value}))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm" 
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">When this happens... *</label>
                            <select 
                                required
                                value={ruleForm.trigger}
                                onChange={e => handleTriggerChange(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm appearance-none"
                            >
                                <option value="" disabled>Select trigger</option>
                                {Array.from(new Set(Object.values(TRIGGER_META).map(m => m.module))).map(module => (
                                    <optgroup key={module} label={module.toUpperCase()}>
                                        {Object.entries(TRIGGER_META)
                                            .filter(([_, meta]) => meta.module === module)
                                            .map(([key, meta]) => (
                                                <option key={key} value={key}>{meta.label}</option>
                                            ))
                                        }
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Initial Delay (minutes)</label>
                            <select 
                                value={ruleForm.delay}
                                onChange={e => setRuleForm(prev => ({...prev, delay: Number(e.target.value)}))}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm appearance-none"
                            >
                                <option value={0}>Immediate</option>
                                <option value={5}>5 Minutes</option>
                                <option value={30}>30 Minutes</option>
                                <option value={60}>1 Hour</option>
                                <option value={1440}>24 Hours</option>
                            </select>
                        </div>
                    </div>                    
                    
                    {availableVariables.length > 0 && (selectedTrigger !== TriggerType.FORM_SUBMITTED || selectedFormId) && (
                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                            <div className="flex items-center gap-2 mb-3">
                                <Zap className="w-4 h-4 text-primary" />
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Available Variables</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {availableVariables.map(v => (
                                    <button 
                                        type="button"
                                        key={v}
                                        title="Click to copy"
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-md text-[11px] font-bold hover:bg-slate-50 hover:text-primary hover:border-primary/30 transition-colors shadow-sm"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`{{${v}}}`);
                                            message.success(`Copied {{${v}}}`);
                                        }}
                                    >
                                        <Copy className="w-3 h-3" />
                                        {`{{${v}}}`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Trigger Context: Form Mapping */}
                {selectedTrigger === TriggerType.FORM_SUBMITTED && (
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 m-0">Form Integration Context</h3>
                                <p className="text-xs text-slate-500">Map form fields to communication channels.</p>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Source Form *</label>
                            <select 
                                required
                                value={ruleForm.config?.formId || ''}
                                onChange={e => setRuleForm(prev => ({...prev, config: {...prev.config, formId: e.target.value}}))}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm appearance-none"
                            >
                                <option value="" disabled>Select the form that triggers this</option>
                                {forms.map(f => (
                                    <option key={f.id} value={f.id}>{f.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-4 my-10">
                    <div className="h-px bg-slate-200 flex-1" />
                    <div className="flex items-center gap-2 text-primary">
                        <GitMerge className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Neural Flow Canvas</span>
                    </div>
                    <div className="h-px bg-slate-200 flex-1" />
                </div>

                {/* Flow Nodes */}
                <div className="flex flex-col gap-8 mb-10 relative">
                    {nodes.map((node, i) => {
                        return (
                            <AutomationNode 
                                key={node.id}
                                node={node}
                                index={i}
                                isLast={i === nodes.length - 1}
                                waTemplates={waTemplates}
                                emailTemplates={emailTemplates}
                                loadingWa={loadingWa}
                                loadingEmail={loadingEmail}
                                hasWaConfig={hasWaConfig}
                                availableVariables={availableVariables}
                                updateNode={updateNode}
                                removeNode={removeNode}
                            />
                        );
                    })}
                    <button 
                        type="button"
                        onClick={addNode} 
                        className="w-full h-16 border-2 border-dashed border-slate-200 hover:border-primary/40 bg-slate-50/50 hover:bg-primary/5 rounded-2xl flex items-center justify-center gap-2 text-slate-500 hover:text-primary transition-all font-bold shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                        Append Next Step
                    </button>
                </div>

                <div className="flex justify-end gap-4 pt-8 border-t border-slate-100">
                    <button 
                        type="button" 
                        onClick={exitBuilder} 
                        className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={nodes.length === 0}
                        className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all disabled:opacity-50 min-w-[200px]"
                    >
                        {editingRuleId ? 'Update Neural Flow' : 'Activate Neural Flow'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AutomationBuilder;