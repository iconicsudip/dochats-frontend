import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Row, Col, Switch, Tag, Avatar, Select, Table, Modal, Form, message } from 'antd';
import apiClient from '../../api/apiClient';
import { moduleConfigApi } from '../../api/moduleConfig';
import {
    AppstoreOutlined, TeamOutlined, RobotOutlined, CalendarOutlined,
    FundOutlined, PlayCircleOutlined, PieChartOutlined, LinkOutlined, MessageOutlined,
    CreditCardOutlined, ThunderboltOutlined, SettingOutlined, CheckCircleOutlined,
    FormOutlined,
    WhatsAppOutlined,
    MailOutlined
} from '@ant-design/icons';
import { Module, ModuleLabel } from '../../enums';

const { Title, Text } = Typography;

// All modules with metadata
const ALL_MODULES: { key: Module; icon: React.ReactNode; color: string; desc: string }[] = [
    { key: Module.LIVE_CHAT, icon: <MessageOutlined />, color: '#a855f7', desc: 'Real-time chat with visitors' },
    { key: Module.CRM, icon: <FundOutlined />, color: '#a855f7', desc: 'Pipeline, leads, deals' },
    { key: Module.BOOKINGS, icon: <CalendarOutlined />, color: '#3b82f6', desc: 'Appointments & reservations' },
    { key: Module.AUTOMATION, icon: <PlayCircleOutlined />, color: '#f59e0b', desc: 'Workflow automation engine' },
    { key: Module.ANALYTICS, icon: <PieChartOutlined />, color: '#06b6d4', desc: 'Reports & insights' },
    { key: Module.LINKS, icon: <LinkOutlined />, color: '#ec4899', desc: 'Smart link management' },
    { key: Module.SUB_USERS, icon: <TeamOutlined />, color: '#8b5cf6', desc: 'Team & agent access' },
    { key: Module.BILLING, icon: <CreditCardOutlined />, color: '#64748b', desc: 'Billing & subscriptions' },
    { key: Module.PLANS, icon: <ThunderboltOutlined />, color: '#f59e0b', desc: 'Plan management' },
    { key: Module.FORMS, icon: <FormOutlined />, color: '#00df9a', desc: 'Dynamic form creation' },
    { key: Module.WHATSAPP, icon: <WhatsAppOutlined />, color: '#25d366', desc: 'WhatsApp Meta Business Hub' },
    { key: Module.EMAIL, icon: <MailOutlined />, color: '#3b82f6', desc: 'Drag-and-Drop Email Marketing' },
];



