import React from 'react';
import { 
    Trash2, 
    Smartphone, 
    Mail, 
    XCircle, 
    ArrowDown, 
    Calendar 
} from 'lucide-react';
import { ACTION_META, ActionType } from '../../constants/automation';
import { useModules } from '../../contexts/ModuleContext';
import { Module } from '../../enums';

interface AutomationNodeProps {
    node: any;
    index: number;
    isLast: boolean;
    waTemplates: any[];
    emailTemplates: any[];
    loadingWa: boolean;
    loadingEmail: boolean;
    hasWaConfig: boolean;
    availableVariables: string[];
    updateNode: (id: string, updates: any) => void;
    removeNode: (id: string) => void;
}

const AutomationNode: React.FC<AutomationNodeProps> = ({
    node, index, isLast, waTemplates, emailTemplates, loadingWa, loadingEmail, hasWaConfig, availableVariables, updateNode, removeNode
}) => {
    const { hasModule } = useModules();

    return (
        <div className="relative group">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-primary/30 hover:shadow-md transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {index + 1}
                    </div>
                    <select 
                        value={node.action || ''}
                        onChange={(e) => updateNode(node.id, { action: e.target.value })}
                        className="w-full sm:w-64 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm appearance-none"
                    >
                        <option value="" disabled>Select Action</option>
                        {Array.from(new Set(Object.values(ACTION_META).map(m => m.category))).map(category => (
                            <optgroup key={category} label={category.toUpperCase()}>
                                {Object.entries(ACTION_META)
                                    .filter(([key, meta]) => {
                                        if (meta.category !== category) return false;
                                        if (key === ActionType.SEND_WHATSAPP) return hasModule(Module.WHATSAPP);
                                        if (key === ActionType.SEND_EMAIL) return hasModule(Module.EMAIL);
                                        return true;
                                    })
                                    .map(([key, meta]) => (
                                        <option key={key} value={key}>
                                            {meta.label}
                                        </option>
                                    ))
                                }
                            </optgroup>
                        ))}
                    </select>
                    <button 
                        type="button"
                        onClick={() => removeNode(node.id)}
                        className="sm:ml-auto w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Node Level Delay */}
                <div className="mb-6">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Delay After Previous Step</span>
                    <select 
                        value={node.config?.delayMinutes || 0}
                        onChange={(e) => updateNode(node.id, { config: { ...node.config, delayMinutes: Number(e.target.value) } })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm appearance-none"
                    >
                        <option value={0}>Immediate</option>
                        <option value={5}>5 Minutes</option>
                        <option value={60}>1 Hour</option>
                        <option value={1440}>1 Day</option>
                        <option value={2880}>2 Days</option>
                        <option value={4320}>3 Days</option>
                        <option value={10080}>1 Week</option>
                    </select>
                </div>

                {node.action === ActionType.SEND_WHATSAPP && !hasWaConfig && (
                    <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                        <h4 className="text-sm font-bold text-orange-600 mb-1">WhatsApp Not Connected</h4>
                        <p className="text-xs text-orange-700/80 mb-3">You need to configure your Meta API credentials before you can send automated WhatsApp messages.</p>
                        <button 
                            type="button"
                            onClick={() => (window as any).showWaSettings && (window as any).showWaSettings()}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#25d366] text-white rounded-lg text-xs font-bold shadow-sm hover:bg-[#20bd5a] transition-colors"
                        >
                            <Smartphone className="w-3.5 h-3.5" />
                            Connect WhatsApp API
                        </button>
                    </div>
                )}

                {node.action === ActionType.SEND_WHATSAPP && hasWaConfig && (
                    <div className="mb-6">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">WhatsApp Template</span>
                        <select 
                            value={node.config?.whatsappTemplate || ''}
                            onChange={(e) => {
                                updateNode(node.id, { config: { ...node.config, whatsappTemplate: e.target.value, variableMapping: {} } });
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm appearance-none"
                        >
                            <option value="" disabled>{loadingWa ? 'Loading templates...' : 'Select verified template'}</option>
                            {waTemplates.map(t => (
                                <option key={t.name} value={t.name}>{t.name}</option>
                            ))}
                        </select>

                        {/* WhatsApp Variable Mapping UI */}
                        {node.config?.whatsappTemplate && (() => {
                            const template = waTemplates.find(t => t.name === node.config.whatsappTemplate);
                            if (!template) return null;
                            
                            const vars: string[] = [];
                            template.components?.forEach((comp: any) => {
                                if (comp.text) {
                                    const matches = Array.from(comp.text.matchAll(/{{\s*(.*?)\s*}}/g)).map((m: any) => m[1].trim());
                                    vars.push(...matches);
                                }
                            });
                            const uniqueVars = Array.from(new Set(vars)).sort((a, b) => Number(a) - Number(b));

                            if (uniqueVars.length === 0) return null;

                            return (
                                <div className="mt-4 p-4 bg-[#25d366]/5 border border-[#25d366]/20 rounded-xl">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Smartphone className="w-4 h-4 text-[#25d366]" />
                                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Template Variables</span>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {uniqueVars.map(v => (
                                            <div key={v} className="flex items-center justify-between gap-3">
                                                <span className="text-xs text-slate-500 shrink-0 font-medium">Variable &#123;&#123;{v}&#125;&#125;</span>
                                                <select 
                                                    value={node.config.variableMapping?.[v] || ''}
                                                    onChange={(e) => {
                                                        const newMapping = { ...(node.config.variableMapping || {}), [v]: e.target.value };
                                                        updateNode(node.id, { config: { ...node.config, variableMapping: newMapping } });
                                                    }}
                                                    className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#25d366]/20 shadow-sm appearance-none"
                                                >
                                                    <option value="" disabled>Map to field...</option>
                                                    {availableVariables.map(av => (
                                                        <option key={av} value={av}>{av}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {node.action === ActionType.SEND_EMAIL && (
                    <div className="mb-6">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Email Template</span>
                        <select 
                            value={node.config?.emailTemplateId || ''}
                            onChange={(e) => {
                                updateNode(node.id, { config: { ...node.config, emailTemplateId: e.target.value, variableMapping: {} } });
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm appearance-none"
                        >
                            <option value="" disabled>{loadingEmail ? 'Loading templates...' : 'Select from synced templates'}</option>
                            {emailTemplates.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.name} — {t.subject}
                                </option>
                            ))}
                        </select>

                        {/* Variable Mapping UI */}
                        {node.config?.emailTemplateId && (() => {
                            const template = emailTemplates.find(t => t.id === node.config.emailTemplateId);
                            if (!template) return null;
                            
                            const content = template.content || '';
                            const vars = Array.from(content.matchAll(/{{\s*(.*?)\s*}}/g)).map((m:any) => m[1].trim());
                            const uniqueVars = Array.from(new Set(vars));

                            if (uniqueVars.length === 0) return null;

                            return (
                                <div className="mt-4 p-4 bg-primary/5 border border-primary/10 rounded-xl">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Mail className="w-4 h-4 text-primary" />
                                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Template Personalization</span>
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {uniqueVars.map(v => (
                                            <div key={v} className="flex items-center justify-between gap-3">
                                                <span className="text-xs text-slate-500 shrink-0 font-medium">{v}</span>
                                                <select 
                                                    value={node.config.variableMapping?.[v] || ''}
                                                    onChange={(e) => {
                                                        const newMapping = { ...(node.config.variableMapping || {}), [v]: e.target.value };
                                                        updateNode(node.id, { config: { ...node.config, variableMapping: newMapping } });
                                                    }}
                                                    className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm appearance-none"
                                                >
                                                    <option value="" disabled>Map to field...</option>
                                                    {availableVariables.map(av => (
                                                        <option key={av} value={av}>{av}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {node.action === ActionType.CREATE_BOOKING && (
                    <div className="mb-6">
                        <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                            <div className="flex items-center gap-2 mb-3">
                                <Calendar className="w-4 h-4 text-primary" />
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Booking Details Mapping</span>
                            </div>
                            
                            <div className="flex flex-col gap-3">
                                {['guest_name', 'phone', 'booking_date'].map(field => (
                                    <div key={field} className="flex items-center justify-between gap-3">
                                        <span className="text-xs text-slate-500 shrink-0 font-medium capitalize">{field.replace('_', ' ')}</span>
                                        <select 
                                            value={node.config?.variableMapping?.[field] || ''}
                                            onChange={(e) => {
                                                const newMapping = { ...(node.config?.variableMapping || {}), [field]: e.target.value };
                                                updateNode(node.id, { config: { ...node.config, variableMapping: newMapping } });
                                            }}
                                            className="flex-1 bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm appearance-none"
                                        >
                                            <option value="" disabled>Map to variable...</option>
                                            {availableVariables.map(av => (
                                                <option key={av} value={av}>{av}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Failover Logic */}
                <div className="mt-4 p-4 bg-red-50/50 border border-red-100 border-dashed rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Failover Protection</span>
                    </div>
                    <select 
                        value={node.failover || ''}
                        onChange={(e) => updateNode(node.id, { failover: e.target.value === '' ? null : e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 shadow-sm appearance-none mb-2"
                    >
                        <option value="">Stop Workflow (Default)</option>
                        {Array.from(new Set(Object.values(ACTION_META).map(m => m.category))).map(category => (
                            <optgroup key={category} label={category.toUpperCase()}>
                                {Object.entries(ACTION_META)
                                    .filter(([key, meta]) => {
                                        if (meta.category !== category) return false;
                                        if (key === node.action) return false;
                                        if (key === 'send_whatsapp') return hasModule(Module.WHATSAPP);
                                        if (key === 'send_email') return hasModule(Module.EMAIL);
                                        return true;
                                    })
                                    .map(([key, meta]) => (
                                        <option key={key} value={key}>
                                            {meta.label}
                                        </option>
                                    ))
                                }
                            </optgroup>
                        ))}
                    </select>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                        Choose an alternative action if the primary delivery channel fails or is not available.
                    </p>
                </div>

                {!isLast && (
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
                        <div className="h-8 w-0.5 bg-primary/20"></div>
                        <ArrowDown className="w-4 h-4 text-primary absolute -bottom-2" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AutomationNode;
