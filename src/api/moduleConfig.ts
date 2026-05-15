import apiClient from './apiClient';

export const moduleConfigApi = {
    updateAdminModules: async (adminId: string, enabledModules: string[]) => {
        const response = await apiClient.patch(`/modules/admin/${adminId}`, { enabledModules });
        return response.data;
    }
};
