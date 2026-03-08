import React, { useState } from 'react';
import { Modal, Input, Button, Typography, message, Grid } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';

const { Title, Text } = Typography;

export const ChangePasswordModal: React.FC = () => {
    const { user, setUser } = useAuth();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.sm;

    if (!user || (!user.isFirstLogin && !user.mustChangePassword)) return null;

    const handleSubmit = async () => {
        if (password.length < 6) return message.error('Password must be at least 6 characters');

        setLoading(true);
        try {
            await apiClient.post('/auth/change-password', { newPassword: password });
            message.success('Password updated successfully');
            setUser({ ...user, isFirstLogin: false, mustChangePassword: false });
        } catch (e: any) {
            message.error(e.response?.data?.error || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            open={true}
            closable={false}
            maskClosable={false}
            footer={null}
            centered
            width={isMobile ? '100%' : 400}
            styles={{
                body: {
                    background: '#1a1b1e',
                    border: '1px solid #2d2e33',
                    padding: '32px 24px',
                    textAlign: 'center'
                }
            }}
        >
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ color: '#fff', margin: 0 }}>Welcome!</Title>
                <Text style={{ color: '#94a3b8' }}>Please set a new password to continue.</Text>
            </div>

            <Input.Password
                size="large"
                placeholder="New Password (min 6 chars)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ marginBottom: 24, background: '#0b0c0e', border: '1px solid #2d2e33', color: '#fff' }}
            />

            <Button
                type="primary"
                block
                onClick={handleSubmit}
                loading={loading}
                style={{ background: '#00df9a', color: '#000', fontWeight: 600, border: 'none', height: 44, borderRadius: 10 }}
            >
                Confirm & Continue
            </Button>
        </Modal>
    );
};
