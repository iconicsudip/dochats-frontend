import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModules } from '../contexts/ModuleContext';
import { Role, Module } from '../enums';
import FeatureTour from '../components/FeatureTour';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    LayoutDashboard, Link as LinkIcon, MessageSquare, LogOut, 
    Users, PieChart, CreditCard, DollarSign, AlertTriangle, 
    Zap, Rocket, Menu, Calendar, PlayCircle, BarChart3, AppWindow, 
    FileText, Phone, Mail, Settings as SettingsIcon, ChevronDown, X, Plug, Search, Bell, HelpCircle, LayoutGrid, MessageCircle,
    Building2, Briefcase, LifeBuoy, ShoppingBag
} from 'lucide-react';

const DashboardLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { hasModule } = useModules();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        engagement: true,
        channels: true,
        crm: true,
        workspace: true
    });

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const defaultPath = user?.role === Role.SUB_USER ? '/dashboard/chat' : '/dashboard';

    // Strictly preserved Super Admin items
    const superAdminItems = [
        { key: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
        { key: '/dashboard/manage-admins', icon: Users, label: 'Tenants & Admins', tourKey: 'manage-admins' },
        { key: '/dashboard/manage-plans', icon: Zap, label: 'Subscriptions', tourKey: 'manage-plans' },
        { key: '/dashboard/module-manager', icon: AppWindow, label: 'Feature Flags', tourKey: 'module-manager' },
    ];

    // Modern SaaS Admin items structured perfectly to match user screenshots and feedback
    const adminItems = [
        { key: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
        {
            key: 'engagement',
            icon: Zap,
            label: 'Engagement',
            children: [
                { key: '/dashboard/chat', icon: MessageSquare, label: 'Live Chat', module: Module.LIVE_CHAT, tourKey: 'live-chat', badge: '46' },
                { key: '/dashboard/links', icon: LinkIcon, label: 'Smart Links', module: Module.LINKS, tourKey: 'smart-links' },
                { key: '/dashboard/reports', icon: PieChart, label: 'Reports' },
            ]
        },
        {
            key: 'channels',
            icon: LayoutGrid,
            label: 'Channels',
            children: [
                { key: '/dashboard/whatsapp', icon: MessageCircle, label: 'WhatsApp', module: Module.WHATSAPP },
                { key: 'rcs-external', icon: Rocket, label: 'RCS Campaigns', onClick: () => window.open('https://mrcs.madmarketer.net', '_blank') },
            ]
        },
        {
            key: 'crm',
            icon: Users,
            label: 'CRM',
            module: Module.CRM,
            tourKey: 'crm',
            children: [
                { key: '/dashboard/crm', icon: Users, label: 'Contacts' },
                { key: '/dashboard/crm/companies', icon: Building2, label: 'Companies' },
                { key: '/dashboard/crm/deals', icon: Briefcase, label: 'Deals' },
                { key: '/dashboard/crm/tickets', icon: LifeBuoy, label: 'Tickets' },
                { key: '/dashboard/crm/orders', icon: ShoppingBag, label: 'Orders' },
            ]
        },
        { key: '/dashboard/bookings', icon: Calendar, label: 'Bookings', module: Module.BOOKINGS, tourKey: 'bookings' },
        { key: '/dashboard/automation', icon: PlayCircle, label: 'Automation', module: Module.AUTOMATION },
        { key: '/dashboard/forms', icon: FileText, label: 'Dynamic Forms', module: Module.FORMS, tourKey: 'dynamic-forms' },
        { key: '/dashboard/email', icon: Mail, label: 'Email Marketing', module: Module.EMAIL },
        {
            key: 'workspace',
            icon: SettingsIcon,
            label: 'Workspace',
            children: [
                { key: '/dashboard/sub-users', icon: Users, label: 'Team', module: Module.SUB_USERS },
                { key: '/dashboard/plans', icon: Zap, label: 'My Plan', module: Module.PLANS },
                { key: '/dashboard/billing', icon: CreditCard, label: 'Billing', module: Module.BILLING },
                { key: '/dashboard/settings', icon: SettingsIcon, label: 'Settings' },
            ]
        }
    ];

    // Strictly preserved Sub User items
    const subUserItems = [
        { key: '/dashboard/chat', icon: MessageSquare, label: 'Live Inbox', module: Module.LIVE_CHAT },
        {
            key: 'crm',
            icon: Users,
            label: 'CRM',
            module: Module.CRM,
            children: [
                { key: '/dashboard/crm', icon: Users, label: 'Contacts' },
                { key: '/dashboard/crm/companies', icon: Building2, label: 'Companies' },
                { key: '/dashboard/crm/deals', icon: Briefcase, label: 'Deals' },
                { key: '/dashboard/crm/tickets', icon: LifeBuoy, label: 'Tickets' },
                { key: '/dashboard/crm/orders', icon: ShoppingBag, label: 'Orders' },
            ]
        },
        { key: '/dashboard/bookings', icon: Calendar, label: 'Appointments', module: Module.BOOKINGS },
        { key: '/dashboard/settings', icon: SettingsIcon, label: 'Settings' },
    ];

    const buildMenuItems = (items: any[]) => {
        return items.filter(item => {
            if (item.module && !hasModule(item.module)) return false;
            if (item.children) {
                item.children = buildMenuItems(item.children);
                if (item.children.length === 0) return false;
            }
            return true;
        });
    };

    let menuSections: { label?: string; items: any[] }[] = [];

    if (user?.role === Role.SUPER_ADMIN) {
        menuSections = [{ items: buildMenuItems(superAdminItems) }];
    } else if (user?.role === Role.ADMIN) {
        menuSections = [{ items: buildMenuItems(adminItems) }];
    } else if (user?.role === Role.SUB_USER) {
        menuSections = [{ items: buildMenuItems(subUserItems) }];
    }

    menuSections = menuSections.filter(s => s.items.length > 0);

    const toggleGroup = (key: string) => {
        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    useEffect(() => {
        const newExpanded = { ...expandedGroups };
        let changed = false;
        menuSections.forEach(section => {
            section.items.forEach(item => {
                if (item.children) {
                    const hasActiveChild = item.children.some((child: any) => location.pathname.startsWith(child.key));
                    if (hasActiveChild && !newExpanded[item.key]) {
                        newExpanded[item.key] = true;
                        changed = true;
                    }
                }
            });
        });
        if (changed) setExpandedGroups(newExpanded);
    }, [location.pathname]);

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-[#0a0f1d] border-r border-slate-800/80 text-slate-300 shadow-2xl overflow-hidden w-[260px] font-sans">
            {/* Header / Brand Logo */}
            <div 
                className="flex items-center h-[80px] px-6 gap-3 shrink-0 cursor-pointer border-b border-slate-800/60"
                onClick={() => { navigate(defaultPath); setMobileMenuOpen(false); }}
            >
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-sm shadow-primary/30">
                    <Plug className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div>
                    <span className="text-white text-lg font-bold m-0 leading-none tracking-tight block">DoConnect</span>
                </div>
                <div className="ml-auto w-6 h-6 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center text-slate-400 font-semibold text-[10px]">
                    OS
                </div>
            </div>

            {/* Navigation Menu */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar">
                {menuSections.map((section, idx) => (
                    <div key={idx} className="space-y-1.5">
                        {section.label && (
                            <div className="px-3 mb-3 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                                {section.label}
                            </div>
                        )}
                        {section.items.map((item) => {
                            const isActive = location.pathname === item.key;
                            
                            if (item.children) {
                                return (
                                    <div key={item.key} className="space-y-1">
                                        <button 
                                            onClick={() => toggleGroup(item.key)}
                                            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3 truncate">
                                                <item.icon className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors shrink-0" />
                                                <span className="truncate">{item.label}</span>
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${expandedGroups[item.key] ? "rotate-180" : ""}`} />
                                        </button>
                                        <AnimatePresence initial={false}>
                                            {expandedGroups[item.key] && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden mt-1 ml-4 border-l border-slate-800 pl-3 space-y-1"
                                                >
                                                    {item.children.map((child: any) => {
                                                        const isChildActive = location.pathname === child.key && child.key !== 'rcs-external';
                                                        return (
                                                            <button
                                                                key={child.key}
                                                                onClick={() => {
                                                                    if (child.onClick) child.onClick();
                                                                    else { navigate(child.key); setMobileMenuOpen(false); }
                                                                }}
                                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all group cursor-pointer ${
                                                                    isChildActive 
                                                                        ? "bg-primary/15 text-primary font-semibold border border-primary/30 shadow-2xs" 
                                                                        : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-3 truncate">
                                                                    {child.icon && (
                                                                        <child.icon className={`w-4 h-4 transition-colors shrink-0 ${isChildActive ? "text-primary" : "text-slate-500 group-hover:text-slate-300"}`} />
                                                                    )}
                                                                    <span className="truncate">{child.label}</span>
                                                                </div>
                                                                {child.badge && (
                                                                    <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-semibold border border-primary/30 shrink-0">
                                                                        {child.badge}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            }

                            return (
                                <button
                                    key={item.key}
                                    data-tour={item.tourKey}
                                    onClick={() => {
                                        if (item.onClick) item.onClick();
                                        else { navigate(item.key); setMobileMenuOpen(false); }
                                    }}
                                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group cursor-pointer ${
                                        isActive 
                                            ? "bg-primary/15 text-primary font-semibold border border-primary/30 shadow-2xs" 
                                            : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                                    }`}
                                >
                                    <div className="flex items-center gap-3 truncate">
                                        <item.icon className="w-4 h-4 transition-colors shrink-0 text-slate-400 group-hover:text-white" />
                                        <span className="truncate">{item.label}</span>
                                    </div>
                                    {item.badge && (
                                        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-semibold border border-primary/30 shrink-0">
                                            {item.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}

                {/* Bottom Utility Menu */}
                <div className="pt-4 border-t border-slate-800/80 space-y-1">
                    <button onClick={() => { navigate('/dashboard/settings'); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800/60 hover:text-white transition-colors cursor-pointer">
                        <SettingsIcon className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="truncate">Account Settings</span>
                    </button>
                    <button onClick={logout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer">
                        <LogOut className="w-4 h-4 text-red-500 shrink-0" />
                        <span className="truncate">Sign Out</span>
                    </button>
                </div>
            </div>

            {/* Upgrade Premium Block */}
            {(!user?.planId || user?.plan?.name?.toLowerCase().includes('basic')) && (
                <div className="p-4 shrink-0 font-sans">
                    <div className="bg-gradient-to-br from-primary/20 via-slate-900 to-slate-900 border border-primary/30 rounded-2xl p-5 text-white relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none" />
                        
                        <div className="flex items-center justify-between mb-2 relative z-10">
                            <div className="font-bold text-sm text-white m-0 tracking-tight">Upgrade to Pro</div>
                            <div className="w-6 h-6 flex items-center justify-center bg-primary/20 rounded-lg shrink-0">
                                <Zap className="w-3.5 h-3.5 text-primary" />
                            </div>
                        </div>
                        <p className="text-slate-400 text-xs mb-4 relative z-10 leading-relaxed m-0">
                            Unlock advanced features, higher message limits, and smart automations.
                        </p>
                        <button 
                            onClick={() => navigate('/dashboard/plans')}
                            className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold text-xs rounded-xl transition-all shadow-sm shadow-primary/30 relative z-10 cursor-pointer"
                        >
                            Upgrade Plan
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <>
            <div className="flex min-h-screen bg-slate-50 font-sans selection:bg-primary/30 overflow-x-hidden w-full">
                {/* Desktop Sidebar */}
                {!isMobile && (
                    <aside className="fixed inset-y-0 left-0 w-[260px] z-50 shadow-2xl font-sans">
                        <SidebarContent />
                    </aside>
                )}

                {/* Mobile Sidebar Overlay */}
                <AnimatePresence>
                    {isMobile && mobileMenuOpen && (
                        <>
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setMobileMenuOpen(false)}
                                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[90]"
                            />
                            <motion.aside 
                                initial={{ x: '-100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '-100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="fixed inset-y-0 left-0 w-[280px] z-[100] shadow-2xl font-sans"
                            >
                                <SidebarContent />
                                <button 
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="absolute top-5 right-[-48px] w-10 h-10 rounded-xl bg-[#0a0f1d] border border-slate-800 flex items-center justify-center text-white shadow-xl cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>

                {/* Main Content Area */}
                <main 
                    className={`flex-1 flex flex-col min-h-screen transition-all duration-300 w-full min-w-0 overflow-x-hidden ${
                        !isMobile ? "ml-[260px] max-w-[calc(100vw-260px)]" : "ml-0 max-w-full"
                    }`}
                >
                    {/* Top Header */}
                    <header className="h-[80px] bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 md:px-10 flex items-center justify-between sticky top-0 z-40 shadow-2xs w-full min-w-0 font-sans font-medium text-slate-700">
                        {isMobile ? (
                            <button 
                                onClick={() => setMobileMenuOpen(true)}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs cursor-pointer shrink-0"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        ) : (
                            <div className="relative w-72 md:w-96 max-w-full font-sans">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search workspace..." 
                                    className="w-full pl-10 pr-12 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-2xs focus:bg-white" 
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <span className="text-[10px] font-semibold bg-white text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs">⌘K</span>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3 md:gap-4 shrink-0 font-sans">
                            {!isMobile && (
                                <button className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-2xs hover:bg-white cursor-pointer">
                                    <HelpCircle className="w-4 h-4" />
                                </button>
                            )}
                            <button className="relative w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-2xs hover:bg-white cursor-pointer shrink-0">
                                <Bell className="w-4 h-4" />
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                            </button>
                            <button 
                                onClick={() => navigate('/dashboard/settings')}
                                className="w-10 h-10 rounded-xl border border-slate-200 shadow-2xs overflow-hidden hover:ring-2 hover:ring-primary/30 transition-all cursor-pointer shrink-0"
                            >
                                <img 
                                    src={user?.logoUrl || `https://ui-avatars.com/api/?name=${user?.name || 'U'}&background=5c59f2&color=fff&bold=false`}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        </div>
                    </header>

                    {/* Page Content */}
                    <div className="flex-1 px-4 md:px-10 py-8 md:py-10 w-full min-w-0 max-w-[1600px] mx-auto overflow-x-hidden font-sans font-normal text-slate-800">
                        <Outlet />
                    </div>
                </main>
            </div>

            <FeatureTour />
            <ChangePasswordModal />
        </>
    );
};

export default DashboardLayout;
