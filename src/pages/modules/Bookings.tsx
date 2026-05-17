import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { bookingsApi, Booking } from '../../api/bookings';
import { 
    Calendar as CalendarIcon, Plus, Clock, CheckCircle2, 
    XCircle, MessageCircle, PlayCircle, X, ChevronLeft, ChevronRight, ListFilter, AlignJustify, User, Phone, Mail, FileText, Send, Sparkles, Filter
} from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { message } from 'antd';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

const STATUS_CONFIG: Record<BookingStatus, { color: string; bg: string; label: string; icon: any }> = {
    pending: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Pending', icon: Clock },
    confirmed: { color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: 'Confirmed', icon: CheckCircle2 },
    completed: { color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'Completed', icon: CheckCircle2 },
    cancelled: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'Cancelled', icon: XCircle },
};

const SOURCE_CONFIG: Record<string, { color: string; bg: string }> = {
    'AI Chat': { color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
    'Smart Link': { color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    'Dynamic Form': { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
    'Manual': { color: 'text-slate-600', bg: 'bg-slate-100 border-slate-200' },
};

const SimpleCalendar = ({ bookings, onSelectBooking }: { bookings: Booking[], onSelectBooking: (b: Booking) => void }) => {
    const [currentDate, setCurrentDate] = useState(dayjs());
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startDate = startOfMonth.startOf('week');
    const endDate = endOfMonth.endOf('week');

    const days = [];
    let day = startDate;
    while (day.isBefore(endDate)) {
        days.push(day);
        day = day.add(1, 'day');
    }

    return (
        <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden animate-in fade-in duration-300">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <button onClick={() => setCurrentDate(currentDate.subtract(1, 'month'))} className="p-2.5 hover:bg-white bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-all shadow-2xs cursor-pointer">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-extrabold text-slate-900 m-0 tracking-tight">{currentDate.format('MMMM YYYY')}</h3>
                <button onClick={() => setCurrentDate(currentDate.add(1, 'month'))} className="p-2.5 hover:bg-white bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-all shadow-2xs cursor-pointer">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="py-3 text-center text-xs font-extrabold text-slate-500 tracking-wider uppercase border-r border-slate-100 last:border-0">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {days.map(d => {
                    const ds = d.format('YYYY-MM-DD');
                    const dayBookings = bookings.filter(b => b.date === ds);
                    const isCurrentMonth = d.month() === currentDate.month();
                    const isToday = d.isSame(dayjs(), 'day');

                    return (
                        <div key={ds} className={cn(
                            "min-h-[120px] p-3 border-r border-b border-slate-100 relative group transition-colors",
                            !isCurrentMonth && "bg-slate-50/40 opacity-60",
                            isToday && "bg-primary/5"
                        )}>
                            <div className={cn(
                                "w-7 h-7 flex items-center justify-center rounded-xl text-xs font-extrabold mb-2",
                                isToday ? "bg-primary text-white shadow-md shadow-primary/20" : isCurrentMonth ? "text-slate-700 bg-slate-100" : "text-slate-400"
                            )}>
                                {d.date()}
                            </div>
                            <div className="space-y-1.5">
                                {dayBookings.slice(0, 3).map(b => {
                                    const sc = STATUS_CONFIG[b.status.toLowerCase() as BookingStatus];
                                    return (
                                        <div 
                                            key={b.id} 
                                            onClick={() => onSelectBooking(b)}
                                            className={cn("text-xs font-bold p-2 rounded-xl border truncate cursor-pointer transition-all hover:scale-[1.02] hover:shadow-2xs", sc.bg, sc.color)}
                                        >
                                            <span className="font-extrabold">{b.time}</span> {b.clientName}
                                        </div>
                                    );
                                })}
                                {dayBookings.length > 3 && (
                                    <div className="text-[11px] text-slate-500 font-extrabold px-1 pt-0.5">+{dayBookings.length - 3} more</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const Bookings: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [view, setView] = useState<'list' | 'calendar'>('list');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterDate, setFilterDate] = useState<string>('all');
    
    // Drawer States (converted from modal as requested)
    const [drawerType, setDrawerType] = useState<'none' | 'add' | 'detail'>('none');
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    
    // Form State
    const [formData, setFormData] = useState({
        clientName: '', phone: '', email: '', service: 'Property Consultation', 
        date: dayjs().format('YYYY-MM-DD'), time: '10:00', duration: 30, notes: ''
    });

    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('tab') === 'settings') {
            setView('calendar');
        }
        fetchBookings();
    }, [location.search]);

    const fetchBookings = async () => {
        try {
            const data = await bookingsApi.getBookings();
            setBookings(data.map((b: any) => ({
                ...b,
                date: dayjs(b.date).format('YYYY-MM-DD'),
                time: dayjs(b.date).format('HH:mm')
            })));
        } catch (error) {
            console.error(error);
        }
    };

    const filtered = bookings.filter(b => {
        const matchStatus = filterStatus === 'all' || b.status === filterStatus;
        const today = dayjs().format('YYYY-MM-DD');
        const matchDate =
            filterDate === 'all' ||
            (filterDate === 'today' && b.date === today) ||
            (filterDate === 'upcoming' && b.date >= today);
        return matchStatus && matchDate;
    });

    const stats = {
        total: bookings.length,
        today: bookings.filter(b => b.date === dayjs().format('YYYY-MM-DD')).length,
        pending: bookings.filter(b => b.status === 'PENDING').length,
        fromAI: bookings.filter(b => b.source === 'AI Chat').length,
    };

    const handleAddBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                ...formData,
                source: 'Manual',
            };
            await bookingsApi.createBooking(data);
            setDrawerType('none');
            setFormData({
                clientName: '', phone: '', email: '', service: 'Property Consultation', 
                date: dayjs().format('YYYY-MM-DD'), time: '10:00', duration: 30, notes: ''
            });
            fetchBookings();
            message.success("Booking created successfully");
        } catch (error) {
            console.error(error);
            message.error("Failed to create booking");
        }
    };

    const updateStatus = async (id: string, status: BookingStatus) => {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: status.toUpperCase() as any } : b));
        if (selectedBooking?.id === id) setSelectedBooking(prev => prev ? { ...prev, status: status.toUpperCase() as any } : null);
        
        try {
            await bookingsApi.updateStatus(id, status.toUpperCase());
            message.success(`Booking ${status}`);
        } catch (error) {
            console.error(error);
            fetchBookings();
            message.error("Failed to update status");
        }
    };

    return (
        <div className="pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white border border-slate-200/80 p-6 rounded-3xl shadow-2xs">
                <div>
                    <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-11 h-11 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <CalendarIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-900 m-0 tracking-tight">Bookings & Scheduling</h1>
                    </div>
                    <p className="text-sm text-slate-500 m-0">All appointments captured via AI Chat, Smart Links, or manually — automated reminders trigger instantly.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 w-full sm:w-auto">
                        <button
                            onClick={() => setView('list')}
                            className={cn(
                                "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-extrabold rounded-xl transition-all cursor-pointer",
                                view === 'list' ? "bg-white text-blue-600 shadow-sm font-black" : "text-slate-500 hover:text-slate-800"
                            )}
                        >
                            <AlignJustify className="w-4 h-4" /> List View
                        </button>
                        <button
                            onClick={() => setView('calendar')}
                            className={cn(
                                "flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-extrabold rounded-xl transition-all cursor-pointer",
                                view === 'calendar' ? "bg-white text-blue-600 shadow-sm font-black" : "text-slate-500 hover:text-slate-800"
                            )}
                        >
                            <CalendarIcon className="w-4 h-4" /> Calendar View
                        </button>
                    </div>
                    <button 
                        onClick={() => setDrawerType('add')}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-2xl text-sm font-extrabold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 cursor-pointer"
                        style={{ color: '#ffffff' }}
                    >
                        <Plus className="w-4 h-4" /> New Booking
                    </button>
                </div>
            </div>

            {/* Automation notice */}
            <div className="bg-primary/5 border border-primary/20 rounded-3xl p-5 mb-8 flex items-center gap-4 animate-in slide-in-from-bottom-2 shadow-2xs">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                    <PlayCircle className="w-5 h-5" />
                </div>
                <p className="text-sm text-slate-700 m-0 leading-relaxed">
                    <strong className="text-primary font-extrabold">Active Neural Flow:</strong> All incoming bookings sync instantly with your CRM pipeline and trigger two-way automated reminders.
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Total Bookings</span>
                    <div className="text-4xl font-extrabold text-blue-600 tracking-tight">{stats.total}</div>
                </div>
                <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Today's Slots</span>
                    <div className="text-4xl font-extrabold text-amber-500 tracking-tight">{stats.today}</div>
                </div>
                <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Pending Confirmation</span>
                    <div className="text-4xl font-extrabold text-purple-600 tracking-tight">{stats.pending}</div>
                </div>
                <div className="bg-white rounded-3xl p-7 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-2">From AI Chat</span>
                    <div className="text-4xl font-extrabold text-primary tracking-tight">{stats.fromAI}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-8 bg-slate-100/80 p-2 rounded-2xl border border-slate-200/80 w-fit">
                <div className="flex items-center gap-2 pl-3 pr-1 text-slate-400 font-bold text-xs">
                    <Filter className="w-4 h-4 text-slate-500" /> Filter:
                </div>
                <select 
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-5 py-2.5 text-xs font-extrabold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none pr-10 cursor-pointer shadow-2xs"
                >
                    <option value="all">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                </select>
                <select 
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-5 py-2.5 text-xs font-extrabold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none pr-10 cursor-pointer shadow-2xs"
                >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="upcoming">Upcoming</option>
                </select>
            </div>

            {view === 'list' ? (
                <div className="flex flex-col gap-4">
                    {filtered.map(booking => {
                        const sc = STATUS_CONFIG[booking.status.toLowerCase() as BookingStatus];
                        const src = SOURCE_CONFIG[booking.source || 'Manual'] || SOURCE_CONFIG['Manual'];
                        
                        return (
                            <div 
                                key={booking.id}
                                onClick={() => { setSelectedBooking(booking); setDrawerType('detail'); }}
                                className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-5 w-full lg:w-auto">
                                    <div className="text-center min-w-[85px] py-3 px-4 bg-slate-50 border border-slate-200/80 rounded-2xl group-hover:bg-primary/10 group-hover:border-primary/30 group-hover:text-primary transition-all shadow-2xs">
                                        <span className="block text-xl font-black text-slate-900 group-hover:text-primary">{booking.time}</span>
                                        <span className="block text-[11px] font-bold text-slate-400 uppercase mt-0.5">{booking.duration}m</span>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-extrabold text-slate-900 m-0 mb-1 group-hover:text-primary transition-colors">{booking.clientName}</h4>
                                        <p className="text-sm font-bold text-slate-500 m-0">{booking.service}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                                    <div className="text-xs font-bold text-slate-600 px-4 py-2 bg-slate-100 rounded-xl flex items-center gap-2 border border-slate-200/80">
                                        <CalendarIcon className="w-4 h-4 text-slate-500" /> {dayjs(booking.date).format('DD MMM YYYY')}
                                    </div>
                                    
                                    <span className={cn("px-4 py-2 rounded-xl text-xs font-extrabold border flex items-center gap-1.5", src.bg, src.color)}>
                                        <Sparkles className="w-3.5 h-3.5" /> {booking.source}
                                    </span>
                                    
                                    {booking.automationTriggered && (
                                        <span title={`Automation: ${booking.automationTriggered}`} className="px-4 py-2 rounded-xl text-xs font-extrabold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                                            <PlayCircle className="w-3.5 h-3.5" /> Automated
                                        </span>
                                    )}
                                    
                                    <span className={cn("px-4 py-2 rounded-xl text-xs font-extrabold border flex items-center gap-1.5", sc.bg, sc.color)}>
                                        <sc.icon className="w-3.5 h-3.5" /> {sc.label}
                                    </span>

                                    <div className="flex items-center gap-2 ml-auto" onClick={e => e.stopPropagation()}>
                                        {booking.status === 'PENDING' && (
                                            <button 
                                                onClick={() => updateStatus(booking.id, 'confirmed')}
                                                className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                                            >
                                                Confirm
                                            </button>
                                        )}
                                        {booking.status === 'CONFIRMED' && (
                                            <button 
                                                onClick={() => updateStatus(booking.id, 'completed')}
                                                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-extrabold transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                                            >
                                                Complete
                                            </button>
                                        )}
                                        <button className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer" title="WhatsApp Message">
                                            <MessageCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {filtered.length === 0 && (
                        <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
                            <CalendarIcon className="w-14 h-14 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-xl font-extrabold text-slate-800 mb-2">No appointments found</h3>
                            <p className="text-sm text-slate-500 max-w-md mx-auto m-0 leading-relaxed">Adjust your status and date filters or click "New Booking" above to add an appointment.</p>
                        </div>
                    )}
                </div>
            ) : (
                <SimpleCalendar bookings={bookings} onSelectBooking={b => { setSelectedBooking(b); setDrawerType('detail'); }} />
            )}

            {/* Sliding Drawer Overlay for Add Booking and Details (Replaced Modals) */}
            {drawerType !== 'none' && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div 
                        className="w-full max-w-xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {drawerType === 'add' && (
                            <>
                                <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-slate-50/80">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            +
                                        </div>
                                        <h2 className="text-xl font-extrabold text-slate-900 m-0 tracking-tight">Schedule New Booking</h2>
                                    </div>
                                    <button onClick={() => setDrawerType('none')} className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                    <form id="booking-add-form" onSubmit={handleAddBooking} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Client Name *</label>
                                                <div className="relative">
                                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input 
                                                        required 
                                                        value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})}
                                                        placeholder="Rahul Sharma" 
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Phone Number *</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input 
                                                        required 
                                                        value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                                                        placeholder="+91 98765 43210" 
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Email Address (Optional)</label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input 
                                                    type="email"
                                                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                                                    placeholder="rahul@example.com" 
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Service / Appointment Type *</label>
                                            <select 
                                                required
                                                value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all appearance-none"
                                            >
                                                {['Property Consultation', 'Health Checkup', 'Product Demo', 'Strategy Call', 'Salon Appointment', 'Hotel Reservation', 'Legal Consultation', 'Custom'].map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                            <div>
                                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Date *</label>
                                                <input 
                                                    required type="date"
                                                    value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Time *</label>
                                                <input 
                                                    required type="time"
                                                    value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Duration</label>
                                                <select 
                                                    value={formData.duration} onChange={e => setFormData({...formData, duration: Number(e.target.value)})}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all appearance-none"
                                                >
                                                    {[15, 30, 45, 60, 90, 120].map(d => (
                                                        <option key={d} value={d}>{d} mins</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Special Notes & Requests</label>
                                            <textarea 
                                                rows={3}
                                                value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                                                placeholder="Provide any context or special requirements for this meeting..." 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all resize-none leading-relaxed" 
                                            />
                                        </div>
                                        
                                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 text-xs text-slate-700 flex items-center gap-3">
                                            <PlayCircle className="w-5 h-5 text-primary shrink-0" />
                                            <span><strong className="text-primary font-black">Auto-triggered:</strong> Instant confirmation WhatsApp and reminders will fire automatically.</span>
                                        </div>
                                    </form>
                                </div>
                                
                                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                                    <button type="button" onClick={() => setDrawerType('none')} className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-sm font-extrabold transition-all cursor-pointer">
                                        Cancel
                                    </button>
                                    <button form="booking-add-form" type="submit" className="px-8 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-2xl text-sm font-extrabold shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 cursor-pointer" style={{ color: '#ffffff' }}>
                                        Confirm & Schedule Booking
                                    </button>
                                </div>
                            </>
                        )}

                        {drawerType === 'detail' && selectedBooking && (() => {
                            const sc = STATUS_CONFIG[selectedBooking.status.toLowerCase() as BookingStatus];
                            return (
                                <>
                                    <div className="flex items-center justify-between p-8 border-b border-slate-100 bg-slate-50/80">
                                        <div>
                                            <h2 className="text-2xl font-extrabold text-slate-900 m-0 mb-1">{selectedBooking.clientName}</h2>
                                            <p className="text-sm font-bold text-slate-500 m-0">{selectedBooking.service}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={cn("px-4 py-2 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 shadow-2xs", sc.bg, sc.color)}>
                                                <sc.icon className="w-3.5 h-3.5" /> {sc.label}
                                            </span>
                                            <button onClick={() => setDrawerType('none')} className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                                        <div>
                                            <h3 className="text-sm font-extrabold text-slate-900 mb-4 uppercase tracking-wider">Booking Metadata</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {[
                                                    { label: 'Scheduled Date', value: dayjs(selectedBooking.date).format('DD MMMM YYYY'), icon: CalendarIcon },
                                                    { label: 'Time Window', value: `${selectedBooking.time} (${selectedBooking.duration} mins)`, icon: Clock },
                                                    { label: 'Contact Phone', value: selectedBooking.phone, icon: Phone },
                                                    { label: 'Contact Email', value: selectedBooking.email || 'Not provided', icon: Mail },
                                                    { label: 'Lead Source', value: selectedBooking.source, icon: Sparkles },
                                                    { label: 'Assigned Agent', value: selectedBooking.assignedTo || 'Unassigned Auto', icon: User },
                                                ].map((item, i) => (
                                                    <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-500 shadow-2xs shrink-0 border border-slate-100">
                                                            <item.icon className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <div>
                                                            <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</span>
                                                            <span className="block text-sm font-extrabold text-slate-900 truncate">{item.value}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {selectedBooking.notes && (
                                            <div>
                                                <h3 className="text-sm font-extrabold text-slate-900 mb-4 uppercase tracking-wider">Meeting Notes</h3>
                                                <div className="p-6 bg-amber-50/60 border border-amber-200 rounded-3xl">
                                                    <p className="text-sm font-medium text-slate-700 m-0 leading-relaxed">{selectedBooking.notes}</p>
                                                </div>
                                            </div>
                                        )}

                                        {selectedBooking.formData && (() => {
                                            let dataObj = selectedBooking.formData;
                                            try {
                                                if (typeof dataObj === 'string') dataObj = JSON.parse(dataObj);
                                            } catch (e) { }

                                            if (!dataObj || typeof dataObj !== 'object' || Object.keys(dataObj).length === 0) return null;

                                            return (
                                                <div>
                                                    <h3 className="text-sm font-extrabold text-slate-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-primary" /> Captured Form Responses
                                                    </h3>
                                                    <div className="p-6 bg-primary/5 border border-primary/20 rounded-3xl space-y-3.5">
                                                        {Object.entries(dataObj).map(([key, value]) => (
                                                            <div key={key} className="flex items-center justify-between border-b border-primary/10 pb-3 last:border-0 last:pb-0">
                                                                <span className="text-sm font-bold text-slate-600">{key}</span>
                                                                <span className="text-sm font-black text-slate-900 text-right max-w-[60%]">
                                                                    {typeof value === 'object' ? JSON.stringify(value) : value?.toString() || '-'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-3">
                                        <div className="flex gap-3">
                                            {selectedBooking.status === 'PENDING' && (
                                                <button 
                                                    onClick={() => updateStatus(selectedBooking.id, 'confirmed')}
                                                    className="flex-1 py-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl text-sm font-extrabold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                                                >
                                                    Confirm Appointment
                                                </button>
                                            )}
                                            {selectedBooking.status === 'CONFIRMED' && (
                                                <button 
                                                    onClick={() => updateStatus(selectedBooking.id, 'completed')}
                                                    className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-sm font-extrabold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                                                >
                                                    Mark Completed
                                                </button>
                                            )}
                                            <button className="flex-1 py-3.5 bg-[#25d366] hover:bg-[#25d366]/90 text-white rounded-2xl text-sm font-extrabold shadow-md shadow-[#25d366]/20 transition-all flex items-center justify-center gap-2 cursor-pointer" style={{ color: '#ffffff' }}>
                                                <MessageCircle className="w-4 h-4 fill-white" /> WhatsApp Message
                                            </button>
                                        </div>

                                        {selectedBooking.status !== 'CANCELLED' && (
                                            <button 
                                                onClick={() => { updateStatus(selectedBooking.id, 'cancelled'); setDrawerType('none'); }}
                                                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl text-xs font-black transition-all cursor-pointer"
                                            >
                                                Cancel Appointment
                                            </button>
                                        )}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Bookings;
