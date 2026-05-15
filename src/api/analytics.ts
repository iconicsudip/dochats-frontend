import apiClient from './apiClient';

export interface AnalyticsData {
    kpi: {
        revenueEst: number;
        leadsThisMonth: number;
        bookingsThisMonth: number;
        automationRuns: number;
    };
    funnel: {
        stage: string;
        count: number;
        color: string;
    }[];
    topSources: {
        label: string;
        value: number;
        color: string;
    }[];
    weeklyBookings: {
        day: string;
        val: number;
    }[];
    activityFeed: {
        id: string;
        type: string;
        text: string;
        name: string;
        time: string;
        color: string;
    }[];
}

export const analyticsApi = {
    getAnalytics: async (): Promise<AnalyticsData> => {
        const res = await apiClient.get('/analytics');
        return res.data;
    }
};
