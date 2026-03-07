import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Typography, Space, Card, message, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, TeamOutlined, LinkOutlined } from '@ant-design/icons';
import apiClient from '../../api/apiClient';

const { Title, Text, Paragraph } = Typography;

const ManagePlans: React.FC = () => {
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [form] = Form.useForm();

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/super-admin/plans');
            setPlans(res.data);
        } catch (e) {
            message.error('Failed to fetch plans');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleSavePlan = async (values: any) => {
        setSubmitting(true);
        try {
            if (editingPlan) {
                await apiClient.put(`/super-admin/plans/${editingPlan.id}`, values);
                message.success('Plan updated successfully');
            } else {
                await apiClient.post('/super-admin/plans', values);
                message.success('Plan created successfully');
            }
            setIsModalOpen(false);
            setEditingPlan(null);
            form.resetFields();
            fetchPlans();
        } catch (e: any) {
            message.error(e.response?.data?.error || 'Failed to save plan');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePlan = async (id: string) => {
        Modal.confirm({
            title: <span style={{ color: '#fff' }}>Delete Subscription Plan</span>,
            content: <span style={{ color: '#a1a1aa' }}>Are you sure? A plan cannot be deleted if it is currently assigned to users.</span>,
            okText: 'Yes, Delete',
            okType: 'danger',
            okButtonProps: { style: { background: '#ef4444', borderColor: '#ef4444' } },
            cancelButtonProps: { style: { borderColor: '#2d2e33', color: '#a1a1aa' } },
            centered: true,
            styles: { body: { background: '#121316' } },
            onOk: async () => {
                try {
                    await apiClient.delete(`/super-admin/plans/${id}`);
                    message.success('Plan deleted');
                    fetchPlans();
                } catch (e: any) {
                    message.error(e.response?.data?.error || 'Failed to delete plan');
                }
            }
        });
    };

    const handleEditPlan = (plan: any) => {
        setEditingPlan(plan);
        form.setFieldsValue(plan);
        setIsModalOpen(true);
    };

    const columns = [
        {
            title: 'Order',
            dataIndex: 'order',
            key: 'order',
            width: 80,
            render: (order: number) => (
                <Text style={{ color: '#8696a0' }}>#{order}</Text>
            )
        },
        {
            title: 'Plan Name',
            dataIndex: 'name',
            key: 'name',
            render: (name: string) => (
                <Text strong style={{ color: '#fff', fontSize: 14 }}>{name}</Text>
            )
        },
        {
            title: 'Prices',
            key: 'prices',
            render: (_: any, record: any) => (
                <Space direction="vertical" size={0}>
                    <Text style={{ color: '#00df9a', fontWeight: 600, fontSize: 13 }}>Monthly: ₹{record.monthlyPrice?.toLocaleString()}</Text>
                    <Text style={{ color: '#00df9a', fontWeight: 600, fontSize: 13 }}>Yearly: ₹{record.yearlyPrice?.toLocaleString()}</Text>
                </Space>
            )
        },
        {
            title: 'Limits',
            key: 'limits',
            render: (_: any, record: any) => (
                <Space direction="vertical" size={0}>
                    <Text style={{ fontSize: 12 }}><TeamOutlined style={{ marginRight: 8, color: '#3b82f6' }} />{record.subUsersLimit} Sub-Users</Text>
                    <Text style={{ fontSize: 12 }}><LinkOutlined style={{ marginRight: 8, color: '#ffd279' }} />{record.linksLimit} Dynamic Links</Text>
                </Space>
            )
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: (desc: string) => (
                <Paragraph ellipsis={{ rows: 2 }} style={{ color: '#8696a0', fontSize: 12, margin: 0, maxWidth: 200 }}>
                    {desc || 'No description'}
                </Paragraph>
            )
        },
        {
            title: 'Action',
            key: 'action',
            align: 'right' as 'right',
            render: (_: any, record: any) => (
                <Space>
                    <Button
                        type="text"
                        icon={<EditOutlined style={{ color: '#00df9a' }} />}
                        onClick={() => handleEditPlan(record)}
                    />
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeletePlan(record.id)}
                    />
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
                <div>
                    <Title level={4} style={{ margin: 0, fontWeight: 800 }}>Subscription Plans</Title>
                    <Paragraph type="secondary" style={{ fontSize: 13, margin: 0 }}>
                        Define and manage service tiers for your administrative users.
                    </Paragraph>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setEditingPlan(null);
                        form.resetFields();
                        setIsModalOpen(true);
                    }}
                    className="premium-button"
                >
                    Create New Plan
                </Button>
            </div>

            <Card styles={{ body: { padding: 0 } }} style={{ background: '#121316', border: '1px solid #2d2e33', borderRadius: 12, overflow: 'hidden' }}>
                <Table
                    columns={columns}
                    dataSource={plans}
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    style={{ background: 'transparent' }}
                    scroll={{ x: 'max-content' }}
                />
            </Card>

            <Modal
                title={<span style={{ color: '#fff' }}>{editingPlan ? "Edit Plan Details" : "Create New Subscription Plan"}</span>}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                centered
                width={550}
                styles={{
                    header: { background: '#121316', borderBottom: '1px solid #2d2e33', padding: '16px 24px' },
                    body: { background: '#121316', padding: '24px' },
                }}
            >
                <Form form={form} layout="vertical" onFinish={handleSavePlan} initialValues={{ subUsersLimit: 3, linksLimit: 5, order: 0 }}>
                    <Row gutter={16}>
                        <Col span={16}>
                            <Form.Item
                                name="name"
                                label={<span style={{ color: '#a1a1aa' }}>Plan Name</span>}
                                rules={[{ required: true, message: 'Please enter plan name' }]}
                            >
                                <Input placeholder="e.g. Basic, Professional, Enterprise" className="premium-input" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item
                                name="order"
                                label={<span style={{ color: '#a1a1aa' }}>Display Order</span>}
                                rules={[{ required: true }]}
                            >
                                <Input type="number" className="premium-input" placeholder="0" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="monthlyPrice"
                                label={<span style={{ color: '#a1a1aa' }}>Monthly Price (₹)</span>}
                                rules={[{ required: true, message: 'Please enter monthly price' }]}
                            >
                                <Input type="number" placeholder="999" className="premium-input" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="yearlyPrice"
                                label={<span style={{ color: '#a1a1aa' }}>Yearly Price (₹)</span>}
                                rules={[{ required: true, message: 'Please enter yearly price' }]}
                            >
                                <Input type="number" placeholder="9999" className="premium-input" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="subUsersLimit"
                                label={<span style={{ color: '#a1a1aa' }}>Sub-Users Limit</span>}
                                rules={[{ required: true }]}
                            >
                                <Input type="number" className="premium-input" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="linksLimit"
                                label={<span style={{ color: '#a1a1aa' }}>Links Limit</span>}
                                rules={[{ required: true }]}
                            >
                                <Input type="number" className="premium-input" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="description"
                        label={<span style={{ color: '#a1a1aa' }}>Description</span>}
                    >
                        <Input.TextArea
                            placeholder="What's included in this plan?"
                            className="premium-input"
                            autoSize={{ minRows: 3, maxRows: 6 }}
                            style={{ background: '#0b0c0e', border: '1px solid #2d2e33', borderRadius: 8, padding: '12px' }}
                        />
                    </Form.Item>

                    <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: 24 }}>
                        <Button
                            onClick={() => setIsModalOpen(false)}
                            style={{ borderColor: '#2d2e33', color: '#a1a1aa' }}
                        >Cancel</Button>
                        <Button type="primary" htmlType="submit" className="premium-button" loading={submitting}>
                            {editingPlan ? "Update Plan" : "Create Plan"}
                        </Button>
                    </Space>
                </Form>
            </Modal>
        </div>
    );
};

export default ManagePlans;
