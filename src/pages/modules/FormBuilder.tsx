import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Typography, Space, Select, Switch, Row, Col, Divider, message, Modal, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined, ArrowLeftOutlined, DragOutlined, SettingOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { formsApi } from '../../api/forms';

// Dnd Kit Imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { Title, Text } = Typography;
const { Option } = Select;

interface FormField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'email' | 'tel' | 'textarea' | 'select' | 'date';
    required: boolean;
    options?: string[];
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        patternMessage?: string;
    };
}

interface SortableItemProps {
    field: FormField;
    index: number;
    removeField: (id: string) => void;
    updateField: (id: string, updates: Partial<FormField>) => void;
}

const SortableField: React.FC<SortableItemProps> = ({ field, index, removeField, updateField }) => {
    const [showValidation, setShowValidation] = useState(false);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 1,
        opacity: isDragging ? 0.5 : 1,
        background: isDragging ? 'rgba(0, 223, 154, 0.05)' : 'rgba(255,255,255,0.02)',
        border: isDragging ? '1px solid #00df9a' : '1px solid rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        position: 'relative' as const,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Space>
                    <div {...attributes} {...listeners} style={{ cursor: 'grab', padding: '4px 8px', marginLeft: -8 }}>
                        <DragOutlined style={{ color: '#00df9a' }} />
                    </div>
                    <Text strong style={{ color: '#fff' }}>Field #{index + 1}</Text>
                </Space>
                <Space>
                    <Tooltip title="Custom Validation">
                        <Button 
                            type="text" 
                            icon={<SettingOutlined style={{ color: showValidation ? '#00df9a' : '#94a3b8' }} />} 
                            onClick={() => setShowValidation(!showValidation)}
                        />
                    </Tooltip>
                    <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={() => removeField(field.id)}
                    />
                </Space>
            </div>

            <Row gutter={12}>
                <Col span={12}>
                    <Form.Item label="Field Label" style={{ marginBottom: 0 }}>
                        <Input 
                            value={field.label} 
                            onChange={e => updateField(field.id, { label: e.target.value })}
                            className="premium-input"
                        />
                    </Form.Item>
                </Col>
                <Col span={6}>
                    <Form.Item label="Input Type" style={{ marginBottom: 0 }}>
                        <Select 
                            value={field.type} 
                            onChange={val => updateField(field.id, { type: val as any })}
                            style={{ width: '100%' }}
                        >
                            <Option value="text">Short Text</Option>
                            <Option value="textarea">Long Text</Option>
                            <Option value="email">Email</Option>
                            <Option value="tel">Phone</Option>
                            <Option value="number">Number</Option>
                            <Option value="date">Date</Option>
                            <Option value="select">Dropdown</Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={6} style={{ display: 'flex', alignItems: 'center', paddingTop: 24 }}>
                    <Space>
                        <Switch 
                            size="small" 
                            checked={field.required} 
                            onChange={val => updateField(field.id, { required: val })}
                        />
                        <Text style={{ fontSize: 12, color: '#94a3b8' }}>Required</Text>
                    </Space>
                </Col>
            </Row>

            {showValidation && (
                <div style={{ marginTop: 20, padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                    <Text strong style={{ fontSize: 12, color: '#00df9a', display: 'block', marginBottom: 12 }}>Custom Validation Rules</Text>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item label="Min Length/Value" style={{ marginBottom: 12 }}>
                                <Input 
                                    type="number" 
                                    value={field.validation?.min} 
                                    onChange={e => updateField(field.id, { validation: { ...field.validation, min: parseInt(e.target.value) || undefined } })}
                                    className="premium-input"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Max Length/Value" style={{ marginBottom: 12 }}>
                                <Input 
                                    type="number" 
                                    value={field.validation?.max} 
                                    onChange={e => updateField(field.id, { validation: { ...field.validation, max: parseInt(e.target.value) || undefined } })}
                                    className="premium-input"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item label="Regex Pattern" style={{ marginBottom: 12 }}>
                                <Input 
                                    placeholder="e.g. ^[A-Z]+$" 
                                    value={field.validation?.pattern} 
                                    onChange={e => updateField(field.id, { validation: { ...field.validation, pattern: e.target.value } })}
                                    className="premium-input"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item label="Error Message" style={{ marginBottom: 0 }}>
                                <Input 
                                    placeholder="Message to show if pattern fails" 
                                    value={field.validation?.patternMessage} 
                                    onChange={e => updateField(field.id, { validation: { ...field.validation, patternMessage: e.target.value } })}
                                    className="premium-input"
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </div>
            )}

            {field.type === 'select' && (
                <div style={{ marginTop: 16 }}>
                    <Text style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 8 }}>Dropdown Options (one per line)</Text>
                    <Input.TextArea 
                        placeholder="Option 1&#10;Option 2" 
                        value={field.options?.join('\n')}
                        onChange={e => updateField(field.id, { options: e.target.value.split('\n').filter(o => o.trim()) })}
                        className="premium-input"
                        autoSize={{ minRows: 2 }}
                    />
                </div>
            )}
        </div>
    );
};

