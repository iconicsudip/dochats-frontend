import apiClient from './apiClient';

export interface Conversation {
    id: string;
    linkId: string;
    linkTitle: string;
    linkSlug: string;
    visitorToken: string;
    visitorName: string;
    visitorPhone: string;
    lastMessage: string;
    lastMessageType: string;
    lastMessageAt: string;
    unreadCount: number;
    // mock UI fields for compatibility
    status?: string;
    leadScore?: number;
    industry?: string;
    source?: string;
}

export const conversationsApi = {
    getConversations: async (page = 1, limit = 20): Promise<{ data: Conversation[], total: number }> => {
        const res = await apiClient.get(`/conversations?page=${page}&limit=${limit}`);
        return res.data;
    }
};
