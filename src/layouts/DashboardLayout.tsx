import React, { useState } from 'react';
import {
    DashboardOutlined,
    LinkOutlined,
    MessageOutlined,
    LogoutOutlined,
    UserOutlined,
    TeamOutlined,
    PieChartOutlined,
    CreditCardOutlined,
    DollarOutlined,
    WarningOutlined,
    ThunderboltOutlined,
    RocketOutlined,
    MenuOutlined,
    CalendarOutlined,
    PlayCircleOutlined,
    FundOutlined,
    ApiOutlined,
    AppstoreOutlined,
    BulbOutlined,
    FormOutlined,
    WhatsAppOutlined,
    MailOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Button, Avatar, Space, Typography, ConfigProvider, theme, Drawer, Grid, Tag } from 'antd';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModules } from '../contexts/ModuleContext';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { ProfileDrawer } from '../components/ProfileDrawer';
import { Role, Module } from '../enums';
import FeatureTour from '../components/FeatureTour';

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

const DashboardLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { hasModule } = useModules();
    const [profileOpen, setProfileOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const defaultPath = user?.role === Role.SUB_USER ? '/dashboard/chat' : '/dashboard';

    // SuperAdmin menu items
    const superAdminItems = [
        { key: '/dashboard', icon: <DashboardOutlined />, label: 'System Overview', roles: [Role.SUPER_ADMIN] },
        { key: '/dashboard/manage-admins', icon: <TeamOutlined />, label: 'Manage Admins', roles: [Role.SUPER_ADMIN], tourKey: 'manage-admins' },
        { key: '/dashboard/manage-plans', icon: <ThunderboltOutlined />, label: 'Subscription Plans', roles: [Role.SUPER_ADMIN], tourKey: 'manage-plans' },
        { key: '/dashboard/upgrade-requests', icon: <RocketOutlined />, label: 'Upgrade Requests', roles: [Role.SUPER_ADMIN] },
        { key: '/dashboard/payments', icon: <DollarOutlined />, label: 'Payments', roles: [Role.SUPER_ADMIN] },
        { key: '/dashboard/module-manager', icon: <AppstoreOutlined />, label: 'Module Manager', roles: [Role.SUPER_ADMIN], tourKey: 'module-manager' },
    ];

    // Admin core menu items (always shown)
    const adminCoreItems = [
        { key: '/dashboard', icon: <DashboardOutlined />, label: 'Overview' },
        {
            key: 'engagement',
            icon: <ThunderboltOutlined />,
            label: 'Engagement',
            children: [
                { key: '/dashboard/chat', icon: <MessageOutlined />, label: 'Live Chat', module: Module.LIVE_CHAT, tourKey: 'live-chat' },
                { key: '/dashboard/links', icon: <LinkOutlined />, label: 'Smart Links', module: Module.LINKS, tourKey: 'smart-links' },
            ]
        }
    ];

    // Admin module items — top-level (no Neural Hub wrapper)
    const adminModuleItems = [
        {
            key: 'channels',
            icon: <AppstoreOutlined />,
            label: 'Channels',
            children: [
                { key: '/dashboard/whatsapp', icon: <WhatsAppOutlined />, label: 'WhatsApp', module: Module.WHATSAPP, isNew: true },
                { key: 'rcs-external', icon: <ThunderboltOutlined />, label: 'RCS Business', onClick: () => window.open('https://mrcs.madmarketer.net', '_blank') },
            ]
        },
        { key: '/dashboard/crm', icon: <FundOutlined />, label: 'CRM & Pipeline', module: Module.CRM, tourKey: 'crm' },
        { key: '/dashboard/bookings', icon: <CalendarOutlined />, label: 'Bookings', module: Module.BOOKINGS, tourKey: 'bookings' },
        { key: '/dashboard/automation', icon: <PlayCircleOutlined />, label: 'Automation', module: Module.AUTOMATION },
        { key: '/dashboard/forms', icon: <FormOutlined />, label: 'Dynamic Forms', module: Module.FORMS, tourKey: 'dynamic-forms' },
        { key: '/dashboard/email', icon: <MailOutlined />, label: 'Email Marketing', module: Module.EMAIL },
        { key: '/dashboard/analytics', icon: <PieChartOutlined />, label: 'Analytics', module: Module.ANALYTICS },
    ];

    // Admin management items
    const adminManageItems = [
        {
            key: 'workspace',
            icon: <SettingOutlined />,
            label: 'Workspace',
            children: [
                { key: '/dashboard/sub-users', icon: <TeamOutlined />, label: 'Team', module: Module.SUB_USERS },
                { key: '/dashboard/plans', icon: <ThunderboltOutlined />, label: 'My Plan', module: Module.PLANS },
                { key: '/dashboard/billing', icon: <CreditCardOutlined />, label: 'Billing', module: Module.BILLING },
            ]
        }
    ];

    // Sub-User items
    const subUserItems = [
        {
            key: 'engagement',
            icon: <ThunderboltOutlined />,
            label: 'Engagement',
            children: [
                { key: '/dashboard/chat', icon: <MessageOutlined />, label: 'Live Chat', module: Module.LIVE_CHAT },
                { key: '/dashboard/links', icon: <LinkOutlined />, label: 'Smart Links', module: Module.LINKS },
            ]
        },
        {
            key: 'channels',
            icon: <AppstoreOutlined />,
            label: 'Channels',
            children: [
                { key: '/dashboard/whatsapp', icon: <WhatsAppOutlined />, label: 'WhatsApp', module: Module.WHATSAPP },
                { key: 'rcs-external', icon: <ThunderboltOutlined />, label: 'RCS Business', onClick: () => window.open('https://mrcs.madmarketer.net', '_blank') },
            ]
        },
        { key: '/dashboard/crm', icon: <FundOutlined />, label: 'CRM', module: Module.CRM },
        { key: '/dashboard/bookings', icon: <CalendarOutlined />, label: 'Bookings', module: Module.BOOKINGS },
    ];

    const buildMenuItems = (items: any[]): any[] =>
        items.map(item => {
            // Check module permission for the item itself
            if (item.module && !hasModule(item.module)) return null;

            const children = item.children ? buildMenuItems(item.children) : undefined;

            // If it has children but none are visible, hide the parent
            if (item.children && (!children || children.length === 0)) return null;

            return {
                key: item.key,
                icon: item.icon,
                onClick: item.onClick,
                label: (
                    <span data-tour={item.tourKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        {item.key && item.key.startsWith('/') ? (
                            <Link to={item.key} style={{ color: 'inherit', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                                {item.label}
                            </Link>
                        ) : (
                            item.label
                        )}
                        {item.isNew && (
                            <Tag color="#00df9a" style={{ color: '#000', fontSize: 9, padding: '0 5px', lineHeight: '16px', marginLeft: 6, borderRadius: 4, fontWeight: 700 }}>NEW</Tag>
                        )}
                    </span>
                ),
                children: children,
            };
        }).filter(Boolean) as any[];

    let menuSections: { label?: string; items: any[] }[] = [];

    if (user?.role === Role.SUPER_ADMIN) {
        menuSections = [{ items: buildMenuItems(superAdminItems) }];
    } else if (user?.role === Role.ADMIN) {
        menuSections = [
            { items: buildMenuItems(adminCoreItems) },
            { items: buildMenuItems(adminModuleItems) },
            { items: buildMenuItems(adminManageItems) },
        ];
    } else if (user?.role === Role.SUB_USER) {
        menuSections = [{ items: buildMenuItems(subUserItems) }];
    }

    // Hide sections that have no items (e.g. if all modules in that section are disabled)
    menuSections = menuSections.filter(s => s.items.length > 0);

    const allMenuItems = menuSections.flatMap((s, si) => {
        const sectionItems = s.items;
        if (s.label) {
            return [
                { key: `divider-${si}`, type: 'divider' as const },
                { key: `group-${si}`, type: 'group' as const, label: <span style={{ fontSize: 10, letterSpacing: 1.2, color: '#475569', fontWeight: 700, paddingLeft: 4 }}>{s.label}</span>, children: sectionItems },
            ];
        }
        return sectionItems;
    });

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
                        width={260}
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
                        <SidebarContent
                            user={user}
                            navigate={navigate}
                            logout={logout}
                            menuItems={allMenuItems}
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
                    width={260}
                    styles={{ body: { padding: 0 }, header: { display: 'none' } }}
                    contentWrapperStyle={{ background: '#000000' }}
                >
                    <SidebarContent
                        user={user}
                        navigate={navigate}
                        logout={logout}
                        menuItems={allMenuItems}
                        location={location}
                        defaultPath={defaultPath}
                        onMenuClick={() => setMobileMenuOpen(false)}
                    />
                </Drawer>

                <Layout style={{
                    marginLeft: isMobile ? 0 : 260,
                    transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0, 1)',
                    background: 'var(--background)'
                }}>
                    <Header style={{
                        background: 'rgba(11, 12, 14, 0.8)',
                        padding: isMobile ? '0 20px' : '0 40px',
                        height: 72,
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
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <BulbOutlined style={{ color: '#00df9a', fontSize: 16 }} />
                                <Text style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Neural Business Operating System</Text>
                            </div>
                        )}

                        <Space size={isMobile ? 12 : 20}>
                            <div
                                style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, cursor: 'pointer' }}
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
                                    size={isMobile ? 38 : 42}
                                    style={{ background: 'rgba(0, 223, 154, 0.1)', border: '1px solid rgba(0, 223, 154, 0.2)', color: '#00df9a' }}
                                    className="tour-avatar"
                                />
                            </div>
                        </Space>
                    </Header>

                    <Content style={{ padding: isMobile ? '20px 16px' : '32px 40px', overflowY: 'auto' }}>
                        {/* Subscription Warning Banners */}
                        {isOverdue && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
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
                                background: 'rgba(250, 204, 21, 0.06)',
                                border: '1px solid rgba(250, 204, 21, 0.2)',
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
            <FeatureTour />
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
            style={{ height: 72, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12, flexShrink: 0, cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            onClick={() => {
                navigate(defaultPath);
                onMenuClick();
            }}
        >
            <div style={{
                width: 38, height: 38,
                background: 'linear-gradient(135deg, #00df9a 0%, #00b37d 100%)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(0, 223, 154, 0.3)'
            }}>
                <ApiOutlined style={{ color: '#000', fontSize: 20 }} />
            </div>
            <div>
                <Title level={5} style={{ margin: 0, fontWeight: 800, color: '#fff', fontSize: 16, letterSpacing: -0.5, lineHeight: 1 }}>
                    MadMarketer
                </Title>
                <Text style={{ fontSize: 10, color: '#00df9a', fontWeight: 600, letterSpacing: 0.5 }}>AI BOS</Text>
            </div>
        </div>

        {/* Menu Section */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 6px' }}>
            <Menu
                mode="inline"
                selectedKeys={[location.pathname + location.search]}
                items={menuItems}
                onClick={({ key }) => {
                    // If it's a path, navigate
                    if (key && key.startsWith('/')) {
                        navigate(key);
                        onMenuClick();
                        return;
                    }

                    // Otherwise, look for custom onClick (like for RCS)
                    const findItem = (items: any[]): any => {
                        for (const item of items) {
                            if (item.key === key) return item;
                            if (item.children) {
                                const found = findItem(item.children);
                                if (found) return found;
                            }
                        }
                        return null;
                    };

                    const menuItem = findItem(menuItems);
                    if (menuItem?.onClick) {
                        menuItem.onClick();
                    }
                    onMenuClick();
                }}
                style={{ border: 'none', background: 'transparent' }}
                inlineIndent={20}
            />
        </div>

        {/* Footer Section */}
        <div style={{ paddingBottom: 16, flexShrink: 0 }}>
            {user?.role === Role.ADMIN && (
                <div style={{ padding: '0 12px', marginBottom: 12 }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(0, 223, 154, 0.06) 0%, rgba(0, 179, 125, 0.03) 100%)',
                        border: '1px solid rgba(0, 223, 154, 0.15)',
                        borderRadius: 12,
                        padding: '14px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: 'rgba(0, 223, 154, 0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <ThunderboltOutlined style={{ color: '#00df9a', fontSize: 14 }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Active Plan</div>
                                <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{user?.plan?.name || 'Basic'}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: 10, color: '#475569' }}>
                                {user?.subUsersLimit} agents · {user?.linksLimit} links
                            </div>
                            {(!user?.planId || user?.plan?.name?.toLowerCase().includes('basic')) && (
                                <Button
                                    type="link"
                                    size="small"
                                    onClick={() => navigate('/dashboard/plans')}
                                    style={{ padding: 0, color: '#00df9a', fontSize: 11, fontWeight: 700, height: 'auto' }}
                                >
                                    Upgrade ↑
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <div style={{ padding: '0 12px' }}>
                <Button
                    icon={<LogoutOutlined style={{ fontSize: 16 }} />}
                    block
                    onClick={logout}
                    type="text"
                    style={{
                        color: '#64748b',
                        height: 44,
                        width: '100%',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        gap: 10,
                        fontSize: 13,
                        padding: '0 12px',
                        fontWeight: 500,
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.color = '#ef4444';
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.06)';
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    }}
                >
                    <span>Sign out</span>
                </Button>
            </div>
        </div>
    </div>
);

export default DashboardLayout;
