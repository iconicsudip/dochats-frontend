import apiClient from './apiClient';

export interface WhatsAppTemplate {
    name: string;
    status: string;
    category: string;
    language: string;
    components: any[];
}

export interface WhatsAppPhone {
    id: string;
    display_phone_number: string;
    verified_name: string;
    quality_rating: string;
}

export const whatsappApi = {
    getAuthState: async () => {
        const response = await apiClient.get('/whatsapp/auth/state');
        return response.data;
    },
    handleCallback: async (code: string, wabaId?: string, phoneNumberId?: string, businessId?: string) => {
        const response = await apiClient.post('/whatsapp/auth/callback', { code, wabaId, phoneNumberId, businessId });
        return response.data;
    },
    getConfig: async () => {
        const response = await apiClient.get('/whatsapp/config');
        return response.data;
    },
    updateConfig: async (whatsappConfig: any) => {
        const response = await apiClient.put('/whatsapp/config', { whatsappConfig });
        return response.data;
    },
    getPhones: async () => {
        const response = await apiClient.get<WhatsAppPhone[]>('/whatsapp/phones');
        return response.data;
    },
    getTemplates: async () => {
        const response = await apiClient.get<WhatsAppTemplate[]>('/whatsapp/templates');
        return response.data;
    },
    createTemplate: async (data: any) => {
        const response = await apiClient.post('/whatsapp/templates', data);
        return response.data;
    },
    deleteTemplate: async (templateName: string) => {
        const response = await apiClient.delete(`/whatsapp/templates/${templateName}`);
        return response.data;
    },
    sendMessage: async (data: { to: string, templateName: string, components?: any[], phoneNumberId?: string }) => {
        const response = await apiClient.post('/whatsapp/messages', data);
        return response.data;
    },
    getProfile: async (phoneId: string) => {
        const response = await apiClient.get(`/whatsapp/profile/${phoneId}`);
        return response.data;
    },
    updateProfile: async (phoneId: string, data: any) => {
        const response = await apiClient.post(`/whatsapp/profile/${phoneId}`, data);
        return response.data;
    },
    getAnalytics: async () => {
        const response = await apiClient.get('/whatsapp/analytics');
        return response.data;
    }
};
