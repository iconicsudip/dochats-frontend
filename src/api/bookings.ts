import apiClient from './apiClient';

export interface Booking {
    id: string;
    clientName: string;
    phone: string;
    service: string;
    industry?: string;
    date: string;
    time?: string;
    duration: number;
    status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
    source?: string;
    notes?: string;
    assignedTo?: string;
    formData?: any;
    leadId?: string;
    email?: string;
    meetingUrl?: string;
    googleCalendarUrl?: string;
    outlookCalendarUrl?: string;
    externalSynced?: boolean;
    automationTriggered?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CalendarConfig {
    googleCalendar: { enabled: boolean; account: string; syncToken?: string };
    outlook: { enabled: boolean; account: string };
    apple: { enabled: boolean };
    autoGenerateMeet: boolean;
}

export const bookingsApi = {
    getBookings: async (params?: { page?: number; limit?: number; search?: string; status?: string; date?: string; owner?: string }) => {
        const query = params ? `?${new URLSearchParams(Object.entries(params).filter(([_, v]) => v !== undefined) as any).toString()}` : '';
        const response = await apiClient.get(`/bookings${query}`);
        return response.data;
    },
    createBooking: async (data: Partial<Booking> & { time?: string; meetingUrl?: string }) => {
        const response = await apiClient.post<Booking>('/bookings', data);
        return response.data;
    },
    updateStatus: async (id: string, status: string) => {
        const response = await apiClient.patch(`/bookings/${id}/status`, { status });
        return response.data;
    },
    updateBooking: async (id: string, data: Partial<Booking>) => {
        const response = await apiClient.patch<Booking>(`/bookings/${id}`, data);
        return response.data;
    },
    getCalendarConfig: async () => {
        const response = await apiClient.get<CalendarConfig>('/bookings/calendar-config');
        return response.data;
    },
    updateCalendarConfig: async (calendarConfig: CalendarConfig) => {
        const response = await apiClient.post<CalendarConfig>('/bookings/calendar-config', { calendarConfig });
        return response.data;
    },
    syncExternal: async (id: string) => {
        const response = await apiClient.post<{ success: boolean; booking: Booking }>(`/bookings/${id}/sync-external`);
        return response.data;
    },
    importExternalIcal: async (icalUrl: string) => {
        const response = await apiClient.post<{ success: boolean; count: number; message: string }>('/bookings/import-ical', { icalUrl });
        return response.data;
    }
};
