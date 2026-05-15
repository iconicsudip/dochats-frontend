import React from 'react';
import { Modal, Form, Input, Button, Typography } from 'antd';

const { Title } = Typography;

interface WhatsAppSettingsModalProps {
    open: boolean;
    saving: boolean;
    initialValues: any;
    onCancel: () => void;
    onFinish: (vals: any) => void;
}

const WhatsAppSettingsModal: React.FC<WhatsAppSettingsModalProps> = ({
    open, saving, initialValues, onCancel, onFinish
}) => {
    return (
        <Modal
            title={<Title level={4} style={{ color: '#fff', margin: 0 }}>WhatsApp Settings</Title>}
            open={open}
            onCancel={onCancel}
            footer={null}
            className="premium-modal"
        >
            <Form layout="vertical" onFinish={onFinish} initialValues={initialValues}>
                <Form.Item name="apiKey" label="Meta Access Token" rules={[{ required: true }]}>
                    <Input.Password className="premium-input" />
                </Form.Item>
                <Form.Item name="phoneNumberId" label="Phone Number ID" rules={[{ required: true }]}>
                    <Input className="premium-input" />
                </Form.Item>
                <Form.Item name="businessAccountId" label="Business Account ID" rules={[{ required: true }]}>
                    <Input className="premium-input" />
                </Form.Item>
                <Button type="primary" block htmlType="submit" loading={saving} className="premium-button">
                    Save WhatsApp Config
                </Button>
            </Form>
        </Modal>
    );
};

export default WhatsAppSettingsModal;
