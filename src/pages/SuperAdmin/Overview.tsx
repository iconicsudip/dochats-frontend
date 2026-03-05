import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Typography, Skeleton, Space, Table, Avatar, Tag } from 'antd';
import { TeamOutlined, LinkOutlined, MessageOutlined, DashboardOutlined, GlobalOutlined, UserOutlined } from '@ant-design/icons';
import apiClient from '../../api/apiClient';

const { Title, Text } = Typography;

const Overview: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get('/super-admin/stats')
            .then(res => setStats(res.data))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const StatCard = ({ title, value, icon, color }: any) => (
        <Card style={{ background: '#121316', border: '1px solid #2d2e33', borderRadius: 12 }}>
            <Statistic
                title={<Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>}
                value={value}
                prefix={React.cloneElement(icon, { style: { color, marginRight: 8, fontSize: 18 } })}
                valueStyle={{ color: '#fff', fontWeight: 800, fontSize: 22 }}
            />
        </Card>
    );

    if (loading) return <Skeleton active />;

    return (
        <div>
            <div style={{ marginBottom: 32 }}>
                <Title level={4} style={{ margin: 0, fontWeight: 800 }}>System Overview</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>Global performance and resource mapping across all accounts.</Text>
            </div>

            <Row gutter={[24, 24]}>
                <Col xs={24} sm={12} lg={8}>
                    <StatCard title="Total Admins" value={stats?.totalAdmins} icon={<TeamOutlined />} color="#00df9a" />
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <StatCard title="Total Sub-Users" value={stats?.totalSubUsers} icon={<TeamOutlined />} color="#53bdeb" />
                </Col>
                <Col xs={24} sm={12} lg={8}>
                    <StatCard title="Active Links" value={stats?.totalLinks} icon={<LinkOutlined />} color="#ffd279" />
                </Col>
                <Col xs={24} sm={12} lg={12}>
                    <StatCard title="Total Conversations" value={stats?.totalConversations} icon={<MessageOutlined />} color="#ff7e67" />
                </Col>
                <Col xs={24} sm={12} lg={12}>
                    <StatCard title="Total Messages" value={stats?.totalMessages} icon={<DashboardOutlined />} color="#a78bfa" />
                </Col>
            </Row>

            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                <Col span={24}>
                    <Card
                        title={<Text strong style={{ color: '#fff', fontSize: 15 }}>Recent Activity</Text>}
                        style={{ background: '#121316', border: '1px solid #2d2e33', borderRadius: 12 }}
                        styles={{ body: { padding: 0 } }}
                    >
                        <Table
                            dataSource={stats?.recentConversations}
                            rowKey="id"
                            pagination={false}
                            size="small"
                            className="small-table"
                            columns={[
                                {
                                    title: 'Visitor',
                                    dataIndex: 'visitorName',
                                    render: (name: string) => (
                                        <Space>
                                            <Avatar icon={<UserOutlined />} size="small" />
                                            <Text style={{ color: '#fff' }}>{name || 'Anonymous'}</Text>
                                        </Space>
                                    )
                                },
                                {
                                    title: 'Source Link',
                                    dataIndex: ['link', 'title'],
                                    render: (title: string) => <Tag color="blue">{title}</Tag>
                                },
                                {
                                    title: 'Last Activity',
                                    dataIndex: 'lastMessageAt',
                                    render: (date: string) => <Text type="secondary" style={{ fontSize: 12 }}>{new Date(date).toLocaleString()}</Text>
                                }
                            ]}
                        />
                    </Card>
                </Col>
            </Row>

            <Card
                style={{ marginTop: 40, background: 'rgba(0, 223, 154, 0.05)', border: '1px solid rgba(0, 223, 154, 0.2)', borderRadius: 16 }}
                styles={{ body: { padding: '40px' } }}
            >
                <Space align="start" size={24}>
                    <div style={{ width: 48, height: 48, background: '#00df9a', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <GlobalOutlined style={{ fontSize: 24, color: '#000' }} />
                    </div>
                    <div>
                        <Title level={5} style={{ color: '#fff', margin: '0 0 8px 0' }}>Super Admin Control Panel</Title>
                        <Text style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
                            You are currently viewing global system reports. As a Super Admin, you have the authority to manage all administrative accounts, monitor their activities, and ensure system-wide performance.
                        </Text>
                    </div>
                </Space>
            </Card>
        </div>
    );
};

export default Overview;
