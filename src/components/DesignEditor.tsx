import React from 'react';
import { Radio, Select } from 'antd';

export type BackgroundDesign = {
    type: 'solid' | 'gradient';
    color1: string;
    color2?: string;
    direction?: string;
};

export type ChatDesign = {
    headerBackground?: BackgroundDesign;
    chatBackground?: BackgroundDesign;
    inputBackground?: BackgroundDesign;
    adminBubbleBackground?: BackgroundDesign;
    visitorBubbleBackground?: BackgroundDesign;
};

interface DesignEditorProps {
    value?: ChatDesign;
    onChange: (value: ChatDesign) => void;
}

const defaultDesign: ChatDesign = {
    headerBackground: { type: 'solid', color1: '#202c33' },
    chatBackground: { type: 'solid', color1: '#0b141a' },
    inputBackground: { type: 'solid', color1: '#202c33' },
    adminBubbleBackground: { type: 'solid', color1: '#202c33' },
    visitorBubbleBackground: { type: 'solid', color1: '#005c4b' },
};

const ColorGradientField = ({
    label,
    value,
    onChange
}: {
    label: string;
    value: BackgroundDesign;
    onChange: (val: BackgroundDesign) => void;
}) => {
    return (
        <div className="border border-slate-200 rounded-xl p-4 bg-white/50 space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase">{label}</label>
                <Radio.Group 
                    size="small" 
                    value={value.type} 
                    onChange={e => onChange({ ...value, type: e.target.value })}
                >
                    <Radio.Button value="solid">Solid</Radio.Button>
                    <Radio.Button value="gradient">Gradient</Radio.Button>
                </Radio.Group>
            </div>

            <div className="flex items-center gap-4 pt-2">
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 font-medium">Color 1</span>
                    <input 
                        type="color" 
                        value={value.color1} 
                        onChange={e => onChange({ ...value, color1: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    />
                </div>

                {value.type === 'gradient' && (
                    <>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-500 font-medium">Color 2</span>
                            <input 
                                type="color" 
                                value={value.color2 || '#ffffff'} 
                                onChange={e => onChange({ ...value, color2: e.target.value })}
                                className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                            />
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                            <span className="text-[10px] text-slate-500 font-medium">Direction</span>
                            <Select 
                                size="small"
                                value={value.direction || 'to right'}
                                onChange={v => onChange({ ...value, direction: v })}
                                options={[
                                    { value: 'to right', label: 'To Right' },
                                    { value: 'to bottom', label: 'To Bottom' },
                                    { value: 'to bottom right', label: 'Diagonal Down' },
                                    { value: 'to top right', label: 'Diagonal Up' },
                                ]}
                            />
                        </div>
                    </>
                )}
            </div>
            
            {/* Preview Strip */}
            <div 
                className="h-2 w-full rounded-full mt-2" 
                style={{ 
                    background: value.type === 'gradient' 
                        ? `linear-gradient(${value.direction || 'to right'}, ${value.color1}, ${value.color2 || '#ffffff'})`
                        : value.color1 
                }} 
            />
        </div>
    );
};

export const DesignEditor: React.FC<DesignEditorProps> = ({ value, onChange }) => {
    const current = value || defaultDesign;

    const handleChange = (key: keyof ChatDesign, fieldVal: BackgroundDesign) => {
        onChange({
            ...current,
            [key]: fieldVal
        });
    };

    return (
        <div className="space-y-4">
            <ColorGradientField 
                label="Header Background" 
                value={current.headerBackground || defaultDesign.headerBackground!} 
                onChange={(v) => handleChange('headerBackground', v)} 
            />
            <ColorGradientField 
                label="Chat Area Background" 
                value={current.chatBackground || defaultDesign.chatBackground!} 
                onChange={(v) => handleChange('chatBackground', v)} 
            />
            <ColorGradientField 
                label="Input Box Background" 
                value={current.inputBackground || defaultDesign.inputBackground!} 
                onChange={(v) => handleChange('inputBackground', v)} 
            />
            <ColorGradientField 
                label="Admin Bubble Background (Left)" 
                value={current.adminBubbleBackground || defaultDesign.adminBubbleBackground!} 
                onChange={(v) => handleChange('adminBubbleBackground', v)} 
            />
            <ColorGradientField 
                label="Visitor Bubble Background (Right)" 
                value={current.visitorBubbleBackground || defaultDesign.visitorBubbleBackground!} 
                onChange={(v) => handleChange('visitorBubbleBackground', v)} 
            />
        </div>
    );
};
