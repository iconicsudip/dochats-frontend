import React, { useState, useEffect } from 'react';
import { Typography, Card, Button, Row, Col, List, Space, Divider, Spin, message, Segmented, Grid } from 'antd';
import { CheckCircleOutlined, TeamOutlined, LinkOutlined, WhatsAppOutlined, RocketOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';

const { Title, Text, Paragraph } = Typography;

const Plans: React.FC = () => {
    const { user, setUser } = useAuth();
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

    const screens = Grid.useBreakpoint();
    const isMobile = !screens.sm;

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/super-admin/plans');
            setPlans(res.data);
        } catch (e) {
            message.error('Failed to load plans');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleUpgradeRequest = async (plan: any) => {
        setSubmitting(true);
        try {
            await apiClient.post('/billing/request-upgrade', {
                planId: plan.id,
                billingCycle: billingCycle
            });
            message.success(`Upgrade request for ${plan.name} (${billingCycle.toLowerCase()}) submitted successfully!`);

            // Refresh user data to show pending status
            const userRes = await apiClient.get('/auth/me');
            setUser(userRes.data);
        } catch (e: any) {
            message.error(e.response?.data?.error || 'Failed to submit upgrade request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCustomRequest = async () => {
        setSubmitting(true);
        try {
            await apiClient.post('/billing/request-upgrade', { planId: null });
            message.success('Custom plan request submitted successfully!');

            // Refresh user data
            const userRes = await apiClient.get('/auth/me');
            setUser(userRes.data);
        } catch (e: any) {
            message.error(e.response?.data?.error || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" /></div>;

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: isMobile ? 32 : 64 }}>
                <Title level={2} style={{ fontWeight: 800, margin: 0, fontSize: isMobile ? 24 : 32 }}>Choose the Right Plan for Your Business</Title>
                <Paragraph type="secondary" style={{ fontSize: isMobile ? 14 : 16, marginTop: 12 }}>
                    Unlock advanced features, higher limits, and dedicated support to scale your customer engagement.
                </Paragraph>
                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                    <Segmented
                        options={[
                            { label: isMobile ? 'Monthly' : 'Monthly billing', value: 'MONTHLY' },
                            {
                                label: (
                                    <Space size={isMobile ? 4 : 8}>
                                        {isMobile ? 'Yearly' : 'Yearly billing'}
                                        <span style={{ fontSize: 9, background: '#00df9a', color: '#000', padding: '1px 4px', borderRadius: 4, fontWeight: 700 }}>20% OFF</span>
                                    </Space>
                                ), value: 'YEARLY'
                            }
                        ]}
                        value={billingCycle}
                        onChange={(val: any) => setBillingCycle(val)}
                        size={isMobile ? 'middle' : 'large'}
                        className="premium-segmented"
                        style={{ background: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: 12 }}
                    />
                </div>
            </div>

            <Row gutter={[24, 24]} justify="center">
                {plans.map((plan) => {
                    const isCurrent = plan.id === user?.planId || (user?.plan?.name && plan.name === user?.plan?.name);

                    return (
                        <Col xs={24} md={12} lg={8} key={plan.id}>
                            <Card
                                hoverable
                                className="premium-card"
                                style={{
                                    height: '100%',
                                    border: isCurrent ? '2px solid #00df9a' : '1px solid #2d2e33',
                                    background: isCurrent ? 'linear-gradient(145deg, #121316 0%, #0b0c0e 100%)' : '#121316',
                                    borderRadius: 16,
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}
                            >
                                {isCurrent && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 12,
                                        right: -35,
                                        background: '#00df9a',
                                        color: '#000',
                                        padding: '4px 40px',
                                        transform: 'rotate(45deg)',
                                        fontSize: 10,
                                        fontWeight: 800,
                                        zIndex: 1
                                    }}>
                                        CURRENT
                                    </div>
                                )}

                                <div style={{ padding: '8px' }}>
                                    <Space direction="vertical" size={24} style={{ width: '100%' }}>
                                        <div>
                                            <Title level={4} style={{ margin: 0, color: '#fff', fontSize: isMobile ? 18 : 20 }}>{plan.name}</Title>
                                            <Paragraph style={{ color: '#8696a0', fontSize: isMobile ? 12 : 13, marginTop: 8, height: isMobile ? 'auto' : 40, overflow: 'hidden' }}>
                                                {plan.description || "The perfect starting point for growing businesses."}
                                            </Paragraph>
                                        </div>

                                        <div>
                                            <Title level={2} style={{ margin: 0, color: '#00df9a', fontWeight: 800, fontSize: isMobile ? 24 : 32 }}>
                                                ₹{billingCycle === 'MONTHLY' ? plan.monthlyPrice.toLocaleString() : (plan.yearlyPrice / 12).toLocaleString()}
                                                <span style={{ fontSize: isMobile ? 13 : 14, color: '#8696a0', fontWeight: 400 }}>/month</span>
                                            </Title>
                                            {billingCycle === 'YEARLY' && (
                                                <Text type="secondary" style={{ fontSize: 12 }}>Billed annually at ₹{plan.yearlyPrice.toLocaleString()}</Text>
                                            )}
                                        </div>

                                        <Divider style={{ margin: '8px 0', borderColor: 'rgba(255,255,255,0.05)' }} />

                                        <List
                                            split={false}
                                            dataSource={[
                                                { icon: <TeamOutlined />, text: `${plan.subUsersLimit} Support Agents` },
                                                { icon: <LinkOutlined />, text: `${plan.linksLimit} Dynamic Links` },
                                                { icon: <WhatsAppOutlined />, text: 'WhatsApp Redirection' },
                                                { icon: <RocketOutlined />, text: 'Priority Performance' },
                                                { icon: <CheckCircleOutlined />, text: 'Full Analytics Suite' },
                                            ]}
                                            renderItem={item => (
                                                <List.Item style={{ padding: '8px 0', border: 'none' }}>
                                                    <Space>
                                                        <span style={{ color: '#00df9a' }}>{item.icon}</span>
                                                        <Text style={{ color: '#f8fafc', fontSize: 13 }}>{item.text}</Text>
                                                    </Space>
                                                </List.Item>
                                            )}
                                        />

                                        <div style={{ marginTop: 12 }}>
                                            {isCurrent && user?.billingCycle === billingCycle ? (
                                                <Button block size="large" disabled style={{ background: 'rgba(0, 223, 154, 0.12)', border: '1px solid #00df9a', color: '#00df9a', fontWeight: 800, height: 52, borderRadius: 12 }}>
                                                    <CheckCircleOutlined style={{ marginRight: 8 }} /> Active Plan
                                                </Button>
                                            ) : (
                                                <Button
                                                    type={billingCycle === 'YEARLY' || (plan.monthlyPrice > (user?.plan?.monthlyPrice || 0)) ? 'primary' : 'default'}
                                                    block
                                                    size="large"
                                                    className={billingCycle === 'YEARLY' || (plan.monthlyPrice > (user?.plan?.monthlyPrice || 0)) ? 'premium-button' : ''}
                                                    onClick={() => handleUpgradeRequest(plan)}
                                                    loading={submitting}
                                                    disabled={user?.upgradeRequests?.some((r: any) => r.planId === plan.id && r.billingCycle === billingCycle)}
                                                    style={{
                                                        height: 52,
                                                        borderRadius: 12,
                                                        borderColor: billingCycle === 'YEARLY' || (plan.monthlyPrice > (user?.plan?.monthlyPrice || 0)) ? 'transparent' : '#2d2e33',
                                                        color: billingCycle === 'YEARLY' || (plan.monthlyPrice > (user?.plan?.monthlyPrice || 0)) ? '#000' : '#fff',
                                                        fontWeight: 700
                                                    }}
                                                >
                                                    {user?.upgradeRequests?.some((r: any) => r.planId === plan.id && r.billingCycle === billingCycle)
                                                        ? 'Request Pending'
                                                        : (isCurrent && user?.billingCycle !== billingCycle
                                                            ? `Switch to ${billingCycle.toLowerCase()}`
                                                            : (`Upgrade to ${plan.name}`))
                                                    }
                                                </Button>
                                            )}
                                        </div>
                                    </Space>
                                </div>
                            </Card>
                        </Col>
                    );
                })}
            </Row>

            <div style={{
                marginTop: isMobile ? 40 : 80,
                textAlign: 'center',
                background: 'rgba(0, 223, 154, 0.03)',
                padding: isMobile ? '32px 20px' : '48px',
                borderRadius: 24,
                border: '1px solid rgba(0, 223, 154, 0.1)'
            }}>
                <Title level={3} style={{ color: '#fff', fontSize: isMobile ? 20 : 24 }}>Need something custom?</Title>
                <Paragraph style={{ color: '#8696a0', fontSize: isMobile ? 14 : 16 }}>
                    If our standard plans don't fit your needs, we can create a custom solution tailored to your specific requirements.
                </Paragraph>
                <Button
                    type="primary"
                    size="large"
                    icon={<RocketOutlined />}
                    className="premium-button"
                    onClick={handleCustomRequest}
                    loading={submitting}
                    disabled={user?.upgradeRequests?.some((r: any) => r.planId === null)}
                    style={{ marginTop: 16, height: 52, padding: isMobile ? '0 24px' : '0 40px', fontWeight: 700, width: isMobile ? '100%' : 'auto' }}
                >
                    {user?.upgradeRequests?.some((r: any) => r.planId === null)
                        ? 'Custom Plan Request Pending'
                        : 'Request Custom Enterprise Plan'}
                </Button>
            </div>
        </div>
    );
};

export default Plans;
