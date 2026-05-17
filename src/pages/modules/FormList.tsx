import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pagination } from 'antd';
import { formsApi } from '../../api/forms';
import { FORM_TEMPLATES } from '../../constants/formTemplates';
import { 
    Plus, Edit2, Trash2, BarChart2, Copy, Eye, FileText, 
    LayoutTemplate, CheckCircle, Search, MoreHorizontal, X
} from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface FormListProps {
    predefined?: boolean;
}

const FormList: React.FC<FormListProps> = ({ predefined }) => {
    const [forms, setForms] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'my-forms' | 'templates'>(predefined ? 'templates' : 'my-forms');
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const pageSize = 10;
    const navigate = useNavigate();

    // Custom Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        if (predefined) {
            setView('templates');
        } else {
            setView('my-forms');
        }
    }, [predefined]);

    const fetchForms = async () => {
        setLoading(true);
        try {
            const res = await formsApi.getForms();
            setForms(res.data);
        } catch (e) {
            showToast('Failed to fetch forms', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchForms();
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this form? All responses will be permanently lost.')) return;
        try {
            await formsApi.deleteForm(id);
            showToast('Form deleted', 'success');
            fetchForms();
        } catch (e) {
            showToast('Failed to delete form', 'error');
        }
    };

    const useTemplate = (template: any) => {
        navigate('/dashboard/forms/new', { state: { template } });
    };

    const copyLink = (id: string) => {
        const link = `${window.location.origin}/f/${id}`;
        navigator.clipboard.writeText(link);
        showToast('Public link copied to clipboard!', 'success');
    };

    const filteredForms = forms.filter(f => 
        (f.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredForms.length / pageSize);
    const paginatedForms = filteredForms.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="animate-in fade-in duration-500 pb-20 font-sans text-slate-800">
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

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 bg-white border border-slate-200/80 p-6 sm:p-8 rounded-2xl shadow-xs">
                <div>
                    <div className="flex items-center gap-3 mb-1.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                            <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight">Dynamic Forms</h1>
                    </div>
                    <p className="text-xs text-slate-500 m-0">Create custom forms or use industry-specific templates to collect data.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 w-full sm:w-auto">
                        <button 
                            onClick={() => { setView('my-forms'); setPage(1); }}
                            className={cn(
                                "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                                view === 'my-forms' ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
                            )}
                        >
                            My Forms
                        </button>
                        <button 
                            onClick={() => { setView('templates'); setPage(1); }}
                            className={cn(
                                "flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                                view === 'templates' ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
                            )}
                        >
                            Templates
                        </button>
                    </div>
                    <button 
                        onClick={() => navigate('/dashboard/forms/new')}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all w-full sm:w-auto shrink-0 cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        <span>Create Blank Form</span>
                    </button>
                </div>
            </div>

            {view === 'my-forms' ? (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                                placeholder="Search forms..."
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-white border-b border-slate-200">
                                    <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Form Title</th>
                                    <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Responses</th>
                                    <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                    <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Created</th>
                                    <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
                                            <p className="text-xs font-semibold text-slate-400 mt-4">Loading forms...</p>
                                        </td>
                                    </tr>
                                ) : filteredForms.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-4">
                                                <FileText className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-700 mb-1">No forms found</h3>
                                            <p className="text-xs text-slate-500 mb-4">No custom forms match your criteria.</p>
                                            <button 
                                                onClick={() => navigate('/dashboard/forms/new')}
                                                className="text-primary text-xs font-bold hover:underline cursor-pointer"
                                            >
                                                Create your first form &rarr;
                                            </button>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedForms.map(form => (
                                        <tr key={form.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                                            <td className="py-4 px-6">
                                                <div className="text-xs font-bold text-slate-900">{form.title}</div>
                                                <div className="text-[11px] text-slate-500 mt-0.5">{form.description || 'No description'}</div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                                                    {form._count?.responses || 0} submissions
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border",
                                                    form.isActive ? "bg-green-50 text-green-600 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200"
                                                )}>
                                                    {form.isActive && <CheckCircle className="w-3 h-3" />}
                                                    {form.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-xs font-medium text-slate-500">
                                                {new Date(form.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex justify-end gap-1.5">
                                                    <button 
                                                        title="View Responses"
                                                        onClick={() => navigate(`/dashboard/forms/${form.id}/responses`)}
                                                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                                                    >
                                                        <BarChart2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        title="Preview"
                                                        onClick={() => window.open(`/f/${form.id}`, '_blank')}
                                                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        title="Copy Link"
                                                        onClick={() => copyLink(form.id)}
                                                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        title="Edit"
                                                        onClick={() => navigate(`/dashboard/forms/edit/${form.id}`)}
                                                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-amber-50 hover:text-amber-600 transition-colors cursor-pointer"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        title="Delete"
                                                        onClick={() => handleDelete(form.id)}
                                                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Bar */}
                    {filteredForms.length > pageSize && (
                        <div className="py-4 px-6 bg-white border-t border-slate-200 flex justify-end items-center shadow-xs">
                            <Pagination 
                                current={page} 
                                pageSize={pageSize} 
                                total={filteredForms.length} 
                                onChange={(p) => setPage(p)} 
                                showSizeChanger={false} 
                            />
                        </div>
                    )}
                </div>

            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {FORM_TEMPLATES.map(template => (
                        <div 
                            key={template.id} 
                            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col cursor-pointer group"
                            onClick={() => useTemplate(template)}
                        >
                            <div className="mb-4">
                                <span className="inline-block px-2.5 py-1 bg-cyan-50 text-cyan-600 border border-cyan-200 rounded-md text-[10px] font-bold uppercase tracking-wider mb-3">
                                    {template.industry}
                                </span>
                                <h3 className="text-base font-bold text-slate-900 mb-1 group-hover:text-primary transition-colors">
                                    {template.title}
                                </h3>
                                <p className="text-xs text-slate-500 leading-relaxed min-h-[40px]">
                                    {template.description}
                                </p>
                            </div>
                            
                            <div className="mt-auto pt-4 border-t border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Included Fields</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {template.fields.slice(0, 3).map(f => (
                                        <span key={f.id} className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-medium text-slate-500">
                                            {f.label}
                                        </span>
                                    ))}
                                    {template.fields.length > 3 && (
                                        <span className="px-2 py-0.5 text-[10px] font-bold text-slate-400">
                                            +{template.fields.length - 3} more
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <button 
                                className="w-full mt-5 py-2.5 bg-slate-50 hover:bg-primary hover:text-white text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200 hover:border-primary cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); useTemplate(template); }}
                            >
                                Use Template
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FormList;
