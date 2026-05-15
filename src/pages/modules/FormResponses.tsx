import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Button, Space, message, Modal, Row, Col, Statistic } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { formsApi } from '../../api/forms';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const FormResponses: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [responses, setResponses] = useState<any[]>([]);
    const [form, setForm] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [formRes, respRes] = await Promise.all([
                formsApi.getForm(id!),
                formsApi.getResponses(id!)
            ]);
            setForm(formRes.data);
            setResponses(respRes.data);
        } catch (e) {
            message.error('Failed to fetch responses');
        } finally {
            setLoading(false);
        }
    };

    const exportToCSV = () => {
        if (!responses.length || !form) return;

        const headers = ['Submitted At', ...form.fields.map((f: any) => f.label)];
        const rows = responses.map(r => {
            return [
                dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                ...form.fields.map((f: any) => r.data[f.label] || '')
            ];
        });

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `responses_${form.title}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const columns = [
        {
            title: 'Submitted At',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
            render: (date: string) => dayjs(date).format('MMM D, YYYY HH:mm'),
            sorter: (a: any, b: any) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
        },
        ...(form?.fields || []).map((f: any) => ({
            title: f.label,
            key: f.label,
            render: (_: any, record: any) => <Text style={{ color: '#fff' }}>{record.data[f.label] || '-'}</Text>
        }))
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <Space direction="vertical" size={0}>
                    <Button 
                        type="text" 
                        icon={<ArrowLeftOutlined />} 
                        onClick={() => navigate('/dashboard/forms')}
                        style={{ padding: 0, color: '#94a3b8', marginBottom: 8 }}
                    >
                        Back to Forms
                    </Button>
                    <Title level={4} style={{ margin: 0, fontWeight: 800 }}>{form?.title} — Responses</Title>
                </Space>
                <Button 
                    icon={<DownloadOutlined />} 
                    onClick={exportToCSV}
                    disabled={!responses.length}
                    className="premium-button"
                >
                    Export CSV
                </Button>
            </div>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card className="premium-card">
                        <Statistic title="Total Responses" value={responses.length} />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card className="premium-card">
                        <Statistic title="Responses Today" value={responses.filter(r => dayjs(r.createdAt).isSame(dayjs(), 'day')).length} />
                    </Card>
                </Col>
            </Row>

            <Card styles={{ body: { padding: 0 } }} className="premium-card">
                <Table 
                    className="premium-table"
                    columns={columns} 
                    dataSource={responses} 
                    rowKey="id" 
                    loading={loading}
                    pagination={{ pageSize: 20 }}
                    scroll={{ x: 'max-content' }}
                />
            </Card>
        </div>
    );
};

export default FormResponses;
