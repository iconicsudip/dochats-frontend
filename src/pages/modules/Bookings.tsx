import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { bookingsApi, Booking } from '../../api/bookings';
import { Card, Typography, Button, Row, Col, Tag, Badge, Calendar, Space, Modal, Form, Input, Select, TimePicker, Switch, Avatar, Tooltip, Statistic } from 'antd';
import {
    CalendarOutlined, PlusOutlined, ClockCircleOutlined, UserOutlined,
    CheckCircleOutlined, CloseCircleOutlined, PhoneOutlined, WhatsAppOutlined,
    PlayCircleOutlined, EnvironmentOutlined, TeamOutlined, LinkOutlined
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

const STATUS_CONFIG: Record<BookingStatus, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
    pending: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Pending', icon: <ClockCircleOutlined /> },
    confirmed: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', label: 'Confirmed', icon: <CheckCircleOutlined /> },
    completed: { color: '#00df9a', bg: 'rgba(0, 223, 154, 0.1)', label: 'Completed', icon: <CheckCircleOutlined /> },
    cancelled: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Cancelled', icon: <CloseCircleOutlined /> },
};

const SOURCE_CONFIG: Record<string, { color: string; bg: string }> = {
    'AI Chat': { color: '#00df9a', bg: 'rgba(0, 223, 154, 0.1)' },
    'Smart Link': { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    'Dynamic Form': { color: '#00df9a', bg: 'rgba(0, 223, 154, 0.1)' },
    'Manual': { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' },
};

const Bookings: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [view, setView] = useState<'list' | 'calendar'>('list');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterDate, setFilterDate] = useState<string>('all');
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [form] = Form.useForm();
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('tab') === 'settings') {
            setView('calendar'); // For now, since there's no explicit settings tab, I'll switch to calendar or just handle it
        }
    }, [location.search]);

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const data = await bookingsApi.getBookings();
            setBookings(data.map((b: any) => ({
                ...b,
                date: dayjs(b.date).format('YYYY-MM-DD'),
                time: dayjs(b.date).format('HH:mm')
            })));
        } catch (error) {
            console.error(error);
        }
    };

    const filtered = bookings.filter(b => {
        const matchStatus = filterStatus === 'all' || b.status === filterStatus;
        const today = dayjs().format('YYYY-MM-DD');
        const matchDate =
            filterDate === 'all' ||
            (filterDate === 'today' && b.date === today) ||
            (filterDate === 'upcoming' && b.date >= today);
        return matchStatus && matchDate;
    });

    const stats = {
        total: bookings.length,
        today: bookings.filter(b => b.date === dayjs().format('YYYY-MM-DD')).length,
        pending: bookings.filter(b => b.status === 'PENDING').length,
        fromAI: bookings.filter(b => b.source === 'AI Chat').length,
    };

    const handleAddBooking = async (values: any) => {
        try {
            const data = {
                ...values,
                date: values.date || dayjs().format('YYYY-MM-DD'),
                time: values.time || '10:00',
                source: 'Manual',
            };
            await bookingsApi.createBooking(data);
            setAddModalOpen(false);
            form.resetFields();
            fetchBookings();
        } catch (error) {
            console.error(error);
        }
    };

    const updateStatus = async (id: string, status: BookingStatus) => {
        // Optimistic update
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status: status.toUpperCase() as any } : b));
        if (selectedBooking?.id === id) setSelectedBooking(prev => prev ? { ...prev, status: status.toUpperCase() as any } : null);
        
        try {
            await bookingsApi.updateStatus(id, status.toUpperCase());
        } catch (error) {
            console.error(error);
            fetchBookings();
        }
    };

    const getCellData = (date: Dayjs) => {
        const ds = date.format('YYYY-MM-DD');
        return bookings.filter(b => b.date === ds);
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <CalendarOutlined style={{ color: '#3b82f6', fontSize: 20 }} />
                        <Title level={3} style={{ margin: 0, fontWeight: 800, color: '#fff' }}>Bookings</Title>
                    </div>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        All bookings captured via AI Chat, Smart Links, or manually — auto-reminders fire on confirm.
                    </Text>
                </div>
                <Space>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {(['list', 'calendar'] as const).map(v => (
                            <Button
                                key={v}
                                size="small"
                                onClick={() => setView(v)}
                                style={{
                                    background: view === v ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
                                    borderColor: view === v ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)',
                                    color: view === v ? '#3b82f6' : '#94a3b8',
                                    borderRadius: 8, fontWeight: 600
                                }}
                            >
                                {v === 'list' ? '☰ List' : '📅 Calendar'}
                            </Button>
                        ))}
                    </div>
                    <Button type="primary" icon={<PlusOutlined />} className="premium-button" onClick={() => setAddModalOpen(true)}>
                        New Booking
                    </Button>
                </Space>
            </div>

            {/* Automation notice */}
            <div style={{
                background: 'rgba(0, 223, 154, 0.04)',
                border: '1px solid rgba(0, 223, 154, 0.15)',
                borderRadius: 12,
                padding: '12px 18px',
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                gap: 10
            }}>
                <PlayCircleOutlined style={{ color: '#00df9a', fontSize: 16 }} />
                <Text style={{ color: '#64748b', fontSize: 13 }}>
                    <strong style={{ color: '#00df9a' }}>Automation connected:</strong> New bookings auto-trigger confirmation messages, 24h reminders, and CRM lead sync.
                </Text>
            </div>

            {/* Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {[
                    { label: 'Total Bookings', value: stats.total, color: '#3b82f6' },
                    { label: "Today's Slots", value: stats.today, color: '#f59e0b' },
                    { label: 'Pending Confirm', value: stats.pending, color: '#a855f7' },
                    { label: 'From AI Chat', value: stats.fromAI, color: '#00df9a' },
                ].map((s, i) => (
                    <Col xs={12} sm={6} key={i}>
                        <Card className="premium-card" style={{ borderColor: `${s.color}20` }}>
                            <Statistic
                                title={<Text style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>{s.label}</Text>}
                                value={s.value}
                                valueStyle={{ color: s.color, fontWeight: 800, fontSize: 28 }}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <Select
                    value={filterStatus}
                    onChange={setFilterStatus}
                    style={{ width: 160 }}
                    options={[
                        { value: 'all', label: 'All Status' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'confirmed', label: 'Confirmed' },
                        { value: 'completed', label: 'Completed' },
                        { value: 'cancelled', label: 'Cancelled' },
                    ]}
                />
                <Select
                    value={filterDate}
                    onChange={setFilterDate}
                    style={{ width: 160 }}
                    options={[
                        { value: 'all', label: 'All Dates' },
                        { value: 'today', label: 'Today' },
                        { value: 'upcoming', label: 'Upcoming' },
                    ]}
                />
            </div>

            {view === 'list' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filtered.map(booking => {
                        const sc = STATUS_CONFIG[booking.status.toLowerCase() as BookingStatus];
                        const src = SOURCE_CONFIG[booking.source || 'Manual'] || SOURCE_CONFIG['Manual'];
                        return (
                            <Card
                                key={booking.id}
                                className="premium-card"
                                style={{ border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer' }}
                                onClick={() => { setSelectedBooking(booking); setDetailOpen(true); }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        {/* Time block */}
                                        <div style={{
                                            textAlign: 'center',
                                            minWidth: 56,
                                            padding: '8px 10px',
                                            background: 'rgba(255,255,255,0.03)',
                                            borderRadius: 10,
                                            border: '1px solid rgba(255,255,255,0.06)'
                                        }}>
                                            <Text style={{ fontSize: 16, fontWeight: 800, color: '#fff', display: 'block' }}>{booking.time}</Text>
                                            <Text style={{ fontSize: 10, color: '#475569' }}>{booking.duration}m</Text>
                                        </div>
                                        {/* Client info */}
                                        <div>
                                            <Text strong style={{ fontSize: 14, color: '#fff', display: 'block' }}>{booking.clientName}</Text>
                                            <Text style={{ fontSize: 12, color: '#475569' }}>{booking.service}</Text>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                        {/* Date */}
                                        <Text style={{ fontSize: 12, color: '#475569', minWidth: 80 }}>
                                            📅 {dayjs(booking.date).format('DD MMM')}
                                        </Text>
                                        {/* Source badge */}
                                        <Tag style={{ background: src.bg, color: src.color, border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                            {booking.source === 'AI Chat' ? '🤖 ' : booking.source === 'Smart Link' ? '🔗 ' : '✍️ '}{booking.source}
                                        </Tag>
                                        {/* Automation badge */}
                                        {booking.automationTriggered && (
                                            <Tooltip title={`Automation: ${booking.automationTriggered}`}>
                                                <Tag style={{ background: 'rgba(0,223,154,0.08)', color: '#00df9a', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'help' }}>
                                                    ⚡ Auto
                                                </Tag>
                                            </Tooltip>
                                        )}
                                        {/* Status */}
                                        <Tag style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}25`, borderRadius: 6, fontWeight: 600 }}>
                                            {sc.label}
                                        </Tag>
                                        {/* Actions */}
                                        <Space size={4} onClick={e => e.stopPropagation()}>
                                            {booking.status === 'PENDING' && (
                                                <Button size="small" type="primary"
                                                    style={{ borderRadius: 6, background: '#3b82f6', border: 'none', fontSize: 11 }}
                                                    onClick={() => updateStatus(booking.id, 'confirmed')}>
                                                    Confirm
                                                </Button>
                                            )}
                                            {(booking.status === 'CONFIRMED') && (
                                                <Button size="small"
                                                    style={{ borderRadius: 6, background: 'rgba(0,223,154,0.1)', border: 'none', color: '#00df9a', fontSize: 11 }}
                                                    onClick={() => updateStatus(booking.id, 'completed')}>
                                                    Complete
                                                </Button>
                                            )}
                                            <Tooltip title="WhatsApp">
                                                <Button size="small" type="text" icon={<WhatsAppOutlined style={{ color: '#25d366' }} />}
                                                    style={{ background: 'rgba(37,211,102,0.06)', borderRadius: 6, border: 'none' }} />
                                            </Tooltip>
                                        </Space>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                // Calendar View
                <Card className="premium-card" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Calendar
                        cellRender={(date) => {
                            const items = getCellData(date);
                            return items.length > 0 ? (
                                <div style={{ fontSize: 11 }}>
                                    {items.slice(0, 2).map(b => {
                                        const sc = STATUS_CONFIG[b.status.toLowerCase() as BookingStatus];
                                        return (
                                            <div key={b.id} style={{
                                                background: sc.bg,
                                                color: sc.color,
                                                borderRadius: 4,
                                                padding: '1px 4px',
                                                marginBottom: 2,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                cursor: 'pointer',
                                            }}
                                                onClick={() => { setSelectedBooking(b); setDetailOpen(true); }}
                                            >
                                                {b.time} {b.clientName}
                                            </div>
                                        );
                                    })}
                                    {items.length > 2 && <Text style={{ fontSize: 10, color: '#475569' }}>+{items.length - 2} more</Text>}
                                </div>
                            ) : null;
                        }}
                    />
                </Card>
            )}

            {/* Add Booking Modal */}
            <Modal
                title={<Text style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>New Booking</Text>}
                open={addModalOpen}
                onCancel={() => { setAddModalOpen(false); form.resetFields(); }}
                footer={null}
                width={480}
            >
                <Form form={form} layout="vertical" onFinish={handleAddBooking} style={{ marginTop: 16 }}>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="clientName" label="Client Name" rules={[{ required: true }]}>
                                <Input placeholder="Rahul Sharma" className="premium-input" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
                                <Input placeholder="+91 98765 43210" className="premium-input" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="email" label="Email (Optional)">
                                <Input placeholder="rahul@example.com" className="premium-input" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="service" label="Service / Meeting Type" rules={[{ required: true }]}>
                        <Select placeholder="Select service type" options={[
                            'Property Consultation', 'Health Checkup', 'Product Demo', 'Strategy Call',
                            'Salon Appointment', 'Hotel Reservation', 'Legal Consultation', 'Custom'
                        ].map(s => ({ value: s, label: s }))} />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                                <input type="date" style={{
                                    width: '100%', background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                                    color: '#fff', padding: '10px 14px', fontSize: 14
                                }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="time" label="Time" rules={[{ required: true }]}>
                                <input type="time" style={{
                                    width: '100%', background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                                    color: '#fff', padding: '10px 14px', fontSize: 14
                                }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="duration" label="Duration (minutes)">
                        <Select placeholder="Select duration" options={[15, 30, 45, 60, 90, 120].map(d => ({ value: d, label: `${d} minutes` }))} />
                    </Form.Item>
                    <Form.Item name="notes" label="Notes">
                        <Input.TextArea placeholder="Additional notes..." rows={2} className="premium-input" />
                    </Form.Item>
                    <div style={{ padding: '10px 12px', background: 'rgba(0,223,154,0.05)', borderRadius: 10, border: '1px solid rgba(0,223,154,0.15)', marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, color: '#64748b' }}>
                            ⚡ <strong style={{ color: '#00df9a' }}>Auto-triggered:</strong> Booking confirmation WhatsApp + 24h reminder will fire automatically.
                        </Text>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <Button onClick={() => { setAddModalOpen(false); form.resetFields(); }}>Cancel</Button>
                        <Button type="primary" htmlType="submit" className="premium-button">Create Booking</Button>
                    </div>
                </Form>
            </Modal>

            {/* Detail Modal */}
            <Modal
                title={null}
                open={detailOpen}
                onCancel={() => setDetailOpen(false)}
                footer={null}
                width={480}
            >
                {selectedBooking && (() => {
                    const sc = STATUS_CONFIG[selectedBooking.status.toLowerCase() as BookingStatus];
                    return (
                        <div style={{ paddingTop: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                <div>
                                    <Title level={4} style={{ margin: '0 0 4px', color: '#fff' }}>{selectedBooking.clientName}</Title>
                                    <Text style={{ color: '#475569', fontSize: 13 }}>{selectedBooking.service}</Text>
                                </div>
                                <Tag style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}30`, borderRadius: 8, fontSize: 12, fontWeight: 700, padding: '4px 10px' }}>
                                    {sc.label}
                                </Tag>
                            </div>
                            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                                {[
                                    { label: 'Date', value: dayjs(selectedBooking.date).format('DD MMM YYYY'), icon: '📅' },
                                    { label: 'Time', value: `${selectedBooking.time} (${selectedBooking.duration}m)`, icon: '🕐' },
                                    { label: 'Phone', value: selectedBooking.phone, icon: '📞' },
                                    { label: 'Email', value: selectedBooking.email || 'Not provided', icon: '📧' },
                                    { label: 'Assigned To', value: selectedBooking.assignedTo, icon: '👤' },
                                    { label: 'Source', value: selectedBooking.source, icon: '📥' },
                                    { label: 'Automation', value: selectedBooking.automationTriggered || 'None', icon: '⚡' },
                                ].map((item, i) => (
                                    <Col span={12} key={i}>
                                        <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Text style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{item.label}</Text>
                                            <Text style={{ color: '#fff', fontSize: 13, display: 'block', marginTop: 4 }}>{item.icon} {item.value}</Text>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                            {selectedBooking.notes && (
                                <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', marginBottom: 16 }}>
                                    <Text style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Notes</Text>
                                    <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginTop: 4 }}>{selectedBooking.notes}</Text>
                                </div>
                            )}

                            {selectedBooking.formData && (() => {
                                let dataObj = selectedBooking.formData;
                                try {
                                    if (typeof dataObj === 'string') dataObj = JSON.parse(dataObj);
                                } catch (e) {
                                    console.error('Failed to parse formData', e);
                                }

                                if (!dataObj || typeof dataObj !== 'object' || Object.keys(dataObj).length === 0) return null;

                                return (
                                    <div style={{ padding: 12, background: 'rgba(0, 223, 154, 0.05)', borderRadius: 10, border: '1px solid rgba(0, 223, 154, 0.2)', marginBottom: 16 }}>
                                        <Text style={{ fontSize: 10, color: '#00df9a', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, display: 'block', marginBottom: 10 }}>
                                            📋 Form Responses
                                        </Text>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {Object.entries(dataObj).map(([key, value]) => (
                                                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6 }}>
                                                    <Text style={{ color: '#94a3b8', fontSize: 12, flex: 1, paddingRight: 8 }}>{key}</Text>
                                                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 600, flex: 2, textAlign: 'right' }}>
                                                        {typeof value === 'object' ? JSON.stringify(value) : value?.toString() || '-'}
                                                    </Text>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                {selectedBooking.status === 'PENDING' && (
                                    <Button type="primary" style={{ flex: 1, borderRadius: 10, background: '#3b82f6', border: 'none' }}
                                        onClick={() => updateStatus(selectedBooking.id, 'confirmed')}>
                                        ✓ Confirm Booking
                                    </Button>
                                )}
                                {selectedBooking.status === 'CONFIRMED' && (
                                    <Button style={{ flex: 1, borderRadius: 10, background: 'rgba(0,223,154,0.1)', border: 'none', color: '#00df9a' }}
                                        onClick={() => updateStatus(selectedBooking.id, 'completed')}>
                                        ✓ Mark Complete
                                    </Button>
                                )}
                                <Button
                                    icon={<WhatsAppOutlined />}
                                    style={{ flex: 1, borderRadius: 10, borderColor: 'rgba(37,211,102,0.2)', color: '#25d366', background: 'rgba(37,211,102,0.06)' }}
                                >
                                    WhatsApp
                                </Button>
                            </div>
                            {selectedBooking.status !== 'CANCELLED' && (
                                <Button
                                    block
                                    danger
                                    style={{ borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444' }}
                                    onClick={() => { updateStatus(selectedBooking.id, 'cancelled'); setDetailOpen(false); }}
                                >
                                    Cancel Booking
                                </Button>
                            )}
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
};

export default Bookings;
