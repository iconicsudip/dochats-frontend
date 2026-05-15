import React, { useState, useEffect } from 'react';
import { 
    Card, Typography, Button, Row, Col, Space, Table, Tag, 
    message, Tabs, Tooltip, Result, Badge, Alert,
    Modal
} from 'antd';
import {
    MailOutlined, PlusOutlined, DeleteOutlined, EditOutlined,
    LockOutlined, LayoutOutlined, SyncOutlined, InfoCircleOutlined,
    EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { emailApi, EmailTemplate } from '../../api/email';
import { useAuth } from '../../contexts/AuthContext';
import { useModules } from '../../contexts/ModuleContext';
import { Module } from '../../enums';
import Form from 'antd/es/form';
import Input from 'antd/es/input';

const { Title, Text, Paragraph } = Typography;

const Email: React.FC = () => {
    const { user, updateMe } = useAuth();
    const { hasModule } = useModules();
    const navigate = useNavigate();
    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [showVerifyAlert, setShowVerifyAlert] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewContent, setPreviewContent] = useState('');
    const [previewTitle, setPreviewTitle] = useState('');

    useEffect(() => {
        if (hasModule(Module.EMAIL)) {
            fetchTemplates();
        }
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const data = await emailApi.getTemplates();
            setTemplates(data);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await emailApi.deleteTemplate(id);
            message.success('Template deleted');
            fetchTemplates();
        } catch (error) {
            message.error('Failed to delete template');
        }
    };

    const handleSync = async (id: string) => {
        try {
            await emailApi.syncTemplate(id);
            message.success('Template synced with AWS SES successfully');
            fetchTemplates();
        } catch (error) {
            message.error('Failed to sync with AWS SES');
        }
    };

    const handleSyncIdentity = async (values: any) => {
        setLoading(true);
        try {
            await updateMe({ emailConfig: values });
            message.success('Sender profile updated');
            setShowVerifyAlert(true);
        } catch (e) {
            message.error('Update failed');
        } finally {
            setLoading(false);
        }
    };

    if (!hasModule(Module.EMAIL)) {
        return (
            <div style={{ padding: '40px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Card className="premium-card" style={{ maxWidth: 500, textAlign: 'center', padding: '40px 20px' }}>
                    <Result
                        icon={<LockOutlined style={{ fontSize: 64, color: '#3b82f6' }} />}
                        title={<Title level={3} style={{ color: '#fff', marginTop: 16 }}>Email Marketing Locked</Title>}
                        subTitle={<Text type="secondary">This module is not enabled for your account. Please contact your administrator or upgrade your plan to unlock the Drag-and-Drop Email Builder.</Text>}
                        extra={[
                            <Button type="primary" key="upgrade" className="premium-button">
                                Upgrade Plan
                            </Button>
                        ]}
                    />
                </Card>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <MailOutlined style={{ fontSize: 24 }} />
                        </div>
                        <div>
                            <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>Email Marketing Hub</Title>
                            <Text type="secondary" style={{ fontSize: 13 }}>Manage your high-converting email templates for automation.</Text>
                        </div>
                    </div>
                </div>
                <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => navigate('/dashboard/email/new')} className="premium-button">
                    New Email Template
                </Button>
            </div>

            <Tabs 
                defaultActiveKey="templates" 
                className="premium-tabs"
                items={[
                    {
                        key: 'templates',
                        label: <Space><LayoutOutlined />My Templates</Space>,
                        children: (
                            <Table 
                                dataSource={templates} 
                                loading={loading}
                                className="premium-table"
                                rowKey="id"
                                columns={[
                                    { 
                                        title: 'Template Name', 
                                        key: 'name', 
                                        render: (r) => (
                                            <Space direction="vertical" size={0}>
                                                <Text strong style={{ color: '#fff', fontSize: 14 }}>{r.name}</Text>
                                                <Text type="secondary" style={{ fontSize: 12 }}>{r.subject}</Text>
                                            </Space>
                                        )
                                    },
                                    { 
                                        title: 'Status', 
                                        key: 'status', 
                                        render: (_, record) => (
                                            <Tag 
                                                color={record.sesSynced ? 'success' : 'warning'} 
                                                style={{ borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                            >
                                                {record.sesSynced ? (
                                                    <><MailOutlined style={{ fontSize: 10 }} /> Synced</>
                                                ) : (
                                                    <><SyncOutlined spin={false} style={{ fontSize: 10 }} /> Sync Pending</>
                                                )}
                                            </Tag>
                                        )
                                    },
                                    { 
                                        title: 'Last Modified', 
                                        dataIndex: 'updatedAt', 
                                        key: 'updatedAt', 
                                        render: (d) => <Text style={{ color: '#64748b', fontSize: 13 }}>{new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                                    },
                                    { 
                                        title: 'Actions', 
                                        key: 'actions', 
                                        render: (_, record) => (
                                            <Space>
                                                {!record.sesSynced && (
                                                    <Tooltip title="Force Sync with SES">
                                                        <Button type="text" icon={<SyncOutlined style={{ color: '#00df9a' }} />} onClick={() => handleSync(record.id)} />
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="Preview Template">
                                                    <Button 
                                                        type="text" 
                                                        icon={<EyeOutlined style={{ color: '#a855f7' }} />} 
                                                        onClick={() => {
                                                            setPreviewContent(record.content);
                                                            setPreviewTitle(record.name);
                                                            setPreviewOpen(true);
                                                        }} 
                                                    />
                                                </Tooltip>
                                                <Tooltip title="Edit Design">
                                                    <Button type="text" icon={<EditOutlined style={{ color: '#3b82f6' }} />} onClick={() => navigate(`/dashboard/email/edit/${record.id}`)} />
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <Button type="text" icon={<DeleteOutlined style={{ color: '#ef4444' }} />} onClick={() => handleDelete(record.id)} />
                                                </Tooltip>
                                            </Space>
                                        )
                                    }
                                ]}
                            />
                        )
                    },
                    {
                        key: 'settings',
                        label: <Space><EditOutlined />Sender Identity</Space>,
                        children: (
                            <Card className="premium-card" style={{ maxWidth: 650 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                    <Badge status="processing" color="#3b82f6" />
                                    <Title level={4} style={{ color: '#fff', margin: 0 }}>Verified Sender Settings</Title>
                                </div>
                                <Paragraph style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
                                    Your "From" address must be verified in your AWS SES account to ensure delivery. 
                                    Professional identities increase open rates and build trust.
                                </Paragraph>
                                {showVerifyAlert && (
                                    <Alert
                                        message="Identity Sync Started"
                                        description={
                                            <Space direction="vertical" size={4}>
                                                <Text style={{ color: '#0ea5e9' }}>
                                                    We've requested AWS SES to verify your email address.
                                                </Text>
                                                <Text strong style={{ color: '#fff' }}>
                                                    Action Required: Please check your inbox ({user?.emailConfig?.fromEmail}) and click the verification link from AWS.
                                                </Text>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    Until verified, automated emails from this address will not be delivered.
                                                </Text>
                                            </Space>
                                        }
                                        type="info"
                                        showIcon
                                        icon={<InfoCircleOutlined />}
                                        closable
                                        onClose={() => setShowVerifyAlert(false)}
                                        style={{ 
                                            marginBottom: 24, 
                                            background: 'rgba(14, 165, 233, 0.05)', 
                                            border: '1px solid rgba(14, 165, 233, 0.2)',
                                            borderRadius: 12
                                        }}
                                    />
                                )}

                                <Form 
                                    layout="vertical" 
                                    initialValues={user?.emailConfig || {}}
                                    onFinish={handleSyncIdentity}
                                >
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item name="fromName" label={<Text style={{ color: '#94a3b8', fontSize: 12 }}>DISPLAY NAME</Text>} rules={[{ required: true }]}>
                                                <Input placeholder="e.g. Acme Marketing" className="premium-input" />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item name="fromEmail" label={<Text style={{ color: '#94a3b8', fontSize: 12 }}>SENDER EMAIL</Text>} rules={[{ required: true, type: 'email' }]}>
                                                <Input placeholder="hello@yourdomain.com" className="premium-input" />
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                    <Button type="primary" htmlType="submit" loading={loading} className="premium-button" style={{ marginTop: 8 }}>
                                        Sync Identity
                                    </Button>
                                </Form>
                            </Card>
                        )
                    }
                ]} 
            />
            <Modal
                title={<Text strong style={{ color: '#fff' }}>Preview: {previewTitle}</Text>}
                open={previewOpen}
                onCancel={() => setPreviewOpen(false)}
                footer={null}
                width={800}
                className="premium-modal"
                bodyStyle={{ padding: 0, height: '70vh', background: '#0f172a', overflow: 'hidden', borderRadius: '0 0 12px 12px' }}
            >
                <iframe 
                    srcDoc={previewContent}
                    title="Email Preview"
                    style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
                />
            </Modal>
        </div>
    );
};

export default Email;
