import React, { useState } from 'react';
import {
    DashboardOutlined,
    LinkOutlined,
    MessageOutlined,
    LogoutOutlined,
    UserOutlined,
    CheckCircleOutlined,
    TeamOutlined,
    PieChartOutlined,
    CreditCardOutlined,
    DollarOutlined,
    WarningOutlined,
    ThunderboltOutlined,
    RocketOutlined,
    MenuOutlined
} from '@ant-design/icons';
import { Layout, Menu, Button, Avatar, Space, Typography, ConfigProvider, theme, Drawer, Grid } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { ProfileDrawer } from '../components/ProfileDrawer';
import { Role } from '../enums';

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

const DashboardLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const [profileOpen, setProfileOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const defaultPath = user?.role === Role.SUB_USER ? '/dashboard/chat' : '/dashboard';

    const menuItems = [
        { key: '/dashboard', icon: <DashboardOutlined />, label: 'System Overview', roles: [Role.SUPER_ADMIN] },
        { key: '/dashboard/manage-admins', icon: <TeamOutlined />, label: 'Manage Admins', roles: [Role.SUPER_ADMIN] },
        { key: '/dashboard/manage-plans', icon: <ThunderboltOutlined />, label: 'Subscription Plans', roles: [Role.SUPER_ADMIN] },
        { key: '/dashboard/upgrade-requests', icon: <RocketOutlined />, label: 'Upgrade Requests', roles: [Role.SUPER_ADMIN] },
        { key: '/dashboard/payments', icon: <DollarOutlined />, label: 'Payments', roles: [Role.SUPER_ADMIN] },
        { key: '/dashboard', icon: <DashboardOutlined />, label: 'Overview', roles: [Role.ADMIN] },
        { key: '/dashboard/plans', icon: <ThunderboltOutlined />, label: 'My Plan', roles: [Role.ADMIN] },
        { key: '/dashboard/links', icon: <LinkOutlined />, label: 'My Links', roles: [Role.ADMIN] },
        { key: '/dashboard/sub-users', icon: <TeamOutlined />, label: 'Sub-Users', roles: [Role.ADMIN] },
        { key: '/dashboard/reports', icon: <PieChartOutlined />, label: 'Reports', roles: [Role.ADMIN] },
        { key: '/dashboard/billing', icon: <CreditCardOutlined />, label: 'Billing', roles: [Role.ADMIN] },
        { key: '/dashboard/chat', icon: <MessageOutlined />, label: 'Live Chat', roles: [Role.ADMIN, Role.SUB_USER] },
    ].filter(item => (item.roles as Role[]).includes(user?.role));


    const subscriptionWarning = user?.role === Role.ADMIN && user?.subscription;
    const isOverdue = subscriptionWarning && user.subscription.isOverdue;
    const showWarning = subscriptionWarning && user.subscription.showWarning && !isOverdue;

    return (
        <ConfigProvider
            theme={{
                algorithm: theme.darkAlgorithm,
                token: {
                    colorPrimary: '#00df9a',
                    colorBgBase: '#0b0c0e',
                    colorBgContainer: '#121316',
                    colorBgElevated: '#1a1b1e',
                    colorTextBase: '#f8fafc',
                    borderRadius: 8,
                },
            }}
        >
            <Layout style={{ minHeight: '100vh', background: 'var(--background)' }}>
                {!isMobile && (
                    <Sider
                        collapsed={false}
                        width={280}
                        collapsedWidth={80}
                        className="premium-sider"
                        style={{
                            position: 'fixed',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            background: '#000000',
                            borderRight: '1px solid var(--divider)',
                            zIndex: 100,
                        }}
                    >
                        {/* Sidebar Content */}
                        <SidebarContent
                            user={user}
                            navigate={navigate}
                            logout={logout}
                            menuItems={menuItems}
                            location={location}
                            defaultPath={defaultPath}
                            onMenuClick={() => { }}
                        />
                    </Sider>
                )}

                <Drawer
                    placement="left"
                    onClose={() => setMobileMenuOpen(false)}
                    open={mobileMenuOpen}
                    width={280}
                    styles={{ body: { padding: 0 }, header: { display: 'none' } }}
                    contentWrapperStyle={{ background: '#000000' }}
                >
                    <SidebarContent
                        user={user}
                        navigate={navigate}
                        logout={logout}
                        menuItems={menuItems}
                        location={location}
                        defaultPath={defaultPath}
                        onMenuClick={() => setMobileMenuOpen(false)}
                    />
                </Drawer>

                <Layout style={{
                    marginLeft: isMobile ? 0 : 280,
                    transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0, 1)',
                    background: 'var(--background)'
                }}>
                    <Header style={{
                        background: 'rgba(11, 12, 14, 0.8)',
                        padding: isMobile ? '0 20px' : '0 48px',
                        height: 85,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        backdropFilter: 'blur(16px)',
                        borderBottom: '1px solid var(--divider)'
                    }}>
                        {isMobile ? (
                            <Button
                                type="text"
                                icon={<MenuOutlined style={{ fontSize: 20, color: '#fff' }} />}
                                onClick={() => setMobileMenuOpen(true)}
                                style={{ width: 40, height: 40 }}
                            />
                        ) : <div />}

                        <Space size={isMobile ? 12 : 32}>
                            <div
                                style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16, cursor: 'pointer' }}
                                onClick={() => setProfileOpen(true)}
                            >
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                                    <Text strong style={{ color: '#fff', fontSize: isMobile ? 13 : 14 }}>{user?.name || user?.username}</Text>
                                    {!isMobile && (
                                        <Text type="secondary" style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: 0.5 }}>{user?.role === Role.SUB_USER ? 'SUPPORT AGENT' : user?.role === Role.SUPER_ADMIN ? 'SUPER ADMIN' : 'ADMINISTRATOR'}</Text>
                                    )}
                                </div>
                                <Avatar
                                    src={user?.logoUrl}
                                    icon={<UserOutlined />}
                                    size={isMobile ? 40 : 48}
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--divider)' }}
                                />
                            </div>
                        </Space>
                    </Header>
                    <Content style={{ padding: isMobile ? '20px' : '32px 48px', overflowY: 'auto' }}>
                        {/* Subscription Warning Banners */}
                        {isOverdue && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: 12,
                                padding: '12px 20px',
                                marginBottom: 24,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <Space>
                                    <WarningOutlined style={{ color: '#ef4444', fontSize: 18 }} />
                                    <Text style={{ color: '#ef4444', fontWeight: 600, fontSize: 13 }}>Your subscription has expired. Features are restricted until payment is made.</Text>
                                </Space>
                                <Button type="primary" danger size="small" onClick={() => navigate('/dashboard/billing')} style={{ borderRadius: 6 }}>Pay Now</Button>
                            </div>
                        )}
                        {showWarning && (
                            <div style={{
                                background: 'rgba(250, 204, 21, 0.08)',
                                border: '1px solid rgba(250, 204, 21, 0.25)',
                                borderRadius: 12,
                                padding: '12px 20px',
                                marginBottom: 24,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <Space>
                                    <WarningOutlined style={{ color: '#facc15', fontSize: 18 }} />
                                    <Text style={{ color: '#facc15', fontWeight: 600, fontSize: 13 }}>Subscription expires in {user.subscription.daysRemaining} day{user.subscription.daysRemaining > 1 ? 's' : ''}. Renew now to avoid interruption.</Text>
                                </Space>
                                <Button type="primary" size="small" onClick={() => navigate('/dashboard/billing')} className="premium-button" style={{ borderRadius: 6 }}>Renew Now</Button>
                            </div>
                        )}
                        <Outlet />
                    </Content>
                </Layout>
            </Layout>
            <ChangePasswordModal />
            <ProfileDrawer open={profileOpen} onClose={() => setProfileOpen(false)} />
        </ConfigProvider>
    );
};

