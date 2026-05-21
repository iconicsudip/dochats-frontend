import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, BarChart3, Clock, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { formsApi } from '../../api/forms';
import dayjs from 'dayjs';

const toSnakeCase = (str: string) => 
    str.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^\w]/g, '');

const FormResponses: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [responses, setResponses] = useState<any[]>([]);
    const [form, setForm] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Custom Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [formRes, respRes] = await Promise.all([
                formsApi.getForm(id!),
                formsApi.getResponses(id!)
            ]);
            setForm(formRes.data);
            setResponses(respRes.data);
        } catch (e) {
            showToast('Failed to fetch responses', 'error');
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        if (!responses.length || !form) return;

        const headers = ['Submitted At', ...form.fields.map((f: any) => f.label)];
        const rows = responses.map(r => {
            return [
                dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                ...form.fields.map((f: any) => {
                    const valKey = toSnakeCase(f.label);
                    const val = r.data[valKey];
                    if (f.type === 'image') {
                        const fileList = Array.isArray(val) ? val : (val ? [val] : []);
                        const keysStr = fileList.map((file: any) => file.key).join('; ');
                        return `"${keysStr.replace(/"/g, '""')}"`;
                    }
                    return `"${(val || '').toString().replace(/"/g, '""')}"`;
                })
            ];
        });

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `responses_${form.title}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const todayResponses = responses.filter(r => dayjs(r.createdAt).isSame(dayjs(), 'day')).length;

    const renderCellData = (field: any, rowData: any) => {
        const valKey = toSnakeCase(field.label);
        const val = rowData.data[valKey];

        if (field.type === 'image') {
            const fileList = Array.isArray(val) ? val : (val ? [val] : []);
            if (fileList.length === 0) return <span className="text-slate-300 font-normal">-</span>;

            return (
                <div className="flex gap-1.5 flex-wrap">
                    {fileList.map((file: any, idx: number) => {
                        const fileKey = file.key;
                        if (!fileKey) return null;

                        const imageUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/forms/responses/file?key=${encodeURIComponent(fileKey)}&token=${localStorage.getItem('token')}`;
                        return (
                            <img 
                                key={idx}
                                src={imageUrl} 
                                alt={file.name || 'preview'} 
                                className="w-10 h-10 object-cover rounded-lg border border-slate-200 cursor-pointer hover:border-primary/50 transition-all hover:scale-105 shadow-3xs"
                                onClick={() => setSelectedImage(imageUrl)}
                            />
                        );
                    })}
                </div>
            );
        }

        if (!val) {
            return <span className="text-slate-300 font-normal">-</span>;
        }

        return <span className="text-slate-800 font-semibold">{val.toString()}</span>;
    };

    return (
        <div className="pb-20 animate-in fade-in duration-500 font-sans text-slate-800">
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white border border-slate-200/80 p-6 sm:p-8 rounded-2xl shadow-xs mb-8">
                <div>
                    <button 
                        onClick={() => navigate('/dashboard/forms')}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors mb-2 cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> <span>Back to Forms</span>
                    </button>
                    <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight">{form?.title || 'Form Responses'}</h1>
                </div>
                <button 
                    onClick={exportToCSV}
                    disabled={!responses.length}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-primary rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 disabled:hover:text-slate-700 cursor-pointer"
                >
                    <Download className="w-3.5 h-3.5" /> <span>Export CSV</span>
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                    <div className="flex justify-between items-start mb-3">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Responses</span>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-2xs">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{responses.length}</div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                    <div className="flex justify-between items-start mb-3">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Responses Today</span>
                        <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 border border-green-100 shadow-2xs">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{todayResponses}</div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Submitted At</th>
                                    {(form?.fields || []).map((f: any) => (
                                        <th key={f.label} className="py-3.5 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                            {f.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-medium">
                                {responses.length === 0 ? (
                                    <tr>
                                        <td colSpan={(form?.fields?.length || 0) + 1} className="py-16 text-center text-xs text-slate-500">
                                            No responses yet
                                        </td>
                                    </tr>
                                ) : (
                                    responses.map((r, i) => (
                                        <tr key={r.id || i} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="py-4 px-6 text-slate-500 whitespace-nowrap">
                                                {dayjs(r.createdAt).format('MMM D, YYYY HH:mm')}
                                            </td>
                                            {(form?.fields || []).map((f: any) => (
                                                <td key={f.label} className="py-4 px-6">
                                                    {renderCellData(f, r)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Secure Image Preview Modal */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200 cursor-pointer" 
                    onClick={() => setSelectedImage(null)}
                >
                    <div 
                        className="bg-white rounded-2xl max-w-3xl w-full p-4 relative shadow-2xl animate-in zoom-in-95 duration-200 cursor-default" 
                        onClick={e => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setSelectedImage(null)} 
                            className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer shadow-3xs border border-slate-200/40"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="mt-8 flex justify-center max-h-[80vh] overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                            <img src={selectedImage} alt="Full preview" className="object-contain max-h-[70vh] w-full" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FormResponses;
