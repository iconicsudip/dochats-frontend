import apiClient from './apiClient';

export interface CrmLead {
    id: string;
    name: string;
    phone: string;
    email?: string;
    industry?: string;
    source?: string;
    status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';
    value: number;
    notes?: string;
    assignedTo?: string;
    lastActivity?: string;
    createdAt: string;
    updatedAt: string;
}

export const crmApi = {
    getLeads: async () => {
        const response = await apiClient.get<CrmLead[]>('/crm');
        return response.data;
    },
    createLead: async (data: Partial<CrmLead>) => {
        const response = await apiClient.post<CrmLead>('/crm', data);
        return response.data;
    },
    updateStatus: async (id: string, status: string) => {
        const response = await apiClient.patch(`/crm/${id}/status`, { status });
        return response.data;
    }
};