const SidebarContent: React.FC<{
    user: any;
    navigate: any;
    logout: any;
    menuItems: any[];
    location: any;
    defaultPath: string;
    onMenuClick: () => void;
}> = ({ user, navigate, logout, menuItems, location, defaultPath, onMenuClick }) => (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#000000' }}>
        {/* Logo Section */}
        <div
            style={{ height: 100, display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'center', gap: 12, flexShrink: 0, cursor: 'pointer' }}
            onClick={() => {
                navigate(defaultPath);
                onMenuClick();
            }}
        >
            <div style={{ width: 42, height: 42, background: '#00df9a', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0, 223, 154, 0.2)' }}>
                <CheckCircleOutlined style={{ color: '#000', fontSize: 24 }} />
            </div>
            <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#fff', fontSize: 22, letterSpacing: -0.8 }}>
                DoChats
            </Title>
        </div>

        {/* Menu Section - Grow to fill space */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 8px' }}>
            <Menu
                mode="inline"
                selectedKeys={[location.pathname]}
                items={menuItems}
                onClick={({ key }) => {
                    navigate(key);
                    onMenuClick();
                }}
                style={{ border: 'none', background: 'transparent' }}
                inlineIndent={24}
            />
        </div>

        {/* Footer Section - Stick to bottom but flow naturally in flex */}
        <div style={{ paddingBottom: 20, flexShrink: 0 }}>
            {user?.role === Role.ADMIN && (
                <div style={{ padding: '0 16px', marginBottom: 16 }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #121316 0%, #1a1b1e 100%)',
                        border: '1px solid #2d2e33',
                        borderRadius: 12,
                        padding: '16px',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <div style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: 'rgba(0, 223, 154, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <ThunderboltOutlined style={{ color: '#00df9a', fontSize: 16 }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: '#8696a0', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Active Plan</div>
                                <div style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>{user?.plan?.name || 'Custom Plan'}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 10, color: '#8696a0', opacity: 0.8 }}>
                                {user?.subUsersLimit} Users | {user?.linksLimit} Links
                            </div>
                            {(!user?.planId || user?.plan?.name?.toLowerCase().includes('basic')) && (
                                <Button
                                    type="link"
                                    size="small"
                                    onClick={() => {
                                        navigate('/dashboard/plans');
                                        onMenuClick();
                                    }}
                                    style={{ padding: 0, color: '#00df9a', fontSize: 12, fontWeight: 700, height: 'auto' }}
                                >
                                    Upgrade
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'center' }}>
                <Button
                    icon={<LogoutOutlined style={{ fontSize: 18 }} />}
                    block
                    onClick={logout}
                    type="text"
                    style={{
                        color: '#ef4444',
                        height: 48,
                        width: '100%',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                        padding: '0 16px',
                        fontWeight: 600
                    }}
                >
                    <span style={{ marginLeft: 12 }}>Logout</span>
                </Button>
            </div>
        </div>
    </div>
);

export default DashboardLayout;
