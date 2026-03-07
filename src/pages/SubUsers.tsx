import React, { useState, useEffect } from 'react';
import { Typography, Button, Table, Modal, Form, Input, Select, Spin, Tag, App, Space, Card, Image, Avatar, Progress } from 'antd';
import { TeamOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';

const { Title, Text } = Typography;

const SubUsers: React.FC = () => {
    const { user } = useAuth();
    const { modal, message: msg } = App.useApp();
    const [subUsers, setSubUsers] = useState<any[]>([]);
    const [links, setLinks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();

    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        fetchData(page);
    }, [page]);

    const fetchData = async (currentPage: number = 1) => {
        setLoading(true);
        try {
            const [subRes, linksRes] = await Promise.all([
                apiClient.get(`/auth/sub-users?page=${currentPage}&limit=12`),
                apiClient.get('/links?limit=500') // Giving a large limit to fetch all available links
            ]);
            setSubUsers(subRes.data?.data || subRes.data);
            setTotal(subRes.data?.total || 0);
            setLinks(linksRes.data?.data || linksRes.data);
        } catch (e: any) {
            msg.error('Failed to load sub users');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreateModal = () => {
        setEditingUser(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (user: any) => {
        setEditingUser(user);
        form.setFieldsValue({
            username: user.username,
            links: user.assignedLinks?.map((l: any) => l.id) || []
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (values: any) => {
        setSubmitting(true);
        try {
            if (editingUser) {
                await apiClient.put(`/auth/sub-users/${editingUser.id}`, {
                    password: values.password || undefined,
                    assignedLinkIds: values.links
                });
                msg.success('Sub-user updated successfully!');
            } else {
                await apiClient.post('/auth/sub-users', {
                    username: values.username,
                    password: values.password,
                    assignedLinkIds: values.links
                });
                msg.success('Sub-user created successfully!');
            }
            setIsModalOpen(false);
            form.resetFields();
            fetchData();
        } catch (e: any) {
            msg.error(e.response?.data?.error || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await apiClient.delete(`/auth/sub-users/${id}`);
            msg.success('Sub-user deleted successfully');
            fetchData();
        } catch (e: any) {
            msg.error('Failed to delete sub-user');
        }
    };

    const columns = [
        {
            title: 'TEAM MEMBER',
            key: 'user',
            render: (_: any, record: any) => (
                <Space>
                    {record.logoUrl ? (
                        <Image
                            src={record.logoUrl}
                            alt="logo"
                            width={32}
                            height={32}
                            style={{ borderRadius: 6, objectFit: 'cover' }}
                        />
                    ) : (
                        <Avatar size={32} icon={<TeamOutlined />} style={{ background: '#1a1b1e', border: '1px solid var(--divider)' }} />
                    )}
                    <div>
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{record.name || record.username}</div>
                        <div style={{ color: '#8696a0', fontSize: 11 }}>@{record.username}</div>
                    </div>
                </Space>
            )
        },
        {
            title: 'ASSIGNED LINKS',
            key: 'assignedLinks',
            render: (_: any, record: any) => (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {record.assignedLinks?.map((l: any) => (
                        <Tag
                            key={l.id}
                            style={{
                                background: 'rgba(0, 223, 154, 0.1)',
                                color: '#00df9a',
                                border: '1px solid rgba(0, 223, 154, 0.2)',
                                borderRadius: 4
                            }}
                        >
                            {l.title}
                        </Tag>
                    ))}
                    {(!record.assignedLinks || record.assignedLinks.length === 0) && <Text type="secondary" style={{ fontSize: 12 }}>No links assigned</Text>}
                </div>
            ),
        },
        {
            title: 'ACTIONS',
            key: 'actions',
            align: 'right' as 'right',
            render: (_: any, record: any) => (
                <Space size="middle">
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleOpenEditModal(record)}
                        style={{ color: '#00df9a' }}
                    >
                        Edit
                    </Button>
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                            modal.confirm({
                                title: 'Delete Sub-user',
                                content: `Are you sure you want to delete ${record.username}?`,
                                onOk: () => handleDelete(record.id),
                                okText: 'Yes, Delete',
                                cancelText: 'Cancel',
                                centered: true,
                                okButtonProps: { danger: true, className: 'premium-button-danger' },
                                cancelButtonProps: { type: 'text' }
                            });
                        }}
                    >
                        Delete
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40 }}>
                <div>
                    <Title level={3} style={{ margin: 0, fontWeight: 800 }}>Team Management</Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>Create and manage sub-users who can handle your chat links.</Text>
                </div>
                <Space direction="vertical" align="end" style={{ minWidth: 200 }}>
                    <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Team: {total} / {user?.subUsersLimit || 0}</Text>
                        </div>
                        <Progress
                            percent={Math.min(100, (total / (user?.subUsersLimit || 1)) * 100)}
                            showInfo={false}
                            strokeColor="#00df9a"
                            trailColor="rgba(255,255,255,0.05)"
                            size="small"
                        />
                    </div>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        className="premium-button"
                        onClick={handleOpenCreateModal}
                        disabled={total >= (user?.subUsersLimit || 0)}
                    >
                        Add Team Member
                    </Button>
                </Space>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>
            ) : (
                <Card className="premium-card" bodyStyle={{ padding: 0 }}>
                    <Table
                        dataSource={subUsers}
                        columns={columns}
                        rowKey="id"
                        pagination={{
                            current: page,
                            pageSize: 12,
                            total: total,
                            onChange: (newPage) => setPage(newPage),
                            position: ['bottomCenter']
                        }}
                        className="premium-table"
                        scroll={{ x: 'max-content' }}
                    />
                </Card>
            )}

            <Modal
                title={editingUser ? "Edit Team Member" : "Create Team Member"}
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
                footer={null}
                centered
                width={500}
                mask={{ closable: false }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    style={{ marginTop: 24 }}
                >
                    <Form.Item label="Username" name="username" rules={[{ required: !editingUser }]}>
                        <Input
                            size="large"
                            placeholder="e.g. agent_sarah"
                            disabled={!!editingUser}
                            variant="borderless"
                            className="premium-input"
                        />
                    </Form.Item>
                    <Form.Item
                        label={editingUser ? "New Password (leave blank to keep current)" : "Initial Password"}
                        name="password"
                        rules={[{ required: !editingUser, min: 6 }]}
                    >
                        <Input.Password
                            size="large"
                            placeholder={editingUser ? "Leave blank to keep current" : "Minimum 6 characters"}
                            variant="borderless"
                            className="premium-input"
                        />
                    </Form.Item>
                    <Form.Item label="Assign Chat Links" name="links">
                        <Select
                            mode="multiple"
                            size="large"
                            placeholder="Select links this agent can access"
                            options={links.map(l => ({ value: l.id, label: l.title }))}
                            variant="borderless"
                            className="premium-input"
                            dropdownStyle={{ background: '#111214', border: '1px solid var(--divider)', borderRadius: 12 }}
                        />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 40, gap: 12 }}>
                        <Button
                            onClick={() => { setIsModalOpen(false); form.resetFields(); }}
                            style={{
                                height: 44,
                                borderRadius: 10,
                                background: 'rgba(255,255,255,0.05)',
                                border: 'none',
                                color: '#a1a1aa',
                                fontWeight: 600
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            className="premium-button"
                            loading={submitting}
                        >
                            {editingUser ? "Update Member" : "Create Member"}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default SubUsers;
