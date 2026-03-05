import React, { useEffect, useState } from 'react';
import {
    Row,
    Col,
    Card,
    Button,
    Typography,
    Table,
    Tag,
    Statistic,
    Alert,
    Space,
    Skeleton,
    message,
    Result
} from 'antd';
import {
    CreditCardOutlined,
    CalendarOutlined,
    WarningOutlined,
    ClockCircleOutlined,
    ThunderboltOutlined
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';

const { Title, Text } = Typography;

declare global {
    interface Window {
        Razorpay: any;
    }
}

const Billing: React.FC = () => {
    const queryClient = useQueryClient();
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [page, setPage] = useState(1);

    const { data: status, isLoading: statusLoading } = useQuery({
        queryKey: ['billing-status'],
        queryFn: () => apiClient.get('/billing/status').then(res => res.data),
    });

    const { data: historyResponse, isLoading: historyLoading } = useQuery({
        queryKey: ['billing-history', page],
        queryFn: () => apiClient.get(`/billing/history?page=${page}&limit=10`).then(res => res.data),
    });
    const history = historyResponse?.data || [];
    const total = historyResponse?.total || 0;

    // Load Razorpay script
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        return () => { document.body.removeChild(script); };
    }, []);

    const handlePayNow = async () => {
        try {
            setPaymentLoading(true);

            const { data: order } = await apiClient.post('/billing/create-order');

            const options = {
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: 'DoChats',
                description: 'Monthly Subscription',
                order_id: order.orderId,
                handler: async (response: any) => {
                    try {
                        await apiClient.post('/billing/verify-payment', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });
                        message.success('Payment successful! Your subscription is now active.');
                        queryClient.invalidateQueries({ queryKey: ['billing-status'] });
                        queryClient.invalidateQueries({ queryKey: ['billing-history'] });
                    } catch {
                        message.error('Payment verification failed. Please contact support.');
                    }
                },
                prefill: {},
                theme: {
                    color: '#00df9a'
                },
                modal: {
                    ondismiss: () => {
                        setPaymentLoading(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', () => {
                message.error('Payment failed. Please try again.');
                setPaymentLoading(false);
            });
            rzp.open();
            setPaymentLoading(false);
        } catch (e) {
            console.error(e);
            message.error('Failed to initiate payment');
            setPaymentLoading(false);
        }
    };

    const sub = status?.subscription;
    const isOverdue = sub?.isOverdue;
    const showWarning = sub?.showWarning;

    const columns = [
        {
            title: 'Period',
            key: 'period',
            render: (_: any, record: any) => (
                <Space direction="vertical" size={0}>
                    <Text strong style={{ fontSize: 13 }}>
                        {new Date(record.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' → '}
                        {new Date(record.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Text>
                </Space>
            ),
        },
        {
            title: 'Amount',
            key: 'amount',
            render: (_: any, record: any) => (
                <Text strong style={{ fontSize: 14 }}>₹{record.amount}</Text>
            )
        },
        {
            title: 'Subscription',
            key: 'status',
            render: (_: any, record: any) => {
                const colors: any = {
                    ACTIVE: 'green',
                    OVERDUE: 'red',
                    EXPIRED: 'default'
                };
                return <Tag color={colors[record.status] || 'default'}>{record.status}</Tag>;
            }
        },
        {
            title: 'Payment',
            key: 'payment',
            render: (_: any, record: any) => {
                if (!record.payment) return <Tag color="orange">PENDING</Tag>;
                const colors: any = {
                    PAID: 'green',
                    PENDING: 'orange',
                    FAILED: 'red'
                };
                return (
                    <Space direction="vertical" size={0}>
                        <Tag color={colors[record.payment.status]}>{record.payment.status}</Tag>
                        {record.payment.paidAt && (
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                {new Date(record.payment.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        )}
                    </Space>
                );
            }
        }
    ];

    if (statusLoading) return <Skeleton active paragraph={{ rows: 10 }} />;

    return (
        <div>
            <div style={{ marginBottom: 32 }}>
                <Title level={3} style={{ margin: 0, fontWeight: 800 }}>Billing & Subscription</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>Manage your monthly subscription and view payment history.</Text>
            </div>

            {/* Overdue Alert */}
            {isOverdue && (
                <Alert
                    message="Subscription Expired"
                    description="Your subscription has expired. Please make the payment to continue using all features."
                    type="error"
                    showIcon
                    icon={<WarningOutlined />}
                    style={{ marginBottom: 24, borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.08)' }}
                    action={
                        <Button type="primary" danger onClick={handlePayNow} loading={paymentLoading}>
                            Pay Now
                        </Button>
                    }
                />
            )}

            {/* Warning Alert - 3 days before expiry */}
            {showWarning && !isOverdue && (
                <Alert
                    message={`Subscription expires in ${sub.daysRemaining} day${sub.daysRemaining > 1 ? 's' : ''}`}
                    description="Your subscription is about to expire. Pay now to avoid any service interruption."
                    type="warning"
                    showIcon
                    icon={<ClockCircleOutlined />}
                    style={{ marginBottom: 24, borderRadius: 12, border: '1px solid rgba(250, 204, 21, 0.3)', background: 'rgba(250, 204, 21, 0.08)' }}
                    action={
                        <Button type="primary" onClick={handlePayNow} loading={paymentLoading} className="premium-button">
                            Renew Now
                        </Button>
                    }
                />
            )}

            {/* Current Plan Cards */}
            <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
                <Col xs={24} sm={8}>
                    <Card className="premium-card">
                        <div style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div style={{ width: 44, height: 44, background: 'rgba(0, 223, 154, 0.05)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0, 223, 154, 0.1)' }}>
                                    <CreditCardOutlined style={{ fontSize: 20, color: '#00df9a' }} />
                                </div>
                                <Tag color={isOverdue ? 'red' : 'green'} style={{ borderRadius: 6 }}>
                                    {sub?.status || 'N/A'}
                                </Tag>
                            </div>
                            <Statistic
                                title={<Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>MONTHLY PLAN</Text>}
                                value={sub?.amount || status?.defaultAmount || 0}
                                prefix="₹"
                                valueStyle={{ fontSize: 32, fontWeight: 800, color: '#fff', marginTop: 4 }}
                            />
                        </div>
                    </Card>
                </Col>

                <Col xs={24} sm={8}>
                    <Card className="premium-card">
                        <div style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div style={{ width: 44, height: 44, background: 'rgba(0, 223, 154, 0.05)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0, 223, 154, 0.1)' }}>
                                    <CalendarOutlined style={{ fontSize: 20, color: '#00df9a' }} />
                                </div>
                            </div>
                            <Statistic
                                title={<Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>DAYS REMAINING</Text>}
                                value={sub?.daysRemaining ?? 0}
                                valueStyle={{ fontSize: 32, fontWeight: 800, color: isOverdue ? '#ef4444' : '#fff', marginTop: 4 }}
                                suffix={<Text type="secondary" style={{ fontSize: 14 }}>days</Text>}
                            />
                        </div>
                    </Card>
                </Col>

                <Col xs={24} sm={8}>
                    <Card className="premium-card">
                        <div style={{ padding: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div style={{ width: 44, height: 44, background: 'rgba(0, 223, 154, 0.05)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0, 223, 154, 0.1)' }}>
                                    <CalendarOutlined style={{ fontSize: 20, color: '#00df9a' }} />
                                </div>
                            </div>
                            <Statistic
                                title={<Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>CURRENT PERIOD</Text>}
                                value={sub ? `${new Date(sub.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} — ${new Date(sub.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'N/A'}
                                valueStyle={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 4 }}
                            />
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Pay Now / Renew Button */}
            {!isOverdue && !showWarning && sub && (
                <div style={{ marginBottom: 32 }}>
                    <Button
                        type="primary"
                        size="large"
                        icon={<ThunderboltOutlined />}
                        onClick={handlePayNow}
                        loading={paymentLoading}
                        className="premium-button"
                        style={{ height: 48, paddingInline: 32 }}
                    >
                        Pay Early & Extend
                    </Button>
                    <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                        Pay before your period ends. Your new 30-day period will start from today.
                    </Text>
                </div>
            )}

            {/* No subscription case */}
            {!status?.hasSubscription && (
                <Result
                    icon={<CreditCardOutlined style={{ color: '#00df9a' }} />}
                    title="No Active Subscription"
                    subTitle={`Start your subscription for ₹${status?.defaultAmount || 999}/month to access all features.`}
                    extra={
                        <Button type="primary" size="large" onClick={handlePayNow} loading={paymentLoading} className="premium-button">
                            Subscribe Now
                        </Button>
                    }
                />
            )}

            {/* Payment History Table */}
            <Card
                className="premium-card"
                title={<Title level={5} style={{ margin: 0 }}>Payment History</Title>}
            >
                <Table
                    dataSource={history}
                    columns={columns}
                    rowKey="id"
                    loading={historyLoading}
                    pagination={{
                        current: page,
                        pageSize: 10,
                        total: total,
                        onChange: (newPage) => setPage(newPage)
                    }}
                    style={{ margin: '0 -8px' }}
                    locale={{ emptyText: 'No payment history yet' }}
                />
            </Card>
        </div>
    );
};

export default Billing;