const FormBuilder: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [form] = Form.useForm();
    const [fields, setFields] = useState<FormField[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (id) {
            fetchForm();
        } else if (location.state?.template) {
            const template = location.state.template;
            form.setFieldsValue({
                title: template.title,
                description: template.description
            });
            setFields(template.fields.map((f: any) => ({ 
                ...f, 
                id: f.id || Date.now().toString() + Math.random(),
                validation: f.validation || {}
            })));
        } else {
            setFields([
                { id: '1', label: 'Full Name', type: 'text', required: true, validation: {} },
                { id: '2', label: 'Email Address', type: 'email', required: true, validation: {} }
            ]);
        }
    }, [id, location.state]);

    const fetchForm = async () => {
        setLoading(true);
        try {
            const res = await formsApi.getForm(id!);
            const data = res.data;
            form.setFieldsValue({
                title: data.title,
                description: data.description,
                isActive: data.isActive
            });
            setFields(data.fields.map((f: any) => ({ ...f, validation: f.validation || {} })));
        } catch (e) {
            message.error('Failed to fetch form details');
        } finally {
            setLoading(false);
        }
    };

    const addField = () => {
        const newField: FormField = {
            id: Date.now().toString(),
            label: 'New Field',
            type: 'text',
            required: false,
            validation: {}
        };
        setFields([...fields, newField]);
    };

    const removeField = (fieldId: string) => {
        setFields(fields.filter(f => f.id !== fieldId));
    };

    const updateField = (fieldId: string, updates: Partial<FormField>) => {
        setFields(fields.map(f => f.id === fieldId ? { ...f, ...updates } : f));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setFields((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSave = async (values: any) => {
        if (fields.length === 0) {
            return message.warning('Please add at least one field to the form');
        }

        setSaving(true);
        try {
            const payload = {
                ...values,
                fields
            };

            if (id) {
                await formsApi.updateForm(id, payload);
                message.success('Form updated successfully');
            } else {
                await formsApi.createForm(payload);
                message.success('Form created successfully');
            }
            navigate('/dashboard/forms');
        } catch (e) {
            message.error('Failed to save form');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <Button 
                type="text" 
                icon={<ArrowLeftOutlined />} 
                onClick={() => navigate('/dashboard/forms')}
                style={{ marginBottom: 16, color: '#94a3b8' }}
            >
                Back to Forms
            </Button>

            <Form 
                form={form} 
                layout="vertical" 
                onFinish={handleSave} 
                initialValues={{ 
                    isActive: true
                }}
            >
                <Row gutter={24} align="top">
                    <Col xs={24} lg={8} style={{ position: 'sticky', top: 96, zIndex: 5 }}>
                        <Card title="Form Settings" className="premium-card">
                            <Form.Item 
                                name="title" 
                                label="Form Title" 
                                rules={[{ required: true, message: 'Enter form title' }]}
                            >
                                <Input placeholder="e.g. Lead Qualification Form" className="premium-input" />
                            </Form.Item>
                            
                            <Form.Item name="description" label="Description">
                                <Input.TextArea placeholder="Shown below the title" className="premium-input" autoSize={{ minRows: 3 }} />
                            </Form.Item>

                            <Form.Item name="isActive" label="Form Status" valuePropName="checked">
                                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                            </Form.Item>

                            <Divider style={{ borderColor: 'rgba(255,255,255,0.05)' }} />


                            
                            <Button 
                                type="primary" 
                                htmlType="submit" 
                                block 
                                icon={<SaveOutlined />} 
                                loading={saving}
                                className="premium-button"
                            >
                                {id ? 'Update Form' : 'Create Form'}
                            </Button>
                        </Card>
                    </Col>

                    <Col xs={24} lg={16}>
                        <Card 
                            title="Form Fields" 
                            className="premium-card"
                            extra={
                                <Button type="dashed" icon={<PlusOutlined />} onClick={addField} style={{ color: '#00df9a', borderColor: 'rgba(0,223,154,0.3)' }}>
                                    Add Field
                                </Button>
                            }
                        >
                            <DndContext 
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext 
                                    items={fields.map(f => f.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {fields.map((field, index) => (
                                            <SortableField 
                                                key={field.id} 
                                                field={field} 
                                                index={index}
                                                removeField={removeField}
                                                updateField={updateField}
                                            />
                                        ))}

                                        {fields.length === 0 && (
                                            <div style={{ padding: '40px 0', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.05)' }}>
                                                <Text type="secondary">No fields added yet. Click "Add Field" to start building your form.</Text>
                                            </div>
                                        )}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </Card>
                    </Col>
                </Row>
            </Form>
        </div>
    );
};

export default FormBuilder;
