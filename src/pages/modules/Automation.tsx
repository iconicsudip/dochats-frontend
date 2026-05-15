import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Form, message } from 'antd';
import { automationApi, AutomationRule } from '../../api/automation';
import { emailApi, EmailTemplate } from '../../api/email';
import { formsApi } from '../../api/forms';
import { whatsappApi } from '../../api/whatsapp';

import { useAuth } from '../../contexts/AuthContext';
import { useModules } from '../../contexts/ModuleContext';
import { Module } from '../../enums';

import AutomationList from '../../components/Automation/AutomationList';
import AutomationBuilder from '../../components/Automation/AutomationBuilder';
import WhatsAppSettingsModal from '../../components/Automation/WhatsAppSettingsModal';

import { useNavigate } from 'react-router-dom';

const Automation: React.FC = () => {
    const { user, updateMe } = useAuth();
    const { hasModule } = useModules();
    const navigate = useNavigate();
    
    // Core State
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [waTemplates, setWaTemplates] = useState<any[]>([]);
    const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [view, setView] = useState<'LIST' | 'BUILDER'>('LIST');
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [nodes, setNodes] = useState<any[]>([]);
    
    // UI State
    const [waSettingsOpen, setWaSettingsOpen] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [loadingWa, setLoadingWa] = useState(false);
    const [loadingEmail, setLoadingEmail] = useState(false);
    const [form] = Form.useForm();
    const location = useLocation();
    const sessionInfoRef = React.useRef<{ waba_id?: string, phone_number_id?: string, business_id?: string }>({});

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('tab') === 'logs') {
            // Logic to show logs if needed, for now just a placeholder or state change
        }
    }, [location.search]);

    const hasWaConfig = (!!user?.whatsappConfig?.apiKey && !!user?.whatsappConfig?.phoneNumberId) || !!user?.whatsappConfig?.isConnected;
    const appId = import.meta.env.VITE_META_APP_ID;
    const configId = import.meta.env.VITE_META_CONFIG_ID;

    useEffect(() => {
        if (appId) {
            // @ts-ignore
            window.fbAsyncInit = function() {
                // @ts-ignore
                window.FB.init({
                    appId            : appId,
                    autoLogAppEvents : true,
                    xfbml            : true,
                    version          : import.meta.env.VITE_META_API_VERSION || 'v25.0'
                });
            };

            // @ts-ignore
            if (window.FB) {
                // @ts-ignore
                window.fbAsyncInit();
            } else {
                (function(d, s, id) {
                    var js, fjs = d.getElementsByTagName(s)[0];
                    if (d.getElementById(id)) return;
                    js = d.createElement(s) as any; js.id = id;
                    js.src = "https://connect.facebook.net/en_US/sdk.js";
                    // @ts-ignore
                    js.crossOrigin = "anonymous";
                    fjs.parentNode?.insertBefore(js, fjs);
                }(document, 'script', 'facebook-jssdk'));
            }
        }
    }, [appId]);

    useEffect(() => {
        const handleFBMessage = (event: MessageEvent) => {
            if (!event.origin.endsWith('facebook.com')) return;
            
            try {
                let rawData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                
                // Handle array structure if present
                const data = Array.isArray(rawData) ? rawData[0] : rawData;

                if (data.type === 'WA_EMBEDDED_SIGNUP') {
                    if (data.event === 'FINISH') {
                        const { phone_number_id, waba_id, business_id } = data.data;
                        sessionInfoRef.current = { waba_id, phone_number_id, business_id };
                        console.log('WhatsApp Embedded Signup Session Info:', data.data);
                    } else if (data.event === 'CANCEL') {
                        const currentStep = data.data?.current_step;
                        console.warn('Signup abandoned at step:', currentStep);
                        message.warning(`Signup abandoned at ${currentStep || 'unknown step'}`);
                    } else if (data.event === 'ERROR') {
                        const { error_message, error_code } = data.data || {};
                        console.error('Signup error:', { error_message, error_code });
                        message.error(`Signup error: ${error_message || 'Unknown error'}`);
                    }
                }
            } catch (e) {
                // Ignore non-JSON or unrelated messages
            }
        };

        window.addEventListener('message', handleFBMessage);
        return () => window.removeEventListener('message', handleFBMessage);
    }, []);

    const handleConnect = () => {
        // @ts-ignore
        if (!window.FB) {
            navigate('/dashboard/whatsapp');
            return;
        }

        // @ts-ignore
        window.FB.login((response: any) => {
            if (response.authResponse) {
                const code = response.authResponse.code;
                const { waba_id, phone_number_id, business_id } = sessionInfoRef.current;
                
                whatsappApi.handleCallback(code, waba_id, phone_number_id, business_id).then((res) => {
                    message.success('Account linked successfully!');
                    updateMe({ whatsappConfig: res.data });
                    if (view === 'BUILDER' && hasModule(Module.WHATSAPP)) {
                        fetchWaTemplates();
                    }
                }).catch(() => {
                    message.error('Failed to link account');
                });
            } else {
                message.error('Signup cancelled or failed');
            }
        }, {
            config_id: configId,
            response_type: 'code',
            override_default_response_type: true,
            extras: {
                feature: 'whatsapp_embedded_signup',
                sessionInfoVersion: '3',
                version: 'v4',
                setup: {}
            }
        });
    };

    useEffect(() => {
        (window as any).showWaSettings = handleConnect;
        return () => { delete (window as any).showWaSettings; };
    }, [handleConnect]);

    useEffect(() => {
        fetchRules();
        fetchForms();
    }, []);

    useEffect(() => {
        if (view === 'BUILDER') {
            if (hasModule(Module.WHATSAPP)) fetchWaTemplates();
            if (hasModule(Module.EMAIL)) fetchEmailTemplates();
        }
    }, [view]);

    const fetchRules = async () => {
        try {
            const data = await automationApi.getRules();
            setRules(data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchForms = async () => {
        try {
            const response = await formsApi.getForms();
            setForms(response.data);
        } catch (error) {
            console.error('Fetch forms error:', error);
        }
    };

    const fetchWaTemplates = async () => {
        if (!user?.whatsappConfig) return;
        setLoadingWa(true);
        try {
            const data = await automationApi.getWaTemplates();
            setWaTemplates(data);
            if (data.length === 1) {
                form.setFieldValue(['config', 'whatsappTemplate'], data[0].name);
            }
        } catch (error) {
            console.error('Fetch templates error:', error);
        } finally {
            setLoadingWa(false);
        }
    };

    const fetchEmailTemplates = async () => {
        setLoadingEmail(true);
        try {
            const data = await emailApi.getTemplates(true);
            setEmailTemplates(data);
            if (data.length === 1) {
                form.setFieldValue(['config', 'emailTemplateId'], data[0].id);
            }
        } catch (error) {
            console.error('Fetch email templates error:', error);
        } finally {
            setLoadingEmail(false);
        }
    };

    const enterBuilder = (rule?: AutomationRule, template?: any) => {
        if (rule) {
            setEditingRuleId(rule.id);
            form.setFieldsValue({
                name: rule.name,
                trigger: rule.trigger,
                delay: rule.delay,
                config: rule.config
            });
            if (rule.flow && (rule.flow as any).nodes) {
                const flowNodes = (rule.flow as any).nodes;
                const nodeArray: any[] = [];
                let currentId = (rule.flow as any).startNodeId;
                const visited = new Set();
                
                while (currentId && flowNodes[currentId] && !visited.has(currentId)) {
                    visited.add(currentId);
                    const node = flowNodes[currentId];
                    if (node.type !== 'TRIGGER') {
                        nodeArray.push({
                            id: currentId,
                            type: node.type,
                            action: node.action,
                            config: node.config,
                            failover: node.onFailure
                        });
                    }
                    currentId = node.next;
                }
                setNodes(nodeArray);
            } else {
                setNodes([]);
            }
        } else if (template) {
            setEditingRuleId(null);
            form.setFieldsValue({
                name: template.name,
                trigger: template.trigger
            });
            // Filter out triggers from templates too
            setNodes(template.nodes.filter((n: any) => n.type !== 'TRIGGER').map((n: any) => ({ ...n, id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` })));
        } else {
            setEditingRuleId(null);
            form.resetFields();
            setNodes([{ id: `node_${Date.now()}`, type: 'ACTION', action: '', config: {}, failover: null }]);
        }
        setView('BUILDER');
    };

    const exitBuilder = () => {
        setView('LIST');
        setEditingRuleId(null);
        setNodes([]);
        form.resetFields();
    };

    const addNode = () => {
        setNodes([...nodes, { id: `node_${Date.now()}`, type: 'ACTION', action: '', config: {}, failover: null }]);
    };

    const removeNode = (id: string) => {
        setNodes(nodes.filter(n => n.id !== id));
    };

    const updateNode = (id: string, updates: any) => {
        setNodes(nodes.map(n => n.id === id ? { ...n, ...updates } : n));
    };

    const applyTemplate = (template: any) => {
        form.setFieldsValue({ name: template.name, trigger: template.trigger });
        setNodes(template.nodes.map((n: any) => ({ ...n, id: `${n.id}_${Date.now()}` })));
        message.success(`${template.industry} template applied!`);
    };

    const handleAdd = async (vals: any) => {
        try {
            const flowNodes: any = {};
            const startNodeId = nodes.length > 0 ? nodes[0].id : null;

            nodes.forEach((node, index) => {
                flowNodes[node.id] = {
                    type: node.type,
                    action: node.action,
                    config: node.config,
                    next: index < nodes.length - 1 ? nodes[index + 1].id : null,
                    onSuccess: index < nodes.length - 1 ? nodes[index + 1].id : null,
                    onFailure: node.failover || null
                };
            });

            const payload = {
                ...vals,
                flow: startNodeId ? { startNodeId, nodes: flowNodes } : null,
                actions: nodes.map(n => n.action).filter(a => !!a)
            };

            console.log('[Automation] Saving Flow Payload:', payload);

            if (editingRuleId) {
                await automationApi.updateRule(editingRuleId, payload);
                message.success('Neural Flow updated successfully!');
            } else {
                await automationApi.createRule(payload);
                message.success('Neural Flow automation created!');
            }
            
            exitBuilder();
            fetchRules();
        } catch (error: any) {
            console.error('[Automation] Save Error:', error);
            message.error(`Failed to save rule: ${error.response?.data?.error || error.message}`);
        }
    };

    const handleSaveWaSettings = async (vals: any) => {
        setSavingSettings(true);
        try {
            await updateMe({ whatsappConfig: vals });
            message.success('WhatsApp configuration saved!');
            setWaSettingsOpen(false);
        } catch (e) {
            message.error('Failed to save configuration');
        } finally {
            setSavingSettings(false);
        }
    };

    const toggleRule = async (id: string) => {
        const rule = rules.find(r => r.id === id);
        if (!rule) return;
        setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
        try {
            await automationApi.toggleRule(id, !rule.enabled);
        } catch (error) {
            fetchRules();
        }
    };

    const handleDeleteRule = async (id: string) => {
        try {
            await automationApi.deleteRule(id);
            message.success('Rule deleted');
            fetchRules();
        } catch (error) {
            message.error('Failed to delete rule');
        }
    };

    if (view === 'BUILDER') {
        return (
            <AutomationBuilder
                editingRuleId={editingRuleId}
                form={form}
                nodes={nodes}
                forms={forms}
                waTemplates={waTemplates}
                emailTemplates={emailTemplates}
                loadingWa={loadingWa}
                loadingEmail={loadingEmail}
                hasWaConfig={hasWaConfig}
                exitBuilder={exitBuilder}
                handleAdd={handleAdd}
                setNodes={setNodes}
                addNode={addNode}
                removeNode={removeNode}
                updateNode={updateNode}
                applyTemplate={applyTemplate}
            />
        );
    }

    return (
        <>
            <AutomationList
                rules={rules}
                hasModule={hasModule}
                setWaSettingsOpen={setWaSettingsOpen}
                enterBuilder={enterBuilder}
                toggleRule={toggleRule}
                handleDeleteRule={handleDeleteRule}
                onRefresh={fetchRules}
            />

            <WhatsAppSettingsModal
                open={waSettingsOpen}
                saving={savingSettings}
                initialValues={user?.whatsappConfig}
                onCancel={() => setWaSettingsOpen(false)}
                onFinish={handleSaveWaSettings}
            />
        </>
    );
};

export default Automation;
