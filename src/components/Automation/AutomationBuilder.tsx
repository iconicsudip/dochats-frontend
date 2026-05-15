import React from 'react';
import { Card, Typography, Button, Row, Col, Tag, Form, Input, Select, Space, Tooltip, Divider, message } from 'antd';
import { 
    ArrowRightOutlined, ThunderboltOutlined, FormOutlined, BranchesOutlined, PlusOutlined 
} from '@ant-design/icons';
import { TRIGGER_META, FLOW_TEMPLATES, TriggerType } from '../../constants/automation';
import AutomationNode from './AutomationNode';
import { automationApi } from '../../api/automation';

const { Title, Text } = Typography;

interface AutomationBuilderProps {
    editingRuleId: string | null;
    form: any;
    nodes: any[];
    forms: any[];
    waTemplates: any[];
    emailTemplates: any[];
    loadingWa: boolean;
    loadingEmail: boolean;
    hasWaConfig: boolean;
    exitBuilder: () => void;
    handleAdd: (vals: any) => void;
    setNodes: (nodes: any[]) => void;
    addNode: () => void;
    removeNode: (id: string) => void;
    updateNode: (id: string, updates: any) => void;
    applyTemplate: (template: any) => void;
}

const AutomationBuilder: React.FC<AutomationBuilderProps> = ({
    editingRuleId, form, nodes, forms, waTemplates, emailTemplates, loadingWa, loadingEmail,
    hasWaConfig, exitBuilder, handleAdd, setNodes, addNode, removeNode, updateNode, applyTemplate
}) => {
    const selectedTrigger = Form.useWatch('trigger', form);
    const selectedFormId = Form.useWatch(['config', 'formId'], form);

    const [triggerMetadata, setTriggerMetadata] = React.useState<Record<string, { variables: string[] }>>({});

    React.useEffect(() => {
        automationApi.getMetadata()
            .then(data => setTriggerMetadata(data))
            .catch(err => console.error('Failed to load trigger metadata', err));
    }, []);

    const toSnakeCase = (str: string) => str?.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^\w]/g, '') || '';

    const availableVariables = React.useMemo(() => {
        if (!selectedTrigger) return [];
        
        let vars: string[] = [];
        const standard = triggerMetadata[selectedTrigger as TriggerType]?.variables || [];

        if (selectedTrigger === TriggerType.FORM_SUBMITTED) {
            if (selectedFormId) {
                const selectedForm = forms.find(f => f.id === selectedFormId);
                if (selectedForm?.fields) {
                    const formVars = selectedForm.fields.map((f: any) => toSnakeCase(f.label));
                    vars = Array.from(new Set([...formVars, ...standard]));
                }
            }
        } else {
            vars = standard;
        }
        return vars;
    }, [selectedTrigger, selectedFormId, forms, triggerMetadata]);

    return (
        <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
                <Button 
                    icon={<ArrowRightOutlined style={{ transform: 'rotate(180deg)' }} />} 
                    onClick={exitBuilder} 
                    className="premium-button-secondary"
                />
                <div>
                    <Title level={3} style={{ margin: 0, color: '#fff' }}>
                        {editingRuleId ? 'Edit Neural Flow' : 'Create Neural Flow'}
                    </Title>
                    <Text type="secondary">Design an intelligent multi-path automation sequence.</Text>
                </div>
            </div>

            {!editingRuleId && nodes.length <= 1 && !form.getFieldValue('name') && (
                <div style={{ marginBottom: 40 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Or Start with an Industry Template</Text>
                    <Row gutter={[16, 16]}>
                        {FLOW_TEMPLATES.map(t => (
                            <Col xs={24} sm={8} key={t.name}>
                                <Card 
                                    hoverable 
                                    className="premium-card" 
                                    style={{ height: '100%', border: '1px solid rgba(59, 130, 246, 0.1)' }}
                                    onClick={() => applyTemplate(t)}
                                >
                                    <Tag color="blue" style={{ marginBottom: 12 }}>{t.industry}</Tag>
                                    <Title level={5} style={{ color: '#fff', fontSize: 14, margin: '0 0 8px 0' }}>{t.name}</Title>
                                    <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.4 }}>{t.description}</Text>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </div>
            )}

            <Form form={form} layout="vertical" onFinish={handleAdd}>
                <Card className="premium-card" style={{ marginBottom: 24 }}>
                    <Form.Item name="name" label="Rule Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. New Lead → Welcome Sequence" className="premium-input" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="trigger" label="When this happens..." rules={[{ required: true }]}>
                                <Select 
                                    placeholder="Select trigger" 
                                    className="premium-select"
                                    onChange={(val) => {
                                        // Clear all variable mappings when trigger changes
                                        const updatedNodes = nodes.map((n: any) => ({
                                            ...n,
                                            config: {
                                                ...n.config,
                                                variableMapping: {}
                                            }
                                        }));
                                        setNodes(updatedNodes);
                                        
                                        // Clear form selection if not form_submitted
                                        if (val !== TriggerType.FORM_SUBMITTED) {
                                            form.setFieldValue(['config', 'formId'], undefined);
                                        }
                                    }}
                                >

                                    {Array.from(new Set(Object.values(TRIGGER_META).map(m => m.module))).map(module => (
                                        <Select.OptGroup key={module} label={module.toUpperCase()}>
                                            {Object.entries(TRIGGER_META)
                                                .filter(([_, meta]) => meta.module === module)
                                                .map(([key, meta]) => (
                                                    <Select.Option key={key} value={key}>
                                                        <Space>
                                                            <span style={{ color: meta.color }}>{meta.icon}</span>
                                                            {meta.label}
                                                        </Space>
                                                    </Select.Option>
                                                ))
                                            }
                                        </Select.OptGroup>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="delay" label="Initial Delay (minutes)" initialValue={0}>
                                <Select className="premium-select">
                                    <Select.Option value={0}>Immediate</Select.Option>
                                    <Select.Option value={5}>5 Minutes</Select.Option>
                                    <Select.Option value={30}>30 Minutes</Select.Option>
                                    <Select.Option value={60}>1 Hour</Select.Option>
                                    <Select.Option value={1440}>24 Hours</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>                    
                    
                    <Form.Item noStyle>
                        {() => {
                            if (availableVariables.length === 0) return null;
                            if (selectedTrigger === TriggerType.FORM_SUBMITTED && !selectedFormId) return null;
                            
                            return (
                                <div style={{ padding: '12px 16px', background: 'rgba(59, 130, 246, 0.04)', borderRadius: 12, border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                        <ThunderboltOutlined style={{ color: '#3b82f6', fontSize: 12 }} />
                                        <Text style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>Available Variables</Text>
                                    </div>
                                    <Space wrap size={[6, 6]}>
                                        {availableVariables.map(v => (
                                            <Tooltip title="Click to copy" key={v}>
                                                <Tag 
                                                    color="blue" 
                                                    style={{ cursor: 'pointer', fontSize: 11, borderRadius: 6, border: '1px solid rgba(59, 130, 246, 0.2)', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`{{${v}}}`);
                                                        message.success(`Copied {{${v}}}`);
                                                    }}
                                                >
                                                    {`{{${v}}}`}
                                                </Tag>
                                            </Tooltip>
                                        ))}
                                    </Space>
                                </div>
                            );
                        }}
                    </Form.Item>
                </Card>

                {/* Trigger Context: Form Mapping */}
                {selectedTrigger === TriggerType.FORM_SUBMITTED && (
                    <div style={{ padding: '24px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: 20, border: '1px solid rgba(59, 130, 246, 0.1)', marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FormOutlined style={{ color: '#3b82f6', fontSize: 20 }} />
                            </div>
                            <div>
                                <Title level={5} style={{ margin: 0, color: '#fff' }}>Form Integration Context</Title>
                                <Text type="secondary" style={{ fontSize: 12 }}>Map form fields to communication channels.</Text>
                            </div>
                        </div>
                        
                        <Form.Item name={['config', 'formId']} label="Source Form" rules={[{ required: true }]}>
                            <Select 
                                placeholder="Select the form that triggers this" 
                                className="premium-select"
                            >
                                {forms.map(f => (
                                    <Select.Option key={f.id} value={f.id}>{f.title}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </div>
                )}

                <Divider dashed orientation={"left" as any} style={{ borderColor: 'rgba(255,255,255,0.05)', marginBottom: 32 }}>
                    <Space style={{ color: '#00df9a', fontWeight: 800, letterSpacing: 1 }}><BranchesOutlined /> NEURAL FLOW CANVAS</Space>
                </Divider>

                {/* Flow Nodes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 32, marginBottom: 40, position: 'relative' }}>
                    {nodes.map((node, i) => {
                        return (
                            <AutomationNode 
                                key={node.id}
                                node={node}
                                index={i}
                                isLast={i === nodes.length - 1}
                                waTemplates={waTemplates}
                                emailTemplates={emailTemplates}
                                loadingWa={loadingWa}
                                loadingEmail={loadingEmail}
                                hasWaConfig={hasWaConfig}
                                availableVariables={availableVariables}
                                updateNode={updateNode}
                                removeNode={removeNode}
                            />
                        );
                    })}
                    <Button 
                        block 
                        type="dashed" 
                        icon={<PlusOutlined />} 
                        onClick={addNode} 
                        style={{ height: 60, border: '2px dashed rgba(59, 130, 246, 0.3)', background: 'rgba(59, 130, 246, 0.02)', borderRadius: 16, fontSize: 16, fontWeight: 600, color: '#3b82f6' }}
                    >
                        Append Next Step
                    </Button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, padding: '32px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <Button size="large" onClick={exitBuilder} style={{ minWidth: 120 }}>Cancel</Button>
                    <Button 
                        size="large" 
                        type="primary" 
                        htmlType="submit" 
                        className="premium-button" 
                        disabled={nodes.length === 0}
                        style={{ minWidth: 200 }}
                    >
                        {editingRuleId ? 'Update Neural Flow' : 'Activate Neural Flow'}
                    </Button>
                </div>
            </Form>
        </div>
    );
};

export default AutomationBuilder;