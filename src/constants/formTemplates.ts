export const FORM_TEMPLATES = [
    {
        id: 'real-estate-lead',
        title: 'Real Estate Lead Capture',
        description: 'Qualify property buyers and sellers with specific requirements.',
        industry: 'Real Estate',
        fields: [
            { id: '1', label: 'Full Name', type: 'text', required: true },
            { id: '2', label: 'Phone Number', type: 'tel', required: true },
            { id: '3', label: 'Property Type', type: 'select', required: true, options: ['Apartment', 'Villa', 'Commercial', 'Land'] },
            { id: '4', label: 'Budget Range', type: 'select', required: true, options: ['Under 50L', '50L - 1Cr', '1Cr - 5Cr', 'Above 5Cr'] },
            { id: '5', label: 'Preferred Location', type: 'text', required: false }
        ]
    },
    {
        id: 'healthcare-appt',
        title: 'Patient Appointment Request',
        description: 'Collect patient details and preferred appointment times.',
        industry: 'Healthcare',
        fields: [
            { id: '1', label: 'Patient Name', type: 'text', required: true },
            { id: '2', label: 'Contact Number', type: 'tel', required: true },
            { id: '3', label: 'Department', type: 'select', required: true, options: ['General Physician', 'Dental', 'Dermatology', 'Pediatrics', 'Other'] },
            { id: '4', label: 'Preferred Date', type: 'date', required: true },
            { id: '5', label: 'Reason for Visit', type: 'textarea', required: false }
        ]
    },
    {
        id: 'ecommerce-feedback',
        title: 'Customer Feedback Form',
        description: 'Get insights into product satisfaction and shopping experience.',
        industry: 'E-commerce',
        fields: [
            { id: '1', label: 'Order ID', type: 'text', required: false },
            { id: '2', label: 'Product Satisfaction', type: 'select', required: true, options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Unsatisfied'] },
            { id: '3', label: 'What did you like most?', type: 'textarea', required: false },
            { id: '4', label: 'Would you recommend us?', type: 'select', required: true, options: ['Yes', 'No', 'Maybe'] }
        ]
    },
    {
        id: 'education-inquiry',
        title: 'Course Inquiry Form',
        description: 'Capture leads for educational courses and workshops.',
        industry: 'Education',
        fields: [
            { id: '1', label: 'Student Name', type: 'text', required: true },
            { id: '2', label: 'Email Address', type: 'email', required: true },
            { id: '3', label: 'Interested Course', type: 'select', required: true, options: ['Digital Marketing', 'Data Science', 'Web Development', 'Business Mgmt'] },
            { id: '4', label: 'Current Education Level', type: 'select', required: true, options: ['High School', 'Undergraduate', 'Postgraduate', 'Working Professional'] }
        ]
    },
    {
        id: 'event-registration',
        title: 'Event Registration',
        description: 'Standard form for webinars, seminars, or local events.',
        industry: 'General',
        fields: [
            { id: '1', label: 'Attendee Name', type: 'text', required: true },
            { id: '2', label: 'Organization', type: 'text', required: false },
            { id: '3', label: 'WhatsApp Number', type: 'tel', required: true },
            { id: '4', label: 'How did you hear about us?', type: 'select', required: false, options: ['Social Media', 'Email', 'Friend', 'Ad'] }
        ]
    },
    {
        id: 'hotel-booking',
        title: 'Hotel Room Booking',
        description: 'Streamline room reservations with guest details and preferences.',
        industry: 'Hospitality',
        fields: [
            { id: '1', label: 'Guest Name', type: 'text', required: true },
            { id: '2', label: 'Phone Number', type: 'tel', required: true },
            { id: '3', label: 'Room Type', type: 'select', required: true, options: ['Single Room', 'Double Room', 'Deluxe Suite', 'Presidential Suite'] },
            { id: '4', label: 'Check-in Date', type: 'date', required: true },
            { id: '5', label: 'Check-out Date', type: 'date', required: true },
            { id: '6', label: 'Number of Guests', type: 'number', required: true },
            { id: '7', label: 'Special Requests', type: 'textarea', required: false }
        ]
    }
];
