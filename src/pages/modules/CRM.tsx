import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { crmApi, CrmLead } from '../../api/crm';
import {
    Card, Typography, Button, Row, Col, Tag, Avatar, Space, Input, Select, Badge,
    Tooltip, Modal, Form, Statistic, Dropdown
} from 'antd';
import {
    FundOutlined, PlusOutlined, SearchOutlined, UserOutlined,
    PhoneOutlined, MailOutlined, WhatsAppOutlined, CalendarOutlined,
    DollarOutlined, MoreOutlined, EyeOutlined, ExportOutlined, FireOutlined, ClockCircleOutlined, CheckCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';



const STATUS_CONFIG: Record<LeadStatus, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
    new: { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.1)', label: 'New Lead', icon: <FireOutlined /> },
    contacted: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Contacted', icon: <PhoneOutlined /> },
    qualified: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'Qualified', icon: <CheckCircleOutlined /> },
    proposal: { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', label: 'Proposal', icon: <MailOutlined /> },
    won: { color: '#00df9a', bg: 'rgba(0, 223, 154, 0.1)', label: 'Won', icon: <CheckCircleOutlined /> },
    lost: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Lost', icon: <ClockCircleOutlined /> },
};

const PIPELINE_STAGES: { key: LeadStatus; label: string }[] = [
    { key: 'new', label: 'New Leads' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'qualified', label: 'Qualified' },
    { key: 'proposal', label: 'Proposal' },
    { key: 'won', label: 'Won' },
    { key: 'lost', label: 'Lost' },
];