const ModuleManager: React.FC = () => {
    const [admins, setAdmins] = useState<any[]>([]);
    const [selectedAdmin, setSelectedAdmin] = useState<any | null>(null);
    const [configOpen, setConfigOpen] = useState(false);
    const [editModules, setEditModules] = useState<Module[]>([]);

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            const res = await apiClient.get('/super-admin/admins?limit=100');
            const data = res.data.data.map((admin: any) => {
                const custom = Array.isArray(admin.moduleConfig?.enabledModules) ? admin.moduleConfig.enabledModules : [];
                const plan = Array.isArray(admin.plan?.enabledModules) ? admin.plan.enabledModules : [];
                let combined = Array.from(new Set([...custom, ...plan]));
                
                // Fallback to defaults if everything is empty, matching authController.ts logic
                if (combined.length === 0) {
                    combined = [
                        Module.LIVE_CHAT, Module.CRM, Module.BOOKINGS, 
                        Module.AUTOMATION, Module.ANALYTICS, Module.LINKS, 
                        Module.SUB_USERS, Module.BILLING, Module.PLANS, 
                        Module.FORMS, Module.WHATSAPP, Module.EMAIL
                    ];
                }
                
                return { ...admin, enabledModules: combined };
            });
            setAdmins(data);
        } catch (error) {
            console.error(error);
        }
    };

    const openConfig = (admin: any) => {
        setSelectedAdmin(admin);
        setEditModules([...admin.enabledModules]);
        setConfigOpen(true);
    };

    const toggleModule = (mod: Module) => {
        setEditModules(prev =>
            prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
        );
    };

    const saveModules = async () => {
        if (!selectedAdmin) return;
        try {
            await moduleConfigApi.updateAdminModules(selectedAdmin.id, editModules);
            setAdmins(prev => prev.map(a =>
                a.id === selectedAdmin.id ? { ...a, enabledModules: editModules } : a
            ));
            setConfigOpen(false);
            message.success(`Modules updated for ${selectedAdmin.name}`);
        } catch (error) {
            console.error(error);
            message.error('Failed to update modules');
        }
    };

    const PLAN_COLOR: Record<string, string> = {
        Basic: '#64748b', Pro: '#3b82f6', Business: '#a855f7', Enterprise: '#00df9a'
    };

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <AppstoreOutlined style={{ color: '#00df9a', fontSize: 20 }} />
                    <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#fff' }}>Module Manager</Title>
                </div>
                <Text type="secondary" style={{ fontSize: 13 }}>
                    Control which AI BOS modules each admin account can access.
                </Text>
            </div>

            {/* Summary row */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {[
                    { label: 'Total Admins', value: admins.length, color: '#3b82f6' },
                    { label: 'Avg Modules/Admin', value: Math.round(admins.reduce((a, ad) => a + ad.enabledModules.length, 0) / admins.length), color: '#00df9a' },
                    { label: 'Full Access Admins', value: admins.filter(a => a.enabledModules.length === ALL_MODULES.length).length, color: '#a855f7' },
                ].map((s, i) => (
                    <Col xs={8} key={i}>
                        <Card className="premium-card" style={{ borderColor: `${s.color}20`, textAlign: 'center' }}>
                            <Text style={{ fontSize: 28, fontWeight: 800, color: s.color, display: 'block' }}>{s.value}</Text>
                            <Text style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>{s.label}</Text>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Admin cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {admins.map(admin => (
                    <Card key={admin.id} className="premium-card" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <Avatar size={44} style={{ background: 'rgba(0,223,154,0.1)', color: '#00df9a', fontSize: 18, flexShrink: 0 }}>
                                    {admin.name ? admin.name.charAt(0) : admin.username.charAt(0)}
                                </Avatar>
                                <div>
                                    <Text strong style={{ color: '#fff', fontSize: 15, display: 'block' }}>{admin.name}</Text>
                                    <Text style={{ color: '#475569', fontSize: 12 }}>@{admin.username} · {admin.industry}</Text>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <Tag style={{ background: `${PLAN_COLOR[admin.plan?.name] || '#64748b'}15`, color: PLAN_COLOR[admin.plan?.name] || '#64748b', border: `1px solid ${PLAN_COLOR[admin.plan?.name] || '#64748b'}30`, borderRadius: 6, fontWeight: 700 }}>
                                    {admin.plan?.name || 'No Plan'}
                                </Tag>
                                <Tag style={{ background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: 'none', borderRadius: 6 }}>
                                    {admin.enabledModules.length}/{ALL_MODULES.length} modules
                                </Tag>
                                <Button
                                    icon={<SettingOutlined />}
                                    onClick={() => openConfig(admin)}
                                    style={{ background: 'rgba(0,223,154,0.08)', borderColor: 'rgba(0,223,154,0.2)', color: '#00df9a', borderRadius: 8, fontWeight: 600 }}
                                >
                                    Configure
                                </Button>
                            </div>
                        </div>

                        {/* Module tags */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
                            {ALL_MODULES.map(m => {
                                const active = admin.enabledModules.includes(m.key);
                                return (
                                    <Tag key={m.key} style={{
                                        background: active ? `${m.color}12` : 'rgba(255,255,255,0.02)',
                                        color: active ? m.color : '#2d3748',
                                        border: `1px solid ${active ? `${m.color}25` : 'rgba(255,255,255,0.05)'}`,
                                        borderRadius: 6, fontSize: 11, fontWeight: active ? 600 : 400,
                                        display: 'flex', alignItems: 'center', gap: 4
                                    }}>
                                        {active && <CheckCircleOutlined style={{ fontSize: 10 }} />}
                                        {ModuleLabel[m.key]}
                                    </Tag>
                                );
                            })}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Configure Modal */}
            <Modal
                title={<Text style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Configure Modules — {selectedAdmin?.name}</Text>}
                open={configOpen}
                onCancel={() => setConfigOpen(false)}
                onOk={saveModules}
                okText="Save Changes"
                okButtonProps={{ className: 'premium-button' }}
                width={560}
            >
                <Text style={{ color: '#475569', fontSize: 13, display: 'block', marginBottom: 20 }}>
                    Toggle modules on/off for this admin. Changes apply immediately on next login.
                </Text>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {ALL_MODULES.map(m => {
                        const active = editModules.includes(m.key);
                        return (
                            <div key={m.key} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '12px 16px', borderRadius: 10,
                                background: active ? `${m.color}06` : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${active ? `${m.color}20` : 'rgba(255,255,255,0.05)'}`,
                                transition: 'all 0.2s',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 8, background: `${m.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color }}>
                                        {m.icon}
                                    </div>
                                    <div>
                                        <Text style={{ color: active ? '#fff' : '#475569', fontSize: 14, fontWeight: 600, display: 'block' }}>{ModuleLabel[m.key]}</Text>
                                        <Text style={{ color: '#2d3748', fontSize: 12 }}>{m.desc}</Text>
                                    </div>
                                </div>
                                <Switch
                                    checked={active}
                                    onChange={() => toggleModule(m.key)}
                                    style={{ background: active ? m.color : undefined }}
                                />
                            </div>
                        );
                    })}
                </div>
            </Modal>
        </div>
    );
};

export default ModuleManager;
