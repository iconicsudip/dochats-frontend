import React, { useEffect, useState } from 'react';
import { Card, Statistic, List, Avatar, Typography, Button, Skeleton, Space, Grid, Row, Col, message, Progress, Tag } from 'antd';
import {
    LinkOutlined, MessageOutlined, PlusOutlined, ThunderboltOutlined, TeamOutlined,
    SafetyCertificateOutlined, DownloadOutlined, RobotOutlined, CalendarOutlined,
    PlayCircleOutlined, FundOutlined, RiseOutlined, FireOutlined, ArrowUpOutlined
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useModules } from '../contexts/ModuleContext';
import { socket } from '../socket';
import { Module } from '../enums';
import { useNavigate } from 'react-router-dom';
import { analyticsApi, AnalyticsData } from '../api/analytics';

const { Title, Text } = Typography;



const getActivityIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
        lead: <RobotOutlined />,
        booking: <CalendarOutlined />,
        chat: <MessageOutlined />,
        crm: <FundOutlined />,
        automation: <PlayCircleOutlined />,
    };
    return icons[type] || <ThunderboltOutlined />;
};

const Overview: React.FC = () => {
    const { user } = useAuth();
    const { hasModule } = useModules();
    const navigate = useNavigate();
    const [downloading, setDownloading] = useState(false);
    const { data: linksResponse, isLoading: linksLoading } = useQuery({
        queryKey: ['links'],
        queryFn: () => apiClient.get('/links?limit=50').then(res => res.data),
    });

    const { data: analytics, isLoading: analyticsLoading } = useQuery({
        queryKey: ['analytics'],
        queryFn: () => analyticsApi.getAnalytics(),
    });

    const queryClient = useQueryClient();

    useEffect(() => {
        if (!user?.id) return;
        socket.connect();
        socket.emit('join_admin', user.id);
        const refreshData = () => {
            queryClient.invalidateQueries({ queryKey: ['links'] });
        };
        socket.on('conversation_updated', refreshData);
        socket.on('receive_message', refreshData);
        return () => {
            socket.off('conversation_updated', refreshData);
            socket.off('receive_message', refreshData);
        };
    }, [user?.id, queryClient]);

    const links = linksResponse?.data || [];
    const totalChats = links?.reduce((acc: number, l: any) => acc + l._count.conversations, 0) || 0;
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.sm;

    const handleDownloadLeads = async () => {
        if (downloading) return;
        setDownloading(true);
        try {
            const res = await apiClient.get('/conversations/download');
            const leads = res.data;
            if (leads.length === 0) { message.info('No leads found to download.'); return; }
            setTimeout(() => {
                const headers = ['Name', 'Phone', 'Link', 'Date'];
                const csvRows = [
                    headers.join(','),
                    ...leads.map((l: any) => [
                        `"${(l.name || '').replace(/"/g, '""')}"`,
                        `"${(l.phone || '').replace(/"/g, '""')}"`,
                        `"${(l.link || '').replace(/"/g, '""')}"`,
                        new Date(l.date).toLocaleString()
                    ].join(','))
                ];
                const csvString = csvRows.join('\n');
                const blob = new Blob([csvString], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
            }, 0);
        } catch (e) {
            message.error('Failed to download leads');
        } finally {
            setDownloading(false);
        }
    };

    if (linksLoading || analyticsLoading) return <Skeleton active paragraph={{ rows: 14 }} />;

    const statCards = [
        {
            title: 'Total Leads',
            value: totalChats,
            icon: <RobotOutlined />,
            color: '#00df9a',
            bg: 'rgba(0, 223, 154, 0.08)',
            border: 'rgba(0, 223, 154, 0.15)',
            trend: '+12%',
            desc: 'vs last week',
            path: '/dashboard/crm',
            module: Module.CRM,
        },
        {
            title: 'Live Chats',
            value: totalChats,
            icon: <MessageOutlined />,
            color: '#a855f7',
            bg: 'rgba(168, 85, 247, 0.08)',
            border: 'rgba(168, 85, 247, 0.15)',
            trend: '+5%',
            desc: 'vs last week',
            path: '/dashboard/chat',
            module: Module.LIVE_CHAT,
        },
        {
            title: 'Bookings',
            value: analytics?.kpi.bookingsThisMonth || 0,
            icon: <CalendarOutlined />,
            color: '#3b82f6',
            bg: 'rgba(59, 130, 246, 0.08)',
            border: 'rgba(59, 130, 246, 0.15)',
            trend: 'This month',
            desc: 'Total completed',
            path: '/dashboard/bookings',
            module: Module.BOOKINGS,
        },
        {
            title: 'Smart Links',
            value: links?.length || 0,
            icon: <LinkOutlined />,
            color: '#f59e0b',
            bg: 'rgba(245, 158, 11, 0.08)',
            border: 'rgba(245, 158, 11, 0.15)',
            trend: '+2',
            desc: 'this week',
            path: '/dashboard/links',
            module: Module.LINKS,
        },
    ].filter(s => hasModule(s.module));

    const quickModules = [
        {
            title: 'CRM Pipeline',
            desc: 'Manage leads & deals',
            icon: <FundOutlined style={{ fontSize: 24 }} />,
            color: '#a855f7',
            bg: 'rgba(168, 85, 247, 0.08)',
            path: '/dashboard/crm',
            module: Module.CRM,
            badge: null,
        },
        {
            title: 'Automation',
            desc: 'Set up auto follow-ups',
            icon: <PlayCircleOutlined style={{ fontSize: 24 }} />,
            color: '#3b82f6',
            bg: 'rgba(59, 130, 246, 0.08)',
            path: '/dashboard/automation',
            module: Module.AUTOMATION,
            badge: 'NEW',
        },
        {
            title: 'Bookings',
            desc: 'Manage appointments & slots',
            icon: <CalendarOutlined style={{ fontSize: 24 }} />,
            color: '#f59e0b',
            bg: 'rgba(245, 158, 11, 0.08)',
            path: '/dashboard/bookings',
            module: Module.BOOKINGS,
            badge: null,
        },
    ].filter(m => hasModule(m.module));

    return (
        <div>
            {/* Header */}
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'flex-end',
                marginBottom: isMobile ? 24 : 36,
                gap: isMobile ? 16 : 0
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <div style={{ width: 8, height: 8, background: '#00df9a', borderRadius: 4, boxShadow: '0 0 8px #00df9a' }} />
                        <Text style={{ color: '#00df9a', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>AI Business OS</Text>
                    </div>
                    <Title level={3} style={{ margin: 0, fontWeight: 800, fontSize: isMobile ? 22 : 26, color: '#fff' }}>
                        Command Center
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
                        Welcome back, {user?.name || user?.username}. Here's your business pulse.
                    </Text>
                </div>
                {user?.plan?.leadCaptureEnabled && hasModule(Module.CRM) && (
                    <Button
                        icon={<DownloadOutlined />}
                        onClick={handleDownloadLeads}
                        loading={downloading}
                        disabled={downloading}
                        style={{
                            background: 'rgba(59, 130, 246, 0.08)',
                            borderColor: 'rgba(59, 130, 246, 0.2)',
                            color: '#3b82f6',
                            borderRadius: 10,
                            height: 40,
                            fontWeight: 600,
                            width: isMobile ? '100%' : 'auto'
                        }}
                    >
                        {downloading ? "Processing..." : "Export Leads"}
                    </Button>
                )}
            </div>

            {/* Stat Cards */}
            {statCards.length > 0 && (
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    {statCards.map((stat, idx) => (
                        <Col xs={24} sm={12} lg={6} key={idx}>
                            <Card
                                className="premium-card"
                                style={{ cursor: 'pointer', border: `1px solid ${stat.border}`, background: stat.bg }}
                                onClick={() => navigate(stat.path)}
                            >
                                <div style={{ padding: '4px 4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                        <div style={{
                                            width: 44, height: 44,
                                            background: stat.bg,
                                            borderRadius: 12,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: `1px solid ${stat.border}`
                                        }}>
                                            {React.cloneElement(stat.icon as any, { style: { fontSize: 20, color: stat.color } })}
                                        </div>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            background: 'rgba(0, 223, 154, 0.08)',
                                            padding: '3px 8px',
                                            borderRadius: 20,
                                        }}>
                                            <ArrowUpOutlined style={{ fontSize: 10, color: '#00df9a' }} />
                                            <Text style={{ fontSize: 11, color: '#00df9a', fontWeight: 700 }}>{stat.trend}</Text>
                                        </div>
                                    </div>
                                    <Statistic
                                        title={<Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{stat.title}</Text>}
                                        value={stat.value}
                                        valueStyle={{ fontSize: isMobile ? 28 : 32, fontWeight: 800, color: '#fff', marginTop: 4 }}
                                    />
                                    <Text style={{ fontSize: 11, color: '#475569', marginTop: 4, display: 'block' }}>{stat.desc}</Text>
                                </div>
                            </Card>
                        </Col>
                    ))}

                    {/* Plan Card */}
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="premium-card" style={{ border: '1px solid rgba(168, 85, 247, 0.15)', background: 'rgba(168, 85, 247, 0.05)' }}>
                            <div style={{ padding: '4px 4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                    <div style={{ width: 44, height: 44, background: 'rgba(168, 85, 247, 0.08)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
                                        <SafetyCertificateOutlined style={{ fontSize: 20, color: '#a855f7' }} />
                                    </div>
                                    <Tag color="#a855f7" style={{ borderRadius: 8, fontWeight: 700, fontSize: 10 }}>ACTIVE</Tag>
                                </div>
                                <Statistic
                                    title={<Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Active Plan</Text>}
                                    value={user?.plan?.name || 'Basic'}
                                    valueStyle={{ fontSize: isMobile ? 20 : 22, fontWeight: 800, color: '#fff', marginTop: 4 }}
                                />
                                <div style={{ marginTop: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text style={{ fontSize: 10, color: '#475569' }}>Agents used</Text>
                                        <Text style={{ fontSize: 10, color: '#a855f7', fontWeight: 700 }}>0 / {user?.subUsersLimit || 0}</Text>
                                    </div>
                                    <Progress percent={0} strokeColor="#a855f7" trailColor="rgba(168, 85, 247, 0.1)" showInfo={false} size="small" />
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Quick Access Modules */}
            {quickModules.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                    <Title level={5} style={{ color: '#fff', margin: '0 0 16px 0', fontWeight: 700 }}>Quick Access</Title>
                    <Row gutter={[12, 12]}>
                        {quickModules.map((mod, idx) => (
                            <Col xs={12} sm={6} key={idx}>
                                <Card
                                    className="premium-card"
                                    style={{ cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', padding: 0 }}
                                    onClick={() => navigate(mod.path)}
                                    hoverable
                                >
                                    <div style={{ padding: '20px 16px' }}>
                                        <div style={{
                                            width: 52, height: 52,
                                            borderRadius: 16,
                                            background: mod.bg,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            margin: '0 auto 12px',
                                            color: mod.color,
                                        }}>
                                            {mod.icon}
                                        </div>
                                        <Text strong style={{ fontSize: 13, color: '#fff', display: 'block', marginBottom: 4 }}>{mod.title}</Text>
                                        <Text style={{ fontSize: 11, color: '#475569', lineHeight: 1.4 }}>{mod.desc}</Text>
                                        {mod.badge && (
                                            <Tag
                                                style={{
                                                    marginTop: 8,
                                                    background: mod.badge === 'NEW' ? 'rgba(0,223,154,0.1)' : 'rgba(59,130,246,0.1)',
                                                    color: mod.badge === 'NEW' ? '#00df9a' : '#3b82f6',
                                                    border: 'none',
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    borderRadius: 4,
                                                    padding: '0 6px'
                                                }}
                                            >
                                                {mod.badge}
                                            </Tag>
                                        )}
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </div>
            )}

            {/* Bottom: Activity Feed + Links */}
            <Row gutter={[16, 16]}>
                {/* Activity Feed */}
                <Col xs={24} lg={12}>
                    <Card
                        className="premium-card"
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FireOutlined style={{ color: '#f59e0b', fontSize: 16 }} />
                                <Title level={5} style={{ margin: 0, color: '#fff' }}>Activity Feed</Title>
                            </div>
                        }
                        extra={<Text style={{ fontSize: 12, color: '#475569' }}>Live</Text>}
                    >
                        <List
                            dataSource={(analytics?.activityFeed || []).filter(item => {
                                if (item.type === 'lead') return hasModule(Module.CRM);
                                if (item.type === 'booking') return hasModule(Module.BOOKINGS);
                                if (item.type === 'chat') return hasModule(Module.LIVE_CHAT);
                                if (item.type === 'crm') return hasModule(Module.CRM);
                                if (item.type === 'automation') return hasModule(Module.AUTOMATION);
                                return true;
                            })}
                            renderItem={(item) => (
                                <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '12px 0' }}>
                                    <List.Item.Meta
                                        avatar={
                                            <Avatar
                                                size={36}
                                                icon={getActivityIcon(item.type)}
                                                style={{ background: `${item.color}15`, color: item.color, border: `1px solid ${item.color}25`, flexShrink: 0 }}
                                            />
                                        }
                                        title={<Text style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{item.text}</Text>}
                                        description={
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                <Text style={{ fontSize: 12, color: '#475569' }}>{item.name}</Text>
                                                <span style={{ color: '#2d2e33', fontSize: 10 }}>•</span>
                                                <Text style={{ fontSize: 11, color: '#2d2e33' }}>{item.time}</Text>
                                            </div>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>

                {/* Recent Links */}
                {hasModule(Module.LINKS) && (
                    <Col xs={24} lg={12}>
                        <Card
                            className="premium-card"
                            title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <LinkOutlined style={{ color: '#3b82f6', fontSize: 16 }} />
                                    <Title level={5} style={{ margin: 0, color: '#fff' }}>Smart Links</Title>
                                </div>
                            }
                            extra={
                                <Button type="link" style={{ color: '#00df9a', fontSize: 12, padding: 0, fontWeight: 600 }} onClick={() => navigate('/dashboard/links')}>
                                    View All →
                                </Button>
                            }
                        >
                            {links?.length === 0 ? (
                                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    <PlusOutlined style={{ fontSize: 32, marginBottom: 12, opacity: 0.2 }} />
                                    <p style={{ margin: 0, fontSize: 13, color: '#475569' }}>No links created yet.</p>
                                    <Button
                                        type="link"
                                        style={{ color: '#00df9a', fontWeight: 600, marginTop: 8 }}
                                        onClick={() => navigate('/dashboard/links')}
                                    >
                                        Create your first link →
                                    </Button>
                                </div>
                            ) : (
                                <List
                                    dataSource={links?.slice(0, 5)}
                                    renderItem={(item: any) => (
                                        <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '12px 0' }}>
                                            <List.Item.Meta
                                                avatar={
                                                    <Avatar
                                                        size={36}
                                                        icon={<LinkOutlined />}
                                                        style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.15)' }}
                                                    />
                                                }
                                                title={<Text strong style={{ fontSize: 13, color: '#fff' }}>{item.title}</Text>}
                                                description={
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        /{item.slug} · {item._count.conversations} conversations
                                                    </Text>
                                                }
                                            />
                                            <Tag style={{ background: 'rgba(0,223,154,0.08)', color: '#00df9a', border: 'none', fontSize: 11 }}>
                                                {item._count.conversations}
                                            </Tag>
                                        </List.Item>
                                    )}
                                />
                            )}
                        </Card>
                    </Col>
                )}
            </Row>

            {/* Upgrade CTA */}
            {user?.plan?.name === 'Basic' && (
                <Card
                    style={{
                        marginTop: 24,
                        background: 'linear-gradient(135deg, rgba(0, 223, 154, 0.04) 0%, rgba(168, 85, 247, 0.04) 100%)',
                        border: '1px dashed rgba(0, 223, 154, 0.2)',
                        borderRadius: 16
                    }}
                >
                    <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        gap: isMobile ? 20 : 0
                    }}>
                        <Space size={16}>
                            <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, #00df9a, #a855f7)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <RiseOutlined style={{ color: '#fff', fontSize: 22 }} />
                            </div>
                            <div>
                                <Text strong style={{ fontSize: 15, display: 'block', color: '#fff' }}>Unlock the Full AI Business OS</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>Automation, AI agents, analytics, and unlimited scale.</Text>
                            </div>
                        </Space>
                        <Button
                            type="primary"
                            className="premium-button"
                            icon={<ThunderboltOutlined />}
                            onClick={() => navigate('/dashboard/plans')}
                            style={{ width: isMobile ? '100%' : 'auto' }}
                        >
                            Upgrade Plan
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default Overview;
