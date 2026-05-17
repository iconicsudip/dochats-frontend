import React from 'react';
import { 
    ArrowLeft, Zap, FileText, GitMerge, Plus, Copy
} from 'lucide-react';
import { TRIGGER_META, FLOW_TEMPLATES, TriggerType } from '../../constants/automation';
import AutomationNode from './AutomationNode';
import { automationApi } from '../../api/automation';
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
    showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const AutomationBuilder: React.FC<AutomationBuilderProps> = ({
    editingRuleId, ruleForm, setRuleForm, nodes, forms, waTemplates, emailTemplates, loadingWa, loadingEmail,
    hasWaConfig, exitBuilder, handleAdd, setNodes, addNode, removeNode, updateNode, applyTemplate, showToast
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
        <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-500 font-sans text-slate-800">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8 bg-white border border-slate-200/80 p-6 rounded-2xl shadow-xs">
                <button 
                    onClick={exitBuilder} 
                    className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer shrink-0"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight">
                        {editingRuleId ? 'Edit Neural Flow' : 'Create Neural Flow'}
                    </h1>
                    <p className="text-xs font-semibold text-slate-500 m-0 mt-0.5">Design an intelligent multi-path automation sequence.</p>
                </div>
            </div>

            {!editingRuleId && nodes.length <= 1 && !ruleForm.name && (
                <div className="mb-8">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Or Start with an Industry Blueprint</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {FLOW_TEMPLATES.map(t => (
                            <div 
                                key={t.name}
                                onClick={() => applyTemplate(t)}
                                className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group shadow-2xs flex flex-col justify-between"
                            >
                                <div>
                                    <span className="inline-block px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-lg uppercase tracking-wider mb-3">
                                        {t.industry}
                                    </span>
                                    <h3 className="text-xs font-bold text-slate-900 m-0 mb-1.5 group-hover:text-primary transition-colors leading-tight">{t.name}</h3>
                                </div>
                                <p className="text-xs font-semibold text-slate-500 m-0 line-clamp-2 leading-relaxed mt-1">{t.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <form onSubmit={handleAdd} className="space-y-6">
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-6 text-xs">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Rule Name *</label>
                        <input 
                            required
                            type="text" 
                            placeholder="e.g. New Lead → Welcome Sequence" 
                            value={ruleForm.name}
                            onChange={e => setRuleForm(prev => ({...prev, name: e.target.value}))}
                            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all" 
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">When this happens... *</label>
                            <select 
                                required
                                value={ruleForm.trigger}
                                onChange={e => handleTriggerChange(e.target.value)}
                                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                            >
                                <option value="" disabled>Select trigger</option>
                                {Array.from(new Set(Object.values(TRIGGER_META).map(m => m.module))).map(module => (
                                    <optgroup key={module} label={module.toUpperCase()} className="font-bold">
                                        {Object.entries(TRIGGER_META)
                                            .filter(([_, meta]) => meta.module === module)
                                            .map(([key, meta]) => (
                                                <option key={key} value={key} className="font-medium">{meta.label}</option>
                                            ))
                                        }
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Initial Delay</label>
                            <select 
                                value={ruleForm.delay}
                                onChange={e => setRuleForm(prev => ({...prev, delay: Number(e.target.value)}))}
                                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
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
                        <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10">
                            <div className="flex items-center gap-2 mb-3">
                                <Zap className="w-4 h-4 text-primary" />
                                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Available Variables</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {availableVariables.map(v => (
                                    <button 
                                        type="button"
                                        key={v}
                                        title="Click to copy"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all shadow-2xs cursor-pointer"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`{{${v}}}`);
                                            showToast(`Copied {{${v}}}`, 'success');
                                        }}
                                    >
                                        <Copy className="w-3 h-3 text-slate-400 group-hover:text-primary" />
                                        <span>{`{{${v}}}`}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Trigger Context: Form Mapping */}
                {selectedTrigger === TriggerType.FORM_SUBMITTED && (
                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 text-xs">
                        <div className="flex items-center gap-3.5 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 m-0">Form Integration Context</h3>
                                <p className="text-xs font-semibold text-slate-500 m-0 mt-0.5">Map form fields to communication channels.</p>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Source Form *</label>
                            <select 
                                required
                                value={ruleForm.config?.formId || ''}
                                onChange={e => setRuleForm(prev => ({...prev, config: {...prev.config, formId: e.target.value}}))}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs transition-all"
                            >
                                <option value="" disabled>Select the form that triggers this</option>
                                {forms.map(f => (
                                    <option key={f.id} value={f.id}>{f.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-4 my-8">
                    <div className="h-px bg-slate-200 flex-1" />
                    <div className="flex items-center gap-2 text-primary font-bold">
                        <GitMerge className="w-4 h-4" />
                        <span className="text-[10px] uppercase tracking-widest font-bold">Neural Flow Canvas</span>
                    </div>
                    <div className="h-px bg-slate-200 flex-1" />
                </div>

                {/* Flow Nodes */}
                <div className="flex flex-col gap-8 mb-8 relative">
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
                        className="w-full h-14 border-2 border-dashed border-slate-200 hover:border-primary/40 bg-white hover:bg-primary/5 rounded-2xl flex items-center justify-center gap-2 text-slate-500 hover:text-primary transition-all font-bold text-xs shadow-2xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Append Next Step</span>
                    </button>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 shrink-0">
                    <button 
                        type="button" 
                        onClick={exitBuilder} 
                        className="px-6 py-2.5 bg-slate-100 border border-slate-200/80 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-all cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={nodes.length === 0}
                        className="px-8 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer font-bold"
                    >
                        {editingRuleId ? 'Update Neural Flow' : 'Activate Neural Flow'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AutomationBuilder;