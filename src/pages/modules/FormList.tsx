import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Typography, Space, Tag, message, Modal, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ShareAltOutlined, BarChartOutlined, CopyOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { formsApi } from '../../api/forms';
import { FORM_TEMPLATES } from '../../constants/formTemplates';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

interface FormListProps {
    predefined?: boolean;
}

const FormList: React.FC<FormListProps> = ({ predefined }) => {
    const [forms, setForms] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<'my-forms' | 'templates'>(predefined ? 'templates' : 'my-forms');
    const navigate = useNavigate();

    useEffect(() => {
        if (predefined) {
            setView('templates');
        } else {
            setView('my-forms');
        }
    }, [predefined]);

    const fetchForms = async () => {
        setLoading(true);
        try {
            const res = await formsApi.getForms();
            setForms(res.data);
        } catch (e) {
            message.error('Failed to fetch forms');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchForms();
    }, []);

    const handleDelete = async (id: string) => {
        Modal.confirm({
            title: 'Delete Form',
            content: 'Are you sure you want to delete this form? All responses will be permanently lost.',
            okText: 'Yes, Delete',
            okType: 'danger',
            centered: true,
            onOk: async () => {
                try {
                    await formsApi.deleteForm(id);
                    message.success('Form deleted');
                    fetchForms();
                } catch (e) {
                    message.error('Failed to delete form');
                }
            }
        });
    };

    const useTemplate = (template: any) => {
        // We'll navigate to FormBuilder with template data in state
        navigate('/dashboard/forms/new', { state: { template } });
    };

    const copyLink = (id: string) => {
        const link = `${window.location.origin}/f/${id}`;
        navigator.clipboard.writeText(link);
        message.success('Public link copied to clipboard!');
    };

    const columns = [
        {
            title: 'Form Title',
            dataIndex: 'title',
            key: 'title',
            render: (text: string, record: any) => (
                <Space direction="vertical" size={0}>
                    <Text strong style={{ color: '#fff' }}>{text}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.description || 'No description'}</Text>
                </Space>
            )
        },
        {
            title: 'Responses',
            dataIndex: ['_count', 'responses'],
            key: 'responses',
            align: 'center' as const,
            render: (count: number) => (
                <Tag color="blue" style={{ borderRadius: 10, border: 'none', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                    {count} submissions
                </Tag>
            )
        },
        {
            title: 'Status',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (active: boolean) => (
                <Tag color={active ? 'green' : 'default'} style={{ borderRadius: 10, border: 'none', background: active ? 'rgba(0, 223, 154, 0.1)' : 'rgba(255, 255, 255, 0.05)', color: active ? '#00df9a' : '#94a3b8' }}>
                    {active ? 'Active' : 'Inactive'}
                </Tag>
            )
        },
        {
            title: 'Created',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => dayjs(date).format('MMM D, YYYY')
        },
        {
            title: 'Action',
            key: 'action',
            align: 'right' as const,
            render: (_: any, record: any) => (
                <Space>
                    <Tooltip title="View Responses">
                        <Button 
                            type="text" 
                            icon={<BarChartOutlined style={{ color: '#3b82f6' }} />} 
                            onClick={() => navigate(`/dashboard/forms/${record.id}/responses`)}
                        />
                    </Tooltip>
                    <Tooltip title="Preview">
                        <Button 
                            type="text" 
                            icon={<EyeOutlined style={{ color: '#94a3b8' }} />} 
                            onClick={() => window.open(`/f/${record.id}`, '_blank')}
                        />
                    </Tooltip>
                    <Tooltip title="Copy Link">
                        <Button 
                            type="text" 
                            icon={<CopyOutlined style={{ color: '#00df9a' }} />} 
                            onClick={() => copyLink(record.id)}
                        />
                    </Tooltip>
                    <Tooltip title="Edit">
                        <Button 
                            type="text" 
                            icon={<EditOutlined style={{ color: '#ffd279' }} />} 
                            onClick={() => navigate(`/dashboard/forms/edit/${record.id}`)}
                        />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Button 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            onClick={() => handleDelete(record.id)}
                        />
                    </Tooltip>
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24 }}>
                <div>
                    <Title level={4} style={{ margin: 0, fontWeight: 800 }}>Dynamic Forms</Title>
                    <Paragraph type="secondary" style={{ margin: 0 }}>
                        Create custom forms or use industry-specific templates to collect data.
                    </Paragraph>
                </div>
                <Space>
                    <Button 
                        type={view === 'my-forms' ? 'primary' : 'default'} 
                        onClick={() => setView('my-forms')}
                        className={view === 'my-forms' ? 'premium-button' : ''}
                    >
                        My Forms
                    </Button>
                    <Button 
                        type={view === 'templates' ? 'primary' : 'default'} 
                        onClick={() => setView('templates')}
                        className={view === 'templates' ? 'premium-button' : ''}
                    >
                        Templates
                    </Button>
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        onClick={() => navigate('/dashboard/forms/new')}
                        className="premium-button"
                        style={{ marginLeft: 12 }}
                    >
                        Create Blank Form
                    </Button>
                </Space>
            </div>

            {view === 'my-forms' ? (
                <Card styles={{ body: { padding: 0 } }} className="premium-card">
                    <Table 
                        className="premium-table"
                        columns={columns} 
                        dataSource={forms} 
                        rowKey="id" 
                        loading={loading}
                        pagination={false}
                    />
                </Card>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                    {FORM_TEMPLATES.map(template => (
                        <Card 
                            key={template.id} 
                            className="premium-card" 
                            hoverable
                            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                        >
                            <div style={{ flex: 1 }}>
                                <Tag color="cyan" style={{ marginBottom: 12, borderRadius: 6, border: 'none', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', fontWeight: 700 }}>
                                    {template.industry}
                                </Tag>
                                <Title level={5} style={{ color: '#fff', marginTop: 0, marginBottom: 8 }}>{template.title}</Title>
                                <Paragraph style={{ color: '#94a3b8', fontSize: 13, minHeight: 40 }}>{template.description}</Paragraph>
                                <div style={{ marginTop: 16 }}>
                                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Included Fields:</Text>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {template.fields.slice(0, 4).map(f => (
                                            <Tag key={f.id} style={{ fontSize: 10, borderRadius: 4, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#475569' }}>
                                                {f.label}
                                            </Tag>
                                        ))}
                                        {template.fields.length > 4 && <Text style={{ fontSize: 10, color: '#475569' }}>+{template.fields.length - 4} more</Text>}
                                    </div>
                                </div>
                            </div>
                            <Button 
                                type="primary" 
                                block 
                                style={{ marginTop: 24, borderRadius: 8, fontWeight: 700 }}
                                onClick={() => useTemplate(template)}
                                className="premium-button"
                            >
                                Use Template
                            </Button>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FormList;
