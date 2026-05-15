import React, { useState, useEffect } from 'react';
import {
    Card, Typography, Button, Row, Col, Space, Form, Input,
    message, Tooltip, Divider, ColorPicker, Select, InputNumber,
    Tag, Badge, Spin,
    Empty
} from 'antd';
import {
    MailOutlined, PlusOutlined, DeleteOutlined,
    ArrowUpOutlined, ArrowDownOutlined, EyeOutlined, SaveOutlined,
    FontSizeOutlined, AlignLeftOutlined, AlignCenterOutlined, AlignRightOutlined,
    LinkOutlined, PictureOutlined, MinusOutlined,
    BgColorsOutlined, AppstoreOutlined, FileTextOutlined, DragOutlined,
    ArrowLeftOutlined, ThunderboltOutlined, SettingOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { emailApi, EmailTemplate } from '../../api/email';
import { useAuth } from '../../contexts/AuthContext';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const { Title, Text } = Typography;

type BlockType = 'HEADING' | 'TEXT' | 'BUTTON' | 'IMAGE' | 'DIVIDER' | 'SPACER';

interface EmailBlock {
    id: string;
    type: BlockType;
    content: string;
    style?: {
        fontSize?: number;
        color?: string;
        backgroundColor?: string;
        textAlign?: 'left' | 'center' | 'right';
        padding?: number;
        borderRadius?: number;
        link?: string;
        imageUrl?: string;
        height?: number;
        fontWeight?: string | number;
        fontFamily?: string;
    };
}

const DEFAULT_BLOCKS: Record<BlockType, EmailBlock> = {
    HEADING: { id: '', type: 'HEADING', content: 'Catchy Heading', style: { fontSize: 28, textAlign: 'center', padding: 20, fontWeight: 800, color: '#1a202c' } },
    TEXT: { id: '', type: 'TEXT', content: 'Share your story here. Use this space to connect with your audience and deliver your message effectively.', style: { fontSize: 16, textAlign: 'left', padding: 15, color: '#4a5568' } },
    BUTTON: { id: '', type: 'BUTTON', content: 'Claim Your Offer', style: { backgroundColor: '#3b82f6', color: '#ffffff', borderRadius: 8, textAlign: 'center', padding: 16, link: '#' } },
    IMAGE: { id: '', type: 'IMAGE', content: '', style: { imageUrl: 'https://images.unsplash.com/photo-1579389083078-4e7018379f7e?auto=format&fit=crop&q=80&w=800', textAlign: 'center', padding: 10 } },
    DIVIDER: { id: '', type: 'DIVIDER', content: '', style: { padding: 24 } },
    SPACER: { id: '', type: 'SPACER', content: '', style: { height: 30 } },
};

const EmailBuilder: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [blocks, setBlocks] = useState<EmailBlock[]>([]);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [form] = Form.useForm();

    // Global Settings
    const [globalBg, setGlobalBg] = useState('#f7fafc');
    const [contentBg, setContentBg] = useState('#ffffff');
    const [fontFamily, setFontFamily] = useState('Inter, system-ui, sans-serif');

    useEffect(() => {
        if (id) {
            fetchTemplate(id);
        } else {
            // Initial default blocks
            setBlocks([
                { ...DEFAULT_BLOCKS.HEADING, id: 'init-1', content: 'Welcome to Our Newsletter' },
                { ...DEFAULT_BLOCKS.TEXT, id: 'init-2' },
                { ...DEFAULT_BLOCKS.BUTTON, id: 'init-3' }
            ]);
        }
    }, [id]);

    const fetchTemplate = async (templateId: string) => {
        setFetching(true);
        try {
            const template = await emailApi.getTemplates().then(ts => ts.find(t => t.id === templateId));
            if (template) {
                setBlocks(template.design?.blocks || []);
                setGlobalBg(template.design?.globalBg || '#f7fafc');
                setContentBg(template.design?.contentBg || '#ffffff');
                setFontFamily(template.design?.fontFamily || 'Inter, system-ui, sans-serif');
                form.setFieldsValue({ name: template.name, subject: template.subject });
            }
        } catch (error) {
            message.error('Failed to load template');
        } finally {
            setFetching(false);
        }
    };

    const addBlock = (type: BlockType) => {
        const newBlock = { ...DEFAULT_BLOCKS[type], id: Math.random().toString(36).substring(7) };
        setBlocks([...blocks, newBlock]);
        setSelectedBlockId(newBlock.id);
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        const newBlocks = [...blocks];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= blocks.length) return;
        [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
        setBlocks(newBlocks);
    };

    const deleteBlock = (blockId: string) => {
        setBlocks(blocks.filter(b => b.id !== blockId));
        if (selectedBlockId === blockId) setSelectedBlockId(null);
    };

    const updateBlock = (blockId: string, updates: Partial<EmailBlock>) => {
        setBlocks(blocks.map(b => b.id === blockId ? { ...b, ...updates, style: { ...b.style, ...updates.style } } : b));
    };

    const generateHTML = () => {
        const blockHtml = blocks.map(block => {
            const s = block.style || {};
            const align = s.textAlign || 'left';
            const padding = s.padding || 0;

            switch (block.type) {
                case 'HEADING':
                    return `<h1 style="font-size: ${s.fontSize}px; color: ${s.color}; text-align: ${align}; padding: ${padding}px; margin: 0; font-weight: ${s.fontWeight}; font-family: ${fontFamily};">${block.content}</h1>`;
                case 'TEXT':
                    return `<div style="font-size: ${s.fontSize}px; color: ${s.color}; text-align: ${align}; padding: ${padding}px; line-height: 1.6; font-family: ${fontFamily};">${block.content}</div>`;
                case 'BUTTON':
                    return `
                        <div style="text-align: ${align}; padding: ${padding}px;">
                            <a href="${s.link}" style="background-color: ${s.backgroundColor}; color: ${s.color}; padding: 14px 28px; border-radius: ${s.borderRadius}px; text-decoration: none; display: inline-block; font-weight: bold; font-family: ${fontFamily};">
                                ${block.content}
                            </a>
                        </div>`;
                case 'IMAGE':
                    return `<div style="text-align: ${align}; padding: ${padding}px;"><img src="${s.imageUrl}" style="max-width: 100%; height: auto; border-radius: 8px; display: block; margin: ${align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : '0 auto 0 0'};" /></div>`;
                case 'DIVIDER':
                    return `<div style="padding: ${padding}px;"><hr style="border: 0; border-top: 1px solid #e2e8f0;" /></div>`;
                case 'SPACER':
                    return `<div style="height: ${s.height}px;"></div>`;
                default:
                    return '';
            }
        }).join('\n');

        return `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Roboto:wght@400;700&family=Outfit:wght@400;700;900&display=swap');
                        body { margin: 0; padding: 0; background-color: ${globalBg}; font-family: ${fontFamily}; }
                        .container { max-width: 600px; margin: 40px auto; background-color: ${contentBg}; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
                        .content { padding: 30px; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word; }
                        .footer { padding: 30px; text-align: center; color: #718096; font-size: 13px; background-color: rgba(0,0,0,0.02); }
                        @media only screen and (max-width: 620px) {
                            .container { width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="content">${blockHtml}</div>
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} All rights reserved.</p>
                        </div>
                    </div>
                </body>
            </html>
        `;
    };

    const handleSave = async (values: any) => {
        setLoading(true);
        try {
            const payload = {
                name: values.name,
                subject: values.subject,
                content: generateHTML(),
                design: {
                    blocks,
                    globalBg,
                    contentBg,
                    fontFamily
                }
            };

            if (id) {
                await emailApi.updateTemplate(id, payload);
                message.success('Template updated successfully');
            } else {
                await emailApi.createTemplate(payload);
                message.success('Template created successfully');
            }
            navigate('/dashboard/email');
        } catch (error) {
            message.error('Failed to save template');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin size="large" tip="Loading designer..." />
            </div>
        );
    }

    return (
        <div style={{ padding: '0 24px 24px 24px' }}>
            {/* Top Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 72, borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 24 }}>
                <Space size="middle">
                    <Button
                        type="text"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate('/dashboard/email')}
                        style={{ color: '#94a3b8' }}
                    >
                        Back to Hub
                    </Button>
                    <Divider type="vertical" style={{ borderColor: 'rgba(255,255,255,0.1)', height: 24 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <MailOutlined style={{ color: '#3b82f6', fontSize: 18 }} />
                        <Title level={4} style={{ color: '#fff', margin: 0 }}>{id ? 'Edit Template' : 'New Email Template'}</Title>
                    </div>
                </Space>
                <Space>
                    <Button icon={<EyeOutlined />} onClick={() => {
                        const win = window.open('', '_blank');
                        win?.document.write(generateHTML());
                    }}>
                        Preview
                    </Button>
                    <Button type="primary" icon={<SaveOutlined />} onClick={() => form.submit()} loading={loading} className="premium-button">
                        {id ? 'Update Template' : 'Save Template'}
                    </Button>
                </Space>
            </div>

            <Form form={form} layout="vertical" onFinish={handleSave}>
                <Row gutter={[24, 24]}>
                    {/* Left: Components */}
                    <Col span={6}>
                        <Card className="premium-card designer-sidebar" size="small" style={{ height: 'calc(100vh - 140px)', overflowY: 'auto' }}>
                            <Title level={5} style={{ color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, letterSpacing: 0.5 }}>
                                <AppstoreOutlined style={{ fontSize: 14 }} /> BLOCKS
                            </Title>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                                <Button block icon={<FontSizeOutlined />} onClick={() => addBlock('HEADING')} className="block-btn">Heading</Button>
                                <Button block icon={<FileTextOutlined />} onClick={() => addBlock('TEXT')} className="block-btn">Text</Button>
                                <Button block icon={<LinkOutlined />} onClick={() => addBlock('BUTTON')} className="block-btn">Button</Button>
                                <Button block icon={<PictureOutlined />} onClick={() => addBlock('IMAGE')} className="block-btn">Image</Button>
                                <Button block icon={<MinusOutlined />} onClick={() => addBlock('DIVIDER')} className="block-btn">Divider</Button>
                                <Button block icon={<ArrowDownOutlined />} onClick={() => addBlock('SPACER')} className="block-btn">Spacer</Button>
                            </div>

                            {selectedBlockId ? (
                                <>
                                    <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '16px 0' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <Title level={5} style={{ color: '#00df9a', margin: 0, fontSize: 13, letterSpacing: 0.5 }}>
                                            <SettingOutlined style={{ fontSize: 14 }} /> BLOCK SETTINGS
                                        </Title>
                                        <Button danger size="small" type="text" icon={<DeleteOutlined />} onClick={() => deleteBlock(selectedBlockId)}>Delete</Button>
                                    </div>
                                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                        {blocks.find(b => b.id === selectedBlockId)?.type !== 'DIVIDER' && (
                                            <Form.Item label={<Text style={{ color: '#94a3b8', fontSize: 11 }}>CONTENT</Text>} style={{ marginBottom: 0 }}>
                                                {blocks.find(b => b.id === selectedBlockId)?.type === 'TEXT' ? (
                                                    <div className="premium-quill">
                                                        <ReactQuill
                                                            theme="snow"
                                                            value={blocks.find(b => b.id === selectedBlockId)?.content}
                                                            onChange={(content) => updateBlock(selectedBlockId, { content })}
                                                            modules={{
                                                                toolbar: [
                                                                    ['bold', 'italic', 'underline', 'strike'],
                                                                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                                    ['clean']
                                                                ]
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <Input.TextArea
                                                        className="premium-input"
                                                        value={blocks.find(b => b.id === selectedBlockId)?.content}
                                                        onChange={(e) => updateBlock(selectedBlockId, { content: e.target.value })}
                                                        rows={4}
                                                    />
                                                )}
                                            </Form.Item>
                                        )}

                                        <Row gutter={12}>
                                            <Col span={12}>
                                                <Text style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>SIZE</Text>
                                                <InputNumber
                                                    size="small" min={8} max={100} style={{ width: '100%', marginTop: 6 }}
                                                    value={blocks.find(b => b.id === selectedBlockId)?.style?.fontSize}
                                                    onChange={(v) => updateBlock(selectedBlockId, { style: { fontSize: v || 16 } })}
                                                />
                                            </Col>
                                            <Col span={12}>
                                                <Text style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>COLOR</Text><br />
                                                <ColorPicker
                                                    size="small" style={{ marginTop: 6 }}
                                                    value={blocks.find(b => b.id === selectedBlockId)?.style?.color || '#000000'}
                                                    onChange={(c) => updateBlock(selectedBlockId, { style: { color: c.toHexString() } })}
                                                />
                                            </Col>
                                        </Row>

                                        <Row gutter={12}>
                                            <Col span={12}>
                                                <Text style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>PADDING</Text>
                                                <InputNumber
                                                    size="small" min={0} max={100} style={{ width: '100%', marginTop: 6 }}
                                                    value={blocks.find(b => b.id === selectedBlockId)?.style?.padding}
                                                    onChange={(v) => updateBlock(selectedBlockId, { style: { padding: v || 0 } })}
                                                />
                                            </Col>
                                            <Col span={12}>
                                                <Text style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>ALIGN</Text><br />
                                                <Space style={{ marginTop: 6 }}>
                                                    <Button size="small" type={blocks.find(b => b.id === selectedBlockId)?.style?.textAlign === 'left' ? 'primary' : 'default'} icon={<AlignLeftOutlined />} onClick={() => updateBlock(selectedBlockId, { style: { textAlign: 'left' } })} />
                                                    <Button size="small" type={blocks.find(b => b.id === selectedBlockId)?.style?.textAlign === 'center' ? 'primary' : 'default'} icon={<AlignCenterOutlined />} onClick={() => updateBlock(selectedBlockId, { style: { textAlign: 'center' } })} />
                                                    <Button size="small" type={blocks.find(b => b.id === selectedBlockId)?.style?.textAlign === 'right' ? 'primary' : 'default'} icon={<AlignRightOutlined />} onClick={() => updateBlock(selectedBlockId, { style: { textAlign: 'right' } })} />
                                                </Space>
                                            </Col>
                                        </Row>

                                        {blocks.find(b => b.id === selectedBlockId)?.type === 'BUTTON' && (
                                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <Form.Item label={<Text style={{ color: '#94a3b8', fontSize: 11 }}>LINK URL</Text>} style={{ marginBottom: 12 }}>
                                                    <Input
                                                        className="premium-input"
                                                        value={blocks.find(b => b.id === selectedBlockId)?.style?.link}
                                                        onChange={(e) => updateBlock(selectedBlockId, { style: { link: e.target.value } })}
                                                        prefix={<LinkOutlined />}
                                                    />
                                                </Form.Item>
                                                <Form.Item label={<Text style={{ color: '#94a3b8', fontSize: 11 }}>BUTTON COLOR</Text>} style={{ marginBottom: 0 }}>
                                                    <ColorPicker
                                                        showText style={{ width: '100%' }}
                                                        value={blocks.find(b => b.id === selectedBlockId)?.style?.backgroundColor || '#3b82f6'}
                                                        onChange={(c) => updateBlock(selectedBlockId, { style: { backgroundColor: c.toHexString() } })}
                                                    />
                                                </Form.Item>
                                            </div>
                                        )}

                                        {blocks.find(b => b.id === selectedBlockId)?.type === 'IMAGE' && (
                                            <Form.Item label={<Text style={{ color: '#94a3b8', fontSize: 11 }}>IMAGE URL</Text>} style={{ marginBottom: 0 }}>
                                                <Input
                                                    className="premium-input"
                                                    value={blocks.find(b => b.id === selectedBlockId)?.style?.imageUrl}
                                                    onChange={(e) => updateBlock(selectedBlockId, { style: { imageUrl: e.target.value } })}
                                                    prefix={<PictureOutlined />}
                                                />
                                            </Form.Item>
                                        )}
                                    </Space>
                                </>
                            ) : (
                                <div style={{ padding: '40px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)' }}>
                                    <DragOutlined style={{ fontSize: 24, color: '#2d3748', marginBottom: 12 }} />
                                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Select a block in the preview to adjust its properties.</Text>
                                </div>
                            )}

                            <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '24px 0' }} />
                            <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: 16, borderRadius: 12, border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                <Title level={5} style={{ color: '#fff', fontSize: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <ThunderboltOutlined style={{ color: '#3b82f6' }} /> VARIABLES
                                </Title>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {['name', 'email', 'phone', 'booking_date', 'booking_time', 'lead_source'].map(v => (
                                        <Tag
                                            key={v}
                                            color="blue"
                                            style={{ cursor: 'pointer', borderRadius: 4, fontSize: 10, margin: 0 }}
                                            onClick={() => {
                                                const tag = `{{${v}}}`;
                                                navigator.clipboard.writeText(tag);
                                                message.success(`Copied ${tag}`);
                                            }}
                                        >
                                            {`{{${v}}}`}
                                        </Tag>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    </Col>

                    {/* Middle: Live Canvas */}
                    <Col span={12}>
                        <div style={{
                            background: globalBg,
                            padding: '40px 20px',
                            height: 'calc(100vh - 140px)',
                            overflowY: 'auto',
                            borderRadius: 16,
                            border: '1px solid rgba(255,255,255,0.05)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}>
                            <div style={{ maxWidth: 600, margin: '0 auto', background: contentBg, borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.2)', fontFamily: fontFamily, wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                {blocks.length === 0 ? (
                                    <div style={{ padding: 100, textAlign: 'center' }}>
                                        <Empty description={<Text style={{ color: '#475569' }}>Your canvas is empty. Add blocks from the sidebar to begin.</Text>} />
                                    </div>
                                ) : (
                                    <div style={{ padding: 30 }}>
                                        {blocks.map((block, index) => (
                                            <div
                                                key={block.id}
                                                onClick={() => setSelectedBlockId(block.id)}
                                                style={{
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    padding: '2px 0',
                                                    borderRadius: 8,
                                                    border: selectedBlockId === block.id ? '2px solid #3b82f6' : '2px dashed transparent',
                                                    transition: 'all 0.2s',
                                                    marginBottom: 32, // Increased margin for controls
                                                }}
                                            >
                                                {/* Logic to render block based on type - simplified for preview */}
                                                <div style={{ pointerEvents: 'none' }}>
                                                    {block.type === 'HEADING' && <h1 style={{ ...block.style, margin: 0, fontFamily }}>{block.content}</h1>}
                                                    {block.type === 'TEXT' && <div style={{ ...block.style, lineHeight: 1.6, fontFamily }} dangerouslySetInnerHTML={{ __html: block.content }} />}
                                                    {block.type === 'BUTTON' && (
                                                        <div style={{ textAlign: block.style?.textAlign as any, padding: block.style?.padding }}>
                                                            <div style={{
                                                                background: block.style?.backgroundColor,
                                                                color: block.style?.color,
                                                                padding: '12px 24px',
                                                                borderRadius: block.style?.borderRadius,
                                                                display: 'inline-block',
                                                                fontWeight: 'bold',
                                                                fontFamily
                                                            }}>
                                                                {block.content}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {block.type === 'IMAGE' && (
                                                        <div style={{ textAlign: block.style?.textAlign as any, padding: block.style?.padding }}>
                                                            <img src={block.style?.imageUrl} style={{ maxWidth: '100%', borderRadius: 8 }} alt="Block" />
                                                        </div>
                                                    )}
                                                    {block.type === 'DIVIDER' && <div style={{ padding: block.style?.padding }}><hr style={{ border: 0, borderTop: '1px solid #e2e8f0' }} /></div>}
                                                    {block.type === 'SPACER' && <div style={{ height: block.style?.height }}></div>}
                                                </div>

                                                {selectedBlockId === block.id && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        right: 0,
                                                        top: -36,
                                                        display: 'flex',
                                                        flexDirection: 'row',
                                                        gap: 6,
                                                        zIndex: 20,
                                                        background: '#1a1b1e',
                                                        padding: '4px 10px',
                                                        borderRadius: '8px 8px 0 0',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderBottom: 'none',
                                                        boxShadow: '0 -4px 12px rgba(0,0,0,0.2)'
                                                    }}>
                                                        <Tooltip title="Move Up"><Button size="small" type="text" icon={<ArrowUpOutlined style={{ color: '#94a3b8' }} />} onClick={(e) => { e.stopPropagation(); moveBlock(index, 'up'); }} /></Tooltip>
                                                        <Tooltip title="Move Down"><Button size="small" type="text" icon={<ArrowDownOutlined style={{ color: '#94a3b8' }} />} onClick={(e) => { e.stopPropagation(); moveBlock(index, 'down'); }} /></Tooltip>
                                                        <Divider type="vertical" style={{ borderColor: 'rgba(255,255,255,0.1)', height: 16, margin: '4px 2px' }} />
                                                        <Tooltip title="Delete"><Button size="small" type="text" icon={<DeleteOutlined style={{ color: '#ef4444' }} />} onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }} /></Tooltip>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Col>

                    {/* Right: Global & Config */}
                    <Col span={6}>
                        <Card className="premium-card designer-sidebar" size="small" style={{ height: 'calc(100vh - 140px)', overflowY: 'auto' }}>
                            <Title level={5} style={{ color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, letterSpacing: 0.5 }}>
                                <FileTextOutlined style={{ fontSize: 14 }} /> TEMPLATE DETAILS
                            </Title>
                            <Form.Item name="name" label={<Text style={{ color: '#94a3b8', fontSize: 11 }}>TEMPLATE NAME</Text>} rules={[{ required: true }]}>
                                <Input placeholder="e.g. Summer Promotion" className="premium-input" />
                            </Form.Item>
                            <Form.Item name="subject" label={<Text style={{ color: '#94a3b8', fontSize: 11 }}>EMAIL SUBJECT</Text>} rules={[{ required: true }]}>
                                <Input placeholder="Don't miss out on our sale!" className="premium-input" />
                            </Form.Item>

                            <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '24px 0' }} />
                            <Title level={5} style={{ color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, letterSpacing: 0.5 }}>
                                <BgColorsOutlined style={{ fontSize: 14 }} /> GLOBAL DESIGN
                            </Title>

                            <Space direction="vertical" style={{ width: '100%' }} size="large">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 13, color: '#94a3b8' }}>Canvas BG</Text>
                                    <ColorPicker value={globalBg} onChange={(c) => setGlobalBg(c.toHexString())} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 13, color: '#94a3b8' }}>Content BG</Text>
                                    <ColorPicker value={contentBg} onChange={(c) => setContentBg(c.toHexString())} />
                                </div>
                                <Form.Item label={<Text style={{ color: '#94a3b8', fontSize: 11 }}>TYPOGRAPHY</Text>} style={{ marginBottom: 0 }}>
                                    <Select value={fontFamily} onChange={setFontFamily} className="premium-select">
                                        <Select.Option value="Inter, system-ui, sans-serif">Inter (Modern)</Select.Option>
                                        <Select.Option value="'Outfit', sans-serif">Outfit (Premium)</Select.Option>
                                        <Select.Option value="'Roboto', sans-serif">Roboto (Clean)</Select.Option>
                                        <Select.Option value="'Georgia', serif">Georgia (Classic)</Select.Option>
                                    </Select>
                                </Form.Item>
                            </Space>

                            <div style={{ marginTop: 40, padding: 16, background: 'rgba(0,223,154,0.05)', borderRadius: 12, border: '1px solid rgba(0,223,154,0.1)' }}>
                                <Badge status="processing" color="#00df9a" text={<Text style={{ color: '#00df9a', fontSize: 12, fontWeight: 700 }}>LIVE SYNC ENABLED</Text>} />
                                <div style={{ marginTop: 8, fontSize: 11, color: '#475569' }}>
                                    All changes are tracked in real-time. Hit save to push updates to your automation engine.
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>
            </Form>
        </div>
    );
};

export default EmailBuilder;
