import apiClient from './apiClient';

export const formsApi = {
    getForms: () => apiClient.get('/forms'),
    getForm: (id: string) => apiClient.get(`/forms/public/${id}`),
    createForm: (data: any) => apiClient.post('/forms', data),
    updateForm: (id: string, data: any) => apiClient.put(`/forms/${id}`, data),
    deleteForm: (id: string) => apiClient.delete(`/forms/${id}`),
    submitResponse: (id: string, data: any) => apiClient.post(`/forms/public/${id}/submit`, { data }),
    getResponses: (id: string) => apiClient.get(`/forms/${id}/responses`),
};
