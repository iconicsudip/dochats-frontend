import React from 'react';
import {
    CalendarOutlined, FundOutlined, BellOutlined,
    WhatsAppOutlined, MailOutlined, RobotOutlined, CheckCircleOutlined,
    FormOutlined
} from '@ant-design/icons';

import { TriggerType, ActionType } from '../enums/automation';

export { TriggerType, ActionType };

export const TRIGGER_META: Record<TriggerType, { label: string; icon: React.ReactNode; color: string; module: string }> = {
    [TriggerType.NEW_LEAD]: { label: 'Live Chat Lead', icon: <RobotOutlined />, color: '#00df9a', module: 'Live Chat' },
    [TriggerType.BOOKING_CREATED]: { label: 'Booking Created', icon: <CalendarOutlined />, color: '#3b82f6', module: 'Bookings' },
    [TriggerType.BOOKING_CONFIRMED]: { label: 'Booking Confirmed', icon: <CheckCircleOutlined />, color: '#3b82f6', module: 'Bookings' },
    [TriggerType.DEAL_STATUS_CHANGE]: { label: 'CRM Status Update', icon: <FundOutlined />, color: '#a855f7', module: 'CRM' },
    [TriggerType.NO_REPLY_24H]: { label: 'No Reply (24h)', icon: <BellOutlined />, color: '#f59e0b', module: 'Live Chat' },
    [TriggerType.BOOKING_CANCELLED]: { label: 'Booking Cancelled', icon: <CalendarOutlined />, color: '#ef4444', module: 'Bookings' },
    [TriggerType.FORM_SUBMITTED]: { label: 'Form Submitted', icon: <FormOutlined />, color: '#00df9a', module: 'Forms' },
};

export const ACTION_META: Record<ActionType, { label: string; icon: React.ReactNode; color: string; category: string }> = {
    [ActionType.SEND_WHATSAPP]: { label: 'Send WhatsApp', icon: <WhatsAppOutlined />, color: '#25d366', category: 'Messaging' },
    [ActionType.SEND_EMAIL]: { label: 'Send Email', icon: <MailOutlined />, color: '#3b82f6', category: 'Messaging' },
    [ActionType.CREATE_CRM_LEAD]: { label: 'Create CRM Lead', icon: <FundOutlined />, color: '#a855f7', category: 'CRM' },
    [ActionType.BOOK_FOLLOWUP]: { label: 'Schedule Follow-up', icon: <CalendarOutlined />, color: '#f59e0b', category: 'CRM' },
    [ActionType.UPDATE_CRM_STATUS]: { label: 'Update CRM Status', icon: <FundOutlined />, color: '#a855f7', category: 'CRM' },
    [ActionType.CREATE_BOOKING]: { label: 'Create Booking', icon: <CalendarOutlined />, color: '#3b82f6', category: 'Bookings' },
};

export const FLOW_TEMPLATES = [
    {
        name: 'Real Estate: Lead Nurture',
        industry: 'Real Estate',
        trigger: 'form_submitted',
        description: 'Instant WhatsApp greeting + Email brochure.',
        nodes: [
            { id: '1', type: 'ACTION', action: 'send_whatsapp', config: { whatsappTemplate: 'real_estate_welcome' }, failover: 'send_email' },
            { id: '2', type: 'ACTION', action: 'send_email', config: {}, failover: null }
        ]
    },
    {
        name: 'Healthcare: Patient Prep',
        industry: 'Healthcare',
        trigger: 'booking_confirmed',
        description: 'Confirmation email + WhatsApp prep instructions 24h before.',
        nodes: [
            { id: '1', type: 'ACTION', action: 'send_email', config: { subject: 'Appointment Confirmed' }, failover: null },
            { id: '2', type: 'ACTION', action: 'send_whatsapp', config: { whatsappTemplate: 'healthcare_instructions', delayMinutes: 1440 }, failover: null },
            { id: '3', type: 'ACTION', action: 'book_followup', config: { delayMinutes: 2880 }, failover: null }
        ]
    },
    {
        name: 'E-commerce: Order Recovery',
        industry: 'E-commerce',
        trigger: 'form_submitted',
        description: 'Recover abandoned carts/forms with a discount via WhatsApp.',
        nodes: [
            { id: '1', type: 'ACTION', action: 'send_whatsapp', config: { whatsappTemplate: 'order_recovery_discount' }, failover: 'send_email' },
            { id: '2', type: 'ACTION', action: 'create_crm_lead', config: { status: 'HOT' }, failover: null }
        ]
    },
    {
        name: 'Education: Enrollment Flow',
        industry: 'Education',
        trigger: 'form_submitted',
        description: 'Deliver course syllabus + Schedule counselor call.',
        nodes: [
            { id: '1', type: 'ACTION', action: 'send_email', config: { subject: 'Your Course Syllabus' }, failover: null },
            { id: '2', type: 'ACTION', action: 'book_followup', config: { service: 'Counseling Session' }, failover: null }
        ]
    },
    {
        name: 'Agency: Service Onboarding',
        industry: 'Service Agency',
        trigger: 'booking_created',
        description: 'Send onboarding questionnaire + Create CRM project.',
        nodes: [
            { id: '1', type: 'ACTION', action: 'send_whatsapp', config: { whatsappTemplate: 'onboarding_start' }, failover: null },
            { id: '2', type: 'ACTION', action: 'create_crm_lead', config: { status: 'ONBOARDING' }, failover: null },
            { id: '3', type: 'ACTION', action: 'update_crm_status', config: { newStatus: 'WON' }, failover: null }
        ]
    }
];
