import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import Overview from './pages/Overview';
import Links from './pages/Links';
import LiveChat from './pages/LiveChat';
import PublicChat from './pages/PublicChat';
import SubUsers from './pages/SubUsers';
import Reports from './pages/Reports';
import Billing from './pages/Billing';
import Plans from './pages/Plans';
import Auth from './pages/Auth';
import { useAuth } from './contexts/AuthContext';
import { Spin } from 'antd';
import { Role } from './enums';
import SuperAdminOverview from './pages/SuperAdmin/Overview';
import ManageAdmins from './pages/SuperAdmin/ManageAdmins';
import ManagePlans from './pages/SuperAdmin/ManagePlans';
import Payments from './pages/SuperAdmin/Payments';
import UpgradeRequests from './pages/SuperAdmin/UpgradeRequests';

function App() {
  const { token, loading, user } = useAuth();

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b' }}>
      <Spin size="large" />
    </div>
  );

  const defaultPath = user?.role === Role.SUB_USER ? "/dashboard/chat" : "/dashboard";
  const isOverdue = user?.role === Role.ADMIN && user?.subscription?.isOverdue;

  return (
    <Routes>
      <Route path="/auth" element={!token ? <Auth /> : <Navigate to={defaultPath} />} />

      {/* Admin Dashboard */}
      <Route path="/dashboard" element={token ? <DashboardLayout /> : <Navigate to="/auth" />}>
        {user?.role === Role.SUPER_ADMIN && (
          <>
            <Route index element={<SuperAdminOverview />} />
            <Route path="manage-admins" element={<ManageAdmins />} />
            <Route path="manage-plans" element={<ManagePlans />} />
            <Route path="payments" element={<Payments />} />
            <Route path="upgrade-requests" element={<UpgradeRequests />} />
          </>
        )}

        {user?.role === Role.ADMIN && (
          <>
            <Route index element={<Overview />} />
            <Route path="billing" element={<Billing />} />
            <Route path="plans" element={<Plans />} />
            {/* These routes are accessible but will show blurred/locked content if overdue */}
            <Route path="links" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <Links />} />
            <Route path="sub-users" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <SubUsers />} />
            <Route path="reports" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <Reports />} />
          </>
        )}

        {/* Both Admin and Sub-User can access Chat */}
        {(user?.role === Role.ADMIN || user?.role === Role.SUB_USER) && (
          <Route path="chat" element={isOverdue ? <Navigate to="/dashboard/billing" replace /> : <LiveChat />} />
        )}

        {/* Dashboard 404 - Redirect to default home */}
        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Route>

      {/* Visitor Chat Link */}
      <Route path="/chat/:slug" element={<PublicChat />} />

      <Route path="/" element={<Navigate to={token ? defaultPath : "/auth"} />} />

      {/* Global 404 - Redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
