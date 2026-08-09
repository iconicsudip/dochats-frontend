import apiClient from './apiClient';

export const realtimeApi = {
    getSSERealtimeUrl: (token: string): string => {
        const baseURL = apiClient.defaults.baseURL || 'http://localhost:5001/api';
        return `${baseURL}/realtime?token=${token}`;
    },
    getSSEVisitorRealtimeUrl: (conversationId: string, visitorToken: string): string => {
        const baseURL = apiClient.defaults.baseURL || 'http://localhost:5001/api';
        return `${baseURL}/realtime?conversationId=${conversationId}&visitorToken=${visitorToken}`;
    }
};
