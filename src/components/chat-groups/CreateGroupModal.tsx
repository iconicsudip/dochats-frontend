import React from 'react';
import { X, Users, Loader2 } from 'lucide-react';
import { Form, Input } from 'antd';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingGroup: any;
    groupName: string;
    setGroupName: (name: string) => void;
    selectedMemberIds: string[];
    subUsers: any[];
    toggleMember: (id: string) => void;
    handleCreateOrUpdate: () => void;
    isPending: boolean;
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
    isOpen,
    onClose,
    editingGroup,
    groupName,
    setGroupName,
    selectedMemberIds,
    subUsers,
    toggleMember,
    handleCreateOrUpdate,
    isPending
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-900 m-0">{editingGroup ? 'Edit Group' : 'New Chat Group'}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <Form layout="vertical" onFinish={handleCreateOrUpdate} className="flex flex-col flex-1 overflow-hidden">
                    <div className="p-6 space-y-6 overflow-y-auto flex-1">
                        <Form.Item 
                            label={<span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Group name</span>}
                            className="mb-0"
                        >
                            <Input
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                size="large"
                                className="rounded-xl h-11"
                                placeholder="e.g. Sales Team"
                            />
                        </Form.Item>
                        <div>
                            <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                                <Users className="w-3.5 h-3.5" /> Team members
                            </label>
                            <div className="space-y-1 max-h-48 overflow-y-auto -mx-2 px-2">
                                {subUsers.map((su: any) => (
                                    <label key={su.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedMemberIds.includes(su.id)}
                                            onChange={() => toggleMember(su.id)}
                                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary/20"
                                        />
                                        <span className="text-sm text-slate-700 font-medium">{su.name || su.username}</span>
                                    </label>
                                ))}
                                {subUsers.length === 0 && (
                                    <p className="text-xs text-slate-400 p-2">Add team members under Workspace → Team first.</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-white">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer bg-white shadow-sm">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !groupName.trim()}
                            className="px-6 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                        >
                            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Save
                        </button>
                    </div>
                </Form>
            </div>
        </div>
    );
};

export default CreateGroupModal;
