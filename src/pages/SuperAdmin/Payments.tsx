import React, { useState } from 'react';
import {
    Row,
    Col,
    Card,
    Typography,
    Table,
    Statistic,
    Avatar,
    Space,
    Skeleton,
    Input,
    Select,
    Tooltip,
    Empty,
    Pagination
} from 'antd';
import {
    DollarOutlined,
    CheckCircleOutlined,
    UserOutlined,
    SearchOutlined,
    ExclamationCircleOutlined,
    CalendarOutlined,
    WalletOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import apiClient from '../../api/apiClient';

const { Title, Text } = Typography;

const Payments: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const { data: response, isLoading } = useQuery({
        queryKey: ['all-payments', currentPage, searchTerm, statusFilter],
        queryFn: () => apiClient.get(`/billing/all-payments?page=${currentPage}&limit=${pageSize}&search=${searchTerm}&status=${statusFilter}`).then(res => res.data),
    });

    const stats = response?.stats || {};
    const paginatedPayments = response?.data || [];
    const totalPayments = response?.total || 0;

    const statCards = [
        {
            title: 'Total Revenue',
            value: stats.totalRevenue || 0,
            prefix: '₹',
            icon: <DollarOutlined />,
            color: '#00df9a',
            gradient: 'linear-gradient(135deg, rgba(0, 223, 154, 0.12), rgba(0, 223, 154, 0.02))',
        },
        {
            title: 'Active Plans',
            value: stats.activeSubscriptions || 0,
            icon: <CheckCircleOutlined />,
            color: '#22c55e',
            gradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(34, 197, 94, 0.02))',
        },
        {
            title: 'Pending / Overdue',
            value: stats.pendingPayments || 0,
            icon: <ExclamationCircleOutlined />,
            color: '#f59e0b',
            gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(245, 158, 11, 0.02))',
        },
        {
            title: 'Total Bills',
            value: stats.totalBills || 0,
            icon: <WalletOutlined />,
            color: '#6366f1',
            gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(99, 102, 241, 0.02))',
        },
    ];

    const getSubscriptionColor = (status: string) => {
        const map: any = {
            ACTIVE: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
            OVERDUE: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
            EXPIRED: { bg: 'rgba(113, 113, 122, 0.1)', color: '#71717a', border: 'rgba(113, 113, 122, 0.3)' },
        };
        return map[status] || { bg: 'rgba(113, 113, 122, 0.1)', color: '#71717a', border: 'rgba(113, 113, 122, 0.3)' };
    };

    const getPaymentColor = (status: string) => {
        const map: any = {
            PAID: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
            PENDING: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
            FAILED: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
        };
        return map[status] || { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' };
    };

    const columns = [
        {
            title: 'ADMIN',
            key: 'admin',
            width: 220,
            render: (_: any, record: any) => (
                <Space>
                    <Avatar
                        src={record.admin?.logoUrl}
                        icon={<UserOutlined />}
                        size={40}
                        style={{
                            background: 'rgba(0, 223, 154, 0.1)',
                            color: '#00df9a',
                            border: '1px solid rgba(0, 223, 154, 0.2)'
                        }}
                    />
                    <div>
                        <Text strong style={{ fontSize: 13, display: 'block', color: '#fff' }}>
                            {record.admin?.name || record.admin?.username}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>@{record.admin?.username}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'BILLING PERIOD',
            key: 'period',
            width: 200,
            render: (_: any, record: any) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CalendarOutlined style={{ color: '#8696a0', fontSize: 14 }} />
                    <div>
                        <Text style={{ fontSize: 13, display: 'block' }}>
                            {new Date(record.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            to {new Date(record.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                    </div>
                </div>
            ),
        },
        {
            title: 'AMOUNT',
            key: 'amount',
            width: 120,
            align: 'right' as const,
            render: (_: any, record: any) => (
                <Text strong style={{ fontSize: 15, color: '#fff' }}>₹{record.amount}</Text>
            ),
        },
        {
            title: 'SUBSCRIPTION',
            key: 'subscriptionStatus',
            width: 140,
            align: 'center' as const,
            render: (_: any, record: any) => {
                const style = getSubscriptionColor(record.subscriptionStatus);
                return (
                    <span style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.5,
                        textTransform: 'uppercase' as const,
                        background: style.bg,
                        color: style.color,
                        border: `1px solid ${style.border}`
                    }}>
                        {record.subscriptionStatus}
                    </span>
                );
            },
        },
        {
            title: 'PAYMENT STATUS',
            key: 'paymentStatus',
            width: 160,
            align: 'center' as const,
            render: (_: any, record: any) => {
                const payStatus = record.payment?.status || 'UNPAID';
                const style = getPaymentColor(payStatus);
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <span style={{
                            padding: '4px 12px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: 0.5,
                            textTransform: 'uppercase' as const,
                            background: style.bg,
                            color: style.color,
                            border: `1px solid ${style.border}`
                        }}>
                            {payStatus}
                        </span>
                        {record.payment?.paidAt && (
                            <Tooltip title={new Date(record.payment.paidAt).toLocaleString('en-IN')}>
                                <Text type="secondary" style={{ fontSize: 10 }}>
                                    {new Date(record.payment.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </Tooltip>
                        )}
                    </div>
                );
            },
        },
        {
            title: 'RAZORPAY ID',
            key: 'razorpayId',
            width: 180,
            render: (_: any, record: any) => {
                const rpId = record.payment?.razorpayPaymentId;
                if (!rpId) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
                return (
                    <Tooltip title={rpId}>
                        <Text copyable={{ text: rpId }} style={{ fontSize: 11, color: '#8696a0' }}>
                            {rpId.length > 18 ? `${rpId.substring(0, 18)}...` : rpId}
                        </Text>
                    </Tooltip>
                );
            },
        },
    ];

    const statusFilterOptions = [
        { value: 'ALL', label: 'All Statuses' },
        { value: 'PAID', label: '✅ Paid' },
        { value: 'PENDING', label: '⏳ Pending' },
        { value: 'ACTIVE', label: '🟢 Active' },
        { value: 'OVERDUE', label: '🔴 Overdue' },
        { value: 'EXPIRED', label: '⚪ Expired' },
    ];

    if (isLoading) return <Skeleton active paragraph={{ rows: 12 }} />;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div style={{ marginBottom: 32 }}>
                <Title level={3} style={{ margin: 0, fontWeight: 800 }}>Payment Management</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>Track all admin payments, subscription statuses, and revenue analytics.</Text>
            </div>

            {/* Stats Cards */}
            <Row gutter={[20, 20]} style={{ marginBottom: 32 }}>
                {statCards.map((stat, idx) => (
                    <Col xs={24} sm={12} lg={6} key={idx}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                        >
                            <Card
                                style={{
                                    background: stat.gradient,
                                    border: `1px solid ${stat.color}15`,
                                    borderRadius: 16,
                                }}
                                styles={{ body: { padding: 24 } }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                    <div style={{
                                        width: 48,
                                        height: 48,
                                        background: `${stat.color}18`,
                                        borderRadius: 14,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: `1px solid ${stat.color}25`
                                    }}>
                                        {React.cloneElement(stat.icon as any, { style: { fontSize: 22, color: stat.color } })}
                                    </div>
                                </div>
                                <Statistic
                                    title={<Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{stat.title}</Text>}
                                    value={stat.value}
                                    prefix={stat.prefix}
                                    valueStyle={{ fontSize: 28, fontWeight: 800, color: '#fff', marginTop: 4 }}
                                />
                            </Card>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* Payments Table */}
            <Card
                style={{
                    background: '#121316',
                    border: '1px solid #2d2e33',
                    borderRadius: 16,
                    overflow: 'hidden'
                }}
                styles={{ body: { padding: 0 } }}
            >
                {/* Table Header with Search & Filter */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #2d2e33',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 16
                }}>
                    <div>
                        <Title level={5} style={{ margin: 0, fontWeight: 700 }}>All Admin Payments</Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {totalPayments} record{totalPayments !== 1 ? 's' : ''} found
                        </Text>
                    </div>
                    <Space size={12} wrap>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#8696a0' }} />}
                            placeholder="Search admin..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            style={{
                                width: 220,
                                background: '#0b0c0e',
                                border: '1px solid #2d2e33',
                                borderRadius: 10,
                                color: '#fff'
                            }}
                            allowClear
                        />
                        <Select
                            value={statusFilter}
                            onChange={v => { setStatusFilter(v); setCurrentPage(1); }}
                            options={statusFilterOptions}
                            style={{ width: 160 }}
                            popupMatchSelectWidth={false}
                            dropdownStyle={{ background: '#1a1b1e', border: '1px solid #2d2e33', borderRadius: 10 }}
                        />
                    </Space>
                </div>

                {totalPayments === 0 ? (
                    <div style={{ padding: 60 }}>
                        <Empty description="No payments match your filters" />
                    </div>
                ) : (
                    <>
                        <Table
                            dataSource={paginatedPayments}
                            columns={columns}
                            rowKey="id"
                            pagination={false}
                            style={{ background: 'transparent' }}
                            className="premium-table"
                            size="middle"
                        />
                        {totalPayments > pageSize && (
                            <div style={{ padding: '16px 24px', borderTop: '1px solid #2d2e33', display: 'flex', justifyContent: 'flex-end' }}>
                                <Pagination
                                    current={currentPage}
                                    pageSize={pageSize}
                                    total={totalPayments}
                                    onChange={setCurrentPage}
                                    showSizeChanger={false}
                                    showTotal={(total, range) => (
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {range[0]}–{range[1]} of {total} records
                                        </Text>
                                    )}
                                />
                            </div>
                        )}
                    </>
                )}
            </Card>
        </motion.div>
    );
};

export default Payments;
