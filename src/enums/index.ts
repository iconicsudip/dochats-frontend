export const Role = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ADMIN: 'ADMIN',
    SUB_USER: 'SUB_USER'
} as const;
export type Role = typeof Role[keyof typeof Role];

export const MessageType = {
    TEXT: 'TEXT',
    AUDIO: 'AUDIO'
} as const;
export type MessageType = typeof MessageType[keyof typeof MessageType];

export const Module = {
    OVERVIEW: 'OVERVIEW',
    LIVE_CHAT: 'LIVE_CHAT',
    CHAT_GROUPS: 'CHAT_GROUPS',
    CRM: 'CRM',
    BOOKINGS: 'BOOKINGS',
    AUTOMATION: 'AUTOMATION',
    ANALYTICS: 'ANALYTICS',
    LINKS: 'LINKS',
    SUB_USERS: 'SUB_USERS',
    BILLING: 'BILLING',
    PLANS: 'PLANS',
    FORMS: 'FORMS',
    WHATSAPP: 'WHATSAPP',
    EMAIL: 'EMAIL',
} as const;
export type Module = typeof Module[keyof typeof Module];

export const ModuleLabel: Record<Module, string> = {
    OVERVIEW: 'Overview',
    LIVE_CHAT: 'Live Chat',
    CHAT_GROUPS: 'Chat Groups',
    CRM: 'CRM & Pipeline',
    BOOKINGS: 'Bookings',
    AUTOMATION: 'Automation',
    ANALYTICS: 'Analytics',
    LINKS: 'Smart Links',
    SUB_USERS: 'Team',
    BILLING: 'Billing',
    PLANS: 'Plans',
    FORMS: 'Dynamic Forms',
    WHATSAPP: 'WhatsApp Business',
    EMAIL: 'Email Marketing',
};
