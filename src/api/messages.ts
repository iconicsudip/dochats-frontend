import apiClient from './apiClient';

export interface Message {
    id: string;
    conversationId: string;
    content: string;
    type: string;
    isFromAdmin: boolean;
    isRead: boolean;
    createdAt: string;
    linkPreview?: any;
}

export const messagesApi = {
    getMessages: async (conversationId: string): Promise<Message[]> => {
        const res = await apiClient.get(`/messages?conversationId=${conversationId}`);
        return res.data;
    },
    sendMessage: async (conversationId: string, content: string, isFromAdmin: boolean = true): Promise<Message> => {
        const res = await apiClient.post(`/messages`, { conversationId, content, isFromAdmin });
        return res.data;
    }
};
