import { Card, Typography, Button, Row, Col, Tag, Switch, Space, Statistic, Empty, Modal, Table, message, Drawer, Spin } from 'antd';
import { 
    PlusOutlined, ThunderboltOutlined, WhatsAppOutlined, DeleteOutlined, 
    EditOutlined, FieldTimeOutlined, BranchesOutlined, EyeOutlined, PlayCircleOutlined,
    HistoryOutlined
} from '@ant-design/icons';
import { TRIGGER_META, ACTION_META, TriggerType, ActionType, FLOW_TEMPLATES } from '../../constants/automation';
import { AutomationRule } from '../../api/automation';
import { Module } from '../../enums';
import React from 'react';

const { Title, Text } = Typography;

interface AutomationListProps {
    rules: AutomationRule[];
    hasModule: (mod: Module) => boolean;
    setWaSettingsOpen: (open: boolean) => void;
    enterBuilder: (rule?: AutomationRule, template?: any) => void;
    toggleRule: (id: string) => void;
    handleDeleteRule: (id: string) => void;
    onRefresh: () => void;
}

const AutomationList: React.FC<AutomationListProps> = ({
    rules, hasModule, setWaSettingsOpen, enterBuilder, toggleRule, handleDeleteRule, onRefresh
}) => {
    const [showTemplates, setShowTemplates] = React.useState(false);
    const [viewingFlow, setViewingFlow] = React.useState<AutomationRule | null>(null);
    const [manualRunRule, setManualRunRule] = React.useState<AutomationRule | null>(null);
    const [viewingLogs, setViewingLogs] = React.useState<AutomationRule | null>(null);
    
    const stats = {
        total: rules.length,
        active: rules.filter(r => r.enabled).length,
        totalRuns: rules.reduce((a, r) => a + r.runs, 0),
    };

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <ThunderboltOutlined style={{ color: '#f59e0b', fontSize: 28 }} />
                        <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#fff' }}>Automation Engine</Title>
                    </div>
                    <Text type="secondary" style={{ fontSize: 14 }}>
                        Design intelligent flows to connect your channels and automate your business operations.
                    </Text>
                </div>
                <Space>
                    <Button 
                        icon={<BranchesOutlined />} 
                        onClick={() => setShowTemplates(!showTemplates)}
                        className={showTemplates ? "premium-button" : "premium-button-secondary"}
                    >
                        {showTemplates ? "Hide Templates" : "Explore Blueprints"}
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} className="premium-button" onClick={() => enterBuilder()}>
                        Create Flow
                    </Button>
                </Space>
            </div>

            {/* Industry Templates Section (Conditional) */}
            {showTemplates && (
                <div style={{ marginBottom: 48, padding: 24, background: 'rgba(59, 130, 246, 0.05)', borderRadius: 24, border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                        <BranchesOutlined style={{ color: '#3b82f6', fontSize: 18 }} />
                        <Title level={4} style={{ margin: 0, color: '#fff', fontSize: 16 }}>Ready-to-Use Industry Blueprints</Title>
                    </div>
                    <Row gutter={[16, 16]}>
                        {FLOW_TEMPLATES.map(t => (
                            <Col xs={24} sm={12} md={8} lg={4.8 as any} key={t.name}>
                                <Card 
                                    hoverable 
                                    className="premium-card" 
                                    style={{ height: '100%', border: '1px solid rgba(59, 130, 246, 0.1)', cursor: 'pointer' }}
                                    bodyStyle={{ padding: 16 }}
                                    onClick={() => enterBuilder(undefined, t)}
                                >
                                    <Tag color="blue" style={{ marginBottom: 12, fontSize: 10 }}>{t.industry}</Tag>
                                    <Title level={5} style={{ color: '#fff', fontSize: 13, margin: '0 0 8px 0', lineHeight: 1.4 }}>{t.name}</Title>
                                    <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {t.description}
                                    </Text>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </div>
            )}

            {/* Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                {[
                    { label: 'Total Rules', value: stats.total, color: '#a855f7' },
                    { label: 'Active Rules', value: stats.active, color: '#00df9a' },
                    { label: 'Total Runs', value: stats.totalRuns, color: '#3b82f6' },
                ].map((s, i) => (
                    <Col xs={24} sm={8} key={i}>
                        <Card className="premium-card">
                            <Statistic
                                title={<Text style={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, fontSize: 11, fontWeight: 700 }}>{s.label}</Text>}
                                value={s.value}
                                valueStyle={{ color: s.color, fontWeight: 800, fontSize: 32 }}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Rules List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {rules.length === 0 ? (
                    <Card className="premium-card" style={{ textAlign: 'center', padding: '60px 0' }}>
                        <Empty description={<Text type="secondary">No automation rules yet. Start by creating your first rule!</Text>} />
                    </Card>
                ) : (
                    rules.map(rule => {
                        const trig = TRIGGER_META[rule.trigger as TriggerType];
                        return (
                            <Card key={rule.id} className="premium-card" style={{ borderLeft: `4px solid ${rule.enabled ? trig?.color || '#3b82f6' : '#2d3748'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${trig?.color || '#3b82f6'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: trig?.color || '#3b82f6', fontSize: 20 }}>
                                                {trig?.icon}
                                            </div>
                                            <div>
                                                <Title level={5} style={{ margin: 0, color: '#fff' }}>{rule.name}</Title>
                                                <Text type="secondary" style={{ fontSize: 12 }}>{trig?.module} • {trig?.label}</Text>
                                            </div>
                                        </div>                                        {(rule.delay ?? 0) > 0 && (
                                            <div style={{ marginTop: 8 }}>
                                                <Tag icon={<FieldTimeOutlined />} color="warning" style={{ fontSize: 10 }}>
                                                    Delay: {
                                                        rule.delay! >= 1440 ? `${Math.round(rule.delay! / 1440)} Day(s)` :
                                                        rule.delay! >= 60 ? `${Math.round(rule.delay! / 60)} Hour(s)` :
                                                        `${rule.delay} mins`
                                                    }
                                                </Tag>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <Text strong style={{ display: 'block', color: '#fff' }}>{rule.runs} Runs</Text>
                                            <Text type="secondary" style={{ fontSize: 11 }}>Last: {rule.lastRunAt ? new Date(rule.lastRunAt).toLocaleString() : 'Never'}</Text>
                                        </div>
                                        <Switch
                                            checked={rule.enabled}
                                            onChange={() => toggleRule(rule.id)}
                                            style={{ background: rule.enabled ? '#00df9a' : undefined }}
                                        />
                                        <Button
                                            type="text"
                                            icon={<HistoryOutlined style={{ color: '#a855f7' }} />}
                                            onClick={() => setViewingLogs(rule)}
                                            title="View Execution History"
                                        />
                                        <Button
                                            type="text"
                                            icon={<PlayCircleOutlined style={{ color: '#00df9a' }} />}
                                            onClick={() => setManualRunRule(rule)}
                                            title="Run Flow Manually"
                                        />

                                        <Button
                                            type="text"
                                            icon={<EyeOutlined style={{ color: '#3b82f6' }} />}
                                            onClick={() => setViewingFlow(rule)}
                                        />
                                        <Button
                                            type="text"
                                            icon={<EditOutlined style={{ color: '#3b82f6' }} />}
                                            onClick={() => enterBuilder(rule)}
                                        />
                                        <Button
                                            danger
                                            type="text"
                                            icon={<DeleteOutlined />}
                                            onClick={() => handleDeleteRule(rule.id)}
                                        />
                                    </div>
                                </div>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* View Flow Modal */}
            <Modal
                title={<Title level={4} style={{ color: '#fff', margin: 0 }}>Automation Blueprint: {viewingFlow?.name}</Title>}
                open={!!viewingFlow}
                onCancel={() => setViewingFlow(null)}
                footer={null}
                className="premium-modal"
                width={600}
            >
                {viewingFlow && (
                    <div style={{ padding: '8px 0' }}>
                        <div style={{ marginBottom: 24 }}>
                            <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 12 }}>Trigger Event</Text>
                            <Card className="premium-card" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                <Space size="large">
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                                        {TRIGGER_META[viewingFlow.trigger as TriggerType]?.icon}
                                    </div>
                                    <div>
                                        <Text style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>{TRIGGER_META[viewingFlow.trigger as TriggerType]?.label}</Text>
                                        <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{TRIGGER_META[viewingFlow.trigger as TriggerType]?.module}</Text>
                                    </div>
                                </Space>
                            </Card>
                        </div>

                        <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 12 }}>Action Sequence</Text>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {viewingFlow.actions.map((action: string, idx: number) => {
                                const am = ACTION_META[action as ActionType];
                                return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                                                {idx + 1}
                                            </div>
                                            {idx < viewingFlow.actions.length - 1 && <div style={{ width: 2, height: 20, background: 'rgba(255,255,255,0.05)' }} />}
                                        </div>
                                        <Card className="premium-card" style={{ flex: 1, border: '1px solid rgba(255,255,255,0.05)' }} bodyStyle={{ padding: '12px 16px' }}>
                                            <Space>
                                                <span style={{ color: am?.color || '#fff', fontSize: 16 }}>{am?.icon}</span>
                                                <Text style={{ color: '#fff', fontWeight: 500 }}>{am?.label || action}</Text>
                                            </Space>
                                        </Card>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
                            <Button type="primary" className="premium-button" onClick={() => { enterBuilder(viewingFlow); setViewingFlow(null); }}>
                                Edit Flow Journey
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Manual Run Modal */}
            <ManualRunModal
                rule={manualRunRule}
                onClose={() => setManualRunRule(null)}
                onRefresh={onRefresh}
            />
            {/* Activity Log Drawer */}
            <ActivityLogDrawer
                rule={viewingLogs}
                onClose={() => setViewingLogs(null)}
            />
        </div>
    );
};

interface ActivityLogDrawerProps {
    rule: AutomationRule | null;
    onClose: () => void;
}

const ActivityLogDrawer: React.FC<ActivityLogDrawerProps> = ({ rule, onClose }) => {
    const [logs, setLogs] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [total, setTotal] = React.useState(0);
    const [hasMore, setHasMore] = React.useState(false);

    React.useEffect(() => {
        if (rule) {
            setLogs([]);
            setPage(1);
            fetchLogs(rule.id, 1, true);
        }
    }, [rule]);

    const fetchLogs = async (ruleId: string, pageNum: number, reset = false) => {
        setLoading(true);
        try {
            const { automationApi } = await import('../../api/automation');
            const data = await automationApi.getLogs(ruleId, pageNum, 10);
            
            if (reset) {
                setLogs(data.logs);
            } else {
                setLogs(prev => [...prev, ...data.logs]);
            }
            
            setTotal(data.total);
            setPage(data.page);
            setHasMore(data.page < data.totalPages);
        } catch (error) {
            console.error("Failed to fetch logs:", error);
            message.error("Failed to load activity logs.");
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = () => {
        if (rule && !loading) {
            fetchLogs(rule.id, page + 1);
        }
    };

    return (
        <Drawer
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <HistoryOutlined style={{ color: '#a855f7' }} />
                    <div>
                        <Title level={4} style={{ color: '#fff', margin: 0 }}>Activity History</Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>{rule?.name}</Text>
                    </div>
                </div>
            }
            placement="right"
            onClose={onClose}
            open={!!rule}
            width={500}
            className="premium-drawer"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {logs.length === 0 && !loading ? (
                    <Empty description={<Text type="secondary">No activity recorded for this rule yet.</Text>} />
                ) : (
                    <>
                        {logs.map((log: any) => {
                            const am = ACTION_META[log.action as ActionType];
                            const target = log.details?.name || log.details?.Name || log.details?.email || log.details?.Email || log.details?.phone || 'Unknown Lead';
                            return (
                                <div key={log.id} style={{ 
                                    padding: 16, 
                                    background: 'rgba(255,255,255,0.02)', 
                                    borderRadius: 16, 
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    transition: 'transform 0.2s ease'
                                }} className="hover-lift">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                        <Tag color={log.status === 'SUCCESS' ? 'success' : 'error'} style={{ margin: 0, borderRadius: 4, fontWeight: 700, fontSize: 10 }}>
                                            {log.status}
                                        </Tag>
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                            {new Date(log.executedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                        </Text>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 10, background: `${am?.color || '#3b82f6'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: am?.color || '#3b82f6' }}>
                                            {am?.icon || <ThunderboltOutlined />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <Text style={{ color: '#fff', fontWeight: 600, display: 'block' }}>{am?.label || log.action}</Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>to <span style={{ color: '#3b82f6' }}>{target}</span></Text>
                                        </div>
                                    </div>
                                    {log.message && (
                                        <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: 12, color: '#94a3b8', borderLeft: `2px solid ${log.status === 'SUCCESS' ? '#00df9a' : '#ef4444'}` }}>
                                            {log.message}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        
                        {hasMore && (
                            <Button 
                                onClick={handleLoadMore} 
                                loading={loading} 
                                block 
                                className="premium-button-secondary"
                                style={{ marginTop: 8 }}
                            >
                                Load Older Activity
                            </Button>
                        )}
                        
                        {loading && logs.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <Spin size="large" />
                            </div>
                        )}
                    </>
                )}
            </div>
        </Drawer>
    );
};

interface ManualRunModalProps {
    rule: AutomationRule | null;
    onClose: () => void;
    onRefresh: () => void;
}

const ManualRunModal: React.FC<ManualRunModalProps> = ({ rule, onClose, onRefresh }) => {
    const [loading, setLoading] = React.useState(false);
    const [dataItems, setDataItems] = React.useState<any[]>([]);
    const [selectedKeys, setSelectedKeys] = React.useState<React.Key[]>([]);
    const [executing, setExecuting] = React.useState(false);

    React.useEffect(() => {
        if (rule) {
            fetchData();
        } else {
            setDataItems([]);
            setSelectedKeys([]);
        }
    }, [rule]);

    const fetchData = async () => {
        if (!rule) return;
        setLoading(true);
        try {
            // If it's a form trigger, we fetch responses
            if (rule.trigger === 'form_submitted' || rule.trigger === 'form_abandoned') {
                const formId = (rule.config as any)?.formId;
                if (formId) {
                    const { formsApi } = await import('../../api/forms');
                    const response = await formsApi.getResponses(formId);
                    const responses = response.data || [];
                    // Map responses to flat objects
                    const items = responses.map((r: any) => ({
                        key: r.id,
                        ...r.data,
                        _submittedAt: r.submittedAt
                    }));
                    setDataItems(items);
                }
            } else {
                // For other triggers, maybe show a "Paste CSV" or similar?
                // For now, let's just support form-based manual runs
                message.info("Manual runs are currently optimized for Form-based triggers.");
            }
        } catch (error) {
            console.error("Failed to fetch data for manual run:", error);
            message.error("Failed to load available lead data.");
        } finally {
            setLoading(false);
        }
    };

    const handleRun = async () => {
        if (!rule || selectedKeys.length === 0) return;
        setExecuting(true);
        try {
            const selectedData = dataItems.filter(item => selectedKeys.includes(item.key));
            const { automationApi } = await import('../../api/automation');
            await automationApi.runRuleManually(rule.id, selectedData);
            message.success(`Successfully triggered flow for ${selectedData.length} leads.`);
            onRefresh();
            onClose();
        } catch (error) {
            console.error("Manual run failed:", error);
            message.error("Failed to execute manual run.");
        } finally {
            setExecuting(false);
        }
    };

    const columns = dataItems.length > 0 ? Object.keys(dataItems[0])
        .filter(k => !k.startsWith('_') && k !== 'key')
        .map(k => ({
            title: k.charAt(0).toUpperCase() + k.slice(1),
            dataIndex: k,
            key: k,
            ellipsis: true,
        })) : [];

    return (
        <Modal
            title={<Title level={4} style={{ color: '#fff', margin: 0 }}>Manual Run: {rule?.name}</Title>}
            open={!!rule}
            onCancel={onClose}
            width={800}
            className="premium-modal"
            footer={[
                <Button key="cancel" onClick={onClose} className="premium-button-secondary">Cancel</Button>,
                <Button 
                    key="run" 
                    type="primary" 
                    icon={<PlayCircleOutlined />} 
                    disabled={selectedKeys.length === 0} 
                    loading={executing}
                    onClick={handleRun}
                    className="premium-button"
                >
                    Run Flow for {selectedKeys.length} Selected
                </Button>
            ]}
        >
            <div style={{ marginBottom: 16 }}>
                <Text type="secondary">Select the lead data you want to push through this automation flow.</Text>
            </div>
            <Table
                size="small"
                loading={loading}
                dataSource={dataItems}
                columns={columns}
                rowSelection={{
                    selectedRowKeys: selectedKeys,
                    onChange: setSelectedKeys
                }}
                pagination={{ pageSize: 5 }}
                className="premium-table"
                scroll={{ x: 'max-content' }}
            />
        </Modal>
    );
};

export default AutomationList;
