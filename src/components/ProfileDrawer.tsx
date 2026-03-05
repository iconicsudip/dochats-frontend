import React, { useState, useEffect, useRef } from 'react';
import { Drawer, Form, Input, Button, Typography, Avatar, message, Divider, Image } from 'antd';
import { UserOutlined, CameraOutlined, LockOutlined, SaveOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';

const { Title, Text } = Typography;

interface ProfileDrawerProps {
    open: boolean;
    onClose: () => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({ open, onClose }) => {
    const { user, setUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [logoBase64, setLogoBase64] = useState<string | null>(null);
    const [form] = Form.useForm();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Re-sync state every time drawer opens
    useEffect(() => {
        if (open && user) {
            setLogoBase64(user.logoUrl || null);
            form.setFieldsValue({ name: user.name || '' });
        }
    }, [open, user]);

    const handleUpdate = async (values: any) => {
        setLoading(true);
        try {
            const payload = {
                name: values.name,
                logoUrl: logoBase64,
            };
            // Only include password if provided
            if (values.password) {
                (payload as any).password = values.password;
            }
            const res = await apiClient.put('/auth/update-me', payload);
            setUser({ ...user, ...res.data });
            message.success('Profile updated successfully');
            form.resetFields(['password']);
        } catch (e: any) {
            message.error(e.response?.data?.error || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

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

        // Reset input so same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <Drawer
            title={<Text strong style={{ color: '#fff', fontSize: 18 }}>My Profile</Text>}
            placement="right"
            onClose={onClose}
            open={open}
            width={400}
            styles={{
                header: { background: '#121316', borderBottom: '1px solid #2d2e33' },
                body: { background: '#0b0c0e', padding: '24px' }
            }}
        >
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
            />

            <div style={{ textAlign: 'center', marginBottom: 32 }}>
                <div
                    style={{ position: 'relative', display: 'inline-block', cursor: 'pointer' }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Avatar
                        size={100}
                        src={logoBase64}
                        icon={<UserOutlined />}
                        style={{ background: '#1a1b1e', border: '2px solid #2d2e33' }}
                    />
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        background: '#00df9a',
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '3px solid #0b0c0e',
                        color: '#000'
                    }}>
                        <CameraOutlined />
                    </div>
                </div>
                <div style={{ marginTop: 16 }}>
                    <Title level={4} style={{ margin: 0, color: '#fff' }}>{user?.name || user?.username}</Title>
                    <Text type="secondary">@{user?.username}</Text>
                </div>
            </div>

            <Divider style={{ borderColor: '#2d2e33' }} />

            <Form
                form={form}
                layout="vertical"
                initialValues={{ name: user?.name || '' }}
                onFinish={handleUpdate}
            >
                <Form.Item label="Display Name" name="name">
                    <Input placeholder="Your Name or Brand" className="premium-input" />
                </Form.Item>

                <Form.Item label="Profile Photo">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            background: '#121316',
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
                        <span style={{ color: '#fff', fontSize: 13 }}>Click to upload photo</span>
                    </div>
                    {logoBase64 && (
                        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Image
                                src={logoBase64}
                                alt="preview"
                                width={50}
                                height={50}
                                style={{ borderRadius: 6, border: '1px solid #2d2e33', objectFit: 'cover' }}
                            />
                            <Button
                                type="link"
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => setLogoBase64(null)}
                                style={{ padding: 0 }}
                            >
                                Remove Photo
                            </Button>
                        </div>
                    )}
                </Form.Item>

                <Form.Item
                    label="Change Password"
                    name="password"
                    rules={[{ min: 6, message: 'Password must be at least 6 characters' }]}
                >
                    <Input.Password
                        prefix={<LockOutlined style={{ color: '#8696a0' }} />}
                        placeholder="Leave blank to keep current"
                        className="premium-input"
                    />
                </Form.Item>

                <Button
                    type="primary"
                    htmlType="submit"
                    block
                    loading={loading}
                    icon={<SaveOutlined />}
                    className="premium-button"
                    style={{ marginTop: 24 }}
                >
                    Save Profile
                </Button>
            </Form>

            <div style={{ marginTop: 40, padding: '20px', background: '#121316', borderRadius: 12, border: '1px solid #2d2e33' }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>ACCOUNT DETAILS</Text>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text type="secondary">System Role</Text>
                    <Text style={{ color: '#fff' }}>{user?.role}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">Member Since</Text>
                    <Text style={{ color: '#fff' }}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</Text>
                </div>
            </div>
        </Drawer>
    );
};

