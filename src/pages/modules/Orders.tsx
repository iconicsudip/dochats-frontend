import React, { useState, useEffect } from 'react';
import { Pagination } from 'antd';
import { crmApi, CrmLead } from '../../api/crm';
import { bookingsApi, Booking } from '../../api/bookings';
import { useAuth } from '../../contexts/AuthContext';
import { 
    ShoppingBag, Search, RefreshCw, Calendar, DollarSign, 
    CheckCircle2, Clock, XCircle, Plus, X, Edit3, ExternalLink 
} from 'lucide-react';

interface OrderItem {
    id: string;
    leadId?: string;
    title: string;
    date: string;
    time: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    assignedTo?: string;
    lead?: {
        name?: string;
        company?: string;
    };
    notes?: string;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; icon: any }> = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Pending', icon: Clock },
    confirmed: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Confirmed', icon: Calendar },
    completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Completed', icon: CheckCircle2 },
    cancelled: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Cancelled', icon: XCircle }
};

const ORDER_STATUSES: ('pending' | 'confirmed' | 'completed' | 'cancelled')[] = ['pending', 'confirmed', 'completed', 'cancelled'];

const Orders: React.FC = () => {
    const { user } = useAuth();
    const isSubUser = user?.role === 'SUB_USER';
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const [leads, setLeads] = useState<CrmLead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Pagination & Summary State
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [summary, setSummary] = useState<{ totalOrders: number; completedOrders: number }>({ totalOrders: 0, completedOrders: 0 });

    // Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Modal State
    const [modalType, setModalType] = useState<'add_order' | 'edit_order' | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

    // Form States
    const [orderTitle, setOrderTitle] = useState('');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [orderTime, setOrderTime] = useState('10:00');
    const [orderStatus, setOrderStatus] = useState<'pending' | 'confirmed' | 'completed' | 'cancelled'>('confirmed');
    const [orderNotes, setOrderNotes] = useState('');
    const [associatedLeadId, setAssociatedLeadId] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [orderRes, leadData] = await Promise.all([
                crmApi.getOrders({ page, limit: pageSize, search: searchTerm, status: filterStatus }),
                crmApi.getLeads()
            ]);
            setOrders(orderRes.data || orderRes || []);
            if (orderRes.summary) {
                setSummary(orderRes.summary);
                setTotal(orderRes.total || 0);
            } else {
                const arr = Array.isArray(orderRes) ? orderRes : (orderRes.data || []);
                setTotal(arr.length);
                setSummary({
                    totalOrders: arr.length,
                    completedOrders: arr.filter((o: any) => o.status === 'completed').length
                });
            }
            setLeads(leadData);
        } catch (error) {
            console.error('Error fetching orders:', error);
            showToast("Failed to fetch sales orders", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timer);
    }, [page, pageSize, searchTerm, filterStatus]);

    // Handle Add Order
    const handleAddOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orderTitle.trim() || !associatedLeadId) {
            showToast("Order service and contact are required", "error");
            return;
        }

        try {
            const lead = leads.find(l => l.id === associatedLeadId);
            if (!lead) return;

            const payload = {
                clientName: lead.name,
                phone: lead.phone || '0000000000',
                email: lead.email,
                service: orderTitle.trim(),
                date: orderDate,
                time: orderTime,
                duration: 60,
                status: orderStatus.toUpperCase() as any,
                notes: orderNotes.trim(),
                leadId: lead.id
            };

            await bookingsApi.createBooking(payload);

            // Log activity timeline on lead
            await crmApi.updateLead(lead.id, {
                newActivityItem: {
                    id: 'act-' + Date.now(),
                    type: 'MEETING',
                    title: `Sales Order Placed: ${orderTitle.trim()}`,
                    description: `Scheduled for ${orderDate} at ${orderTime} | Status: ${orderStatus.toUpperCase()}`,
                    date: new Date().toISOString()
                }
            });

            showToast("Sales order created successfully!");
            setModalType(null);
            setOrderTitle('');
            setOrderStatus('confirmed');
            setOrderNotes('');
            setAssociatedLeadId('');
            fetchData();
        } catch (err) {
            showToast("Failed to create order", "error");
        }
    };

    // Handle Edit Order
    const handleEditOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrder) return;

        try {
            await bookingsApi.updateBooking(selectedOrder.id, {
                service: orderTitle.trim(),
                date: orderDate,
                time: orderTime,
                status: orderStatus.toUpperCase() as any,
                notes: orderNotes.trim()
            });

            if (selectedOrder.leadId) {
                await crmApi.updateLead(selectedOrder.leadId, {
                    newActivityItem: {
                        id: 'act-' + Date.now(),
                        type: 'NOTE',
                        title: `Order #${selectedOrder.id} updated`,
                        description: `Service: ${orderTitle.trim()} | Status: ${orderStatus.toUpperCase()}`,
                        date: new Date().toISOString()
                    }
                });
            }

            showToast("Order updated successfully!");
            setModalType(null);
            fetchData();
        } catch (err) {
            showToast("Failed to update order", "error");
        }
    };

    // Quick Status Change
    const handleStatusChange = async (order: OrderItem, newStatus: string) => {
        try {
            await bookingsApi.updateStatus(order.id, newStatus.toUpperCase());

            if (order.leadId) {
                await crmApi.updateLead(order.leadId, {
                    newActivityItem: {
                        id: 'act-' + Date.now(),
                        type: 'NOTE',
                        title: `Order status updated: ${order.title || 'Service'}`,
                        description: `Changed from ${order.status} to ${newStatus.toUpperCase()}`,
                        date: new Date().toISOString()
                    }
                });
            }

            showToast(`Order status updated to ${newStatus.toUpperCase()}`);
            fetchData();
        } catch (err) {
            showToast("Failed to update order status", "error");
        }
    };

    const openEditModal = (order: OrderItem) => {
        setSelectedOrder(order);
        setOrderTitle(order.title || '');
        setOrderDate(order.date ? order.date.split('T')[0] : new Date().toISOString().split('T')[0]);
        setOrderTime(order.time || '10:00');
        setOrderStatus(order.status || 'confirmed');
        setOrderNotes(order.notes || '');
        setAssociatedLeadId(order.leadId || '');
        setModalType('edit_order');
    };

    return (
        <div className="space-y-8 font-sans pb-12">
            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-slate-900 text-white shadow-2xl text-xs font-semibold animate-in slide-in-from-bottom-4 duration-200 border border-slate-700">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-emerald-400' : toast.type === 'error' ? 'bg-red-400' : 'bg-blue-400'}`} />
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs font-sans">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                        <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight">Orders & Sales Transactions</h1>
                        <p className="text-xs text-slate-500 m-0 mt-0.5">
                            Manage sales transactions, order fulfillment, and client purchasing history.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    {!isSubUser && (
                        <button 
                            onClick={() => { setOrderTitle(''); setOrderStatus('confirmed'); setOrderNotes(''); setAssociatedLeadId(leads[0]?.id || ''); setModalType('add_order'); }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs transition-all shadow-sm shadow-primary/30 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            Create Order
                        </button>
                    )}
                    <button 
                        onClick={() => { setPage(1); fetchData(); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-xs border border-slate-200 transition-all cursor-pointer shadow-2xs"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider m-0">Total Orders</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0">{summary.totalOrders}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                        <ShoppingBag className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider m-0">Completed Orders</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0">{summary.completedOrders}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider m-0">Fulfillment Rate</p>
                        <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight m-0">
                            {summary.totalOrders > 0 ? `${Math.round((summary.completedOrders / summary.totalOrders) * 100)}%` : '0%'}
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-2xs">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filter toolbar */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative flex-1 w-full font-sans">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Search orders by title, customer, or company..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs focus:border-primary text-slate-800"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                    className="w-full sm:w-48 bg-white border border-slate-200 rounded-2xl px-4 py-3 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs focus:border-primary cursor-pointer text-slate-700"
                >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {/* Main Content Table */}
            {loading && orders.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
                    <div className="w-10 h-10 border-3 border-slate-200 border-t-primary rounded-full animate-spin mb-3" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loading Orders...</span>
                </div>
            ) : orders.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-8 text-center">
                    <ShoppingBag className="w-12 h-12 text-slate-300 mb-3" />
                    <h3 className="text-base font-bold text-slate-800 m-0">No sales orders found</h3>
                    <p className="text-xs font-medium text-slate-500 m-0 mt-1 max-w-sm">
                        {searchTerm || filterStatus !== 'all' ? "No matching orders found for your filter criteria." : "No sales orders or customer transactions have been recorded yet in your CRM."}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden font-sans">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/75 border-b border-slate-100 font-sans">
                                    <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Order Title / Service</th>
                                    <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Customer / Company</th>
                                    <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Order Status</th>
                                    <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Schedule Date</th>
                                    <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Notes</th>
                                    <th className="py-3 px-6 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-medium font-sans">
                                {orders.map((o) => {
                                    const conf = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending;
                                    return (
                                        <tr key={o.id} className="hover:bg-slate-50/50 transition-colors group font-sans">
                                            <td className="py-3.5 px-6 font-semibold text-slate-900 text-xs">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 shadow-2xs shrink-0 text-xs">
                                                        <ShoppingBag className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-semibold text-slate-900">{o.title || 'Standard Booking'}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-6">
                                                <div className="font-semibold text-slate-800 text-xs">{o.lead?.name || '--'}</div>
                                                {o.lead?.company && <div className="text-[11px] font-medium text-slate-500">{o.lead.company}</div>}
                                            </td>
                                            <td className="py-3.5 px-6">
                                                <select
                                                    value={o.status}
                                                    disabled={isSubUser}
                                                    onChange={e => handleStatusChange(o, e.target.value)}
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${conf.bg} ${conf.text} ${conf.border} focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs uppercase tracking-wider cursor-pointer disabled:opacity-75`}
                                                >
                                                    {ORDER_STATUSES.map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-3.5 px-6 font-medium text-slate-600">
                                                <div className="flex items-center gap-1.5 text-xs">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    {new Date(o.date).toLocaleDateString('en-GB')} at {o.time}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-6 font-medium text-slate-500 text-xs max-w-xs truncate">
                                                {o.notes || '--'}
                                            </td>
                                            <td className="py-3.5 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {!isSubUser && (
                                                        <button 
                                                            onClick={() => openEditModal(o)}
                                                            className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-xl border border-slate-200/80 transition-all cursor-pointer shadow-2xs"
                                                            title="Edit Order"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {total > pageSize && (
                        <div className="py-4 px-6 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
                            <Pagination 
                                current={page} 
                                pageSize={pageSize} 
                                total={total} 
                                onChange={(p, s) => { setPage(p); setPageSize(s); }} 
                                showSizeChanger={false} 
                            />
                        </div>
                    )}
                </div>
            )}

            {/* HubSpot Slide-Over Drawer: Add / Edit Order */}
            {modalType && (
                <div className="fixed inset-0 z-[200] flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
                    <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col font-sans animate-in slide-in-from-right duration-300">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0 bg-white">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center font-bold shadow-lg shrink-0">
                                    <ShoppingBag className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold tracking-tight text-slate-900 m-0">
                                        {modalType === 'add_order' ? 'Create Sales Order' : 'Edit Order Details'}
                                    </h3>
                                    <p className="text-xs font-semibold text-slate-500 mt-0.5">Enter transaction details and fulfillment schedule</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setModalType(null)} 
                                    className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Form Body */}
                        <form onSubmit={modalType === 'add_order' ? handleAddOrder : handleEditOrder} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar text-xs">
                            <div>
                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    Order Title / Service Name *
                                </label>
                                <input 
                                    type="text"
                                    required
                                    placeholder="e.g. Premium Onboarding Package"
                                    value={orderTitle}
                                    onChange={e => setOrderTitle(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Schedule Date *
                                    </label>
                                    <input 
                                        type="date"
                                        required
                                        value={orderDate}
                                        onChange={e => setOrderDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Time *
                                    </label>
                                    <input 
                                        type="time"
                                        required
                                        value={orderTime}
                                        onChange={e => setOrderTime(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Order Status
                                    </label>
                                    <select
                                        value={orderStatus}
                                        onChange={e => setOrderStatus(e.target.value as any)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all cursor-pointer uppercase tracking-wider"
                                    >
                                        {ORDER_STATUSES.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>

                                {modalType === 'add_order' && (
                                    <div>
                                        <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                                            Associated Contact / Lead *
                                        </label>
                                        <select
                                            required
                                            value={associatedLeadId}
                                            onChange={e => setAssociatedLeadId(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-semibold text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all cursor-pointer"
                                        >
                                            <option value="">-- Select Contact / Lead --</option>
                                            {leads.map(l => (
                                                <option key={l.id} value={l.id}>{l.name} ({l.company || 'Individual'})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-2">
                                    Order Notes
                                </label>
                                <textarea 
                                    rows={3}
                                    placeholder="Enter transaction details or special fulfillment instructions..."
                                    value={orderNotes}
                                    onChange={e => setOrderNotes(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-all custom-scrollbar"
                                />
                            </div>

                            {/* Sticky Footer */}
                            <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white pb-2">
                                <button 
                                    type="button" 
                                    onClick={() => setModalType(null)} 
                                    className="px-5 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-bold text-xs transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold text-xs transition-all shadow-md shadow-primary/30 cursor-pointer flex items-center gap-2"
                                >
                                    <ShoppingBag className="w-4 h-4" />
                                    {modalType === 'add_order' ? 'Save Order' : 'Update Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Orders;
