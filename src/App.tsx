import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Overview from './pages/Overview';
import Links from './pages/Links';
import LiveChat from './pages/LiveChat';
import ChatGroups from './pages/ChatGroups';
import PublicChat from './pages/PublicChat';
import SubUsers from './pages/SubUsers';
import Reports from './pages/Reports';
import Billing from './pages/Billing';
import Plans from './pages/Plans';
import Settings from './pages/Settings';
import Auth from './pages/Auth';
import ResetPassword from './pages/ResetPassword';
import { useAuth } from './contexts/AuthContext';
import { Role } from './enums';
import SuperAdminOverview from './pages/SuperAdmin/Overview';
import ManageAdmins from './pages/SuperAdmin/ManageAdmins';
import ManagePlans from './pages/SuperAdmin/ManagePlans';
import Payments from './pages/SuperAdmin/Payments';
import UpgradeRequests from './pages/SuperAdmin/UpgradeRequests';
import CRM from './pages/modules/CRM';
import ContactDetail from './pages/modules/ContactDetail';
import Companies from './pages/modules/Companies';
import Deals from './pages/modules/Deals';
import Tickets from './pages/modules/Tickets';
import Orders from './pages/modules/Orders';
import Bookings from './pages/modules/Bookings';
import Automation from './pages/modules/Automation';
import WhatsApp from './pages/modules/WhatsApp';
import ModuleManager from './pages/SuperAdmin/ModuleManager';
import ChannelsManager from './pages/SuperAdmin/ChannelsManager';
import FormList from './pages/modules/FormList';
import FormBuilder from './pages/modules/FormBuilder';
import FormResponses from './pages/modules/FormResponses';
import PublicForm from './pages/PublicForm';
import Email from './pages/modules/Email';
import EmailBuilder from './pages/modules/EmailBuilder';
import Broadcasts from './pages/modules/Broadcasts';
import { APP_NAME } from './constants/brand';


function App() {
    const { token, loading, user } = useAuth();

    if (loading) return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 font-sans">
            <div className="w-12 h-12 border-4 border-slate-700 border-t-primary rounded-full animate-spin mb-4" />
            <div className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Initializing {APP_NAME}...</div>
        </div>
    );

    const defaultPath = user?.role === Role.SUB_USER ? "/dashboard/chat" : "/dashboard";
    const isOverdue = user?.role === Role.ADMIN && user?.subscription?.isOverdue;

    return (
        <Routes>
            <Route path="/auth" element={!token ? <Auth /> : <Navigate to={defaultPath} />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin Dashboard */}
            <Route path="/dashboard" element={token ? <DashboardLayout /> : <Navigate to="/auth" />}>
                {user?.role === Role.SUPER_ADMIN && (
                    <>
                        <Route index element={<SuperAdminOverview />} />
                        <Route path="manage-admins" element={<ManageAdmins />} />
                        <Route path="manage-plans" element={<ManagePlans />} />
                        <Route path="payments" element={<Payments />} />
                        <Route path="upgrade-requests" element={<UpgradeRequests />} />
                        <Route path="module-manager" element={<ModuleManager />} />
                        <Route path="channels-manager" element={<ChannelsManager />} />
                    </>
                )}

                {user?.role === Role.ADMIN && (
                    <>
                        <Route index element={<Overview />} />
                        <Route path="billing" element={<Billing />} />
                        <Route path="settings" element={<Settings />} />
                        {/* Gated routes */}
                        <Route path="links" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <Links />} />
                        <Route path="broadcasts" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <Broadcasts />} />
                        <Route path="sub-users" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <SubUsers />} />
                        <Route path="chat-groups" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <ChatGroups />} />
                        <Route path="reports" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <Reports />} />
                        {/* Business OS Modules */}
                        <Route path="crm" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <CRM />} />
                        <Route path="crm/contact/:id" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <ContactDetail />} />
                        <Route path="crm/companies" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <Companies />} />
                        <Route path="crm/deals" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <Deals />} />
                        <Route path="crm/tickets" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <Tickets />} />
                        <Route path="crm/orders" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <Orders />} />
                        <Route path="bookings" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <Bookings />} />
                        <Route path="automation" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <Automation />} />
                        <Route path="whatsapp" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <WhatsApp />} />
                        <Route path="forms" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <FormList />} />
                        <Route path="forms/new" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <FormBuilder />} />
                        <Route path="forms/predefined" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <FormList predefined={true} />} />
                        <Route path="forms/edit/:id" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <FormBuilder />} />
                        <Route path="forms/:id/responses" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <FormResponses />} />
                        <Route path="email" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <Email />} />
                        <Route path="email/new" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <EmailBuilder />} />
                        <Route path="email/edit/:id" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <EmailBuilder />} />
                    </>
                )}

                {/* Both Admin and Sub-User can access Chat and some modules */}
                {(user?.role === Role.ADMIN || user?.role === Role.SUB_USER) && (
                    <>
                        <Route path="chat" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <LiveChat />} />
                        <Route path="chat-groups" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <ChatGroups />} />
                        <Route path="plans" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <Plans />} />
                        {user?.role === Role.SUB_USER && (
                            <>
                                <Route path="crm" element={<CRM />} />
                                <Route path="crm/contact/:id" element={<ContactDetail />} />
                                <Route path="crm/companies" element={<Companies />} />
                                <Route path="crm/deals" element={<Deals />} />
                                <Route path="crm/tickets" element={<Tickets />} />
                                <Route path="crm/orders" element={<Orders />} />
                                <Route path="bookings" element={<Bookings />} />
                                <Route path="settings" element={<Settings />} />
                            </>
                        )}
                    </>
                )}

                {/* Dashboard 404 - Redirect to default home */}
                <Route path="*" element={<Navigate to={defaultPath} replace />} />
            </Route>

            {/* Visitor Chat Link */}
            <Route path="/chat/:slug" element={<PublicChat />} />
            <Route path="/f/:id" element={<PublicForm />} />

            <Route path="/" element={<Navigate to={token ? defaultPath : "/auth"} />} />

            {/* Global 404 - Redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
