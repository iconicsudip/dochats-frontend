import apiClient from './apiClient';

export interface BroadcastCampaign {
    id: string;
    name: string;
    targetFilter: {
        linkId?: string;
        leadStatus?: string;
    };
    content: string;
    mediaUrl?: string;
    status: 'PENDING' | 'SENT' | 'FAILED';
    scheduledAt?: string;
    sentAt?: string;
    createdAt: string;
    updatedAt: string;
}

export const broadcastsApi = {
    getCampaigns: async (): Promise<BroadcastCampaign[]> => {
        const response = await apiClient.get<BroadcastCampaign[]>('/campaigns');
        return response.data;
    },
    createCampaign: async (data: Partial<BroadcastCampaign>): Promise<BroadcastCampaign> => {
        const response = await apiClient.post<BroadcastCampaign>('/campaigns', data);
        return response.data;
    },
    sendCampaign: async (id: string): Promise<{ success: boolean; message: string }> => {
        const response = await apiClient.post<{ success: boolean; message: string }>(`/campaigns/${id}/send`);
        return response.data;
    },
    deleteCampaign: async (id: string): Promise<{ success: boolean }> => {
        const response = await apiClient.delete<{ success: boolean }>(`/campaigns/${id}`);
        return response.data;
    }
};
