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
    automationTriggered?: string;
    createdAt: string;
    updatedAt: string;
}

export const bookingsApi = {
    getBookings: async () => {
        const response = await apiClient.get<Booking[]>('/bookings');
        return response.data;
    },
    createBooking: async (data: Partial<Booking> & { time?: string }) => {
        const response = await apiClient.post<Booking>('/bookings', data);
        return response.data;
    },
    updateStatus: async (id: string, status: string) => {
        const response = await apiClient.patch(`/bookings/${id}/status`, { status });
        return response.data;
    }
};
