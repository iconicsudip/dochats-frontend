import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Module } from '../enums';
import { useAuth } from './AuthContext';

interface ModuleContextType {
    enabledModules: Module[];
    hasModule: (module: Module) => boolean;
    loading: boolean;
    setEnabledModules: (modules: Module[]) => void;
}

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

// Default modules available to all ADMIN accounts (can be restricted by SuperAdmin)
const DEFAULT_ADMIN_MODULES: Module[] = [
    Module.OVERVIEW,
    Module.LIVE_CHAT,
    Module.CRM,
    Module.BOOKINGS,
    Module.AUTOMATION,
    Module.ANALYTICS,
    Module.LINKS,
    Module.SUB_USERS,
    Module.BILLING,
    Module.PLANS,
    Module.FORMS,
    Module.WHATSAPP,
    Module.EMAIL,
];

const SUB_USER_MODULES: Module[] = [
    Module.LIVE_CHAT,
    Module.CRM,
    Module.BOOKINGS,
];

export const ModuleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [enabledModules, setEnabledModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setEnabledModules([]);
            setLoading(false);
            return;
        }

        // Load from user object if backend provides module config
        // Falls back to default based on role
        const savedModules = user?.enabledModules as Module[] | undefined;

        if (savedModules && savedModules.length > 0) {
            setEnabledModules(savedModules);
        } else {
            if (user.role === 'SUB_USER') {
                setEnabledModules(SUB_USER_MODULES);
            } else {
                // Admin gets all modules by default (SuperAdmin will restrict)
                setEnabledModules(DEFAULT_ADMIN_MODULES);
            }
        }
        setLoading(false);
    }, [user]);

    const hasModule = useCallback((module: Module): boolean => {
        return enabledModules.includes(module);
    }, [enabledModules]);

    return (
        <ModuleContext.Provider value={{ enabledModules, hasModule, loading, setEnabledModules }}>
            {children}
        </ModuleContext.Provider>
    );
};

export const useModules = () => {
    const context = useContext(ModuleContext);
    if (!context) throw new Error('useModules must be used within ModuleProvider');
    return context;
};
