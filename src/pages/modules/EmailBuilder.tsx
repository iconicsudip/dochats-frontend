import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { emailApi, EmailTemplate } from '../../api/email';
import { useAuth } from '../../contexts/AuthContext';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
    ArrowLeft, Mail, Eye, Save, LayoutGrid, Type, Heading1, AlignLeft, 
    AlignCenter, AlignRight, Link, Image as ImageIcon, Minus, Maximize2,
    MousePointer2, Palette, FileText, Zap, Settings, ArrowUp, ArrowDown, Trash2, Loader2
} from 'lucide-react';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

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
    HEADING: { id: '', type: 'HEADING', content: 'Catchy Heading', style: { fontSize: 28, textAlign: 'center', padding: 20, fontWeight: 800, color: '#1e293b' } },
    TEXT: { id: '', type: 'TEXT', content: 'Share your story here. Use this space to connect with your audience and deliver your message effectively.', style: { fontSize: 16, textAlign: 'left', padding: 15, color: '#475569' } },
    BUTTON: { id: '', type: 'BUTTON', content: 'Claim Your Offer', style: { backgroundColor: '#2563eb', color: '#ffffff', borderRadius: 8, textAlign: 'center', padding: 16, link: '#' } },
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
    
    // Global Settings
    const [templateName, setTemplateName] = useState('');
    const [templateSubject, setTemplateSubject] = useState('');
    const [globalBg, setGlobalBg] = useState('#f8fafc');
    const [contentBg, setContentBg] = useState('#ffffff');
    const [fontFamily, setFontFamily] = useState('Inter, system-ui, sans-serif');

    // Toast Notification State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
    const showToast = (msg: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setToast({ message: msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        if (id) {
            fetchTemplate(id);
        } else {
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
                setGlobalBg(template.design?.globalBg || '#f8fafc');
                setContentBg(template.design?.contentBg || '#ffffff');
                setFontFamily(template.design?.fontFamily || 'Inter, system-ui, sans-serif');
                setTemplateName(template.name || '');
                setTemplateSubject(template.subject || '');
            }
        } catch (error) {
            showToast('Failed to load template', 'error');
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
                        .footer { padding: 30px; text-align: center; color: #64748b; font-size: 13px; background-color: rgba(0,0,0,0.02); }
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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!templateName || !templateSubject) {
            return showToast('Template name and subject are required', 'error');
        }

        setLoading(true);
        try {
            const payload = {
                name: templateName,
                subject: templateSubject,
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
                showToast('Template updated successfully', 'success');
            } else {
                await emailApi.createTemplate(payload);
                showToast('Template created successfully', 'success');
            }
            setTimeout(() => navigate('/dashboard/email'), 1000);
        } catch (error) {
            showToast('Failed to save template', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex items-center justify-center h-[80vh] font-sans">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <span className="text-xs font-semibold text-slate-500">Loading designer...</span>
                </div>
            </div>
        );
    }

    const selectedBlock = blocks.find(b => b.id === selectedBlockId);

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] -m-6 animate-in fade-in duration-500 font-sans text-slate-800">
            {/* Top Navigation */}
            <div className="flex justify-between items-center h-[72px] px-6 border-b border-slate-200 bg-white shrink-0 shadow-2xs z-10">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/dashboard/email')}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" /> <span>Back to Hub</span>
                    </button>
                    <div className="w-px h-6 bg-slate-200"></div>
                    <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-primary" />
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight m-0">{id ? 'Edit Template' : 'New Email Template'}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        type="button"
                        onClick={() => {
                            const win = window.open('', '_blank');
                            win?.document.write(generateHTML());
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                        <Eye className="w-4 h-4" /> <span>Preview</span>
                    </button>
                    <button 
                        type="button"
                        onClick={handleSave as any}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{id ? 'Update Template' : 'Save Template'}</span>
                    </button>
                </div>
            </div>

            <form onSubmit={handleSave} className="flex flex-1 overflow-hidden">
                {/* Left: Components */}
                <div className="w-[300px] bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
                    <div className="p-5">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <LayoutGrid className="w-4 h-4" /> <span>Blocks</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button type="button" onClick={() => addBlock('HEADING')} className="flex flex-col items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors cursor-pointer">
                                <Heading1 className="w-5 h-5 text-slate-400" /> <span>Heading</span>
                            </button>
                            <button type="button" onClick={() => addBlock('TEXT')} className="flex flex-col items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors cursor-pointer">
                                <Type className="w-5 h-5 text-slate-400" /> <span>Text</span>
                            </button>
                            <button type="button" onClick={() => addBlock('BUTTON')} className="flex flex-col items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors cursor-pointer">
                                <Link className="w-5 h-5 text-slate-400" /> <span>Button</span>
                            </button>
                            <button type="button" onClick={() => addBlock('IMAGE')} className="flex flex-col items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors cursor-pointer">
                                <ImageIcon className="w-5 h-5 text-slate-400" /> <span>Image</span>
                            </button>
                            <button type="button" onClick={() => addBlock('DIVIDER')} className="flex flex-col items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors cursor-pointer">
                                <Minus className="w-5 h-5 text-slate-400" /> <span>Divider</span>
                            </button>
                            <button type="button" onClick={() => addBlock('SPACER')} className="flex flex-col items-center gap-2 p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors cursor-pointer">
                                <Maximize2 className="w-5 h-5 text-slate-400" /> <span>Spacer</span>
                            </button>
                        </div>

                        {selectedBlock ? (
                            <div className="animate-in fade-in slide-in-from-bottom-2">
                                <hr className="border-slate-200 my-6" />
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2 m-0">
                                        <Settings className="w-4 h-4" /> <span>Block Settings</span>
                                    </h3>
                                    <button type="button" onClick={() => deleteBlock(selectedBlockId!)} className="text-red-400 hover:text-red-600 p-1 bg-red-50 hover:bg-red-100 rounded-md transition-colors cursor-pointer">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <div className="space-y-5">
                                    {selectedBlock.type !== 'DIVIDER' && (
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Content</label>
                                            {selectedBlock.type === 'TEXT' ? (
                                                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[150px] text-xs font-medium">
                                                    <ReactQuill
                                                        theme="snow"
                                                        value={selectedBlock.content}
                                                        onChange={(content) => updateBlock(selectedBlockId!, { content })}
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
                                                <textarea
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 resize-y min-h-[100px]"
                                                    value={selectedBlock.content}
                                                    onChange={(e) => updateBlock(selectedBlockId!, { content: e.target.value })}
                                                />
                                            )}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Size (px)</label>
                                            <input 
                                                type="number" 
                                                min={8} max={100} 
                                                value={selectedBlock.style?.fontSize || 16}
                                                onChange={e => updateBlock(selectedBlockId!, { style: { fontSize: parseInt(e.target.value) || 16 } })}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Color</label>
                                            <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-1 bg-white focus-within:ring-2 focus-within:ring-primary/20">
                                                <input 
                                                    type="color" 
                                                    value={selectedBlock.style?.color || '#000000'}
                                                    onChange={e => updateBlock(selectedBlockId!, { style: { color: e.target.value } })}
                                                    className="w-7 h-7 rounded border border-slate-200 cursor-pointer shrink-0"
                                                />
                                                <input 
                                                    type="text" 
                                                    value={selectedBlock.style?.color || '#000000'}
                                                    onChange={e => updateBlock(selectedBlockId!, { style: { color: e.target.value } })}
                                                    className="w-full text-xs font-mono uppercase focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Padding (px)</label>
                                            <input 
                                                type="number" 
                                                min={0} max={100} 
                                                value={selectedBlock.style?.padding || 0}
                                                onChange={e => updateBlock(selectedBlockId!, { style: { padding: parseInt(e.target.value) || 0 } })}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Align</label>
                                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                                <button type="button" onClick={() => updateBlock(selectedBlockId!, { style: { textAlign: 'left' } })} className={cn("p-1.5 rounded flex-1 flex justify-center cursor-pointer", selectedBlock.style?.textAlign === 'left' ? "bg-white shadow-2xs text-primary font-bold" : "text-slate-500")}>
                                                    <AlignLeft className="w-4 h-4" />
                                                </button>
                                                <button type="button" onClick={() => updateBlock(selectedBlockId!, { style: { textAlign: 'center' } })} className={cn("p-1.5 rounded flex-1 flex justify-center cursor-pointer", selectedBlock.style?.textAlign === 'center' ? "bg-white shadow-2xs text-primary font-bold" : "text-slate-500")}>
                                                    <AlignCenter className="w-4 h-4" />
                                                </button>
                                                <button type="button" onClick={() => updateBlock(selectedBlockId!, { style: { textAlign: 'right' } })} className={cn("p-1.5 rounded flex-1 flex justify-center cursor-pointer", selectedBlock.style?.textAlign === 'right' ? "bg-white shadow-2xs text-primary font-bold" : "text-slate-500")}>
                                                    <AlignRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedBlock.type === 'BUTTON' && (
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Link URL</label>
                                                <div className="relative">
                                                    <Link className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                                    <input 
                                                        type="text" 
                                                        value={selectedBlock.style?.link || ''}
                                                        onChange={e => updateBlock(selectedBlockId!, { style: { link: e.target.value } })}
                                                        className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Button Color</label>
                                                <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-1 bg-white focus-within:ring-2 focus-within:ring-primary/20">
                                                    <input 
                                                        type="color" 
                                                        value={selectedBlock.style?.backgroundColor || '#2563eb'}
                                                        onChange={e => updateBlock(selectedBlockId!, { style: { backgroundColor: e.target.value } })}
                                                        className="w-7 h-7 rounded border border-slate-200 cursor-pointer shrink-0"
                                                    />
                                                    <input 
                                                        type="text" 
                                                        value={selectedBlock.style?.backgroundColor || '#2563eb'}
                                                        onChange={e => updateBlock(selectedBlockId!, { style: { backgroundColor: e.target.value } })}
                                                        className="w-full text-xs font-mono uppercase focus:outline-none"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedBlock.type === 'IMAGE' && (
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Image URL</label>
                                            <div className="relative">
                                                <ImageIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                                <input 
                                                    type="text" 
                                                    value={selectedBlock.style?.imageUrl || ''}
                                                    onChange={e => updateBlock(selectedBlockId!, { style: { imageUrl: e.target.value } })}
                                                    className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 px-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-6">
                                <MousePointer2 className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                <p className="text-xs font-medium text-slate-500 m-0">Select a block in the preview to adjust its properties.</p>
                            </div>
                        )}

                        <hr className="border-slate-200 my-6" />
                        
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-2 m-0">
                                <Zap className="w-4 h-4 text-blue-500" /> <span>Variables</span>
                            </h3>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {['name', 'email', 'phone', 'booking_date', 'booking_time', 'lead_source'].map(v => (
                                    <button
                                        key={v}
                                        type="button"
                                        onClick={() => {
                                            const tag = `{{${v}}}`;
                                            navigator.clipboard.writeText(tag);
                                            showToast(`Copied ${tag}`, 'success');
                                        }}
                                        className="px-2.5 py-1 bg-white border border-blue-200 text-blue-600 rounded-md text-[10px] font-mono hover:bg-blue-100 transition-colors cursor-pointer"
                                    >
                                        {`{{${v}}}`}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Middle: Live Canvas */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-10" style={{ backgroundColor: globalBg, transition: 'background-color 0.3s' }}>
                    <div 
                        className="max-w-[600px] mx-auto rounded-xl overflow-hidden shadow-lg transition-colors duration-300 border border-slate-200/50" 
                        style={{ backgroundColor: contentBg, fontFamily }}
                    >
                        {blocks.length === 0 ? (
                            <div className="p-24 text-center">
                                <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-xs font-medium text-slate-400 m-0">Your canvas is empty. Add blocks from the sidebar to begin.</p>
                            </div>
                        ) : (
                            <div className="p-8 pb-32">
                                {blocks.map((block, index) => (
                                    <div
                                        key={block.id}
                                        onClick={() => setSelectedBlockId(block.id)}
                                        className={cn(
                                            "relative cursor-pointer py-0.5 rounded-lg border-2 transition-all group mb-8",
                                            selectedBlockId === block.id ? "border-primary" : "border-transparent hover:border-slate-200"
                                        )}
                                    >
                                        <div className="pointer-events-none break-words">
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
                                            <div className="absolute right-0 -top-10 flex gap-1 z-20 bg-slate-900 p-1 rounded-t-lg shadow-lg">
                                                <button type="button" onClick={(e) => { e.stopPropagation(); moveBlock(index, 'up'); }} className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer" title="Move Up"><ArrowUp className="w-4 h-4" /></button>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); moveBlock(index, 'down'); }} className="p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer" title="Move Down"><ArrowDown className="w-4 h-4" /></button>
                                                <div className="w-px h-4 bg-slate-700 mx-1 my-auto"></div>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); deleteBlock(block.id); }} className="p-1 text-red-400 hover:text-red-300 hover:bg-slate-700 rounded transition-colors cursor-pointer" title="Delete"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Global & Config */}
                <div className="w-[300px] bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto">
                    <div className="p-5">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 m-0">
                            <FileText className="w-4 h-4" /> <span>Template Details</span>
                        </h3>
                        <div className="space-y-4 mb-8 mt-3">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Template Name *</label>
                                <input 
                                    required 
                                    value={templateName} onChange={e => setTemplateName(e.target.value)}
                                    placeholder="e.g. Summer Promotion" 
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20" 
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Subject *</label>
                                <input 
                                    required 
                                    value={templateSubject} onChange={e => setTemplateSubject(e.target.value)}
                                    placeholder="Don't miss out on our sale!" 
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20" 
                                />
                            </div>
                        </div>

                        <hr className="border-slate-200 my-6" />

                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2 m-0">
                            <Palette className="w-4 h-4" /> <span>Global Design</span>
                        </h3>
                        
                        <div className="space-y-5 mt-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-600">Canvas BG</span>
                                <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-1 bg-white focus-within:ring-2 focus-within:ring-primary/20">
                                    <input 
                                        type="color" 
                                        value={globalBg} onChange={e => setGlobalBg(e.target.value)}
                                        className="w-6 h-6 rounded border border-slate-200 cursor-pointer"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-600">Content BG</span>
                                <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-1 bg-white focus-within:ring-2 focus-within:ring-primary/20">
                                    <input 
                                        type="color" 
                                        value={contentBg} onChange={e => setContentBg(e.target.value)}
                                        className="w-6 h-6 rounded border border-slate-200 cursor-pointer"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Typography</label>
                                <select 
                                    value={fontFamily} onChange={e => setFontFamily(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                                >
                                    <option value="Inter, system-ui, sans-serif">Inter (Modern)</option>
                                    <option value="'Outfit', sans-serif">Outfit (Premium)</option>
                                    <option value="'Roboto', sans-serif">Roboto (Clean)</option>
                                    <option value="'Georgia', serif">Georgia (Classic)</option>
                                </select>
                            </div>
                        </div>

                        <div className="mt-10 p-4 bg-green-50 rounded-xl border border-green-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Live Sync Enabled</span>
                            </div>
                            <p className="text-xs font-medium text-slate-600 m-0">
                                All changes are tracked in real-time. Hit save to push updates to your automation engine.
                            </p>
                        </div>
                    </div>
                </div>
            </form>

            {toast && (
                <div className="fixed bottom-5 right-5 z-[300] flex items-center gap-3 px-4 py-3 bg-slate-900 text-white text-xs font-semibold rounded-2xl shadow-xl animate-in slide-in-from-bottom-4 duration-300">
                    <div className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        toast.type === 'success' ? "bg-emerald-400" :
                        toast.type === 'error' ? "bg-red-400" : "bg-amber-400"
                    )} />
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
};

export default EmailBuilder;
