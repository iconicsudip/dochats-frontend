import React from 'react';
import { X, Search, Link2 } from 'lucide-react';

interface LinkPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    linkSearch: string;
    setLinkSearch: (search: string) => void;
    allLinkItems: any[];
    handleSend: (e?: React.FormEvent, systemLink?: any) => void;
    LINK_TYPE_ICONS: Record<string, React.ReactNode>;
}

const LinkPickerModal: React.FC<LinkPickerModalProps> = ({
    isOpen,
    onClose,
    linkSearch,
    setLinkSearch,
    allLinkItems,
    handleSend,
    LINK_TYPE_ICONS
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-slate-900/40 p-4">
            <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-200/80">
                    <h3 className="font-semibold text-[16px] text-slate-900 m-0">Link from system</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="px-6 py-4 border-b border-slate-200/80 bg-white">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
                        <input
                            value={linkSearch}
                            onChange={(e) => setLinkSearch(e.target.value)}
                            placeholder="Search contacts, bookings, forms..."
                            className="w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-xl text-[15px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-slate-800 placeholder:text-slate-400 shadow-sm"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-3">
                    {allLinkItems.length === 0 ? (
                        <p className="text-center text-slate-400 text-[15px] py-10">No items found</p>
                    ) : (
                        <div className="space-y-1">
                            {allLinkItems.map((item) => (
                                <button
                                    key={`${item.type}-${item.id}`}
                                    onClick={() => handleSend(undefined, item)}
                                    className="w-full text-left px-4 py-3.5 rounded-2xl flex items-center gap-4 cursor-pointer border border-transparent hover:border-slate-200 hover:bg-slate-50/50 transition-all group"
                                >
                                    <span className="text-primary/90 flex items-center justify-center [&>svg]:w-5 [&>svg]:h-5 [&>svg]:stroke-[1.5]">
                                        {LINK_TYPE_ICONS[item.type] || <Link2 className="w-5 h-5" />}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-[15px] text-slate-800 truncate tracking-tight">{item.label}</div>
                                        {item.subtitle && <div className="text-[14px] text-slate-500 truncate mt-0.5">{item.subtitle}</div>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LinkPickerModal;
