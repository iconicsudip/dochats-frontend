import apiClient from './apiClient';

export interface AutomationRule {
    id: string;
    name: string;
    trigger: string;
    actions: string[];
    flow?: any;
    config?: any;
    enabled: boolean;
    runs: number;
    delay?: number;
    lastRunAt?: string;
    createdAt: string;
    updatedAt: string;
}

export const automationApi = {
    getRules: async () => {
        const response = await apiClient.get<AutomationRule[]>('/automation');
        return response.data;
    },
    createRule: async (data: Partial<AutomationRule>) => {
        const response = await apiClient.post<AutomationRule>('/automation', data);
        return response.data;
    },
    updateRule: async (id: string, data: Partial<AutomationRule>) => {
        const response = await apiClient.put<AutomationRule>(`/automation/${id}`, data);
        return response.data;
    },
    toggleRule: async (id: string, enabled: boolean) => {
        const response = await apiClient.patch(`/automation/${id}/toggle`, { enabled });
        return response.data;
    },
    deleteRule: async (id: string) => {
        const response = await apiClient.delete(`/automation/${id}`);
        return response.data;
    },
    getWaTemplates: async () => {
        const response = await apiClient.get<any[]>('/automation/whatsapp-templates');
        return response.data;
    },
    runRuleManually: async (id: string, dataItems: any[]) => {
        const response = await apiClient.post(`/automation/${id}/run`, { dataItems });
        return response.data;
    },
    getLogs: async (id: string, page = 1, limit = 20) => {
        const response = await apiClient.get(`/automation/${id}/logs`, { params: { page, limit } });
        return response.data;
    },
    getMetadata: async () => {
        const response = await apiClient.get('/automation/metadata');
        return response.data;
    }
};
