import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Modal, Form, Input, Typography, Space, Card, message, Image } from 'antd';
import { UserAddOutlined, DeleteOutlined, TeamOutlined, LinkOutlined, UploadOutlined } from '@ant-design/icons';
import apiClient from '../../api/apiClient';

const { Title, Text } = Typography;

const ManageAdmins: React.FC = () => {
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<any>(null);
    const [logoBase64, setLogoBase64] = useState<string | null>(null);
    const [defaultAmount, setDefaultAmount] = useState<number>(7999);
    const [form] = Form.useForm();

    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const fetchAdmins = async (currentPage: number = 1) => {
        setLoading(true);
        try {
            const res = await apiClient.get(`/super-admin/admins?page=${currentPage}&limit=15`);
            setAdmins(res.data?.data || res.data);
            setTotal(res.data?.total || 0);
            if (res.data?.defaultAmount) setDefaultAmount(res.data.defaultAmount);
        } catch (e) {
            message.error('Failed to fetch admins');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdmins(page);
    }, [page]);

    const handleSaveAdmin = async (values: any) => {
        try {
            const payload = { ...values, logoUrl: logoBase64 };
            if (editingAdmin) {
                await apiClient.put(`/super-admin/admins/${editingAdmin.id}`, payload);
                message.success('Admin account updated successfully');
            } else {
                await apiClient.post('/super-admin/admins', payload);
                message.success('Admin account created successfully');
            }
            setIsModalOpen(false);
            setEditingAdmin(null);
            setLogoBase64(null);
            form.resetFields();
            fetchAdmins();
        } catch (e: any) {
            message.error(e.response?.data?.error || 'Failed to save admin');
        }
    };

    const handleEditAdmin = (admin: any) => {
        setEditingAdmin(admin);
        setLogoBase64(admin.logoUrl);
        form.setFieldsValue({
            username: admin.username,
            name: admin.name,
            subscriptionAmount: admin.subscriptionAmount,
            password: '' // Don't show old password
        });
        setIsModalOpen(true);
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size / 1024 / 1024 > 5) {
            message.error('Image must be smaller than 5MB!');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDeleteAdmin = async (id: string) => {
        Modal.confirm({
            title: <span style={{ color: '#fff' }}>Delete Admin Account</span>,
            content: <span style={{ color: '#a1a1aa' }}>Are you sure? This will delete the admin and all their associated links and sub-users.</span>,
            okText: 'Yes, Delete',
            okType: 'danger',
            okButtonProps: { style: { background: '#ef4444', borderColor: '#ef4444' } },
            cancelButtonProps: { style: { borderColor: '#2d2e33', color: '#a1a1aa' } },
            styles: { body: { background: '#121316' } },
            style: { top: '30%' },
            className: 'dark-confirm-modal',
            onOk: async () => {
                try {
                    await apiClient.delete(`/super-admin/admins/${id}`);
                    message.success('Admin deleted');
                    fetchAdmins();
                } catch (e) {
                    message.error('Failed to delete admin');
                }
            }
        });
    };

    const columns = [
        {
            title: 'Admin',
            key: 'admin',
            render: (_: any, record: any) => (
                <Space>
                    {record.logoUrl && (
                        <Image
                            src={record.logoUrl}
                            alt="logo"
                            width={24}
                            height={24}
                            style={{ borderRadius: 4, objectFit: 'cover' }}
                        />
                    )}
                    <div>
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{record.name || record.username}</div>
                        <div style={{ color: '#8696a0', fontSize: 11 }}>@{record.username}</div>
                    </div>
                </Space>
            )
        },
        {
            title: 'Sub-Users',
            dataIndex: 'subUsers',
            key: 'subUsers',
            render: (subUsers: any[]) => (
                <Space>
                    <TeamOutlined style={{ color: '#8696a0' }} />
                    <Text>{subUsers?.length || 0}</Text>
                </Space>
            )
        },
        {
            title: 'Active Links',
            dataIndex: 'links',
            key: 'links',
            render: (links: any[]) => (
                <Space>
                    <LinkOutlined style={{ color: '#8696a0' }} />
                    <Text>{links?.length || 0}</Text>
                </Space>
            )
        },
        {
            title: 'Monthly Plan',
            dataIndex: 'subscriptionAmount',
            key: 'subscriptionAmount',
            render: (amount: number) => (
                <Text style={{ color: '#00df9a', fontWeight: 600 }}>
                    ₹{(amount || defaultAmount).toLocaleString()}
                </Text>
            )
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: any) => (
                <Space>
                    <Button
                        type="text"
                        icon={<TeamOutlined style={{ color: '#00df9a' }} />}
                        onClick={() => handleEditAdmin(record)}
                    />
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteAdmin(record.id)}
                    />
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
                <div>
                    <Title level={4} style={{ margin: 0, fontWeight: 800 }}>Manage Administrators</Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>Create and monitor all admin accounts across the system.</Text>
                </div>
                <Button
                    type="primary"
                    icon={<UserAddOutlined />}
                    onClick={() => {
                        setEditingAdmin(null);
                        setLogoBase64(null);
                        form.resetFields();
                        setIsModalOpen(true);
                    }}
                    className="premium-button"
                >
                    Create New Admin
                </Button>
            </div>

            <Card styles={{ body: { padding: 0 } }} style={{ background: '#121316', border: '1px solid #2d2e33', borderRadius: 12, overflow: 'hidden' }}>
                <Table
                    columns={columns}
                    dataSource={admins}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    pagination={{
                        current: page,
                        pageSize: 15,
                        total: total,
                        onChange: (newPage) => setPage(newPage)
                    }}
                    style={{ background: 'transparent' }}
                />
            </Card>

            <Modal
                title={<span style={{ color: '#fff' }}>{editingAdmin ? "Edit Admin Account" : "Create Admin Account"}</span>}
                open={isModalOpen}
                onCancel={() => {
                    setIsModalOpen(false);
                    setEditingAdmin(null);
                    setLogoBase64(null);
                    form.resetFields();
                }}
                footer={null}
                centered
                styles={{
                    header: { background: '#121316', borderBottom: '1px solid #2d2e33', padding: '16px 24px' },
                    body: { background: '#121316', padding: '24px' },
                }}
            >
                <Form form={form} layout="vertical" onFinish={handleSaveAdmin}>
                    <Form.Item
                        name="username"
                        label={<span style={{ color: '#a1a1aa' }}>Username</span>}
                        rules={[{ required: true, message: 'Please enter username' }]}
                    >
                        <Input placeholder="admin_name" className="premium-input" disabled={!!editingAdmin} />
                    </Form.Item>
                    <Form.Item
                        name="name"
                        label={<span style={{ color: '#a1a1aa' }}>Display Name</span>}
                    >
                        <Input placeholder="Personal or Brand Name" className="premium-input" />
                    </Form.Item>

                    <Form.Item
                        name="subscriptionAmount"
                        label={<span style={{ color: '#a1a1aa' }}>Monthly Subscription Amount (₹)</span>}
                        tooltip="Leave blank to use default plan amount"
                    >
                        <Input type="number" placeholder="Default from settings" className="premium-input" />
                    </Form.Item>

                    <Form.Item label={<span style={{ color: '#a1a1aa' }}>Admin Logo</span>}>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                        />
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                background: '#0b0c0e',
                                border: '1px dashed #2d2e33',
                                borderRadius: 12,
                                padding: '20px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'border-color 0.2s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#00df9a')}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2d2e33')}
                        >
                            <UploadOutlined style={{ color: '#00df9a', fontSize: 24, display: 'block', marginBottom: 8 }} />
                            <span style={{ color: '#fff', fontSize: 13 }}>Click to upload logo</span>
                        </div>
                        {logoBase64 && (
                            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Image
                                    src={logoBase64}
                                    alt="preview"
                                    width={40}
                                    height={40}
                                    style={{ borderRadius: 6, border: '1px solid #2d2e33', objectFit: 'cover' }}
                                />
                                <Button
                                    type="link"
                                    danger
                                    size="small"
                                    icon={<DeleteOutlined />}
                                    onClick={() => setLogoBase64(null)}
                                >
                                    Remove Logo
                                </Button>
                            </div>
                        )}
                    </Form.Item>

                    <Form.Item
                        name="password"
                        label={<span style={{ color: '#a1a1aa' }}>{editingAdmin ? "Update Password (leave blank to keep)" : "Initial Password"}</span>}
                        rules={editingAdmin ? [] : [{ required: true, message: 'Please enter initial password' }, { min: 6, message: 'Min 6 characters' }]}
                    >
                        <Input.Password placeholder="******" className="premium-input" />
                    </Form.Item>
                    <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: 24 }}>
                        <Button
                            onClick={() => {
                                setIsModalOpen(false);
                                setEditingAdmin(null);
                                setLogoBase64(null);
                                form.resetFields();
                            }}
                            style={{ borderColor: '#2d2e33', color: '#a1a1aa' }}
                        >Cancel</Button>
                        <Button type="primary" htmlType="submit" className="premium-button">
                            {editingAdmin ? "Save Changes" : "Create Account"}
                        </Button>
                    </Space>
                </Form>
            </Modal>
        </div>
    );
};

export default ManageAdmins;
