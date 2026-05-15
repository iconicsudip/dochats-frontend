export const TriggerType = {
    NEW_LEAD: 'new_lead',
    BOOKING_CREATED: 'booking_created',
    BOOKING_CONFIRMED: 'booking_confirmed',
    DEAL_STATUS_CHANGE: 'deal_status_change',
    NO_REPLY_24H: 'no_reply_24h',
    BOOKING_CANCELLED: 'booking_cancelled',
    FORM_SUBMITTED: 'form_submitted',
} as const;
export type TriggerType = typeof TriggerType[keyof typeof TriggerType];

export const ActionType = {
    SEND_WHATSAPP: 'send_whatsapp',
    SEND_EMAIL: 'send_email',
    CREATE_CRM_LEAD: 'create_crm_lead',
    BOOK_FOLLOWUP: 'book_followup',
    UPDATE_CRM_STATUS: 'update_crm_status',
    CREATE_BOOKING: 'create_booking',
} as const;
export type ActionType = typeof ActionType[keyof typeof ActionType];

export const AutomationStatus = {
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    DELAYED: 'DELAYED',
} as const;
export type AutomationStatus = typeof AutomationStatus[keyof typeof AutomationStatus];
