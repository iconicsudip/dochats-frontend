import React, { useState, useEffect } from 'react';
import { 
    Card, Typography, Button, Row, Col, Space, Table, Tag, Modal, 
    Form, Input, Select, message, Tabs, Statistic, Tooltip, Empty,
    Avatar
} from 'antd';
import {
    WhatsAppOutlined, PlusOutlined, DeleteOutlined, SyncOutlined,
    PhoneOutlined, FileTextOutlined, SafetyCertificateOutlined,
    RocketOutlined, ThunderboltOutlined, SendOutlined, InfoCircleOutlined,
    BarChartOutlined, UserOutlined, GlobalOutlined, MailOutlined,
    ShopOutlined, EditOutlined, SaveOutlined
} from '@ant-design/icons';
import { whatsappApi, WhatsAppTemplate, WhatsAppPhone } from '../../api/whatsapp';
import { useAuth } from '../../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const WhatsApp: React.FC = () => {
    const { user, updateMe } = useAuth();
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [phones, setPhones] = useState<WhatsAppPhone[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('1');
    const [form] = Form.useForm();
    const [msgForm] = Form.useForm();
    const [profileForm] = Form.useForm();
    const sessionInfoRef = React.useRef<{ waba_id?: string, phone_number_id?: string, business_id?: string }>({});

    const isConnected = user?.whatsappConfig?.isConnected;
    const appId = import.meta.env.VITE_META_APP_ID;
    const configId = import.meta.env.VITE_META_CONFIG_ID;

    useEffect(() => {
        if (isConnected) {
            fetchData();
        }
    }, [isConnected]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [tData, pData, aData] = await Promise.all([
                whatsappApi.getTemplates(),
                whatsappApi.getPhones().catch(() => []),
                whatsappApi.getAnalytics().catch(() => null)
            ]);
            setTemplates(tData);
            setPhones(pData);
            setAnalytics(aData);

            if (pData.length > 0) {
                const profData = await whatsappApi.getProfile(pData[0].id).catch(() => null);
                setProfile(profData);
                if (profData) profileForm.setFieldsValue(profData);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (values: any) => {
        setSending(true);
        try {
            const template = templates.find(t => t.name === values.templateName);
            // Simple variable mapping for now
            const components = values.variables ? [
                {
                    type: 'body',
                    parameters: values.variables.split(',').map((v: string) => ({ type: 'text', text: v.trim() }))
                }
            ] : [];

            await whatsappApi.sendMessage({
                to: values.to,
                templateName: values.templateName,
                components,
                phoneNumberId: values.phoneNumberId
            });
            message.success('Message sent successfully!');
            msgForm.resetFields();
        } catch (error: any) {
            message.error(error.response?.data?.error?.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleUpdateProfile = async (values: any) => {
        if (phones.length === 0) return;
        setLoading(true);
        try {
            await whatsappApi.updateProfile(phones[0].id, values);
            message.success('Profile updated successfully!');
            fetchData();
        } catch (error) {
            message.error('Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleFBMessage = (event: MessageEvent) => {
            if (!event.origin.endsWith('facebook.com')) return;
            
            try {
                let rawData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                
                // Handle array structure if present
                const data = Array.isArray(rawData) ? rawData[0] : rawData;

                if (data.type === 'WA_EMBEDDED_SIGNUP') {
                    if (data.event === 'FINISH') {
                        const { phone_number_id, waba_id, business_id } = data.data;
                        sessionInfoRef.current = { waba_id, phone_number_id, business_id };
                        console.log('WhatsApp Embedded Signup Session Info:', data.data);
                    } else if (data.event === 'CANCEL') {
                        const currentStep = data.data?.current_step;
                        console.warn('Signup abandoned at step:', currentStep);
                        message.warning(`Signup abandoned at ${currentStep || 'unknown step'}`);
                    } else if (data.event === 'ERROR') {
                        const { error_message, error_code } = data.data || {};
                        console.error('Signup error:', { error_message, error_code });
                        message.error(`Signup error: ${error_message || 'Unknown error'}`);
                    }
                }
            } catch (e) {
                // Ignore non-JSON or unrelated messages
            }
        };

        window.addEventListener('message', handleFBMessage);
        return () => window.removeEventListener('message', handleFBMessage);
    }, []);

    const handleConnect = () => {
        // @ts-ignore
        if (!window.FB) {
            message.error('Facebook SDK failed to load. Please disable ad-blockers.');
            return;
        }

        // @ts-ignore
        window.FB.login((response: any) => {
            if (response.authResponse) {
                const code = response.authResponse.code;
                const { waba_id, phone_number_id, business_id } = sessionInfoRef.current;
                
                whatsappApi.handleCallback(code, waba_id, phone_number_id, business_id).then((res) => {
                    message.success('Account linked successfully!');
                    updateMe({ whatsappConfig: res.data });
                }).catch(() => {
                    message.error('Failed to link account');
                });
            } else {
                message.error('Signup cancelled or failed');
            }
        }, {
            config_id: configId,
            response_type: 'code',
            override_default_response_type: true,
            extras: {
                feature: 'whatsapp_embedded_signup',
                sessionInfoVersion: '3',
                version: 'v4',
                setup: {}
            }
        });
    };

    const handleDeleteTemplate = async (name: string) => {
        try {
            await whatsappApi.deleteTemplate(name);
            message.success('Template deleted');
            fetchData();
        } catch (error) {
            message.error('Failed to delete template');
        }
    };

    const handleCreateTemplate = async (values: any) => {
        try {
            const components = [{ type: 'BODY', text: values.body }];
            if (values.header) components.unshift({ type: 'HEADER', format: 'TEXT', text: values.header } as any);
            if (values.footer) components.push({ type: 'FOOTER', text: values.footer } as any);

            await whatsappApi.createTemplate({
                name: values.name,
                category: values.category,
                language: 'en_US',
                components
            });

            message.success('Template submitted for approval');
            setCreateModalOpen(false);
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error('Failed to create template');
        }
    };

    const columns = [
        {
            title: 'Template Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <Text strong style={{ color: '#fff' }}>{text}</Text>
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                const color = status === 'APPROVED' ? '#00df9a' : status === 'PENDING' ? '#f59e0b' : '#ef4444';
                return <Tag color={color} style={{ borderRadius: 6, fontWeight: 600 }}>{status}</Tag>;
            }
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: (cat: string) => <Tag color="blue">{cat}</Tag>
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: WhatsAppTemplate) => (
                <Space>
                    <Tooltip title="Send Message">
                        <Button 
                            type="text" 
                            icon={<SendOutlined style={{ color: '#3b82f6' }} />} 
                            onClick={() => {
                                setActiveTab('3');
                                msgForm.setFieldsValue({ templateName: record.name });
                            }}
                        />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Button 
                            type="text" 
                            icon={<DeleteOutlined style={{ color: '#ef4444' }} />} 
                            onClick={() => handleDeleteTemplate(record.name)}
                        />
                    </Tooltip>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            {/* Header section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <WhatsAppOutlined style={{ fontSize: 32, color: '#25d366' }} />
                        <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#fff' }}>WhatsApp Business</Title>
                    </div>
                    <Text type="secondary" style={{ fontSize: 14 }}>
                        Manage your official WhatsApp Business Account, templates, and messaging.
                    </Text>
                </div>
                <Space>
                    {!isConnected ? (
                        <Button 
                            type="primary" 
                            icon={<WhatsAppOutlined />} 
                            onClick={handleConnect}
                            className="premium-button"
                            style={{ background: '#1877F2', borderColor: '#1877F2' }}
                        >
                            Connect with Facebook
                        </Button>
                    ) : (
                        <Button 
                            type="primary" 
                            icon={<PlusOutlined />} 
                            onClick={() => setCreateModalOpen(true)}
                            className="premium-button"
                        >
                            Create Template
                        </Button>
                    )}
                </Space>
            </div>

            {!isConnected ? (
                <Card className="premium-card" style={{ textAlign: 'center', padding: '60px 0', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <div style={{ 
                        width: 100, height: 100, borderRadius: 50, background: 'rgba(37,211,102,0.1)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' 
                    }}>
                        <WhatsAppOutlined style={{ fontSize: 50, color: '#25d366' }} />
                    </div>
                    <Title level={3} style={{ color: '#fff' }}>Start Messaging with WhatsApp</Title>
                    <Paragraph style={{ color: '#94a3b8', maxWidth: 600, margin: '0 auto 32px', fontSize: 16 }}>
                        Connect your official WhatsApp Business Account to start sending templates, 
                        automating notifications, and engaging with your customers at scale.
                    </Paragraph>
                    <Button 
                        type="primary" 
                        size="large" 
                        icon={<WhatsAppOutlined />}
                        className="premium-button"
                        style={{ height: 56, padding: '0 40px', fontSize: 18, background: '#1877F2', borderColor: '#1877F2' }}
                        onClick={handleConnect}
                    >
                        Connect with Facebook
                    </Button>
                    <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center', gap: 24 }}>
                        <Text type="secondary" style={{ fontSize: 13 }}><SafetyCertificateOutlined style={{ color: '#00df9a' }} /> Official Meta Partner</Text>
                        <Text type="secondary" style={{ fontSize: 13 }}><ThunderboltOutlined style={{ color: '#f59e0b' }} /> Instant Connection</Text>
                    </div>
                </Card>
            ) : (
                <>
                    <Tabs activeKey={activeTab} onChange={setActiveTab} className="premium-tabs">
                        <TabPane tab={<span><BarChartOutlined /> Overview</span>} key="1">
                            <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
                                <Col xs={24} md={8}>
                                    <Card className="premium-card">
                                        <Statistic 
                                            title={<Text type="secondary">Total Templates</Text>}
                                            value={templates.length}
                                            prefix={<FileTextOutlined style={{ color: '#3b82f6' }} />}
                                            valueStyle={{ color: '#fff', fontWeight: 800 }}
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Card className="premium-card">
                                        <Statistic 
                                            title={<Text type="secondary">Active Numbers</Text>}
                                            value={phones.length}
                                            prefix={<PhoneOutlined style={{ color: '#00df9a' }} />}
                                            valueStyle={{ color: '#fff', fontWeight: 800 }}
                                        />
                                    </Card>
                                </Col>
                                <Col xs={24} md={8}>
                                    <Card className="premium-card">
                                        <Statistic 
                                            title={<Text type="secondary">Account ID</Text>}
                                            value={user?.whatsappConfig?.wabaId?.substring(0, 10) + '...'}
                                            prefix={<SafetyCertificateOutlined style={{ color: '#a855f7' }} />}
                                            valueStyle={{ color: '#fff', fontWeight: 800, fontSize: 16 }}
                                        />
                                    </Card>
                                </Col>
                            </Row>

                            <Card className="premium-card" title={<span style={{ color: '#fff' }}><BarChartOutlined /> Usage Analytics</span>}>
                                {analytics ? (
                                    <Row gutter={[16, 16]}>
                                        <Col span={24}>
                                            <Text type="secondary">Recent message statistics from your Meta Business Account will appear here.</Text>
                                            <Empty description="Analytics data will populate as you send messages" style={{ margin: '40px 0' }} />
                                        </Col>
                                    </Row>
                                ) : (
                                    <Empty description="No analytics data available yet" />
                                )}
                            </Card>
                        </TabPane>

                        <TabPane tab={<span><FileTextOutlined /> Templates</span>} key="2">
                            <Card className="premium-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                                    <Title level={4} style={{ color: '#fff', margin: 0 }}>Message Templates</Title>
                                    <Button icon={<SyncOutlined />} onClick={fetchData} loading={loading}>Sync Meta</Button>
                                </div>
                                <Table 
                                    columns={columns} 
                                    dataSource={templates} 
                                    loading={loading}
                                    rowKey="name"
                                    className="premium-table"
                                />
                            </Card>
                        </TabPane>

                        <TabPane tab={<span><SendOutlined /> Direct Message</span>} key="3">
                            <Row gutter={24}>
                                <Col xs={24} md={12}>
                                    <Card className="premium-card" title={<span style={{ color: '#fff' }}>Send Template Message</span>}>
                                        <Form form={msgForm} layout="vertical" onFinish={handleSendMessage}>
                                            <Form.Item name="phoneNumberId" label="From Number" rules={[{ required: true }]}>
                                                <Select placeholder="Select sender number">
                                                    {phones.map(p => (
                                                        <Select.Option key={p.id} value={p.id}>{p.verified_name} ({p.display_phone_number})</Select.Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                            <Form.Item name="to" label="Recipient Phone (with country code)" rules={[{ required: true }]}>
                                                <Input placeholder="e.g. 919876543210" className="premium-input" />
                                            </Form.Item>
                                            <Form.Item name="templateName" label="Select Template" rules={[{ required: true }]}>
                                                <Select placeholder="Select an approved template">
                                                    {templates.filter(t => t.status === 'APPROVED').map(t => (
                                                        <Select.Option key={t.name} value={t.name}>{t.name}</Select.Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                            <Form.Item name="variables" label="Template Variables (comma separated)" tooltip="If your template has {{1}}, {{2}}, enter values like: John, Order123">
                                                <Input placeholder="Value 1, Value 2..." className="premium-input" />
                                            </Form.Item>
                                            <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={sending} block className="premium-button">
                                                Send Message
                                            </Button>
                                        </Form>
                                    </Card>
                                </Col>
                                <Col xs={24} md={12}>
                                    <Card className="premium-card" title={<span style={{ color: '#fff' }}><InfoCircleOutlined /> Help</span>}>
                                        <Space direction="vertical">
                                            <Text style={{ color: '#94a3b8' }}>• You can only send **Approved** templates to customers.</Text>
                                            <Text style={{ color: '#94a3b8' }}>• Ensure the recipient number includes the country code without the '+' sign.</Text>
                                            <Text style={{ color: '#94a3b8' }}>• If your template includes variables, provide them in the order they appear in the template.</Text>
                                            <Text style={{ color: '#94a3b8' }}>• Meta enforces messaging limits based on your account quality.</Text>
                                        </Space>
                                    </Card>
                                </Col>
                            </Row>
                        </TabPane>

                        <TabPane tab={<span><UserOutlined /> Business Profile</span>} key="4">
                            <Row gutter={24}>
                                <Col xs={24} md={16}>
                                    <Card className="premium-card" title={<span style={{ color: '#fff' }}>Edit Public Profile</span>}>
                                        <Form form={profileForm} layout="vertical" onFinish={handleUpdateProfile}>
                                            <Row gutter={16}>
                                                <Col span={12}>
                                                    <Form.Item name="email" label="Business Email">
                                                        <Input prefix={<MailOutlined />} placeholder="contact@business.com" className="premium-input" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item name="websites" label="Websites (one per line)">
                                                        <Input.TextArea rows={1} placeholder="https://www.business.com" className="premium-input" />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                            <Form.Item name="address" label="Business Address">
                                                <Input prefix={<GlobalOutlined />} placeholder="123 Business St, City, Country" className="premium-input" />
                                            </Form.Item>
                                            <Form.Item name="description" label="Business Description">
                                                <Input.TextArea rows={3} placeholder="Tell your customers about your business..." className="premium-input" />
                                            </Form.Item>
                                            <Form.Item name="about" label="About Status">
                                                <Input placeholder="Hey there! I am using WhatsApp." className="premium-input" />
                                            </Form.Item>
                                            <Form.Item name="vertical" label="Industry Category">
                                                <Select prefix={<ShopOutlined />}>
                                                    <Select.Option value="RETAIL">Retail</Select.Option>
                                                    <Select.Option value="EDUCATION">Education</Select.Option>
                                                    <Select.Option value="HEALTH">Healthcare</Select.Option>
                                                    <Select.Option value="PROF_SERVICES">Professional Services</Select.Option>
                                                    <Select.Option value="HOTEL">Hospitality</Select.Option>
                                                    <Select.Option value="OTHER">Other</Select.Option>
                                                </Select>
                                            </Form.Item>
                                            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} className="premium-button">
                                                Save Profile Changes
                                            </Button>
                                        </Form>
                                    </Card>
                                </Col>
                                <Col xs={24} md={8}>
                                    {profile && (
                                        <Card className="premium-card" title={<span style={{ color: '#fff' }}>Profile Preview</span>}>
                                            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                                <Avatar size={80} src={profile.profile_picture_url} icon={<UserOutlined />} style={{ border: '2px solid #00df9a' }} />
                                                <Title level={4} style={{ color: '#fff', marginTop: 12, marginBottom: 0 }}>{phones[0]?.verified_name}</Title>
                                                <Text type="secondary">{phones[0]?.display_phone_number}</Text>
                                            </div>
                                            <Space direction="vertical" style={{ width: '100%' }}>
                                                <div style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <Text type="secondary" style={{ fontSize: 12 }}>EMAIL</Text>
                                                    <div><Text style={{ color: '#fff' }}>{profile.email || 'Not set'}</Text></div>
                                                </div>
                                                <div style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <Text type="secondary" style={{ fontSize: 12 }}>WEBSITE</Text>
                                                    <div><Text style={{ color: '#fff' }}>{profile.websites?.[0] || 'Not set'}</Text></div>
                                                </div>
                                                <div style={{ padding: '8px 0' }}>
                                                    <Text type="secondary" style={{ fontSize: 12 }}>CATEGORY</Text>
                                                    <div><Tag color="blue">{profile.vertical || 'OTHER'}</Tag></div>
                                                </div>
                                            </Space>
                                        </Card>
                                    )}
                                </Col>
                            </Row>
                        </TabPane>

                        <TabPane tab={<span><PhoneOutlined /> Phone Numbers</span>} key="5">
                            <Row gutter={[16, 16]}>
                                {phones.length > 0 ? phones.map(phone => (
                                    <Col xs={24} sm={12} lg={8} key={phone.id}>
                                        <Card className="premium-card" style={{ border: '1px solid rgba(37,211,102,0.2)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Space direction="vertical" size={2}>
                                                    <Text strong style={{ color: '#fff', fontSize: 16 }}>{phone.verified_name}</Text>
                                                    <Text type="secondary">{phone.display_phone_number}</Text>
                                                </Space>
                                                <Tag color={phone.quality_rating === 'GREEN' ? '#00df9a' : '#f59e0b'}>
                                                    {phone.quality_rating}
                                                </Tag>
                                            </div>
                                            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                                                <Button size="small" icon={<EditOutlined />} onClick={() => setActiveTab('4')}>Edit Profile</Button>
                                                <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => {
                                                    setActiveTab('3');
                                                    msgForm.setFieldsValue({ phoneNumberId: phone.id });
                                                }}>Send Msg</Button>
                                            </div>
                                        </Card>
                                    </Col>
                                )) : <Col span={24}><Empty description="No connected phone numbers" /></Col>}
                            </Row>
                        </TabPane>
                    </Tabs>
                </>
            )}

            <Modal
                title={<Text strong style={{ color: '#fff', fontSize: 18 }}>Create WhatsApp Template</Text>}
                open={createModalOpen}
                onCancel={() => setCreateModalOpen(false)}
                footer={null}
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleCreateTemplate}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="name" label="Template Name" rules={[{ required: true }]}>
                                <Input placeholder="order_confirmation" className="premium-input" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="category" label="Category" initialValue="UTILITY">
                                <Select options={[
                                    { label: 'Marketing', value: 'MARKETING' },
                                    { label: 'Utility', value: 'UTILITY' },
                                    { label: 'Authentication', value: 'AUTHENTICATION' }
                                ]} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="header" label="Header (Optional)">
                        <Input placeholder="e.g. Order #{{1}} confirmed" className="premium-input" />
                    </Form.Item>
                    <Form.Item name="body" label="Body Text" rules={[{ required: true }]}>
                        <Input.TextArea rows={4} placeholder="e.g. Hi {{1}}, your order is confirmed!" className="premium-input" />
                    </Form.Item>
                    <Form.Item name="footer" label="Footer (Optional)">
                        <Input placeholder="Powered by Dochats" className="premium-input" />
                    </Form.Item>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                        <Button onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                        <Button type="primary" htmlType="submit" className="premium-button">Submit to Meta</Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default WhatsApp;
