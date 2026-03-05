import React, { useState } from 'react';

import {
    Row,
    Col,
    Card,
    Typography,
    Table,
    Statistic,
    Spin,
    Empty,
} from 'antd';
import {
    WhatsAppOutlined,
    MessageOutlined,
    LineChartOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import apiClient from '../api/apiClient';

const { Title, Text } = Typography;

const Reports: React.FC = () => {
    const [page, setPage] = useState(1);

    const { data: reportsResponse, isLoading } = useQuery({
        queryKey: ['link-reports', page],
        queryFn: () => apiClient.get(`/links/reports?page=${page}&limit=10`).then(res => res.data),
    });

    const reports = reportsResponse?.data || [];
    const total = reportsResponse?.total || 0;

    const globalStats = reportsResponse?.globalStats || { totalConversations: 0, waRedirects: 0 };
    const totalChats = globalStats.totalConversations;
    const totalWARedirects = globalStats.waRedirects;
    const avgConversion = totalChats > 0 ? ((totalWARedirects / totalChats) * 100).toFixed(1) : '0';

    const columns = [
        {
            title: 'Chat Link',
            dataIndex: 'title',
            key: 'title',
            render: (text: string, record: any) => (
                <div>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{text}</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>/{record.slug}</Text>
                </div>
            )
        },
        {
            title: 'Total Conversations',
            dataIndex: 'totalConversations',
            key: 'totalConversations',
            align: 'center' as const,
            sorter: (a: any, b: any) => a.totalConversations - b.totalConversations,
        },
        {
            title: 'WhatsApp Redirects',
            dataIndex: 'waRedirects',
            key: 'waRedirects',
            align: 'center' as const,
            render: (val: number) => (
                <Text style={{ color: '#25D366', fontWeight: 600 }}>
                    <WhatsAppOutlined style={{ marginRight: 8 }} />
                    {val}
                </Text>
            ),
            sorter: (a: any, b: any) => a.waRedirects - b.waRedirects,
        },
        {
            title: 'Conversion Rate',
            dataIndex: 'conversionRate',
            key: 'conversionRate',
            align: 'center' as const,
            render: (val: string) => (
                <Badge
                    count={`${val}%`}
                    style={{ background: 'rgba(0, 223, 154, 0.1)', color: '#00df9a', border: 'none' }}
                />
            ),
            sorter: (a: any, b: any) => parseFloat(a.conversionRate) - parseFloat(b.conversionRate),
        }
    ];

    if (isLoading) {
        return (
            <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div style={{ marginBottom: 40 }}>
                <Title level={3} style={{ margin: 0, fontWeight: 800 }}>Reports & Analytics</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>Track your WhatsApp redirection performance.</Text>
            </div>

            <Row gutter={[24, 24]} style={{ marginBottom: 40 }}>
                <Col xs={24} sm={8}>
                    <Card className="premium-card" style={{ height: '100%' }}>
                        <Statistic
                            title={<span style={{ color: 'var(--text-secondary)' }}>Total Web Chats</span>}
                            value={totalChats}
                            prefix={<MessageOutlined style={{ color: '#00df9a', marginRight: 8 }} />}
                            valueStyle={{ color: '#fff', fontWeight: 800 }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card className="premium-card" style={{ height: '100%' }}>
                        <Statistic
                            title={<span style={{ color: 'var(--text-secondary)' }}>WhatsApp Redirects</span>}
                            value={totalWARedirects}
                            prefix={<WhatsAppOutlined style={{ color: '#25D366', marginRight: 8 }} />}
                            valueStyle={{ color: '#fff', fontWeight: 800 }}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card className="premium-card" style={{ height: '100%' }}>
                        <Statistic
                            title={<span style={{ color: 'var(--text-secondary)' }}>Avg. Conversion Rate</span>}
                            value={avgConversion}
                            suffix="%"
                            prefix={<LineChartOutlined style={{ color: '#53bdeb', marginRight: 8 }} />}
                            valueStyle={{ color: '#fff', fontWeight: 800 }}
                        />
                    </Card>
                </Col>
            </Row>

            <Card className="premium-card" style={{ padding: 0 }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--divider)' }}>
                    <Title level={5} style={{ margin: 0 }}>Performance by Link</Title>
                </div>
                <Table
                    dataSource={reports}
                    columns={columns}
                    rowKey="id"
                    pagination={{
                        current: page,
                        pageSize: 10,
                        total: total,
                        onChange: (newPage) => setPage(newPage)
                    }}
                    locale={{ emptyText: <Empty description="No data available" /> }}
                    className="premium-table"
                />
            </Card>
        </motion.div>
    );
};

// Simple Badge component since I missed importing it or if it's simpler this way
const Badge = ({ count, style }: { count: string, style: any }) => (
    <span style={{
        padding: '4px 12px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        ...style
    }}>
        {count}
    </span>
);

export default Reports;
