import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';
import { Role } from '../enums';

const { Title, Text } = Typography;

const Auth: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const res = await apiClient.post('/auth/login', values);
            login(res.data.token, res.data.user);
            message.success(`Welcome back, ${res.data.user.username}!`);

            if (res.data.user.role === Role.SUB_USER) {
                navigate('/dashboard/chat');
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            message.error(err.response?.data?.error || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#09090b', backgroundImage: 'radial-gradient(circle at top, #141414 0%, #09090b 100%)' }}>
            <div style={{ width: 400 }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ width: 56, height: 56, background: '#00df9a', borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                        <CheckCircleOutlined style={{ color: '#000', fontSize: 28 }} />
                    </div>
                    <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>Welcome to DoChats</Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>Manage your customer chats with custom links.</Text>
                </div>

                <Card className="premium-card">
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <Text strong style={{ color: '#fff', fontSize: 16 }}>Sign In</Text>
                    </div>

                    <Form layout="vertical" onFinish={onFinish}>
                        <Form.Item
                            name="username"
                            rules={[{ required: true, message: 'Please input your username!' }]}
                        >
                            <Input
                                prefix={<UserOutlined style={{ color: 'var(--text-secondary)' }} />}
                                placeholder="Username"
                                size="large"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: 'Please input your password!' }]}
                        >
                            <Input.Password
                                prefix={<LockOutlined style={{ color: 'var(--text-secondary)' }} />}
                                placeholder="Password"
                                size="large"
                            />
                        </Form.Item>

                        <Button type="primary" htmlType="submit" block loading={loading} className="premium-button">
                            Sign In
                        </Button>
                    </Form>
                </Card>
            </div>
        </div>
    );
};

export default Auth;
