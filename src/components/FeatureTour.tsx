import React from 'react';
import { Joyride, Step, EventData, STATUS } from 'react-joyride';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../enums';

const FeatureTour: React.FC = () => {
    const { user, completeTour } = useAuth();

    if (!user || user.hasSeenTour) return null;

    const adminSteps: Step[] = [
        {
            target: '.premium-sider',
            content: 'This is your navigation menu. You can access all your modules from here.',
            placement: 'right',
        },
        {
            target: '[data-tour="live-chat"]',
            content: 'Handle live visitor chats in real-time. Boost engagement instantly!',
            placement: 'right',
        },
        {
            target: '[data-tour="crm"]',
            content: 'Manage your leads and sales pipeline here. Never lose a deal again.',
            placement: 'right',
        },
        {
            target: '[data-tour="bookings"]',
            content: 'Manage appointments and scheduling with ease.',
            placement: 'right',
        },
        {
            target: '[data-tour="smart-links"]',
            content: 'Create intelligent WhatsApp links that distribute leads automatically.',
            placement: 'right',
        },
        {
            target: '[data-tour="dynamic-forms"]',
            content: 'Create custom forms to collect data or qualified leads from anywhere.',
            placement: 'right',
        },
        {
            target: '.ant-avatar',
            content: 'Manage your profile and account settings here.',
            placement: 'bottom',
        },
    ];

    const superAdminSteps: Step[] = [
        {
            target: '.premium-sider',
            content: 'Access the Super Admin command center to manage the entire system.',
            placement: 'right',
        },
        {
            target: '[data-tour="manage-admins"]',
            content: 'Create and manage administrative accounts and their limits.',
            placement: 'right',
        },
        {
            target: '[data-tour="manage-plans"]',
            content: 'Define subscription tiers and their available features.',
            placement: 'right',
        },
        {
            target: '[data-tour="module-manager"]',
            content: 'Grant or restrict access to specific AI BOS modules for each admin.',
            placement: 'right',
        },
    ];

    const steps = user.role === Role.SUPER_ADMIN ? superAdminSteps : adminSteps;

    const handleJoyrideEvent = (data: EventData) => {
        const { status } = data;
        const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

        if (finishedStatuses.includes(status)) {
            completeTour();
        }
    };

    return (
        <Joyride
            steps={steps}
            continuous
            onEvent={handleJoyrideEvent}
            options={{
                primaryColor: '#00df9a',
                textColor: '#fff',
                backgroundColor: '#1a1b1e',
                arrowColor: '#1a1b1e',
            }}
            styles={{
                tooltipContainer: {
                    textAlign: 'left',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                },
                buttonPrimary: {
                    backgroundColor: '#00df9a',
                    color: '#000',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                },
                buttonBack: {
                    color: '#94a3b8',
                },
                buttonSkip: {
                    color: '#94a3b8',
                },
            }}
        />
    );
};

export default FeatureTour;
