import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pagination } from 'antd';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { bookingsApi, Booking, CalendarConfig } from '../../api/bookings';
import { 
    Calendar as CalendarIcon, Plus, Clock, CheckCircle2, 
    XCircle, MessageCircle, PlayCircle, X, ChevronLeft, ChevronRight, 
    AlignJustify, User, Phone, Mail, FileText, Sparkles, Filter, 
    Settings, Video, RefreshCw, ExternalLink, Download, Copy, Check, Globe,
    Info, Users, Crown, CalendarCheck, UserCheck, DownloadCloud, Search
} from 'lucide-react';
import dayjs from 'dayjs';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

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
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden animate-in fade-in duration-300">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                <button onClick={() => setCurrentDate(currentDate.subtract(1, 'month'))} className="p-2 hover:bg-white bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-all shadow-2xs cursor-pointer">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-base font-bold text-slate-900 m-0 tracking-tight">{currentDate.format('MMMM YYYY')}</h3>
                <button onClick={() => setCurrentDate(currentDate.add(1, 'month'))} className="p-2 hover:bg-white bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-900 transition-all shadow-2xs cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="py-2.5 text-center text-[11px] font-bold text-slate-500 tracking-wider uppercase border-r border-slate-100 last:border-0">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7">
                {days.map(d => {
                    const ds = d.format('YYYY-MM-DD');
                    const dayBookings = bookings.filter(b => b.date.startsWith(ds) || dayjs(b.date).format('YYYY-MM-DD') === ds);
                    const isCurrentMonth = d.month() === currentDate.month();
                    const isToday = d.isSame(dayjs(), 'day');

                    return (
                        <div key={ds} className={cn(
                            "min-h-[110px] p-2.5 border-r border-b border-slate-100 relative group transition-colors",
                            !isCurrentMonth && "bg-slate-50/40 opacity-60",
                            isToday && "bg-primary/5"
                        )}>
                            <div className={cn(
                                "w-6 h-6 flex items-center justify-center rounded-lg text-xs font-bold mb-2",
                                isToday ? "bg-primary text-white shadow-xs" : isCurrentMonth ? "text-slate-700 bg-slate-100" : "text-slate-400"
                            )}>
                                {d.date()}
                            </div>
                            <div className="space-y-1">
                                {dayBookings.slice(0, 3).map(b => {
                                    const sc = STATUS_CONFIG[b.status.toLowerCase() as BookingStatus];
                                    const timeStr = dayjs(b.date).format('HH:mm');
                                    return (
                                        <div 
                                            key={b.id} 
                                            onClick={() => onSelectBooking(b)}
                                            className={cn("text-[11px] font-semibold p-1.5 rounded-lg border truncate cursor-pointer transition-all hover:scale-[1.02] shadow-2xs flex items-center justify-between", sc.bg, sc.color)}
                                        >
                                            <span className="truncate"><span className="font-bold">{timeStr}</span> {b.clientName}</span>
                                            {b.meetingUrl && <Video className="w-3 h-3 shrink-0 ml-1 text-primary" />}
                                        </div>
                                    );
                                })}
                                {dayBookings.length > 3 && (
                                    <div className="text-[10px] text-slate-500 font-bold px-1 pt-0.5">+{dayBookings.length - 3} more</div>
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

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterDate, setFilterDate] = useState<string>('all');
    const [filterOwner, setFilterOwner] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [page, setPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);
    const [total, setTotal] = useState<number>(0);
    const [summary, setSummary] = useState<{ totalBookings: number; todaySlots: number; pendingConfirmation: number; fromAiChat: number }>({
        totalBookings: 0, todaySlots: 0, pendingConfirmation: 0, fromAiChat: 0
    });
    
    // Custom Toast State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    // Drawer States
    const [drawerType, setDrawerType] = useState<'none' | 'add' | 'detail' | 'sync'>('none');
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [copiedFeed, setCopiedFeed] = useState(false);

    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [teamMembers, setTeamMembers] = useState<any[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        clientName: '', phone: '', email: '', service: 'Property Consultation', 
        date: dayjs().format('YYYY-MM-DD'), time: '10:00', duration: 30, notes: '',
        meetingUrl: '', assignedTo: user?.id || ''
    });

    // Calendar Integration Config State
    const [calendarConfig, setCalendarConfig] = useState<CalendarConfig>({
        googleCalendar: { enabled: false, account: '' },
        outlook: { enabled: false, account: '' },
        apple: { enabled: true },
        autoGenerateMeet: true
    });
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [isSyncing, setIsSyncing] = useState<string | null>(null);

    // Inbound External Sync State
    const [importIcalUrl, setImportIcalUrl] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    const location = useLocation();

    const { data: teamMembersData } = useQuery({
        queryKey: ['sub-users'],
        queryFn: () => apiClient.get('/auth/sub-users').then(res => res.data?.users || [])
    });

    const teamMembersMap = React.useMemo(() => {
        const map: Record<string, string> = {};
        if (user?.id) map[user.id] = `👑 ${user.name || user.username || 'Workspace Owner'}`;
        teamMembers.forEach(m => {
            map[m.id] = `👤 ${m.name || m.username}`;
        });
        return map;
    }, [user, teamMembers]);

    useEffect(() => {
        if (teamMembersData) setTeamMembers(teamMembersData);
    }, [teamMembersData]);

    const { data: bookingsData } = useQuery({
        queryKey: ['bookings', page, pageSize, searchTerm, filterStatus, filterDate, filterOwner, view],
        queryFn: () => bookingsApi.getBookings({ 
            page: view === 'calendar' ? undefined : page, 
            limit: view === 'calendar' ? undefined : pageSize, 
            search: searchTerm, 
            status: filterStatus === 'all' ? undefined : filterStatus,
            date: filterDate === 'all' ? undefined : filterDate,
            owner: filterOwner === 'all' ? undefined : filterOwner
        })
    });

    useEffect(() => {
        if (bookingsData) {
            const data = bookingsData;
            if (data && data.data) {
                setBookings(data.data);
                setTotal(data.total || 0);
                if (data.summary) setSummary(data.summary);
            } else if (Array.isArray(data)) {
                setBookings(data);
                setTotal(data.length);
                const confirmed = data.filter((b: any) => b.status === 'CONFIRMED').length;
                const completed = data.filter((b: any) => b.status === 'COMPLETED').length;
                const pending = data.filter((b: any) => b.status === 'PENDING').length;
                const fromAi = data.filter((b: any) => b.source === 'AI Chat').length;
                const today = data.filter((b: any) => dayjs(b.date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')).length;
                setSummary({ totalBookings: data.length, todaySlots: today, pendingConfirmation: pending, fromAiChat: fromAi });
            }
        }
    }, [bookingsData]);

    const { data: configData } = useQuery({
        queryKey: ['calendar-config'],
        queryFn: () => bookingsApi.getCalendarConfig()
    });

    useEffect(() => {
        if (configData) setCalendarConfig(configData);
    }, [configData]);

    const saveCalendarConfigMutation = useMutation({
        mutationFn: (newConfig: CalendarConfig) => bookingsApi.updateCalendarConfig(newConfig),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar-config'] })
    });

    const importIcalMutation = useMutation({
        mutationFn: (url: string) => bookingsApi.importExternalIcal(url),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] })
    });

    const createBookingMutation = useMutation({
        mutationFn: (data: Partial<Booking>) => bookingsApi.createBooking(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] })
    });

    const updateBookingMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<Booking> }) => bookingsApi.updateBooking(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] })
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: string }) => bookingsApi.updateStatus(id, status),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] })
    });

    const syncExternalMutation = useMutation({
        mutationFn: (id: string) => bookingsApi.syncExternal(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] })
    });

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('tab') === 'settings') {
            setView('calendar');
        }
    }, [location.search]);

    const saveCalendarConfig = async (newConfig: CalendarConfig) => {
        setIsSavingConfig(true);
        try {
            await saveCalendarConfigMutation.mutateAsync(newConfig);
            showToast("Calendar sync configuration saved", 'success');
        } catch (error) {
            console.error(error);
            showToast("Failed to save calendar sync config", 'error');
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleImportExternal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!importIcalUrl) return;
        setIsImporting(true);
        try {
            const res = await importIcalMutation.mutateAsync(importIcalUrl);
            showToast(`Imported ${res.count || 0} events from iCal feed`, 'success');
            setImportIcalUrl('');
        } catch (error) {
            console.error(error);
            showToast("Failed to import external calendar feed", 'error');
        } finally {
            setIsImporting(false);
        }
    };

    const handleAddBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let finalMeetingUrl = formData.meetingUrl;
            if (calendarConfig.autoGenerateMeet && !finalMeetingUrl) {
                finalMeetingUrl = `https://meet.google.com/doc-nnct-${Math.floor(100 + Math.random() * 900)}`;
            }

            const data = {
                ...formData,
                meetingUrl: finalMeetingUrl,
                source: 'Manual',
            };
            await createBookingMutation.mutateAsync(data);
            showToast("Meeting booked successfully!", 'success');
            setDrawerType('none');
            setFormData({
                clientName: '', phone: '', email: '', service: 'Property Consultation', 
                date: dayjs().format('YYYY-MM-DD'), time: '10:00', duration: 30, notes: '', meetingUrl: '', assignedTo: user?.id || ''
            });
        } catch (error) {
            console.error(error);
            showToast("Failed to create booking", 'error');
        }
    };

    const handleAssignBooking = async (id: string, assignedTo: string) => {
        try {
            const updated = await updateBookingMutation.mutateAsync({ id, data: { assignedTo } });
            setBookings(prev => prev.map(b => b.id === id ? updated : b));
            if (selectedBooking?.id === id) setSelectedBooking(updated);
            showToast("Assigned successfully!", "success");
        } catch (err) {
            console.error("Failed to assign booking", err);
            showToast("Failed to assign booking", "error");
        }
    };

    const updateStatus = async (id: string, status: BookingStatus) => {
        try {
            await updateStatusMutation.mutateAsync({ id, status: status.toUpperCase() });
            setBookings(prev => prev.map(b => b.id === id ? { ...b, status: status.toUpperCase() as any } : b));
            if (selectedBooking?.id === id) setSelectedBooking(prev => prev ? { ...prev, status: status.toUpperCase() as any } : null);
            showToast("Booking status updated", 'success');
        } catch (error) {
            console.error(error);
            showToast("Failed to update status", 'error');
        }
    };

    const handleExternalSync = async (id: string) => {
        setIsSyncing(id);
        try {
            await syncExternalMutation.mutateAsync(id);
            setBookings(prev => prev.map(b => b.id === id ? { ...b, externalSynced: true } : b));
            if (selectedBooking?.id === id) setSelectedBooking(prev => prev ? { ...prev, externalSynced: true } : null);
            showToast("Successfully synchronized with external calendar providers", 'success');
        } catch (error) {
            console.error(error);
            showToast("External synchronization error", 'error');
        } finally {
            setIsSyncing(null);
        }
    };

    const icalFeedUrl = `${window.location.origin}/api/bookings/feed/usr_cuid998877.ics`;

    return (
        <div className="pb-20 font-sans text-slate-800 animate-in fade-in duration-500" onClick={() => setActiveDropdown(null)}>
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white border border-slate-200/80 p-6 sm:p-8 rounded-2xl shadow-xs">
                <div>
                    <div className="flex items-center gap-3 mb-1.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shadow-2xs">
                            <CalendarIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 m-0 tracking-tight">Bookings & Scheduling</h1>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 m-0">All appointments captured via AI Chat, Smart Links, or manually — automated reminders trigger instantly.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0">
                    {!isMobile && (
                        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 w-full sm:w-auto">
                            <button
                                onClick={() => setView('list')}
                                className={cn(
                                    "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                                    view === 'list' ? "bg-white text-blue-600 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <AlignJustify className="w-3.5 h-3.5" />
                                <span>List View</span>
                            </button>
                            <button
                                onClick={() => setView('calendar')}
                                className={cn(
                                    "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                                    view === 'calendar' ? "bg-white text-blue-600 shadow-2xs font-bold" : "text-slate-500 hover:text-slate-800"
                                )}
                            >
                                <CalendarIcon className="w-3.5 h-3.5" />
                                <span>Calendar View</span>
                            </button>
                        </div>
                    )}

                    <button 
                        onClick={() => setDrawerType('sync')}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200/80 shadow-2xs transition-all cursor-pointer"
                    >
                        <Settings className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Calendar Sync Hub</span>
                    </button>

                    <button 
                        onClick={() => setDrawerType('add')}
                        className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4 shrink-0" />
                        <span>New Booking</span>
                    </button>
                </div>
            </div>

            {/* Automation notice */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-8 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2 shadow-2xs flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 border border-primary/20">
                        <PlayCircle className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-slate-700 m-0 font-medium leading-relaxed">
                        <strong className="text-primary font-bold">Active Neural Flow:</strong> All incoming bookings sync instantly with your CRM pipeline and trigger two-way automated reminders.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg flex items-center gap-1.5 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Real-time 2-Way Sync Active
                    </span>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Bookings</span>
                    <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{summary.totalBookings}</div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Today's Slots</span>
                    <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{summary.todaySlots}</div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pending Confirmation</span>
                    <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{summary.pendingConfirmation}</div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">From AI Chat</span>
                    <div className="text-3xl font-extrabold text-slate-900 tracking-tight">{summary.fromAiChat}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-slate-100 p-2 rounded-2xl border border-slate-200/80">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 pl-3 pr-1 text-slate-500 font-bold text-xs">
                        <Filter className="w-3.5 h-3.5 text-slate-500" />
                        <span>Filter:</span>
                    </div>
                    <select 
                        value={filterStatus}
                        onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-2xs"
                    >
                        <option value="all">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                    <select 
                        value={filterDate}
                        onChange={e => { setFilterDate(e.target.value); setPage(1); }}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-2xs"
                    >
                        <option value="all">All Dates</option>
                        <option value="today">Today</option>
                        <option value="upcoming">Upcoming</option>
                    </select>
                    <select 
                        value={filterOwner}
                        onChange={e => { setFilterOwner(e.target.value); setPage(1); }}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-2xs max-w-[160px] truncate"
                    >
                        <option value="all">All Owners</option>
                        <option value="unassigned">Unassigned</option>
                        {user?.id && <option value={user.id}>👑 {user.name || user.username || 'Workspace Owner'}</option>}
                        {teamMembers.map(m => (
                            <option key={m.id} value={m.id}>👤 {m.name || m.username}</option>
                        ))}
                    </select>
                </div>
                <div className="relative flex-1 max-w-sm min-w-[200px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Search client, service, email..."
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl font-medium text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs focus:border-primary"
                    />
                </div>
            </div>

            {view === 'list' || isMobile ? (
                <div className="space-y-4">
                    {bookings.map(booking => {
                        const sc = STATUS_CONFIG[booking.status.toLowerCase() as BookingStatus];
                        const src = SOURCE_CONFIG[booking.source || 'Manual'] || SOURCE_CONFIG['Manual'];
                        const timeStr = dayjs(booking.date).format('HH:mm');
                        
                        return (
                            <div 
                                key={booking.id}
                                onClick={() => { setSelectedBooking(booking); setDrawerType('detail'); }}
                                className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:shadow-lg hover:border-primary/40 transition-all cursor-pointer group relative overflow-visible flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                {/* Subtle status accent indicator on the left border */}
                                <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl", booking.status === 'CONFIRMED' ? 'bg-blue-500' : booking.status === 'COMPLETED' ? 'bg-emerald-500' : booking.status === 'PENDING' ? 'bg-amber-500' : 'bg-red-500')} />

                                <div className="flex items-start gap-4 min-w-0 flex-1 pl-2">
                                    {/* Elegant Calendar/Time Box */}
                                    <div className="flex flex-col items-center justify-center min-w-[72px] py-2.5 px-3 bg-slate-900 text-white rounded-xl shadow-md group-hover:bg-primary transition-colors shrink-0 text-center">
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 group-hover:text-primary-100 leading-none mb-1">{dayjs(booking.date).format('MMM')}</span>
                                        <span className="text-xl font-extrabold tracking-tight leading-none my-0.5">{dayjs(booking.date).format('DD')}</span>
                                        <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white bg-white/10 px-2 py-0.5 rounded font-mono mt-1 leading-none">{timeStr}</span>
                                    </div>

                                    {/* Booking Title, Subtitle & Metadata Row */}
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="text-base font-extrabold text-slate-900 m-0 group-hover:text-primary transition-colors truncate">{booking.clientName}</h4>
                                            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/80">{booking.service}</span>
                                            {booking.meetingUrl && (
                                                <span title="Video Meeting Attached" className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 text-xs font-semibold">
                                                    <Video className="w-3 h-3" /> Meet
                                                </span>
                                            )}
                                        </div>

                                        {/* Unified clean metadata bar */}
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                                            <div className="flex items-center gap-1.5 font-medium">
                                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span>{booking.duration} mins</span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                                <span className="font-medium text-slate-600">{booking.source || 'Manual'}</span>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                                                <span className="font-semibold text-slate-700 truncate max-w-[150px]">
                                                    {booking.assignedTo ? teamMembersMap[booking.assignedTo] || booking.assignedTo : 'Unassigned'}
                                                </span>
                                            </div>

                                            {booking.externalSynced && (
                                                <div className="flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                                    <Check className="w-3.5 h-3.5 shrink-0" /> Synced
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Area: Status Badge & Actions */}
                                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0 ml-2 md:ml-0">
                                    {/* Status Badge */}
                                    <span className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap", sc.bg, sc.color)}>
                                        <sc.icon className="w-3.5 h-3.5 shrink-0" />
                                        <span>{sc.label}</span>
                                    </span>

                                    {/* Actions Bar */}
                                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                        {booking.status === 'PENDING' && (
                                            <button 
                                                onClick={() => updateStatus(booking.id, 'confirmed')}
                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer shrink-0"
                                            >
                                                Confirm
                                            </button>
                                        )}
                                        {booking.status === 'CONFIRMED' && (
                                            <button 
                                                onClick={() => updateStatus(booking.id, 'completed')}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer shrink-0"
                                            >
                                                Complete
                                            </button>
                                        )}

                                        {/* Add to Calendar Dropdown */}
                                        <div className="relative shrink-0">
                                            <button 
                                                onClick={() => setActiveDropdown(activeDropdown === booking.id ? null : booking.id)}
                                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border border-slate-200 cursor-pointer shadow-2xs"
                                                title="Add to Calendar / Join Meeting"
                                            >
                                                <CalendarIcon className="w-3.5 h-3.5 text-slate-600" />
                                                <span className="hidden sm:inline">Calendar</span>
                                                <span>▾</span>
                                            </button>

                                            {activeDropdown === booking.id && (
                                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200/80 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 font-normal">
                                                    <div className="px-3.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sync Options</div>
                                                    
                                                    {booking.googleCalendarUrl && (
                                                        <a 
                                                            href={booking.googleCalendarUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            onClick={() => setActiveDropdown(null)}
                                                            className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 text-slate-700 hover:text-blue-600 font-semibold text-xs no-underline transition-colors"
                                                        >
                                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                                                            <span>Google Calendar</span>
                                                            <ExternalLink className="w-3 h-3 ml-auto text-slate-400" />
                                                        </a>
                                                    )}

                                                    {booking.outlookCalendarUrl && (
                                                        <a 
                                                            href={booking.outlookCalendarUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            onClick={() => setActiveDropdown(null)}
                                                            className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 text-slate-700 hover:text-blue-600 font-semibold text-xs no-underline transition-colors"
                                                        >
                                                            <span className="w-2.5 h-2.5 rounded-full bg-[#0078d4] shrink-0" />
                                                            <span>Microsoft Outlook</span>
                                                            <ExternalLink className="w-3 h-3 ml-auto text-slate-400" />
                                                        </a>
                                                    )}

                                                    <a 
                                                        href={`/api/bookings/${booking.id}/ical`} 
                                                        download={`appointment-${booking.id}.ics`}
                                                        onClick={() => setActiveDropdown(null)}
                                                        className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 text-slate-700 hover:text-emerald-600 font-semibold text-xs no-underline transition-colors border-t border-slate-100 mt-1 pt-2"
                                                    >
                                                        <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                        <span>Download iCal (.ics)</span>
                                                    </a>

                                                    {booking.meetingUrl && (
                                                        <a 
                                                            href={booking.meetingUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            onClick={() => setActiveDropdown(null)}
                                                            className="flex items-center gap-2.5 px-3.5 py-2 bg-blue-50/50 hover:bg-blue-50 text-blue-700 font-bold text-xs no-underline transition-colors border-t border-slate-100 mt-1 pt-2"
                                                        >
                                                            <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                                            <span>Join Video Meeting</span>
                                                            <ExternalLink className="w-3 h-3 ml-auto" />
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <button 
                                            onClick={() => window.open(`https://wa.me/?text=Hello ${encodeURIComponent(booking.clientName)}`)}
                                            className="w-8 h-8 flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs" 
                                            title="WhatsApp Message"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {bookings.length === 0 ? (
                        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                            <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-slate-800 mb-1 m-0">No appointments found</h3>
                            <p className="text-xs text-slate-500 max-w-md mx-auto m-0 font-semibold leading-relaxed">Adjust your status and date filters or search to find appointments.</p>
                        </div>
                    ) : total > pageSize && (
                        <div className="py-4 px-6 bg-white border border-slate-200/80 rounded-2xl flex justify-end items-center shadow-xs mt-6">
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
            ) : (
                <SimpleCalendar bookings={bookings} onSelectBooking={b => { setSelectedBooking(b); setDrawerType('detail'); }} />
            )}

            {/* Sliding Drawer Overlay for Add Booking, Details, and Sync Hub */}
            {drawerType !== 'none' && (
                <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-300">
                    <div 
                        className="w-full max-w-2xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200 overflow-hidden text-xs font-semibold"
                        onClick={e => e.stopPropagation()}
                    >
                        {drawerType === 'sync' && (
                            <>
                                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold border border-blue-100 shadow-2xs">
                                            <Settings className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-900 m-0 tracking-tight">Calendar Sync Hub</h2>
                                            <p className="text-xs text-slate-500 m-0 font-semibold">Manage 2-way real-time calendar integrations & video link generation</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setDrawerType('none')} className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar leading-relaxed">
                                    {/* 1-Way Inbound Import Sync Card */}
                                    <div className="p-5 bg-gradient-to-r from-primary/10 via-blue-50 to-primary/5 border border-primary/20 rounded-2xl shadow-2xs space-y-4 font-semibold">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold shadow-xs shrink-0">
                                                <DownloadCloud className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-900 m-0 mb-0.5">Import External Calendar (1-Way Inbound Sync)</h3>
                                                <p className="text-xs text-slate-600 m-0 font-medium">Instantly pull appointments from Google Calendar, Outlook, or any iCal (.ics) feed URL.</p>
                                            </div>
                                        </div>

                                        <form onSubmit={handleImportExternal} className="flex flex-col sm:flex-row gap-2 pt-1 font-semibold">
                                            <div className="relative flex-1">
                                                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input 
                                                    type="url"
                                                    required
                                                    value={importIcalUrl}
                                                    onChange={e => setImportIcalUrl(e.target.value)}
                                                    placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
                                                    className="w-full bg-white border border-slate-200/80 rounded-xl pl-10 pr-3.5 py-2.5 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
                                                />
                                            </div>
                                            <button 
                                                type="submit"
                                                disabled={isImporting}
                                                className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold shrink-0 shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 text-xs"
                                            >
                                                {isImporting && <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />}
                                                <span>{isImporting ? 'Syncing...' : 'Sync into DoConnect'}</span>
                                            </button>
                                        </form>

                                        <div className="text-[11px] text-slate-700 font-medium flex items-center gap-2 bg-white/80 p-3 rounded-xl border border-primary/20 shadow-2xs">
                                            <Info className="w-4 h-4 text-primary shrink-0" />
                                            <div>
                                                <span className="text-primary font-bold">How to find your URL: </span>
                                                <span>In Google Calendar &gt; Settings &gt; Specific Calendar &gt; Secret address in iCal format.</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Google Calendar */}
                                    <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center font-bold text-blue-600 border border-blue-100 shrink-0">
                                                    G
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-900 m-0 mb-0.5">Google Calendar Sync</h3>
                                                    <p className="text-xs text-slate-500 m-0 font-medium">Automatic 2-way event reflection & availability checks</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={calendarConfig.googleCalendar.enabled}
                                                    onChange={e => saveCalendarConfig({
                                                        ...calendarConfig,
                                                        googleCalendar: { ...calendarConfig.googleCalendar, enabled: e.target.checked }
                                                    })}
                                                    className="sr-only peer" 
                                                />
                                                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                                            </label>
                                        </div>

                                        {calendarConfig.googleCalendar.enabled && (
                                            <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Connected Google Account Email</label>
                                                    <input 
                                                        value={calendarConfig.googleCalendar.account}
                                                        onChange={e => setCalendarConfig({
                                                            ...calendarConfig,
                                                            googleCalendar: { ...calendarConfig.googleCalendar, account: e.target.value }
                                                        })}
                                                        placeholder="calendar@company.com"
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                                                    <span>✓ OAuth Connection Established</span>
                                                    <span>Webhooks Active</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100/80 text-[11px] space-y-1 text-slate-700">
                                            <div className="font-bold text-blue-800 flex items-center gap-1.5 mb-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                                                <span>Google Calendar Live Feed Process</span>
                                            </div>
                                            <p className="m-0 leading-relaxed font-medium">
                                                1. Copy the Universal ICS subscription feed URL below.<br />
                                                2. On your Google Calendar, click <strong className="font-bold text-slate-900">+</strong> next to <strong className="font-bold text-slate-900">Other calendars</strong> in the left sidebar.<br />
                                                3. Select <strong className="font-bold text-slate-900">From URL</strong>, paste the link, and click Add calendar.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Microsoft Outlook */}
                                    <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-[#0078d4]/10 flex items-center justify-center font-bold text-[#0078d4] border border-[#0078d4]/20 shrink-0">
                                                    MS
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-900 m-0 mb-0.5">Microsoft Outlook 365 Sync</h3>
                                                    <p className="text-xs text-slate-500 m-0 font-medium">Sync with Exchange & Microsoft Calendar</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={calendarConfig.outlook.enabled}
                                                    onChange={e => saveCalendarConfig({
                                                        ...calendarConfig,
                                                        outlook: { ...calendarConfig.outlook, enabled: e.target.checked }
                                                    })}
                                                    className="sr-only peer" 
                                                />
                                                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0078d4]" />
                                            </label>
                                        </div>

                                        {calendarConfig.outlook.enabled && (
                                            <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Connected Outlook Account Email</label>
                                                    <input 
                                                        value={calendarConfig.outlook.account}
                                                        onChange={e => setCalendarConfig({
                                                            ...calendarConfig,
                                                            outlook: { ...calendarConfig.outlook, account: e.target.value }
                                                        })}
                                                        placeholder="work@company.onmicrosoft.com"
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100/80 text-[11px] space-y-1 text-slate-700">
                                            <div className="font-bold text-[#0078d4] flex items-center gap-1.5 mb-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#0078d4] shrink-0" />
                                                <span>Microsoft Outlook Live Feed Process</span>
                                            </div>
                                            <p className="m-0 leading-relaxed font-medium">
                                                1. Copy the Universal ICS subscription feed URL below.<br />
                                                2. In Outlook Web or Desktop, go to <strong className="font-bold text-slate-900">Calendar &gt; Add Calendar &gt; Subscribe from web</strong>.<br />
                                                3. Paste the URL, enter a name (e.g. DoConnect Bookings), and click Import.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Apple iCal & Direct Feed */}
                                    <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 border border-slate-200 shrink-0">
                                                    iCal
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-900 m-0 mb-0.5">Universal iCal / Apple Calendar Live Feed</h3>
                                                    <p className="text-xs text-slate-500 m-0 font-medium">Subscribe via URL on Apple Calendar, Mac, or iPhone</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-3 border-t border-slate-100 space-y-3">
                                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Universal ICS Subscription URL</label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    readOnly
                                                    value={icalFeedUrl}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono text-xs text-slate-600 focus:outline-none select-all shadow-2xs"
                                                />
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(icalFeedUrl);
                                                        setCopiedFeed(true);
                                                        setTimeout(() => setCopiedFeed(false), 2500);
                                                    }}
                                                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-2xs"
                                                >
                                                    {copiedFeed ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                                    <span>{copiedFeed ? 'Copied' : 'Copy'}</span>
                                                </button>
                                            </div>
                                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] space-y-1 text-slate-700 font-medium">
                                                <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0" />
                                                    <span>Apple Calendar Subscription Process</span>
                                                </div>
                                                <p className="m-0 leading-relaxed">
                                                    1. On Mac: Open Calendar &gt; click <strong className="font-bold text-slate-900">File &gt; New Calendar Subscription</strong>.<br />
                                                    2. On iPhone: Open Settings &gt; Calendar &gt; Accounts &gt; Add Account &gt; Other &gt; <strong className="font-bold text-slate-900">Add Subscribed Calendar</strong>.<br />
                                                    3. Paste the URL and click Subscribe. Your iPhone/Mac will auto-refresh automatically!
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Google Meet Auto Generator */}
                                    <div className="p-5 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex items-center justify-between gap-4 shadow-2xs">
                                        <div className="flex items-center gap-3">
                                            <Video className="w-5 h-5 text-blue-600 shrink-0" />
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-900 m-0 mb-0.5">Auto-Generate Video Meeting Links</h4>
                                                <p className="text-[11px] text-slate-600 m-0">Create Google Meet / Conference URLs instantly for all manual bookings</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                            <input 
                                                type="checkbox" 
                                                checked={calendarConfig.autoGenerateMeet}
                                                onChange={e => saveCalendarConfig({
                                                    ...calendarConfig,
                                                    autoGenerateMeet: e.target.checked
                                                })}
                                                className="sr-only peer" 
                                            />
                                            <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                                        </label>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0 font-semibold">
                                    <button 
                                        type="button" 
                                        onClick={() => setDrawerType('none')} 
                                        className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-all cursor-pointer"
                                    >
                                        Close Sync Hub
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => saveCalendarConfig(calendarConfig)}
                                        disabled={isSavingConfig}
                                        className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-70"
                                    >
                                        {isSavingConfig && <RefreshCw className="w-4 h-4 animate-spin" />}
                                        <span>Save Sync Preferences</span>
                                    </button>
                                </div>
                            </>
                        )}

                        {drawerType === 'add' && (
                            <>
                                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            +
                                        </div>
                                        <h2 className="text-lg font-bold text-slate-900 m-0 tracking-tight">Schedule New Booking</h2>
                                    </div>
                                    <button onClick={() => setDrawerType('none')} className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                                    <form id="booking-add-form" onSubmit={handleAddBooking} className="space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Client Name *</label>
                                                <div className="relative">
                                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input 
                                                        required 
                                                        value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})}
                                                        placeholder="Rahul Sharma" 
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-xs" 
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Phone Number *</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <input 
                                                        required 
                                                        value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                                                        placeholder="+91 98765 43210" 
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-xs" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address (Optional)</label>
                                            <div className="relative">
                                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input 
                                                    type="email"
                                                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                                                    placeholder="rahul@example.com" 
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-xs" 
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Service / Appointment Type *</label>
                                            <select 
                                                required
                                                value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all appearance-none cursor-pointer text-xs"
                                            >
                                                {['Property Consultation', 'Health Checkup', 'Product Demo', 'Strategy Call', 'Salon Appointment', 'Hotel Reservation', 'Legal Consultation', 'Custom'].map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                            <div>
                                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Date *</label>
                                                <input 
                                                    required type="date"
                                                    value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-xs cursor-pointer" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Time *</label>
                                                <input 
                                                    required type="time"
                                                    value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-xs cursor-pointer" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Duration</label>
                                                <select 
                                                    value={formData.duration} onChange={e => setFormData({...formData, duration: Number(e.target.value)})}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all appearance-none cursor-pointer text-xs"
                                                >
                                                    {[15, 30, 45, 60, 90, 120].map(d => (
                                                        <option key={d} value={d}>{d} mins</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className="block font-bold text-slate-700 uppercase tracking-wider m-0">Video Meeting URL (Optional)</label>
                                                <button 
                                                    type="button"
                                                    onClick={() => setFormData({...formData, meetingUrl: `https://meet.google.com/doc-nnct-${Math.floor(100 + Math.random() * 900)}`})}
                                                    className="text-primary hover:text-primary-hover font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                                >
                                                    <Sparkles className="w-3 h-3" />
                                                    <span>Auto-Generate Meet Link</span>
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <Video className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <input 
                                                    type="url"
                                                    value={formData.meetingUrl} onChange={e => setFormData({...formData, meetingUrl: e.target.value})}
                                                    placeholder="https://meet.google.com/xyz-abcd-efg" 
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all text-xs" 
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Special Notes & Requests</label>
                                            <textarea 
                                                rows={3}
                                                value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
                                                placeholder="Provide any context or special requirements for this meeting..." 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all resize-none leading-relaxed text-xs" 
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1.5">Assign To Owner / Agent</label>
                                            <div className="relative">
                                                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <select
                                                    value={formData.assignedTo}
                                                    onChange={e => setFormData({...formData, assignedTo: e.target.value})}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 font-semibold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all cursor-pointer appearance-none"
                                                >
                                                    <option value="">Unassigned Auto</option>
                                                    {user?.id && <option value={user.id}>👑 {user.name || user.username || 'Workspace Owner'}</option>}
                                                    {teamMembers.map(m => (
                                                        <option key={m.id} value={m.id}>👤 {m.name || m.username}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div className="p-3.5 bg-primary/5 rounded-xl border border-primary/20 text-slate-700 flex items-center gap-2.5 font-medium">
                                            <PlayCircle className="w-4 h-4 text-primary shrink-0" />
                                            <span><strong className="text-primary font-bold">Auto-triggered:</strong> Instant confirmation WhatsApp, calendar invites, and reminders will fire automatically.</span>
                                        </div>
                                    </form>
                                </div>
                                
                                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 shrink-0 font-semibold">
                                    <button type="button" onClick={() => setDrawerType('none')} className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition-all cursor-pointer">
                                        Cancel
                                    </button>
                                    <button form="booking-add-form" type="submit" className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold shadow-xs transition-all cursor-pointer">
                                        Confirm & Schedule Booking
                                    </button>
                                </div>
                            </>
                        )}

                        {drawerType === 'detail' && selectedBooking && (() => {
                            const sc = STATUS_CONFIG[selectedBooking.status.toLowerCase() as BookingStatus];
                            const timeStr = dayjs(selectedBooking.date).format('HH:mm');
                            return (
                                <>
                                    <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                                        <div>
                                            <h2 className="text-base font-bold text-slate-900 m-0 mb-0.5">{selectedBooking.clientName}</h2>
                                            <p className="text-xs font-semibold text-slate-500 m-0">{selectedBooking.service}</p>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <span className={cn("px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 shadow-2xs", sc.bg, sc.color)}>
                                                <sc.icon className="w-3.5 h-3.5" />
                                                <span>{sc.label}</span>
                                            </span>
                                            <button onClick={() => setDrawerType('none')} className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar leading-relaxed">
                                        <div>
                                            <h3 className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wider">Booking Metadata</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {[
                                                    { label: 'Scheduled Date', value: dayjs(selectedBooking.date).format('DD MMMM YYYY'), icon: CalendarIcon },
                                                    { label: 'Time Window', value: `${timeStr} (${selectedBooking.duration} mins)`, icon: Clock },
                                                    { label: 'Contact Phone', value: selectedBooking.phone, icon: Phone },
                                                    { label: 'Contact Email', value: selectedBooking.email || 'Not provided', icon: Mail },
                                                    { label: 'Lead Source', value: selectedBooking.source, icon: Sparkles },
                                                    { label: 'Assigned Agent', value: selectedBooking.assignedTo ? teamMembersMap[selectedBooking.assignedTo] || selectedBooking.assignedTo : 'Unassigned Auto', icon: User },
                                                ].map((item, i) => (
                                                    <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-slate-500 shadow-2xs shrink-0 border border-slate-100">
                                                            <item.icon className="w-4 h-4 text-primary" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</span>
                                                            <span className="block text-xs font-bold text-slate-900 truncate">{item.value}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Assign Owner Card */}
                                        <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shadow-2xs shrink-0">
                                                    <Users className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-900 m-0 mb-0.5">Assigned Owner</h4>
                                                    <p className="text-[11px] text-slate-500 m-0 font-medium">Transfer booking ownership & notifications</p>
                                                </div>
                                            </div>
                                            <select
                                                value={selectedBooking.assignedTo || ''}
                                                onChange={e => handleAssignBooking(selectedBooking.id, e.target.value)}
                                                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 font-bold text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs cursor-pointer min-w-[180px] appearance-none"
                                            >
                                                <option value="">Unassigned</option>
                                                {user?.id && <option value={user.id}>👑 {user.name || user.username || 'Workspace Owner'}</option>}
                                                {teamMembers.map(m => (
                                                    <option key={m.id} value={m.id}>👤 {m.name || m.username}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* External Calendar Sync Actions Card */}
                                        <div className="p-5 bg-blue-50/50 border border-blue-200/80 rounded-2xl space-y-4 shadow-2xs">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <Globe className="w-5 h-5 text-blue-600" />
                                                    <h4 className="text-xs font-bold text-slate-900 m-0">Universal Calendar Synchronization</h4>
                                                </div>
                                                <button 
                                                    onClick={() => handleExternalSync(selectedBooking.id)}
                                                    disabled={isSyncing === selectedBooking.id}
                                                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-blue-600 font-bold rounded-xl border border-blue-200 shadow-2xs text-[11px] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-70"
                                                >
                                                    <RefreshCw className={cn("w-3.5 h-3.5", isSyncing === selectedBooking.id && "animate-spin")} />
                                                    <span>{isSyncing === selectedBooking.id ? 'Syncing...' : 'Sync Now'}</span>
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                                {selectedBooking.googleCalendarUrl && (
                                                    <a 
                                                        href={selectedBooking.googleCalendarUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3 text-slate-700 hover:text-blue-600 font-bold text-xs no-underline shadow-2xs transition-all"
                                                    >
                                                        <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                                                        <span className="truncate">Add to Google Calendar</span>
                                                        <ExternalLink className="w-3.5 h-3.5 ml-auto text-slate-400" />
                                                    </a>
                                                )}

                                                {selectedBooking.outlookCalendarUrl && (
                                                    <a 
                                                        href={selectedBooking.outlookCalendarUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3 text-slate-700 hover:text-blue-600 font-bold text-xs no-underline shadow-2xs transition-all"
                                                    >
                                                        <span className="w-3 h-3 rounded-full bg-[#0078d4] shrink-0" />
                                                        <span className="truncate">Add to Outlook Calendar</span>
                                                        <ExternalLink className="w-3.5 h-3.5 ml-auto text-slate-400" />
                                                    </a>
                                                )}

                                                <a 
                                                    href={`/api/bookings/${selectedBooking.id}/ical`} 
                                                    download={`appointment-${selectedBooking.id}.ics`}
                                                    className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3 text-slate-700 hover:text-emerald-600 font-bold text-xs no-underline shadow-2xs transition-all"
                                                >
                                                    <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                                                    <span className="truncate">Download iCal (.ics)</span>
                                                </a>

                                                {selectedBooking.meetingUrl && (
                                                    <a 
                                                        href={selectedBooking.meetingUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-3 font-bold text-xs no-underline shadow-xs transition-all"
                                                    >
                                                        <Video className="w-4 h-4 shrink-0" />
                                                        <span className="truncate">Join Video Meeting</span>
                                                        <ExternalLink className="w-3.5 h-3.5 ml-auto" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {selectedBooking.notes && (
                                            <div>
                                                <h3 className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wider">Meeting Notes</h3>
                                                <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
                                                    <p className="font-semibold text-slate-700 m-0 leading-relaxed">{selectedBooking.notes}</p>
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
                                                    <h3 className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                                                        <FileText className="w-3.5 h-3.5 text-primary" />
                                                        <span>Captured Form Responses</span>
                                                    </h3>
                                                    <div className="p-5 bg-primary/5 border border-primary/20 rounded-xl space-y-3 font-semibold">
                                                        {Object.entries(dataObj).map(([key, value]) => (
                                                            <div key={key} className="flex items-center justify-between border-b border-primary/10 pb-2.5 last:border-0 last:pb-0">
                                                                <span className="text-slate-600 font-bold">{key}</span>
                                                                <span className="text-slate-900 text-right max-w-[60%] font-bold">
                                                                    {typeof value === 'object' ? JSON.stringify(value) : value?.toString() || '-'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-3 shrink-0 font-semibold">
                                        <div className="flex gap-2.5">
                                            {selectedBooking.status === 'PENDING' && (
                                                <button 
                                                    onClick={() => updateStatus(selectedBooking.id, 'confirmed')}
                                                    className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-xs transition-all cursor-pointer font-semibold text-xs"
                                                >
                                                    Confirm Appointment
                                                </button>
                                            )}
                                            {selectedBooking.status === 'CONFIRMED' && (
                                                <button 
                                                    onClick={() => updateStatus(selectedBooking.id, 'completed')}
                                                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-xs transition-all cursor-pointer font-semibold text-xs"
                                                >
                                                    Mark Completed
                                                </button>
                                            )}
                                            <button className="flex-1 py-2.5 bg-[#25d366] hover:bg-[#25d366]/90 text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer font-semibold text-xs">
                                                <MessageCircle className="w-3.5 h-3.5 fill-white" />
                                                <span>WhatsApp Message</span>
                                            </button>
                                        </div>

                                        {selectedBooking.status !== 'CANCELLED' && (
                                            <button 
                                                onClick={() => { updateStatus(selectedBooking.id, 'cancelled'); setDrawerType('none'); }}
                                                className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold transition-all cursor-pointer text-xs"
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
