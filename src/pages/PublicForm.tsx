import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, Space, Select, DatePicker, message, Result, ConfigProvider, theme } from 'antd';
import { useParams, useSearchParams } from 'react-router-dom';
import { formsApi } from '../api/forms';
import { CheckCircleFilled, LoadingOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const PublicForm: React.FC = () => {
    const { id } = useParams();
    const [form, setForm] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchParams] = useSearchParams();
    const isEmbed = searchParams.get('embed') === 'true';

    useEffect(() => {
        if (id) {
            fetchForm();
        }
    }, [id]);

    const fetchForm = async () => {
        try {
            const res = await formsApi.getForm(id!);
            setForm(res.data);
        } catch (e: any) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const onFinish = async (values: any) => {
        setSubmitting(true);
        try {
            // Convert dayjs dates to strings
            const formattedValues = { ...values };
            Object.keys(formattedValues).forEach(key => {
                if (dayjs.isDayjs(formattedValues[key])) {
                    formattedValues[key] = formattedValues[key].format('YYYY-MM-DD');
                }
            });

            await formsApi.submitResponse(id!, formattedValues);
            setSubmitted(true);
            message.success('Form submitted successfully!');
            
            // Notify parent window if embedded
            if (isEmbed) {
                window.parent.postMessage({ type: 'LEAD_CAPTURE_SUCCESS' }, '*');
            }
        } catch (e) {
            message.error('Failed to submit form. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0c0e' }}>
                <LoadingOutlined style={{ fontSize: 40, color: '#00df9a' }} spin />
            </div>
        );
    }

    if (!form) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0c0e' }}>
                <Result
                    status="404"
                    title={<span style={{ color: '#fff' }}>Form Not Found</span>}
                    subTitle={<span style={{ color: '#94a3b8' }}>The form you are looking for does not exist or has been removed.</span>}
                />
            </div>
        );
    }

    if (submitted) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0c0e', padding: 20 }}>
                <Card className="premium-card" style={{ maxWidth: 500, textAlign: 'center', padding: '40px 20px' }}>
                    <CheckCircleFilled style={{ fontSize: 64, color: '#00df9a', marginBottom: 24 }} />
                    <Title level={3} style={{ color: '#fff', marginBottom: 12 }}>Thank You!</Title>
                    <Paragraph style={{ color: '#94a3b8', fontSize: 16 }}>
                        Your response has been successfully submitted to <strong>{form.owner.name}</strong>.
                    </Paragraph>
                    <Button type="primary" onClick={() => setSubmitted(false)} className="premium-button" style={{ marginTop: 24 }}>
                        Submit Another Response
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '#00df9a' } }}>
            <div style={{ minHeight: '100vh', background: isEmbed ? 'transparent' : '#0b0c0e', padding: isEmbed ? '20px' : '60px 20px' }}>
                <div style={{ maxWidth: 650, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: isEmbed ? 24 : 40 }}>
                        {form.owner.logoUrl && (
                            <img src={form.owner.logoUrl} alt={form.owner.name} style={{ maxHeight: 60, marginBottom: 20, borderRadius: 8 }} />
                        )}
                        <Title level={2} style={{ color: '#fff', margin: 0, fontWeight: 800 }}>{form.title}</Title>
                        {form.description && (
                            <Paragraph style={{ color: '#94a3b8', fontSize: 16, marginTop: 12 }}>{form.description}</Paragraph>
                        )}
                    </div>

                    <Card className="premium-card" style={{ padding: isEmbed ? '0px 10px' : '10px 20px', background: isEmbed ? 'transparent' : undefined, border: isEmbed ? 'none' : undefined, boxShadow: isEmbed ? 'none' : undefined }}>
                        <Form layout="vertical" onFinish={onFinish}>
                            {form.fields.map((field: any) => {
                                const rules: any[] = [
                                    { required: field.required, message: `${field.label} is required` }
                                ];

                                // Add custom validation
                                if (field.validation) {
                                    if (field.validation.min) {
                                        rules.push({ min: field.validation.min, message: `${field.label} must be at least ${field.validation.min}` });
                                    }
                                    if (field.validation.max) {
                                        rules.push({ max: field.validation.max, message: `${field.label} cannot exceed ${field.validation.max}` });
                                    }
                                    if (field.validation.pattern) {
                                        rules.push({ 
                                            pattern: new RegExp(field.validation.pattern), 
                                            message: field.validation.patternMessage || `${field.label} is invalid` 
                                        });
                                    }
                                }

                                // Special handling for phone numbers if no custom pattern exists
                                if (field.type === 'tel' && !field.validation?.pattern) {
                                    rules.push({ pattern: /^\d{10}$/, message: 'Please enter a valid 10-digit phone number' });
                                }

                                return (
                                    <Form.Item
                                        key={field.id}
                                        name={field.label}
                                        label={<span style={{ color: '#cbd5e1', fontWeight: 600 }}>{field.label}</span>}
                                        rules={rules}
                                    >
                                        {field.type === 'textarea' ? (
                                            <Input.TextArea className="premium-input" autoSize={{ minRows: 3 }} placeholder={`Enter ${field.label.toLowerCase()}...`} />
                                        ) : field.type === 'select' ? (
                                            <Select className="premium-select" placeholder={`Select ${field.label.toLowerCase()}...`}>
                                                {field.options?.map((opt: string) => (
                                                    <Option key={opt} value={opt}>{opt}</Option>
                                                ))}
                                            </Select>
                                        ) : field.type === 'date' ? (
                                            <DatePicker style={{ width: '100%' }} className="premium-input" />
                                        ) : field.type === 'tel' ? (
                                            <Input 
                                                type="tel" 
                                                addonBefore="+91" 
                                                maxLength={10} 
                                                className="premium-input" 
                                                placeholder="Enter 10 digit number" 
                                            />
                                        ) : (
                                            <Input type={field.type} className="premium-input" placeholder={`Enter ${field.label.toLowerCase()}...`} />
                                        )}
                                    </Form.Item>
                                );
                            })}

                            <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    block
                                    size="large"
                                    loading={submitting}
                                    className="premium-button"
                                    style={{ height: 50, fontSize: 16, fontWeight: 700 }}
                                >
                                    Submit Form
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>

                    {!isEmbed && (
                        <div style={{ textAlign: 'center', marginTop: 40 }}>
                            <Text style={{ color: '#475569', fontSize: 12 }}>
                                Powered by <strong style={{ color: '#00df9a' }}>MadMarketer AI BOS</strong>
                            </Text>
                        </div>
                    )}
                </div>
            </div>
        </ConfigProvider>
    );
};

// Mocking dayjs since it might not be available globally in this file context without import
import dayjs from 'dayjs';

export default PublicForm;
