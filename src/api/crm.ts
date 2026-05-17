import apiClient from './apiClient';

export interface ActivityItem {
    id: string;
    type: 'NOTE' | 'EMAIL' | 'CALL' | 'MEETING' | 'TASK';
    title: string;
    description: string;
    date: string;
    status?: string;
    dueDate?: string;
}

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

    jobTitle?: string;
    company?: string;
    city?: string;
    address?: string;
    lifecycleStage?: string;
    favoriteTopics?: string[];
    preferredChannels?: string[];
    communicationSubs?: { newsletter?: boolean; marketing?: boolean };
    aiSummary?: string;
    aiInsights?: {
        sentiment?: string;
        suggestedFollowUps?: string[];
        conversationSummary?: string;
    };
    associations?: {
        companies?: { name: string; primary?: boolean }[];
        deals?: { title: string; amount: number; stage: string }[];
        tickets?: any[];
        relationshipLabel?: string;
    };
    customFields?: Record<string, any>;
    activityTimeline?: ActivityItem[];

    createdAt: string;
    updatedAt: string;
}

export const crmApi = {
    getLeads: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
        const query = params ? `?${new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined) as any).toString()}` : '';
        const response = await apiClient.get(`/crm${query}`);
        return response.data;
    },
    getLead: async (id: string) => {
        const response = await apiClient.get<CrmLead>(`/crm/${id}`);
        return response.data;
    },
    createLead: async (data: Partial<CrmLead>) => {
        const response = await apiClient.post<CrmLead>('/crm', data);
        return response.data;
    },
    updateStatus: async (id: string, status: string) => {
        const response = await apiClient.patch(`/crm/${id}/status`, { status });
        return response.data;
    },
    updateLead: async (id: string, data: Partial<CrmLead> & { newActivityItem?: ActivityItem }) => {
        const response = await apiClient.patch<CrmLead>(`/crm/${id}`, data);
        return response.data;
    },
    deleteLeads: async (ids: string[]) => {
        const response = await apiClient.delete(`/crm?ids=${ids.join(',')}`);
        return response.data;
    },
    bulkCreate: async (leads: Partial<CrmLead>[]) => {
        const response = await apiClient.post('/crm/bulk', { leads });
        return response.data;
    },
    updateAssociations: async (id: string, associations: any) => {
        const response = await apiClient.patch<CrmLead>(`/crm/${id}/associations`, associations);
        return response.data;
    },
    getDeals: async (params?: { page?: number; limit?: number; search?: string }) => {
        const query = params ? `?${new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined) as any).toString()}` : '';
        const response = await apiClient.get(`/crm/deals${query}`);
        return response.data;
    },
    getTickets: async (params?: { page?: number; limit?: number; search?: string }) => {
        const query = params ? `?${new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined) as any).toString()}` : '';
        const response = await apiClient.get(`/crm/tickets${query}`);
        return response.data;
    },
    getCompanies: async (params?: { page?: number; limit?: number; search?: string }) => {
        const query = params ? `?${new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined) as any).toString()}` : '';
        const response = await apiClient.get(`/crm/companies${query}`);
        return response.data;
    },
    getOrders: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
        const query = params ? `?${new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined) as any).toString()}` : '';
        const response = await apiClient.get(`/crm/orders${query}`);
        return response.data;
    }
};
