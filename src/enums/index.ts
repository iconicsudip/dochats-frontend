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
