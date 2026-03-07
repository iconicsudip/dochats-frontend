import React from 'react';
import { Card, Statistic, List, Avatar, Typography, Button, Skeleton, Tag, Space, Grid, Row, Col } from 'antd';
import { LinkOutlined, MessageOutlined, PlusOutlined, MoreOutlined, ThunderboltOutlined, TeamOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const Overview: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { data: linksResponse, isLoading } = useQuery({
        queryKey: ['links'],
        queryFn: () => apiClient.get('/links?limit=50').then(res => res.data),
    });

    const links = linksResponse?.data || [];
    const totalChats = links?.reduce((acc: number, l: any) => acc + l._count.conversations, 0) || 0;

    const stats = [
        { title: 'My Links', value: links?.length || 0, icon: <LinkOutlined />, desc: '+2 this week', trend: '#0c0c0c' },
        { title: 'Live Chats', value: totalChats, icon: <MessageOutlined />, desc: '0 active now', trend: '#a855f7' },
    ];

    const screens = Grid.useBreakpoint();
    const isMobile = !screens.sm;

    if (isLoading) return <Skeleton active paragraph={{ rows: 10 }} />;

    return (
        <div>
            <div style={{ marginBottom: isMobile ? 24 : 32 }}>
                <Title level={3} style={{ margin: 0, fontWeight: 800, fontSize: isMobile ? 20 : 24 }}>Dashboard Overview</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>Welcome back, here's what's happening today.</Text>
            </div>

            <Row gutter={[24, 24]}>
                {stats.map((stat, idx) => (
                    <Col xs={24} sm={12} lg={6} key={idx}>
                        <Card className="premium-card">
                            <div style={{ padding: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                    <div style={{ width: 44, height: 44, background: 'rgba(0, 223, 154, 0.05)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0, 223, 154, 0.1)' }}>
                                        {React.cloneElement(stat.icon as any, { style: { fontSize: 20, color: '#00df9a' } })}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#00df9a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.desc}</div>
                                </div>
                                <Statistic
                                    title={<Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{stat.title}</Text>}
                                    value={stat.value}
                                    valueStyle={{ fontSize: isMobile ? 28 : 32, fontWeight: 800, color: '#fff', marginTop: 4 }}
                                />
                            </div>
                        </Card>
                    </Col>
                ))}

                <Col xs={24} sm={12} lg={6}>
                    <Card className="premium-card">
                        <div style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div style={{ width: 44, height: 44, background: 'rgba(168, 85, 247, 0.05)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(168, 85, 247, 0.1)' }}>
                                    <SafetyCertificateOutlined style={{ fontSize: 20, color: '#a855f7' }} />
                                </div>
                                <Tag color={user?.plan?.name === 'Basic' ? 'blue' : 'gold'} style={{ margin: 0 }}>{user?.plan?.name || 'Basic'}</Tag>
                            </div>
                            <Statistic
                                title={<Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>ACTIVE PLAN</Text>}
                                value={user?.plan?.name || 'Basic'}
                                valueStyle={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#fff', marginTop: 4 }}
                            />
                        </div>
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card className="premium-card">
                        <div style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div style={{ width: 44, height: 44, background: 'rgba(59, 130, 246, 0.05)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                    <TeamOutlined style={{ fontSize: 20, color: '#3b82f6' }} />
                                </div>
                            </div>
                            <Statistic
                                title={<Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>TEAM USAGE</Text>}
                                value={user?.subUsersLimit || 0}
                                suffix={<span style={{ fontSize: 14, color: '#8696a0' }}>limit</span>}
                                valueStyle={{ fontSize: isMobile ? 20 : 24, fontWeight: 800, color: '#fff', marginTop: 4 }}
                            />
                        </div>
                    </Card>
                </Col>
            </Row>

            {user?.plan?.name === 'Basic' && (
                <Card
                    style={{
                        marginTop: 24,
                        background: 'linear-gradient(90deg, rgba(0, 223, 154, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
                        border: '1px dashed rgba(0, 223, 154, 0.3)',
                        borderRadius: 16
                    }}
                >
                    <div style={{
                        display: 'flex',
                        flexDirection: isMobile ? 'column' : 'row',
                        justifyContent: 'space-between',
                        alignItems: isMobile ? 'flex-start' : 'center',
                        padding: '8px 16px',
                        gap: isMobile ? 20 : 0
                    }}>
                        <Space size={16}>
                            <div style={{ width: 40, height: 40, background: '#00df9a', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <ThunderboltOutlined style={{ color: '#000', fontSize: 20 }} />
                            </div>
                            <div>
                                <Text strong style={{ fontSize: 15, display: 'block' }}>Unlock your full potential with DoChats Pro</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>Get more team members, unlimited links and priority support.</Text>
                            </div>
                        </Space>
                        <Button
                            type="primary"
                            className="premium-button"
                            icon={<ThunderboltOutlined />}
                            onClick={() => navigate('/dashboard/plans')}
                            style={{ width: isMobile ? '100%' : 'auto' }}
                        >
                            Upgrade Now
                        </Button>
                    </div>
                </Card>
            )}


            <Row gutter={[24, 24]} style={{ marginTop: 32 }}>
                <Col xs={24}>
                    <Card
                        className="premium-card"
                        title={<Title level={5} style={{ margin: 0 }}>Recent Links</Title>}
                        extra={<Button type="link" style={{ color: '#00df9a', fontSize: 13 }}>View All</Button>}
                    >
                        <div style={{ padding: '0 16px 16px 16px' }}>
                            {links?.length === 0 ? (
                                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    <PlusOutlined style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }} />
                                    <p>No links created yet.</p>
                                </div>
                            ) : (
                                <List
                                    dataSource={links?.slice(0, 4)}
                                    renderItem={(item: any) => (
                                        <List.Item extra={<Button type="text" icon={<MoreOutlined />} />}>
                                            <List.Item.Meta
                                                avatar={<Avatar size={36} icon={<LinkOutlined />} style={{ background: 'rgba(0, 223, 154, 0.1)', color: '#00df9a' }} />}
                                                title={<Text strong style={{ fontSize: 14 }}>{item.title}</Text>}
                                                description={<Text type="secondary" style={{ fontSize: 12 }}>/{item.slug} • {item._count.conversations} conversations</Text>}
                                            />
                                        </List.Item>
                                    )}
                                />
                            )}
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Overview;
