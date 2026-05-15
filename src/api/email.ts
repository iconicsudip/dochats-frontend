import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    content: string;
    design: any;
    sesSynced: boolean;
    sesTemplateName?: string;
    updatedAt: string;
}

export const emailApi = {
    getTemplates: async (syncedOnly?: boolean): Promise<EmailTemplate[]> => {
        const response = await axios.get(`${API_URL}/email/templates`, {
            params: { syncedOnly },
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data;
    },

    createTemplate: async (data: Partial<EmailTemplate>): Promise<EmailTemplate> => {
        const response = await axios.post(`${API_URL}/email/templates`, data, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data;
    },

    updateTemplate: async (id: string, data: Partial<EmailTemplate>): Promise<{ success: boolean, sesSynced: boolean }> => {
        const response = await axios.put(`${API_URL}/email/templates/${id}`, data, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        return response.data;
    },

    syncTemplate: async (id: string): Promise<void> => {
        await axios.post(`${API_URL}/email/templates/${id}/sync`, {}, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
    },

    deleteTemplate: async (id: string): Promise<void> => {
        await axios.delete(`${API_URL}/email/templates/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
    }
};
