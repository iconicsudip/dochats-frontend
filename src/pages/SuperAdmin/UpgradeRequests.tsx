import React, { useState, useEffect } from 'react';
import { Table, Button, Typography, Space, Card, Tag, message, Avatar, Tooltip } from 'antd';
import { CheckOutlined, CloseOutlined, ThunderboltOutlined, UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import apiClient from '../../api/apiClient';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;

const UpgradeRequests: React.FC = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/super-admin/upgrade-requests');
            setRequests(res.data);
        } catch (e) {
            message.error('Failed to fetch upgrade requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        setProcessingId(id);
        try {
            await apiClient.post(`/super-admin/upgrade-requests/${id}/handle`, { status });
            message.success(`Request ${status.toLowerCase()} successfully`);
            fetchRequests();
        } catch (e: any) {
            message.error(e.response?.data?.error || 'Action failed');
        } finally {
            setProcessingId(null);
        }
    };

    const columns = [
        {
            title: 'Admin Details',
            key: 'admin',
            render: (_: any, record: any) => (
                <Space>
                    <Avatar src={record.user.logoUrl} icon={<UserOutlined />} style={{ background: '#1a1b1e' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Text strong style={{ color: '#fff', fontSize: 13 }}>{record.user.name || record.user.username}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>@{record.user.username}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'Current Plan',
            key: 'current',
            render: (_: any, record: any) => (
                <Tag color={record.user.plan ? 'blue' : 'default'} style={{ borderRadius: 4 }}>
                    {record.user.plan?.name || 'Custom / None'}
                </Tag>
            )
        },
        {
            title: 'Requested Plan',
            key: 'requested',
            render: (_: any, record: any) => record.plan ? (
                <Space direction="vertical" size={0}>
                    <Text strong style={{ color: '#00df9a' }}>{record.plan.name}</Text>
                    <Space size={4}>
                        <Tag color="cyan" style={{ fontSize: 10, borderRadius: 2 }}>
                            {record.billingCycle}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            ₹{(record.billingCycle === 'YEARLY' ? record.plan.yearlyPrice : record.plan.monthlyPrice).toLocaleString()}
                        </Text>
                    </Space>
                </Space>
            ) : (
                <Tag color="purple" style={{ borderRadius: 4, fontWeight: 700 }}>CUSTOM REQUEST</Tag>
            )
        },
        {
            title: 'Request Date',
            dataIndex: 'createdAt',
            key: 'date',
            render: (date: string) => (
                <Tooltip title={dayjs(date).format('LLL')}>
                    <Space size={4}>
                        <ClockCircleOutlined style={{ fontSize: 11, color: '#8696a0' }} />
                        <Text style={{ fontSize: 12, color: '#8696a0' }}>{dayjs(date).fromNow()}</Text>
                    </Space>
                </Tooltip>
            )
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => {
                let color = 'gold';
                if (status === 'APPROVED') color = 'success';
                if (status === 'REJECTED') color = 'error';
                return <Tag color={color}>{status}</Tag>;
            }
        },
        {
            title: 'Action',
            key: 'action',
            align: 'right' as 'right',
            render: (_: any, record: any) => record.status === 'PENDING' ? (
                <Space>
                    <Button
                        type="primary"
                        icon={<CheckOutlined />}
                        size="small"
                        loading={processingId === record.id}
                        onClick={() => handleAction(record.id, 'APPROVED')}
                        className="premium-button"
                        style={{ height: 32, minWidth: 100, borderRadius: 6, fontWeight: 600 }}
                    >
                        Approve
                    </Button>
                    <Button
                        danger
                        type="primary"
                        icon={<CloseOutlined />}
                        size="small"
                        loading={processingId === record.id}
                        onClick={() => handleAction(record.id, 'REJECTED')}
                        style={{ height: 32, minWidth: 100, borderRadius: 6, fontWeight: 600, background: '#ff4d4f', border: 'none' }}
                    >
                        Reject
                    </Button>
                </Space>
            ) : null
        }
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
                <div>
                    <Title level={4} style={{ margin: 0, fontWeight: 800 }}>Upgrade Requests</Title>
                    <Paragraph type="secondary" style={{ fontSize: 13, margin: 0 }}>
                        Review and approve plan change requests from your administrative users.
                    </Paragraph>
                </div>
                <ThunderboltOutlined style={{ fontSize: 32, color: '#00df9a', opacity: 0.1 }} />
            </div>

            <Card styles={{ body: { padding: 0 } }} style={{ background: '#121316', border: '1px solid #2d2e33', borderRadius: 12, overflow: 'hidden' }}>
                <Table
                    columns={columns}
                    dataSource={requests}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    style={{ background: 'transparent' }}
                    className="premium-table"
                    scroll={{ x: 'max-content' }}
                />
            </Card>
        </div>
    );
};

export default UpgradeRequests;
