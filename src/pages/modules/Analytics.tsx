import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Statistic, Progress, Tag } from 'antd';
import { analyticsApi, AnalyticsData } from '../../api/analytics';
import {
    RiseOutlined, FundOutlined, CalendarOutlined, RobotOutlined,
    MessageOutlined, ThunderboltOutlined, UserOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;



const Analytics: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const res = await analyticsApi.getAnalytics();
            setData(res);
        } catch (error) {
            console.error(error);
        }
    };

    if (!data) return <div style={{ color: '#fff', padding: 20 }}>Loading analytics...</div>;

    const maxBooking = Math.max(...data.weeklyBookings.map(d => d.val), 1);

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <RiseOutlined style={{ color: '#f59e0b', fontSize: 20 }} />
                    <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#fff' }}>Analytics</Title>
                </div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                    Business performance across all modules — AI Chat, CRM, Bookings, and Automation.
                </Text>
            </div>

            {/* KPI Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {[
                    { label: 'Total Revenue (est.)', value: `₹${(data.kpi.revenueEst / 1000).toFixed(1)}k`, icon: <RiseOutlined />, color: '#00df9a', sub: 'This month' },
                    { label: 'Leads This Month', value: data.kpi.leadsThisMonth, icon: <RobotOutlined />, color: '#a855f7', sub: 'This month' },
                    { label: 'Bookings This Month', value: data.kpi.bookingsThisMonth, icon: <CalendarOutlined />, color: '#3b82f6', sub: 'This month' },
                    { label: 'Automation Runs', value: data.kpi.automationRuns, icon: <ThunderboltOutlined />, color: '#f59e0b', sub: 'This month' },
                ].map((kpi, i) => (
                    <Col xs={12} sm={6} key={i}>
                        <Card className="premium-card" style={{ borderColor: `${kpi.color}20` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${kpi.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color, fontSize: 18 }}>
                                    {kpi.icon}
                                </div>
                                <Tag style={{ background: 'rgba(0,223,154,0.08)', color: '#00df9a', border: 'none', fontSize: 10, borderRadius: 6 }}>↑</Tag>
                            </div>
                            <Text style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600, display: 'block' }}>{kpi.label}</Text>
                            <Text style={{ fontSize: 26, fontWeight: 800, color: kpi.color, display: 'block', marginTop: 4 }}>{kpi.value}</Text>
                            <Text style={{ fontSize: 11, color: '#475569', marginTop: 4, display: 'block' }}>{kpi.sub}</Text>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row gutter={[16, 16]}>
                {/* Funnel */}
                <Col xs={24} lg={10}>
                    <Card className="premium-card" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Text style={{ fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Conversion Funnel</Text>
                        <Text style={{ fontSize: 12, color: '#2d3748', display: 'block', marginBottom: 20, marginTop: 4 }}>Visitor → Lead → Qualified → Booking → Won</Text>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {data.funnel.map((f, i) => {
                                const pct = Math.round((f.count / (data.funnel[0].count || 1)) * 100);
                                return (
                                    <div key={i}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                            <Text style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{f.stage}</Text>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <Text style={{ fontSize: 13, color: f.color, fontWeight: 700 }}>{f.count.toLocaleString()}</Text>
                                                <Text style={{ fontSize: 11, color: '#475569' }}>{pct}%</Text>
                                            </div>
                                        </div>
                                        <Progress
                                            percent={pct}
                                            strokeColor={f.color}
                                            trailColor="rgba(255,255,255,0.04)"
                                            showInfo={false}
                                            size="small"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </Col>

                {/* Weekly Bookings Bar Chart */}
                <Col xs={24} lg={8}>
                    <Card className="premium-card" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Text style={{ fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Weekly Bookings</Text>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 160, marginTop: 24, paddingBottom: 8 }}>
                            {data.weeklyBookings.map((d, i) => (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                    <Text style={{ fontSize: 11, color: '#3b82f6', fontWeight: 700 }}>{d.val}</Text>
                                    <div style={{
                                        width: '100%',
                                        height: `${(d.val / maxBooking) * 120}px`,
                                        background: `linear-gradient(180deg, #3b82f6 0%, rgba(59,130,246,0.3) 100%)`,
                                        borderRadius: '6px 6px 0 0',
                                        transition: 'height 0.5s ease',
                                    }} />
                                    <Text style={{ fontSize: 11, color: '#475569' }}>{d.day}</Text>
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>

                {/* Lead Sources */}
                <Col xs={24} lg={6}>
                    <Card className="premium-card" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Text style={{ fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Lead Sources</Text>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
                            {data.topSources.map((s, i) => (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                        <Text style={{ fontSize: 13, color: '#fff' }}>{s.label}</Text>
                                        <Text style={{ fontSize: 13, color: s.color, fontWeight: 700 }}>{s.value}%</Text>
                                    </div>
                                    <Progress percent={s.value} strokeColor={s.color} trailColor="rgba(255,255,255,0.04)" showInfo={false} size="small" />
                                </div>
                            ))}
                        </div>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default Analytics;
