import React from 'react';
import { Card, Select, Button, Space, Typography } from 'antd';
import { DeleteOutlined, WhatsAppOutlined, MailOutlined, CloseCircleOutlined, ArrowRightOutlined, CalendarOutlined } from '@ant-design/icons';
import { ACTION_META, ActionType } from '../../constants/automation';
import { useModules } from '../../contexts/ModuleContext';
import { Module } from '../../enums';

const { Text } = Typography;

interface AutomationNodeProps {
    node: any;
    index: number;
    isLast: boolean;
    waTemplates: any[];
    emailTemplates: any[];
    loadingWa: boolean;
    loadingEmail: boolean;
    hasWaConfig: boolean;
    availableVariables: string[]; // From the trigger
    updateNode: (id: string, updates: any) => void;
    removeNode: (id: string) => void;
}

const AutomationNode: React.FC<AutomationNodeProps> = ({
    node, index, isLast, waTemplates, emailTemplates, loadingWa, loadingEmail, hasWaConfig, availableVariables, updateNode, removeNode
}) => {
    const { hasModule } = useModules();

    return (
        <div style={{ position: 'relative' }}>
            <Card 
                size="small" 
                className="premium-card" 
                style={{ border: '1px solid rgba(59, 130, 246, 0.2)', transition: 'all 0.3s ease' }}
                bodyStyle={{ padding: 24 }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
                        {index + 1}
                    </div>
                    <Select 
                        style={{ width: 220 }} 
                        className="premium-select"
                        value={node.action}
                        onChange={(val) => updateNode(node.id, { action: val })}
                        placeholder="Select Action"
                    >
                        {Array.from(new Set(Object.values(ACTION_META).map(m => m.category))).map(category => (
                            <Select.OptGroup key={category} label={category.toUpperCase()}>
                                {Object.entries(ACTION_META)
                                    .filter(([key, meta]) => {
                                        if (meta.category !== category) return false;
                                        if (key === ActionType.SEND_WHATSAPP) return hasModule(Module.WHATSAPP);
                                        if (key === ActionType.SEND_EMAIL) return hasModule(Module.EMAIL);
                                        return true;
                                    })
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
                    <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={() => removeNode(node.id)}
                        style={{ marginLeft: 'auto' }}
                    />
                </div>

                {/* Node Level Delay */}
                <div style={{ marginBottom: 20 }}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Delay After Previous Step</Text>
                    <Select 
                        className="premium-select" 
                        style={{ width: '100%' }}
                        value={node.config?.delayMinutes || 0}
                        onChange={(val) => updateNode(node.id, { config: { ...node.config, delayMinutes: val } })}
                    >
                        <Select.Option value={0}>Immediate</Select.Option>
                        <Select.Option value={5}>5 Minutes</Select.Option>
                        <Select.Option value={60}>1 Hour</Select.Option>
                        <Select.Option value={1440}>1 Day</Select.Option>
                        <Select.Option value={2880}>2 Days</Select.Option>
                        <Select.Option value={4320}>3 Days</Select.Option>
                        <Select.Option value={10080}>1 Week</Select.Option>
                    </Select>
                </div>

                {node.action === ActionType.SEND_WHATSAPP && !hasWaConfig && (
                    <div style={{ marginBottom: 20, padding: 16, background: 'rgba(245, 158, 11, 0.1)', borderRadius: 12, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        <Space direction="vertical" size={4}>
                            <Text style={{ color: '#f59e0b', fontWeight: 700, fontSize: 13 }}>WhatsApp Not Connected</Text>
                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>You need to configure your Meta API credentials before you can send automated WhatsApp messages.</Text>
                            <Button 
                                type="primary" 
                                size="small" 
                                icon={<WhatsAppOutlined />}
                                onClick={() => (window as any).showWaSettings && (window as any).showWaSettings()}
                                style={{ background: '#25d366', borderColor: '#25d366' }}
                            >
                                Connect WhatsApp API
                            </Button>
                        </Space>
                    </div>
                )}

                {node.action === ActionType.SEND_WHATSAPP && hasWaConfig && (
                    <div style={{ marginBottom: 20 }}>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>WhatsApp Template</Text>
                        <Select 
                            placeholder="Select verified template" 
                            className="premium-select" 
                            style={{ width: '100%' }}
                            loading={loadingWa}
                            value={node.config?.whatsappTemplate}
                            onChange={(val) => {
                                // Reset mapping when template changes
                                updateNode(node.id, { config: { ...node.config, whatsappTemplate: val, variableMapping: {} } });
                            }}
                        >
                            {waTemplates.map(t => (
                                <Select.Option key={t.name} value={t.name}>{t.name}</Select.Option>
                            ))}
                        </Select>

                        {/* WhatsApp Variable Mapping UI */}
                        {node.config?.whatsappTemplate && (() => {
                            const template = waTemplates.find(t => t.name === node.config.whatsappTemplate);
                            if (!template) return null;
                            
                            // Find all {{n}} in all components
                            const vars: string[] = [];
                            template.components?.forEach((comp: any) => {
                                if (comp.text) {
                                    const matches = Array.from(comp.text.matchAll(/{{\s*(.*?)\s*}}/g)).map((m: any) => m[1].trim());
                                    vars.push(...matches);
                                }
                            });
                            const uniqueVars = Array.from(new Set(vars)).sort((a, b) => Number(a) - Number(b));

                            if (uniqueVars.length === 0) return null;

                            return (
                                <div style={{ marginTop: 16, padding: 16, background: 'rgba(37, 211, 102, 0.04)', borderRadius: 12, border: '1px solid rgba(37, 211, 102, 0.1)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                        <WhatsAppOutlined style={{ color: '#25d366', fontSize: 12 }} />
                                        <Text style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>Template Variables</Text>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {uniqueVars.map(v => (
                                            <div key={v} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                                <Text style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>Variable &#123;&#123;{v}&#125;&#125;</Text>
                                                <Select 
                                                    size="small"
                                                    placeholder="Map to field..."
                                                    className="premium-select"
                                                    style={{ flex: 1 }}
                                                    value={node.config.variableMapping?.[v]}
                                                    onChange={(val) => {
                                                        const newMapping = { ...(node.config.variableMapping || {}), [v]: val };
                                                        updateNode(node.id, { config: { ...node.config, variableMapping: newMapping } });
                                                    }}
                                                >
                                                    {availableVariables.map(av => (
                                                        <Select.Option key={av} value={av}>{av}</Select.Option>
                                                    ))}
                                                </Select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {node.action === ActionType.SEND_EMAIL && (
                    <div style={{ marginBottom: 20 }}>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase' }}>Email Template</Text>
                        <Select 
                            placeholder="Select from synced templates" 
                            className="premium-select" 
                            style={{ width: '100%' }}
                            loading={loadingEmail}
                            value={node.config?.emailTemplateId}
                            onChange={(val) => {
                                // Reset mapping when template changes
                                updateNode(node.id, { config: { ...node.config, emailTemplateId: val, variableMapping: {} } });
                            }}
                        >
                            {emailTemplates.map(t => (
                                <Select.Option key={t.id} value={t.id}>
                                    <Space>
                                        {t.name}
                                        <Text type="secondary" style={{ fontSize: 11 }}>— {t.subject}</Text>
                                    </Space>
                                </Select.Option>
                            ))}
                        </Select>

                        {/* Variable Mapping UI */}
                        {node.config?.emailTemplateId && (() => {
                            const template = emailTemplates.find(t => t.id === node.config.emailTemplateId);
                            if (!template) return null;
                            
                            // Extract variables from content
                            const content = template.content || '';
                            const vars = Array.from(content.matchAll(/{{\s*(.*?)\s*}}/g)).map((m:any) => m[1].trim());
                            const uniqueVars = Array.from(new Set(vars));

                            if (uniqueVars.length === 0) return null;

                            return (
                                <div style={{ marginTop: 16, padding: 16, background: 'rgba(59, 130, 246, 0.04)', borderRadius: 12, border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                        <MailOutlined style={{ color: '#3b82f6', fontSize: 12 }} />
                                        <Text style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>Template Personalization</Text>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {uniqueVars.map(v => (
                                            <div key={v} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                                <Text style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>{v}</Text>
                                                <Select 
                                                    size="small"
                                                    placeholder="Map to field..."
                                                    className="premium-select"
                                                    style={{ flex: 1 }}
                                                    value={node.config.variableMapping?.[v]}
                                                    onChange={(val) => {
                                                        const newMapping = { ...(node.config.variableMapping || {}), [v]: val };
                                                        updateNode(node.id, { config: { ...node.config, variableMapping: newMapping } });
                                                    }}
                                                >
                                                    {availableVariables.map(av => (
                                                        <Select.Option key={av} value={av}>{av}</Select.Option>
                                                    ))}
                                                </Select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {node.action === ActionType.CREATE_BOOKING && (
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ padding: 16, background: 'rgba(59, 130, 246, 0.04)', borderRadius: 12, border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                <CalendarOutlined style={{ color: '#3b82f6', fontSize: 12 }} />
                                <Text style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5 }}>Booking Details Mapping</Text>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {['guest_name', 'phone', 'booking_date'].map(field => (
                                    <div key={field} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                        <Text style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0, textTransform: 'capitalize' }}>{field.replace('_', ' ')}</Text>
                                        <Select 
                                            size="small"
                                            placeholder="Map to variable..."
                                            className="premium-select"
                                            style={{ flex: 1 }}
                                            value={node.config?.variableMapping?.[field]}
                                            onChange={(val) => {
                                                const newMapping = { ...(node.config?.variableMapping || {}), [field]: val };
                                                updateNode(node.id, { config: { ...node.config, variableMapping: newMapping } });
                                            }}
                                        >
                                            {availableVariables.map(av => (
                                                <Select.Option key={av} value={av}>{av}</Select.Option>
                                            ))}
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Failover Logic */}
                <div style={{ marginTop: 12, padding: '16px', background: 'rgba(239, 68, 68, 0.04)', borderRadius: 12, border: '1px dashed rgba(239, 68, 68, 0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <CloseCircleOutlined style={{ color: '#ef4444', fontSize: 14 }} />
                        <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase' }}>Failover Protection</Text>
                    </div>
                    <Select 
                        placeholder="If this step fails, execute..." 
                        className="premium-select" 
                        style={{ width: '100%' }}
                        value={node.failover}
                        onChange={(val) => updateNode(node.id, { failover: val })}
                    >
                        <Select.Option value={null}>Stop Workflow (Default)</Select.Option>
                        {Array.from(new Set(Object.values(ACTION_META).map(m => m.category))).map(category => (
                            <Select.OptGroup key={category} label={category.toUpperCase()}>
                                {Object.entries(ACTION_META)
                                    .filter(([key, meta]) => {
                                        if (meta.category !== category) return false;
                                        if (key === node.action) return false;
                                        if (key === 'send_whatsapp') return hasModule(Module.WHATSAPP);
                                        if (key === 'send_email') return hasModule(Module.EMAIL);
                                        return true;
                                    })
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
                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8 }}>
                        Choose an alternative action if the primary delivery channel fails or is not available.
                    </Text>
                </div>

                {!isLast && (
                    <div style={{ position: 'absolute', bottom: -32, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                        <div style={{ height: 32, width: 2, background: 'rgba(0, 223, 154, 0.3)' }} />
                        <ArrowRightOutlined style={{ color: '#00df9a', transform: 'rotate(90deg)', position: 'absolute', bottom: -8, left: -7 }} />
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AutomationNode;