const CRM: React.FC = () => {
    const [view, setView] = useState<'pipeline' | 'list'>('pipeline');
    const [leads, setLeads] = useState<CrmLead[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [form] = Form.useForm();
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'new') {
            setAddModalOpen(true);
        }
    }, [location.search]);

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            const data = await crmApi.getLeads();
            setLeads(data.map(l => ({ ...l, lastActivity: l.updatedAt ? l.updatedAt.split('T')[0] : 'Just now' })));
        } catch (error) {
            console.error(error);
        }
    };

    const filteredLeads = leads.filter(l => {
        const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.phone.includes(searchTerm) || (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = filterStatus === 'all' || l.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const stats = {
        total: leads.length,
        won: leads.filter(l => l.status === 'WON').length,
        totalValue: leads.reduce((a, l) => a + l.value, 0),
        conversionRate: Math.round((leads.filter(l => l.status === 'WON').length / (leads.length || 1)) * 100),
    };

    const handleAddLead = async (values: any) => {
        try {
            await crmApi.createLead(values);
            setAddModalOpen(false);
            form.resetFields();
            fetchLeads();
        } catch (error) {
            console.error(error);
        }
    };

    const moveLeadStatus = async (leadId: string, newStatus: LeadStatus) => {
        // Optimistic update
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus.toUpperCase() as any } : l));
        try {
            await crmApi.updateStatus(leadId, newStatus.toUpperCase());
        } catch (error) {
            console.error(error);
            fetchLeads(); // Revert on failure
        }
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <FundOutlined style={{ color: '#a855f7', fontSize: 20 }} />
                        <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#fff' }}>CRM & Pipeline</Title>
                    </div>
                    <Text type="secondary" style={{ fontSize: 13 }}>Track leads, manage deals, and close more business.</Text>
                </div>
                <Space>
                    <Button
                        icon={<ExportOutlined />}
                        style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)', color: '#94a3b8', borderRadius: 10 }}
                    >
                        Export
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        className="premium-button"
                        onClick={() => setAddModalOpen(true)}
                    >
                        Add Lead
                    </Button>
                </Space>
            </div>

            {/* Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {[
                    { label: 'Total Leads', value: stats.total, color: '#a855f7', prefix: <UserOutlined /> },
                    { label: 'Deals Won', value: stats.won, color: '#00df9a', prefix: <CheckCircleOutlined /> },
                    { label: 'Pipeline Value', value: `₹${(stats.totalValue / 1000).toFixed(0)}K`, color: '#f59e0b', prefix: <DollarOutlined />, isStr: true },
                    { label: 'Conversion Rate', value: `${stats.conversionRate}%`, color: '#3b82f6', isStr: true },
                ].map((s, i) => (
                    <Col xs={12} sm={6} key={i}>
                        <Card className="premium-card" style={{ borderColor: `${s.color}20` }}>
                            <Statistic
                                title={<Text style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>{s.label}</Text>}
                                value={s.value}
                                valueStyle={{ color: s.color, fontWeight: 800, fontSize: 24 }}
                                formatter={s.isStr ? () => s.value : undefined}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Input
                        prefix={<SearchOutlined style={{ color: '#475569' }} />}
                        placeholder="Search leads..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ width: 220, background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 10, color: '#fff' }}
                    />
                    <Select
                        value={filterStatus}
                        onChange={setFilterStatus}
                        style={{ width: 140 }}
                        options={[
                            { value: 'all', label: 'All Status' },
                            ...PIPELINE_STAGES.map(s => ({ value: s.key, label: s.label }))
                        ]}
                    />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {(['pipeline', 'list'] as const).map(v => (
                        <Button
                            key={v}
                            size="small"
                            style={{
                                background: view === v ? 'rgba(0, 223, 154, 0.1)' : 'rgba(255,255,255,0.03)',
                                borderColor: view === v ? 'rgba(0, 223, 154, 0.3)' : 'rgba(255,255,255,0.08)',
                                color: view === v ? '#00df9a' : '#94a3b8',
                                borderRadius: 8,
                                fontWeight: 600
                            }}
                            onClick={() => setView(v)}
                        >
                            {v === 'pipeline' ? '📊 Pipeline' : '☰ List'}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Pipeline View */}
            {view === 'pipeline' ? (
                <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
                    {PIPELINE_STAGES.map(stage => {
                        const stageLeads = filteredLeads.filter(l => l.status.toLowerCase() === stage.key.toLowerCase());
                        const config = STATUS_CONFIG[stage.key];
                        return (
                            <div key={stage.key} style={{ minWidth: 240, flex: '0 0 240px' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 14px', marginBottom: 10,
                                    background: config.bg,
                                    borderRadius: 10,
                                    border: `1px solid ${config.color}25`
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ color: config.color }}>{config.icon}</span>
                                        <Text style={{ color: config.color, fontWeight: 700, fontSize: 12 }}>{stage.label}</Text>
                                    </div>
                                    <Badge count={stageLeads.length} style={{ background: config.color, color: '#000' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {stageLeads.map(lead => (
                                        <Card
                                            key={lead.id}
                                            className="premium-card"
                                            style={{ cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}
                                            onClick={() => { setSelectedLead(lead); setDetailOpen(true); }}
                                            size="small"
                                        >
                                            <div style={{ padding: '4px 0' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <Avatar size={28} style={{ background: config.bg, color: config.color, fontSize: 12, flexShrink: 0 }}>
                                                            {lead.name.charAt(0)}
                                                        </Avatar>
                                                        <Text strong style={{ fontSize: 13, color: '#fff' }}>{lead.name}</Text>
                                                    </div>
                                                    <Dropdown
                                                        menu={{
                                                            items: PIPELINE_STAGES
                                                                .filter(s => s.key !== stage.key)
                                                                .map(s => ({
                                                                    key: s.key,
                                                                    label: `Move to ${s.label}`,
                                                                    onClick: (e: any) => { e.domEvent.stopPropagation(); moveLeadStatus(lead.id, s.key as LeadStatus); }
                                                                }))
                                                        }}
                                                        trigger={['click']}
                                                    >
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            icon={<MoreOutlined style={{ color: '#475569' }} />}
                                                            onClick={e => e.stopPropagation()}
                                                            style={{ background: 'transparent', border: 'none', padding: '0 4px' }}
                                                        />
                                                    </Dropdown>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                                                    <Text style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <PhoneOutlined /> {lead.phone}
                                                    </Text>
                                                    <Text style={{ fontSize: 11, color: '#475569' }}>
                                                        🏢 {lead.industry}
                                                    </Text>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text style={{ fontSize: 12, color: '#00df9a', fontWeight: 700 }}>
                                                        ₹{lead.value.toLocaleString()}
                                                    </Text>
                                                    <Text style={{ fontSize: 10, color: '#2d3748' }}>{lead.lastActivity}</Text>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                    {stageLeads.length === 0 && (
                                        <div style={{ padding: 24, textAlign: 'center', color: '#2d3748', fontSize: 12, borderRadius: 10, border: '1px dashed rgba(255,255,255,0.05)' }}>
                                            No leads
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                // List View
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filteredLeads.map(lead => {
                        const config = STATUS_CONFIG[lead.status.toLowerCase() as LeadStatus];
                        return (
                            <Card
                                key={lead.id}
                                className="premium-card"
                                style={{ border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                                onClick={() => { setSelectedLead(lead); setDetailOpen(true); }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                                        <Avatar size={42} style={{ background: config.bg, color: config.color, fontSize: 16, flexShrink: 0 }}>
                                            {lead.name.charAt(0)}
                                        </Avatar>
                                        <div>
                                            <Text strong style={{ fontSize: 14, color: '#fff', display: 'block' }}>{lead.name}</Text>
                                            <Text style={{ fontSize: 12, color: '#475569' }}>{lead.phone} · {lead.industry}</Text>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                                        <Tag style={{ background: config.bg, color: config.color, border: `1px solid ${config.color}30`, borderRadius: 6, fontWeight: 600 }}>
                                            {config.label}
                                        </Tag>
                                        <Text style={{ fontSize: 14, color: '#00df9a', fontWeight: 700, minWidth: 80 }}>
                                            ₹{lead.value.toLocaleString()}
                                        </Text>
                                        <Text style={{ fontSize: 12, color: '#2d3748', minWidth: 60 }}>{lead.lastActivity}</Text>
                                        <Space size={4}>
                                            <Tooltip title="Call">
                                                <Button size="small" type="text" icon={<PhoneOutlined style={{ color: '#00df9a' }} />}
                                                    onClick={e => e.stopPropagation()}
                                                    style={{ background: 'rgba(0,223,154,0.06)', borderRadius: 6, border: 'none' }} />
                                            </Tooltip>
                                            <Tooltip title="WhatsApp">
                                                <Button size="small" type="text" icon={<WhatsAppOutlined style={{ color: '#25d366' }} />}
                                                    onClick={e => e.stopPropagation()}
                                                    style={{ background: 'rgba(37,211,102,0.06)', borderRadius: 6, border: 'none' }} />
                                            </Tooltip>
                                            <Tooltip title="View">
                                                <Button size="small" type="text" icon={<EyeOutlined style={{ color: '#3b82f6' }} />}
                                                    onClick={e => { e.stopPropagation(); setSelectedLead(lead); setDetailOpen(true); }}
                                                    style={{ background: 'rgba(59,130,246,0.06)', borderRadius: 6, border: 'none' }} />
                                            </Tooltip>
                                        </Space>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Add Lead Modal */}
            <Modal
                title={<Text style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Add New Lead</Text>}
                open={addModalOpen}
                onCancel={() => { setAddModalOpen(false); form.resetFields(); }}
                footer={null}
                width={480}
            >
                <Form form={form} layout="vertical" onFinish={handleAddLead} style={{ marginTop: 16 }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                                <Input placeholder="Rahul Sharma" className="premium-input" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
                                <Input placeholder="+91 98765 43210" className="premium-input" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="email" label="Email">
                                <Input placeholder="email@example.com" className="premium-input" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="value" label="Deal Value (₹)">
                                <Input type="number" placeholder="50000" className="premium-input" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="industry" label="Industry">
                                <Select placeholder="Select industry" options={[
                                    'Real Estate', 'Healthcare', 'SaaS', 'Hospitality', 'Manufacturing', 'Retail', 'Education', 'Other'
                                ].map(i => ({ value: i, label: i }))} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="source" label="Source">
                                <Select placeholder="Lead source" options={[
                                    'AI Chat', 'WhatsApp', 'Smart Link', 'Direct', 'Referral'
                                ].map(s => ({ value: s, label: s }))} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                        <Button onClick={() => { setAddModalOpen(false); form.resetFields(); }}>Cancel</Button>
                        <Button type="primary" htmlType="submit" className="premium-button">Add Lead</Button>
                    </div>
                </Form>
            </Modal>

            {/* Lead Detail Modal */}
            <Modal
                title={null}
                open={detailOpen}
                onCancel={() => setDetailOpen(false)}
                footer={null}
                width={520}
            >
                {selectedLead && (() => {
                    const config = STATUS_CONFIG[selectedLead.status.toLowerCase() as LeadStatus];
                    return (
                        <div style={{ paddingTop: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                                <Avatar size={56} style={{ background: config.bg, color: config.color, fontSize: 22, flexShrink: 0 }}>
                                    {selectedLead.name.charAt(0)}
                                </Avatar>
                                <div style={{ flex: 1 }}>
                                    <Title level={4} style={{ margin: 0, color: '#fff' }}>{selectedLead.name}</Title>
                                    <Text style={{ color: '#475569', fontSize: 13 }}>{selectedLead.industry}</Text>
                                </div>
                                <Tag style={{ background: config.bg, color: config.color, border: `1px solid ${config.color}30`, borderRadius: 8, fontSize: 12, fontWeight: 700, padding: '4px 10px' }}>
                                    {config.label}
                                </Tag>
                            </div>
                            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                                {[
                                    { icon: <PhoneOutlined />, label: 'Phone', value: selectedLead.phone },
                                    { icon: <MailOutlined />, label: 'Email', value: selectedLead.email },
                                    { icon: <DollarOutlined />, label: 'Deal Value', value: `₹${selectedLead.value.toLocaleString()}` },
                                    { icon: <UserOutlined />, label: 'Assigned To', value: selectedLead.assignedTo },
                                    { icon: <CalendarOutlined />, label: 'Created', value: selectedLead.createdAt },
                                    { icon: <ClockCircleOutlined />, label: 'Last Activity', value: selectedLead.lastActivity },
                                ].map((item, i) => (
                                    <Col span={12} key={i}>
                                        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Text style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{item.label}</Text>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                <span style={{ color: config.color, fontSize: 13 }}>{item.icon}</span>
                                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{item.value || '—'}</Text>
                                            </div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                            {selectedLead.notes && (
                                <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 20 }}>
                                    <Text style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Notes</Text>
                                    <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginTop: 4 }}>{selectedLead.notes}</Text>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Button icon={<PhoneOutlined />} style={{ flex: 1, borderRadius: 10, borderColor: 'rgba(0,223,154,0.2)', color: '#00df9a', background: 'rgba(0,223,154,0.06)' }}>
                                    Call
                                </Button>
                                <Button icon={<WhatsAppOutlined />} style={{ flex: 1, borderRadius: 10, borderColor: 'rgba(37,211,102,0.2)', color: '#25d366', background: 'rgba(37,211,102,0.06)' }}>
                                    WhatsApp
                                </Button>
                                <Button icon={<MailOutlined />} style={{ flex: 1, borderRadius: 10, borderColor: 'rgba(59,130,246,0.2)', color: '#3b82f6', background: 'rgba(59,130,246,0.06)' }}>
                                    Email
                                </Button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
};

export default CRM;
