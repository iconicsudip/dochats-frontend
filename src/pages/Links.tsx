import React, { useState } from 'react';
import {
    Row,
    Col,
    Card,
    Button,
    Input,
    Badge,
    Tooltip,
    Modal,
    Form,
    message,
    Popconfirm,
    Empty,
    Typography,
    Pagination,
    Space,
    Progress,
    Grid
} from 'antd';
import {
    PlusOutlined,
    CopyOutlined,
    ExportOutlined,
    DeleteOutlined,
    SearchOutlined,
    CheckCircleOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/apiClient';

const { Title, Text } = Typography;
const { TextArea } = Input;

const Links: React.FC = () => {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [editingLink, setEditingLink] = useState<any | null>(null);
    const [copiedId, setCopiedId] = useState('');
    const [form] = Form.useForm();
    const pageSize = 6;
    const queryClient = useQueryClient();

    const { data: linksResponse, isLoading } = useQuery({
        queryKey: ['links', currentPage],
        queryFn: () => apiClient.get(`/links?page=${currentPage}&limit=${pageSize}`).then(res => res.data),
    });
    const links = linksResponse?.data || [];
    const totalLinks = linksResponse?.total || 0;

    const createMutation = useMutation({
        mutationFn: (values: any) => apiClient.post('/links', values),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['links'] });
            message.success('Chat link created successfully!');
            setShowModal(false);
            form.resetFields();
        },
        onError: (err: any) => {
            message.error(err.response?.data?.error || 'Failed to create link');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, values }: { id: string, values: any }) => apiClient.put(`/links/${id}`, values),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['links'] });
            message.success('Link updated successfully!');
            setShowModal(false);
            setEditingLink(null);
            form.resetFields();
        },
        onError: (err: any) => {
            message.error(err.response?.data?.error || 'Failed to update link');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/links/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['links'] });
            message.success('Link deleted');
        }
    });

    const handleEdit = (link: any) => {
        setEditingLink(link);
        form.setFieldsValue(link);
        setShowModal(true);
    };

    const copyToClipboard = (slug: string, id: string) => {
        const url = `${window.location.origin}/chat/${slug}`;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        message.success('Link copied to clipboard');
        setTimeout(() => setCopiedId(''), 2000);
    };

    const filteredLinks = links.filter((l: any) =>
        l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.slug.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const screens = Grid.useBreakpoint();
    const isMobile = !screens.sm;

    return (
        <div>
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'flex-start' : 'flex-end',
                marginBottom: isMobile ? 24 : 40,
                gap: isMobile ? 24 : 0
            }}>
                <div>
                    <Title level={3} style={{ margin: 0, fontWeight: 800, fontSize: isMobile ? 20 : 24 }}>My Chat Links</Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>Manage and share your custom chat URLs.</Text>
                </div>
                <Space direction="vertical" align={isMobile ? 'start' : 'end'} style={{ minWidth: isMobile ? '100%' : 200 }}>
                    <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Usage: {totalLinks} / {user?.linksLimit || 0}</Text>
                        </div>
                        <Progress
                            percent={Math.min(100, (totalLinks / (user?.linksLimit || 1)) * 100)}
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
                        onClick={() => setShowModal(true)}
                        disabled={totalLinks >= (user?.linksLimit || 0)}
                        style={{ width: isMobile ? '100%' : 'auto' }}
                    >
                        Create New Link
                    </Button>
                </Space>
            </div>

            <div style={{ marginBottom: 32 }}>
                <Input
                    prefix={<SearchOutlined style={{ color: 'var(--text-secondary)', marginRight: 8 }} />}
                    placeholder="Search by title or slug..."
                    size="large"
                    variant="borderless"
                    value={searchTerm}
                    onChange={e => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                    }}
                    style={{
                        maxWidth: isMobile ? '100%' : 400,
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--divider)',
                        borderRadius: 8,
                        height: 48,
                        color: '#fff'
                    }}
                />
            </div>

            <Row gutter={[24, 24]}>
                <AnimatePresence>
                    {filteredLinks.map((link: any) => (
                        <Col xs={24} md={12} lg={8} key={link.id}>
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <Card className="premium-card">
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                            <div style={{ flex: 1 }}>
                                                <Title level={5} style={{ margin: 0, fontSize: 16 }}>{link.title}</Title>
                                                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>dochats.com/chat/{link.slug}</Text>
                                            </div>
                                            <Badge
                                                count={`${link._count.conversations} Chats`}
                                                style={{ background: 'rgba(0, 223, 154, 0.1)', color: '#00df9a', border: 'none', fontWeight: 600, padding: '0 8px' }}
                                            />
                                        </div>

                                        <div style={{ padding: '12px 0', borderTop: '1px solid var(--divider)', margin: '0 -16px 16px -16px', paddingLeft: 16, paddingRight: 16 }}>
                                            <Text type="secondary" style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>WELCOME MESSAGE</Text>
                                            <div style={{ marginTop: 4, fontStyle: 'italic', fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.4 }}>"{link.welcomeMessage || 'No message set'}"</div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Space size={12}>
                                                <Button
                                                    icon={copiedId === link.id ? <CheckCircleOutlined /> : <CopyOutlined />}
                                                    onClick={() => copyToClipboard(link.slug, link.id)}
                                                    style={{ borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--divider)', fontWeight: 500 }}
                                                >
                                                    {copiedId === link.id ? 'Copied' : 'Copy'}
                                                </Button>
                                                <Button
                                                    onClick={() => handleEdit(link)}
                                                    style={{ borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--divider)' }}
                                                >
                                                    Edit
                                                </Button>
                                                <Tooltip title="Preview Chat">
                                                    <Button
                                                        icon={<ExportOutlined />}
                                                        href={`/chat/${link.slug}`}
                                                        target="_blank"
                                                        style={{ borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--divider)' }}
                                                    />
                                                </Tooltip>
                                            </Space>
                                            <Popconfirm
                                                title="Delete link"
                                                description="Are you sure you want to delete this chat link?"
                                                onConfirm={() => deleteMutation.mutate(link.id)}
                                                okButtonProps={{ danger: true }}
                                            >
                                                <Button danger icon={<DeleteOutlined style={{ fontSize: 16 }} />} type="text" style={{ borderRadius: 8 }} />
                                            </Popconfirm>
                                        </div>
                                    </>
                                </Card>
                            </motion.div>
                        </Col>
                    ))}
                </AnimatePresence>
            </Row>

            {filteredLinks.length === 0 && !isLoading && (
                <Empty description="No links found" style={{ marginTop: 80 }} />
            )}

            {totalLinks > pageSize && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
                    <Pagination
                        current={currentPage}
                        pageSize={pageSize}
                        total={totalLinks}
                        onChange={setCurrentPage}
                        showSizeChanger={false}
                    />
                </div>
            )}

            <Modal
                title={editingLink ? "Edit Chat Link" : "Create Chat Link"}
                open={showModal}
                onCancel={() => { setShowModal(false); setEditingLink(null); form.resetFields(); }}
                footer={null}
                centered
                mask={{ closable: false }}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={values => {
                        if (editingLink) {
                            updateMutation.mutate({ id: editingLink.id, values });
                        } else {
                            createMutation.mutate(values);
                        }
                    }}
                    initialValues={{
                        welcomeMessage: 'Hello! How can I help you today?',
                        whatsappThreshold: 5
                    }}
                    style={{ marginTop: 20 }}
                >
                    <Form.Item
                        label="Internal Title"
                        name="title"
                        rules={[{ required: true, message: 'Please enter a title' }]}
                    >
                        <Input
                            placeholder="e.g. Sales Support"
                            variant="borderless"
                            style={{
                                height: 48,
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--divider)',
                                borderRadius: 8,
                                color: '#fff'
                            }}
                        />
                    </Form.Item>

                    {editingLink && (
                        <div style={{
                            padding: '12px 16px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--divider)',
                            borderRadius: 8,
                            marginBottom: 24
                        }}>
                            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Chat URL (auto-generated)</Text>
                            <Text style={{ fontSize: 14 }}>dochats.com/chat/{editingLink.slug}</Text>
                        </div>
                    )}

                    <Form.Item label="Welcome Message" name="welcomeMessage">
                        <TextArea
                            rows={3}
                            placeholder="Auto-reply whenever someone opens the link"
                            variant="borderless"
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--divider)',
                                borderRadius: 8,
                                color: '#fff',
                                padding: '12px 16px'
                            }}
                        />
                    </Form.Item>

                    <div style={{ padding: '16px 0', borderTop: '1px solid var(--divider)', marginTop: 16 }}>
                        <Title level={5} style={{ fontSize: 14, color: '#00df9a', marginBottom: 16 }}>WhatsApp Redirection (Optional)</Title>

                        <Form.Item
                            label="WhatsApp Redirection Link"
                            name="whatsappLink"
                            extra="Format: https://wa.me/phonenumber?text=Hi Message"
                        >
                            <Input
                                placeholder="https://wa.me/1234567890?text=Hi"
                                variant="borderless"
                                style={{
                                    height: 48,
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--divider)',
                                    borderRadius: 8,
                                    color: '#fff'
                                }}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Redirection Threshold (Messages)"
                            name="whatsappThreshold"
                            extra="Show popup after these many messages from customer"
                        >
                            <Input
                                type="number"
                                placeholder="e.g. 5"
                                variant="borderless"
                                style={{
                                    height: 48,
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid var(--divider)',
                                    borderRadius: 8,
                                    color: '#fff'
                                }}
                            />
                        </Form.Item>
                    </div>

                    <Space style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                        <Button onClick={() => { setShowModal(false); setEditingLink(null); form.resetFields(); }}>Cancel</Button>
                        <Button type="primary" htmlType="submit" loading={createMutation.isPending || updateMutation.isPending} className="premium-button">
                            {editingLink ? "Update Link" : "Generate Link"}
                        </Button>
                    </Space>
                </Form>
            </Modal>
        </div>
    );
};

export default Links;
