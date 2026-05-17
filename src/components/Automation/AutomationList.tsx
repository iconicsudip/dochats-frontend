import React from 'react';
import { 
    Plus, Zap, Trash2, Edit2, PlayCircle, Clock, Eye, History, X, Network
} from 'lucide-react';
import { TRIGGER_META, ACTION_META, TriggerType, ActionType, FLOW_TEMPLATES } from '../../constants/automation';
import { AutomationRule } from '../../api/automation';
import { Module } from '../../enums';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface AutomationListProps {
    rules: AutomationRule[];
    hasModule: (mod: Module) => boolean;
    setWaSettingsOpen: (open: boolean) => void;
    enterBuilder: (rule?: AutomationRule, template?: any) => void;
    toggleRule: (id: string) => void;
    handleDeleteRule: (id: string) => void;
    onRefresh: () => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const AutomationList: React.FC<AutomationListProps> = ({
    rules, hasModule, setWaSettingsOpen, enterBuilder, toggleRule, handleDeleteRule, onRefresh, showToast
}) => {
    const [showTemplates, setShowTemplates] = React.useState(false);
    const [viewingFlow, setViewingFlow] = React.useState<AutomationRule | null>(null);
    const [manualRunRule, setManualRunRule] = React.useState<AutomationRule | null>(null);
    const [viewingLogs, setViewingLogs] = React.useState<AutomationRule | null>(null);
    
    const stats = {
        total: rules.length,
        active: rules.filter(r => r.enabled).length,
        totalRuns: rules.reduce((a, r) => a + (r.runs || 0), 0),
    };

    return (
        <div className="animate-in fade-in duration-500 pb-20 font-sans text-slate-800">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white border border-slate-200/80 p-6 sm:p-8 rounded-2xl shadow-xs">
                <div>
                    <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100 shadow-2xs">
                            <Zap className="w-5 h-5 text-amber-500" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight">Automation Engine</h1>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 m-0">
                        Design intelligent flows to connect your channels and automate your business operations.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0">
                    <button 
                        onClick={() => setShowTemplates(!showTemplates)}
                        className={cn(
                            "w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer",
                            showTemplates ? "bg-primary text-white hover:bg-primary-hover shadow-primary/20 font-bold" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                        )}
                    >
                        <Network className="w-4 h-4" />
                        <span>{showTemplates ? "Hide Blueprints" : "Explore Blueprints"}</span>
                    </button>
                    <button 
                        onClick={() => enterBuilder()}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer font-bold"
                    >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>Create Flow</span>
                    </button>
                </div>
            </div>

            {/* Industry Templates Section */}
            {showTemplates && (
                <div className="mb-8 p-6 bg-primary/5 rounded-2xl border border-primary/10 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-2 mb-5">
                        <Network className="w-5 h-5 text-primary" />
                        <h2 className="text-base font-bold text-slate-900 m-0 tracking-tight">Ready-to-Use Industry Blueprints</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {FLOW_TEMPLATES.map(t => (
                            <div 
                                key={t.name}
                                onClick={() => enterBuilder(undefined, t)}
                                className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group flex flex-col h-full shadow-2xs"
                            >
                                <div className="mb-auto">
                                    <span className="inline-block px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-lg uppercase tracking-wider mb-3">
                                        {t.industry}
                                    </span>
                                    <h3 className="text-xs font-bold text-slate-900 m-0 mb-1.5 group-hover:text-primary transition-colors leading-tight">{t.name}</h3>
                                </div>
                                <p className="text-xs font-semibold text-slate-500 m-0 line-clamp-2 leading-relaxed mt-2">{t.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                {[
                    { label: 'Total Rules', value: stats.total, color: 'text-purple-600' },
                    { label: 'Active Rules', value: stats.active, color: 'text-emerald-600' },
                    { label: 'Total Runs', value: stats.totalRuns, color: 'text-blue-600' },
                ].map((s, i) => (
                    <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs hover:shadow-sm transition-shadow">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">{s.label}</span>
                        <div className={cn("text-3xl font-bold tracking-tight", s.color)}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Rules List */}
            <div className="flex flex-col gap-4">
                {rules.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center shadow-xs flex flex-col items-center">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100 shadow-2xs">
                            <Network className="w-7 h-7 text-slate-300" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 mb-1 m-0">No automation rules yet</h3>
                        <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 font-semibold m-0 leading-relaxed">Start by creating your first automated flow to handle leads, send messages, and sync your business tools.</p>
                        <button 
                            onClick={() => enterBuilder()}
                            className="text-primary text-xs font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                            <span>Create your first flow</span>
                            <Plus className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    rules.map(rule => {
                        const trig = TRIGGER_META[rule.trigger as TriggerType];
                        const borderColor = rule.enabled ? (trig?.color || '#3b82f6') : '#94a3b8';
                        
                        return (
                            <div 
                                key={rule.id} 
                                className="bg-white rounded-2xl p-5 shadow-xs transition-all hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5 group"
                                style={{ borderLeft: `4px solid ${borderColor}`, borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}
                            >
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                    <div 
                                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs border"
                                        style={{ backgroundColor: `${trig?.color || '#3b82f6'}10`, color: trig?.color || '#3b82f6', borderColor: `${trig?.color || '#3b82f6'}20` }}
                                    >
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-sm font-bold text-slate-900 m-0 mb-0.5 truncate">{rule.name}</h3>
                                        <p className="text-xs text-slate-500 font-semibold m-0 mb-2.5 truncate">
                                            <span className="uppercase tracking-wider font-bold text-slate-400">{trig?.module}</span> • {trig?.label}
                                        </p>
                                        
                                        {(rule.delay ?? 0) > 0 && (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-bold border border-amber-200 shadow-2xs">
                                                <Clock className="w-3 h-3" />
                                                <span>Delay: {
                                                    rule.delay! >= 1440 ? `${Math.round(rule.delay! / 1440)} Day(s)` :
                                                    rule.delay! >= 60 ? `${Math.round(rule.delay! / 60)} Hour(s)` :
                                                    `${rule.delay} mins`
                                                }</span>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-5 md:gap-6 w-full md:w-auto border-t md:border-t-0 border-slate-100 pt-4 md:pt-0 shrink-0">
                                    <div className="text-left md:text-right">
                                        <span className="block text-xs font-bold text-slate-900">{rule.runs || 0} Runs</span>
                                        <span className="block text-[10px] font-semibold text-slate-400 mt-0.5">
                                            Last: {rule.lastRunAt ? new Date(rule.lastRunAt).toLocaleString() : 'Never'}
                                        </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleRule(rule.id)}
                                            className={cn(
                                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors mr-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20",
                                                rule.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                                            )}
                                        >
                                            <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-xs", rule.enabled ? 'translate-x-6' : 'translate-x-1')} />
                                        </button>

                                        <div className="flex gap-1">
                                            <button 
                                                onClick={() => setViewingLogs(rule)}
                                                className="w-8 h-8 rounded-lg text-purple-600 hover:bg-purple-50 flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-purple-200"
                                                title="View Execution History"
                                            >
                                                <History className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => setManualRunRule(rule)}
                                                className="w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-emerald-200"
                                                title="Run Flow Manually"
                                            >
                                                <PlayCircle className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => setViewingFlow(rule)}
                                                className="w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                                                title="View Flow"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => enterBuilder(rule)}
                                                className="w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                                                title="Edit Flow"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteRule(rule.id)}
                                                className="w-8 h-8 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer border border-transparent hover:border-red-200"
                                                title="Delete Flow"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* View Flow Modal */}
            {viewingFlow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                            <h2 className="text-base font-bold text-slate-900 m-0 truncate">Blueprint: {viewingFlow.name}</h2>
                            <button onClick={() => setViewingFlow(null)} className="text-slate-400 hover:text-slate-700 w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center transition-all shadow-2xs cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 text-xs">
                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Trigger Event</span>
                                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3.5">
                                    <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-xs shrink-0">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className="block font-bold text-slate-900 truncate">{TRIGGER_META[viewingFlow.trigger as TriggerType]?.label}</span>
                                        <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{TRIGGER_META[viewingFlow.trigger as TriggerType]?.module}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Action Sequence</span>
                                <div className="flex flex-col gap-3">
                                    {viewingFlow.actions.map((action: string, idx: number) => {
                                        const am = ACTION_META[action as ActionType];
                                        return (
                                            <div key={idx} className="flex gap-3.5">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center text-[11px] font-bold shrink-0 z-10 shadow-2xs">
                                                        {idx + 1}
                                                    </div>
                                                    {idx < viewingFlow.actions.length - 1 && (
                                                        <div className="w-0.5 h-full bg-slate-200 my-1 min-h-[20px]"></div>
                                                    )}
                                                </div>
                                                <div className="flex-1 bg-white border border-slate-200/80 rounded-xl p-3 flex items-center gap-3 shadow-2xs mb-1">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border" style={{ backgroundColor: `${am?.color || '#3b82f6'}10`, color: am?.color || '#3b82f6', borderColor: `${am?.color || '#3b82f6'}20` }}>
                                                        <Zap className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-bold text-slate-800">{am?.label || action}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                            <button 
                                onClick={() => { enterBuilder(viewingFlow); setViewingFlow(null); }}
                                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer font-bold"
                            >
                                Edit Flow Journey
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Run Modal */}
            <ManualRunModal
                rule={manualRunRule}
                onClose={() => setManualRunRule(null)}
                onRefresh={onRefresh}
                showToast={showToast}
            />
            {/* Activity Log Drawer */}
            <ActivityLogDrawer
                rule={viewingLogs}
                onClose={() => setViewingLogs(null)}
                showToast={showToast}
            />
        </div>
    );
};

interface ActivityLogDrawerProps {
    rule: AutomationRule | null;
    onClose: () => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const ActivityLogDrawer: React.FC<ActivityLogDrawerProps> = ({ rule, onClose, showToast }) => {
    const [logs, setLogs] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [total, setTotal] = React.useState(0);
    const [hasMore, setHasMore] = React.useState(false);

    React.useEffect(() => {
        if (rule) {
            setLogs([]);
            setPage(1);
            fetchLogs(rule.id, 1, true);
        }
    }, [rule]);

    const fetchLogs = async (ruleId: string, pageNum: number, reset = false) => {
        setLoading(true);
        try {
            const { automationApi } = await import('../../api/automation');
            const data = await automationApi.getLogs(ruleId, pageNum, 10);
            
            if (reset) {
                setLogs(data.logs);
            } else {
                setLogs(prev => [...prev, ...data.logs]);
            }
            
            setTotal(data.total);
            setPage(data.page);
            setHasMore(data.page < data.totalPages);
        } catch (error) {
            showToast("Failed to load activity logs.", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        if (rule && !loading) {
            fetchLogs(rule.id, page + 1);
        }
    };

    if (!rule) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-slate-50 w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 text-xs font-sans text-slate-800">
                <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100 shadow-2xs shrink-0">
                            <History className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-base font-bold text-slate-900 m-0 truncate">Activity History</h2>
                            <span className="block text-xs font-semibold text-slate-500 truncate mt-0.5">{rule.name}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all shadow-2xs cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-4">
                    {logs.length === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white p-8">
                            <History className="w-10 h-10 text-slate-300 mb-3" />
                            <p className="text-xs font-semibold text-slate-500 m-0">No activity recorded for this rule yet.</p>
                        </div>
                    ) : (
                        <>
                            {logs.map((log: any) => {
                                const am = ACTION_META[log.action as ActionType];
                                const target = log.details?.name || log.details?.Name || log.details?.email || log.details?.Email || log.details?.phone || 'Unknown Lead';
                                return (
                                    <div key={log.id} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                                                log.status === 'SUCCESS' ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-red-100 text-red-700 border border-red-200"
                                            )}>
                                                {log.status}
                                            </span>
                                            <span className="text-[11px] font-semibold text-slate-400">
                                                {new Date(log.executedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border" style={{ backgroundColor: `${am?.color || '#3b82f6'}10`, color: am?.color || '#3b82f6', borderColor: `${am?.color || '#3b82f6'}20` }}>
                                                <Zap className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <span className="block font-bold text-slate-900 truncate">{am?.label || log.action}</span>
                                                <span className="block font-semibold text-slate-500 truncate mt-0.5">to <strong className="text-primary font-bold">{target}</strong></span>
                                            </div>
                                        </div>
                                        {log.message && (
                                            <div className={cn(
                                                "mt-3 p-3 rounded-xl font-semibold border-l-2 leading-relaxed text-xs",
                                                log.status === 'SUCCESS' ? "bg-emerald-50 text-emerald-700 border-emerald-500" : "bg-red-50 text-red-700 border-red-500"
                                            )}>
                                                {log.message}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            
                            {hasMore && (
                                <button 
                                    onClick={handleLoadMore} 
                                    disabled={loading}
                                    className="w-full py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50 mt-2 cursor-pointer"
                                >
                                    {loading ? 'Loading...' : 'Load Older Activity'}
                                </button>
                            )}
                            
                            {loading && logs.length === 0 && (
                                <div className="flex justify-center py-12">
                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

interface ManualRunModalProps {
    rule: AutomationRule | null;
    onClose: () => void;
    onRefresh: () => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const ManualRunModal: React.FC<ManualRunModalProps> = ({ rule, onClose, onRefresh, showToast }) => {
    const [loading, setLoading] = React.useState(false);
    const [dataItems, setDataItems] = React.useState<any[]>([]);
    const [selectedKeys, setSelectedKeys] = React.useState<string[]>([]);
    const [executing, setExecuting] = React.useState(false);

    React.useEffect(() => {
        if (rule) {
            fetchData();
        } else {
            setDataItems([]);
            setSelectedKeys([]);
        }
    }, [rule]);

    const fetchData = async () => {
        if (!rule) return;
        setLoading(true);
        try {
            if (rule.trigger === 'form_submitted' || rule.trigger === 'form_abandoned') {
                const formId = (rule.config as any)?.formId;
                if (formId) {
                    const { formsApi } = await import('../../api/forms');
                    const response = await formsApi.getResponses(formId);
                    const responses = response.data || [];
                    const items = responses.map((r: any) => ({
                        key: r.id,
                        ...r.data,
                        _submittedAt: r.submittedAt
                    }));
                    setDataItems(items);
                }
            } else {
                showToast("Manual runs are currently optimized for Form-based triggers.", 'warning');
            }
        } catch (error) {
            showToast("Failed to load available lead data.", 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRun = async () => {
        if (!rule || selectedKeys.length === 0) return;
        setExecuting(true);
        try {
            const selectedData = dataItems.filter(item => selectedKeys.includes(item.key));
            const { automationApi } = await import('../../api/automation');
            await automationApi.runRuleManually(rule.id, selectedData);
            showToast(`Successfully triggered flow for ${selectedData.length} leads.`, 'success');
            onRefresh();
            onClose();
        } catch (error) {
            showToast("Failed to execute manual run.", 'error');
        } finally {
            setExecuting(false);
        }
    };

    const columns = dataItems.length > 0 ? Object.keys(dataItems[0])
        .filter(k => !k.startsWith('_') && k !== 'key')
        .map(k => ({
            title: k.charAt(0).toUpperCase() + k.slice(1),
            dataIndex: k,
            key: k
        })) : [];

    const toggleSelection = (key: string) => {
        setSelectedKeys(prev => 
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const toggleAll = () => {
        if (selectedKeys.length === dataItems.length) {
            setSelectedKeys([]);
        } else {
            setSelectedKeys(dataItems.map(d => d.key));
        }
    };

    if (!rule) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] text-xs font-sans text-slate-800">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-slate-900 m-0">Manual Run: {rule.name}</h2>
                        <p className="text-xs font-semibold text-slate-500 m-0 mt-0.5">Select the lead data you want to push through this automation flow.</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all shadow-2xs cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 overflow-auto custom-scrollbar flex-1 bg-slate-50/50">
                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
                        </div>
                    ) : dataItems.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                            <p className="font-semibold text-slate-500 m-0">No data available for manual execution.</p>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200/80">
                                            <th className="py-3 px-4 w-12 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedKeys.length === dataItems.length && dataItems.length > 0}
                                                    onChange={toggleAll}
                                                    className="rounded border-slate-300 text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
                                                />
                                            </th>
                                            {columns.map(col => (
                                                <th key={col.key} className="py-3 px-4 font-bold text-slate-600 text-[10px] uppercase tracking-wider">
                                                    {col.title}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dataItems.map((item) => (
                                            <tr 
                                                key={item.key} 
                                                className={cn(
                                                    "border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 transition-colors cursor-pointer",
                                                    selectedKeys.includes(item.key) ? "bg-primary/5 hover:bg-primary/10 font-bold" : "font-medium"
                                                )}
                                                onClick={() => toggleSelection(item.key)}
                                            >
                                                <td className="py-3 px-4 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedKeys.includes(item.key)}
                                                        onChange={() => toggleSelection(item.key)}
                                                        className="rounded border-slate-300 text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                </td>
                                                {columns.map(col => (
                                                    <td key={col.key} className="py-3 px-4 text-slate-700">
                                                        {item[col.dataIndex]?.toString() || '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-all cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleRun}
                        disabled={selectedKeys.length === 0 || executing}
                        className="flex items-center gap-1.5 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer font-bold"
                    >
                        {executing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                        <span>Run Flow for {selectedKeys.length} Selected</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AutomationList;
