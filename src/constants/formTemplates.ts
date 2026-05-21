export const FORM_TEMPLATES = [
    {
        id: 'premium-custom-dnd',
        title: 'Premium Slot Booking (Custom DnD Design)',
        description: 'Premium multi-step form utilizing custom sidebar layouts, dependent field options, and pre-configured sortable post-submission action blocks.',
        industry: 'Premium Custom',
        design: {
            isMultistep: true,
            layout: 'custom',
            primaryColor: '#7c3aed',
            steps: [
                { id: 'step-selection', title: 'Category & Selection', description: 'Choose domain and specific service' },
                { id: 'step-datetime', title: 'Preferred Slot', description: 'Pick your date and time slot' },
                { id: 'step-uploads', title: 'Reference Uploads', description: 'Upload reference images or documents' },
                { id: 'step-details', title: 'Contact Information', description: 'Enter your booking details' }
            ],
            thankYouPage: {
                template: 'custom',
                blocks: [
                    { id: 'icon', type: 'icon', value: 'star', color: '#7c3aed', visible: true },
                    { id: 'title', type: 'title', value: 'Booking Requested!', visible: true },
                    { id: 'msg', type: 'message', value: 'Your request has been submitted. You can manage or reorder these blocks dynamically using drag and drop.', visible: true },
                    { id: 'summary', type: 'booking_summary', value: 'Show Booking Details', visible: true },
                    { id: 'btn_whatsapp', type: 'connect_whatsapp', label: 'Message Front Desk on WhatsApp', url: 'https://wa.me/', visible: true },
                    { id: 'btn_livechat', type: 'connect_livechat', label: 'Chat Live with Host', slug: '', visible: true },
                    { id: 'btn', type: 'button', label: 'Return to Website', url: '', visible: true }
                ]
            }
        },
        fields: [
            { id: 'pd1', label: 'Booking Category', type: 'select', required: true, options: ['Salon & Beauty', 'Car / Villa Rental', 'Premium Restaurant'], stepId: 'step-selection' },
            { id: 'pd2', label: 'Select Service / Selection', type: 'select', required: true, dependsOnFieldId: 'pd1', options: [
                'HydraFacial Treatment | Salon & Beauty',
                'Hair Balayage Coloring | Salon & Beauty',
                'Luxury Beachfront Villa | Car / Villa Rental',
                'Premium Tesla Model S Rental | Car / Villa Rental',
                'VIP Rooftop Table Reservation | Premium Restaurant',
                'Standard Dinner Buffet | Premium Restaurant'
            ], stepId: 'step-selection' },
            { id: 'pd3', label: 'Appointment Slot', type: 'date_time_calendar', required: true, stepId: 'step-datetime' },
            { id: 'pd4', label: 'Reference Photos', type: 'image', required: false, options: ['multiple=true'], stepId: 'step-uploads' },
            { id: 'pd5', label: 'Full Name', type: 'text', required: true, stepId: 'step-details' },
            { id: 'pd6', label: 'Phone Number', type: 'tel', required: true, stepId: 'step-details' },
            { id: 'pd7', label: 'Special Instructions', type: 'textarea', required: false, stepId: 'step-details' }
        ]
    },
    {
        id: 'restaurant-single',
        title: 'Restaurant Table Booking (Single-Step)',
        description: 'Instantly reserve a table, select party size, reservation date, and input guest details in one step.',
        industry: 'Restaurant',
        design: {
            isMultistep: false,
            layout: 'default',
            primaryColor: '#e11d48',
            thankYouPage: {
                template: 'custom',
                blocks: [
                    { id: 'icon', type: 'icon', value: 'check-circle', color: '#e11d48', visible: true },
                    { id: 'title', type: 'title', value: 'Table Reserved!', visible: true },
                    { id: 'msg', type: 'message', value: 'Thank you for booking with us. We have reserved your table. See you soon!', visible: true },
                    { id: 'summary', type: 'booking_summary', value: 'Show Reservation Summary', visible: true },
                    { id: 'btn_whatsapp', type: 'connect_whatsapp', label: 'Message Host on WhatsApp', url: 'https://wa.me/', visible: true },
                    { id: 'btn_livechat', type: 'connect_livechat', label: 'Chat Live with Host', slug: '', visible: false },
                    { id: 'btn', type: 'button', label: 'Done', url: '', visible: true }
                ]
            }
        },
        fields: [
            { id: 'ts1', label: 'Full Name', type: 'text', required: true },
            { id: 'ts2', label: 'Phone Number', type: 'tel', required: true },
            { id: 'ts3', label: 'Party Size', type: 'number', required: true },
            { id: 'ts4', label: 'Reservation Date & Time', type: 'date_time_calendar', required: true },
            { id: 'ts5', label: 'Special Occasion / Notes', type: 'textarea', required: false }
        ]
    },
    {
        id: 'restaurant-multi',
        title: 'Premium Restaurant Slot Booking (Multi-Step)',
        description: 'Exquisite multi-step reservation wizard for choosing seating preference, booking slots, and guest confirmation.',
        industry: 'Restaurant',
        design: {
            isMultistep: true,
            layout: 'custom', // Premium Sidebar Layout
            primaryColor: '#d97706',
            steps: [
                { id: 'step-dining', title: 'Dining Preference', description: 'Select seating area & guests' },
                { id: 'step-datetime', title: 'Date & Time Slot', description: 'Choose your preferred slot' },
                { id: 'step-details', title: 'Guest Details', description: 'Enter contact information' },
                { id: 'step-summary', title: 'Summary & Notes', description: 'Confirm and specify requests' }
            ],
            thankYouPage: {
                template: 'custom',
                blocks: [
                    { id: 'icon', type: 'icon', value: 'star', color: '#d97706', visible: true },
                    { id: 'title', type: 'title', value: 'Booking Requested!', visible: true },
                    { id: 'msg', type: 'message', value: 'Your premium table request is being processed. Feel free to connect directly with our front desk below.', visible: true },
                    { id: 'summary', type: 'booking_summary', value: 'Show reservation overview', visible: true },
                    { id: 'btn_whatsapp', type: 'connect_whatsapp', label: 'Message Front Desk', url: 'https://wa.me/', visible: false },
                    { id: 'btn_livechat', type: 'connect_livechat', label: 'Connect via Live Chat', slug: '', visible: true },
                    { id: 'btn', type: 'button', label: 'Return Home', url: '', visible: true }
                ]
            }
        },
        fields: [
            { id: 'tm1', label: 'Dining Area Preference', type: 'select', required: true, options: ['Indoor Main Hall', 'Outdoor Garden Patio', 'Rooftop Terrace', 'Private VIP Room'], stepId: 'step-dining' },
            { id: 'tm2', label: 'Number of Guests', type: 'number', required: true, stepId: 'step-dining' },
            { id: 'tm3', label: 'Preferred Date & Time Slot', type: 'date_time_calendar', required: true, stepId: 'step-datetime' },
            { id: 'tm4', label: 'Full Name', type: 'text', required: true, stepId: 'step-details' },
            { id: 'tm5', label: 'Phone Number', type: 'tel', required: true, stepId: 'step-details' },
            { id: 'tm6', label: 'Email Address (Optional)', type: 'email', required: false, stepId: 'step-details' },
            { id: 'tm7', label: 'Special Occasion / Dietary Notes', type: 'textarea', required: false, stepId: 'step-summary' }
        ]
    },
    {
        id: 'salon-service',
        title: 'Salon & Beauty Treatment Booking',
        description: 'Allow clients to pick skin or hair treatment, schedule slots, and upload photos for stylist preparation.',
        industry: 'Service Booking',
        design: {
            isMultistep: true,
            layout: 'custom', // Premium Sidebar Layout
            primaryColor: '#00a884',
            steps: [
                { id: 'step-service', title: 'Service', description: 'Choose category and treatment' },
                { id: 'step-datetime', title: 'Date & Time', description: 'Select slot on Calendar' },
                { id: 'step-details', title: 'Basic Details', description: 'Fill contact and upload references' },
                { id: 'step-summary', title: 'Summary', description: 'Verify and book' }
            ],
            thankYouPage: {
                template: 'custom',
                blocks: [
                    { id: 'icon', type: 'icon', value: 'check-circle', color: '#10b981', visible: true },
                    { id: 'title', type: 'title', value: 'Booking Requested!', visible: true },
                    { id: 'msg', type: 'message', value: 'We have received your salon treatment query. A confirmation SMS will be sent shortly.', visible: true },
                    { id: 'summary', type: 'booking_summary', value: 'Show booking details', visible: true },
                    { id: 'btn_whatsapp', type: 'connect_whatsapp', label: 'Connect on WhatsApp', url: 'https://wa.me/', visible: false },
                    { id: 'btn_livechat', type: 'connect_livechat', label: 'Chat Live', slug: '', visible: false },
                    { id: 'btn', type: 'button', label: 'Back to Salon Website', url: 'https://mysalon.com', visible: true }
                ]
            }
        },
        fields: [
            { id: 's1', label: 'Treatment Category', type: 'select', required: true, options: ['Skin Treatment', 'Beauty Care', 'Hair Treatment', 'Body Treatment'], stepId: 'step-service' },
            { id: 's2', label: 'Select Service', type: 'select', required: true, dependsOnFieldId: 's1', options: [
                'HydraFacial Aqua | Skin Treatment',
                'HydraFacial Pro | Skin Treatment',
                'HydraFacial Rejuvenation | Skin Treatment',
                'Super Facial | Skin Treatment',
                'Hydra Growth Factor Caviar | Skin Treatment',
                'Deep Facial | Beauty Care',
                'Carbon Extraction Mask | Beauty Care',
                'Nail Strong gel | Beauty Care',
                'Hair Spa & Trim | Hair Treatment',
                'Balayage Coloring | Hair Treatment',
                'Hot Stone Massage | Body Treatment',
                'Deep Tissue Therapy | Body Treatment'
            ], stepId: 'step-service' },
            { id: 's3', label: 'Appointment Date & Time', type: 'date_time_calendar', required: true, stepId: 'step-datetime' },
            { id: 's4', label: 'Full Name', type: 'text', required: true, stepId: 'step-details' },
            { id: 's5', label: 'Phone Number', type: 'tel', required: true, stepId: 'step-details' },
            { id: 's6', label: 'Email Address', type: 'email', required: false, stepId: 'step-details' },
            { id: 's7', label: 'Reference Image (Optional)', type: 'image', required: false, options: ['multiple=false'], stepId: 'step-details' }
        ]
    },
    {
        id: 'rental-booking',
        title: 'Villa & Rental Car Booking',
        description: 'Seamless check-in/out and vehicle rental scheduling with multiple ID uploads.',
        industry: 'Rental Booking',
        design: {
            isMultistep: true,
            layout: 'custom', // Premium Sidebar Layout
            primaryColor: '#4f46e5',
            steps: [
                { id: 'step-accommodation', title: 'Selection', description: 'Choose your rental' },
                { id: 'step-dates', title: 'Dates & Duration', description: 'Select booking range' },
                { id: 'step-guests', title: 'Guest & ID Proof', description: 'Enter details and upload ID' },
                { id: 'step-summary', title: 'Summary', description: 'Confirm booking' }
            ],
            thankYouPage: {
                template: 'custom',
                blocks: [
                    { id: 'icon', type: 'icon', value: 'check-circle', color: '#4f46e5', visible: true },
                    { id: 'title', type: 'title', value: 'Reservation Reserved!', visible: true },
                    { id: 'msg', type: 'message', value: 'Thank you for booking with us. Your room/vehicle is temporarily held pending ID verification.', visible: true },
                    { id: 'summary', type: 'booking_summary', value: 'Show rental overview', visible: true },
                    { id: 'btn_whatsapp', type: 'connect_whatsapp', label: 'Connect on WhatsApp', url: 'https://wa.me/', visible: false },
                    { id: 'btn_livechat', type: 'connect_livechat', label: 'Chat Live', slug: '', visible: false },
                    { id: 'btn', type: 'button', label: 'Explore Activities', url: 'https://myresort.com/activities', visible: true }
                ]
            }
        },
        fields: [
            { id: 'r1', label: 'Rental Category', type: 'select', required: true, options: ['Luxury Villa', 'Deluxe Hotel Room', 'Luxury Sedan', 'SUV Off-Road'], stepId: 'step-accommodation' },
            { id: 'r2', label: 'Select Model / Suite', type: 'select', required: true, dependsOnFieldId: 'r1', options: [
                'Presidential Villa | Luxury Villa',
                'Royal Beachfront Villa | Luxury Villa',
                'Sunset Pool Room | Deluxe Hotel Room',
                'Executive Suite | Deluxe Hotel Room',
                'Tesla Model S | Luxury Sedan',
                'Mercedes S-Class | Luxury Sedan',
                'Range Rover Sport | SUV Off-Road',
                'Jeep Wrangler Rubicon | SUV Off-Road'
            ], stepId: 'step-accommodation' },
            { id: 'r3', label: 'Booking Range', type: 'date_time_calendar', required: true, options: ['range=true'], stepId: 'step-dates' },
            { id: 'r4', label: 'Number of Guests/Drivers', type: 'number', required: true, stepId: 'step-dates' },
            { id: 'r5', label: 'Primary Guest Name', type: 'text', required: true, stepId: 'step-guests' },
            { id: 'r6', label: 'Phone Number', type: 'tel', required: true, stepId: 'step-guests' },
            { id: 'r7', label: 'Upload ID Proof (Multiple Allowed)', type: 'image', required: true, options: ['multiple=true'], stepId: 'step-guests' }
        ]
    },
    {
        id: 'rental-horizontal-search',
        title: 'Horizontal Rental Search',
        description: 'Single-row horizontal booking search form containing location, pickup/return dates, and times.',
        industry: 'Rental Booking',
        design: {
            isMultistep: false,
            layout: 'horizontal',
            primaryColor: '#f38d68',
            thankYouPage: {
                template: 'custom',
                blocks: [
                    { id: 'icon', type: 'icon', value: 'check-circle', color: '#f38d68', visible: true },
                    { id: 'title', type: 'title', value: 'Search Submitted!', visible: true },
                    { id: 'msg', type: 'message', value: 'Your rental search request has been submitted. We are searching for available options.', visible: true },
                    { id: 'summary', type: 'booking_summary', value: 'Show search details', visible: true },
                    { id: 'btn', type: 'button', label: 'Done', url: '', visible: true }
                ]
            }
        },
        fields: [
            { id: 'rh1', label: 'Select City', type: 'select', required: true, options: ['All Location', 'New York', 'Los Angeles', 'Miami', 'London', 'Tokyo'], colSpan: 2 },
            { id: 'rh2', label: 'Pickup Date', type: 'date', required: true, colSpan: 2 },
            { id: 'rh3', label: 'Pickup Time', type: 'select', required: true, options: ['05:30 AM', '09:00 AM', '10:30 AM', '12:00 PM', '02:30 PM', '05:30 PM', '08:00 PM'], colSpan: 2 },
            { id: 'rh4', label: 'Return Date', type: 'date', required: true, colSpan: 2 },
            { id: 'rh5', label: 'Return Time', type: 'select', required: true, options: ['05:30 AM', '09:00 AM', '10:30 AM', '12:00 PM', '02:30 PM', '05:30 PM', '08:00 PM'], colSpan: 2 }
        ]
    },
    {
        id: 'hotel-villa-multistep',
        title: 'Hotel & Villa stay Booking (Multi-Step)',
        description: 'Premium multi-step stay booking wizard for selecting hotel or villa, check-in & check-out dates, room configurations, villa types, and guest details.',
        industry: 'Rental Booking',
        design: {
            isMultistep: true,
            layout: 'custom',
            primaryColor: '#7c3aed',
            stepsSidebarTitle: 'Stay Booking Steps',
            steps: [
                { id: 'step-stay-type', title: 'Stay Type', description: 'Select Hotel or Villa' },
                { id: 'step-dates', title: 'Stay Dates', description: 'Select check-in & check-out' },
                { id: 'step-selection', title: 'Accommodation', description: 'Choose type & configuration' },
                { id: 'step-guests', title: 'Guest Details', description: 'Enter guest info & pax' },
                { id: 'step-summary', title: 'Summary & Notes', description: 'Verify booking details' }
            ],
            thankYouPage: {
                template: 'custom',
                blocks: [
                    { id: 'icon', type: 'icon', value: 'check-circle', color: '#7c3aed', visible: true },
                    { id: 'title', type: 'title', value: 'Stay Booking Requested!', visible: true },
                    { id: 'msg', type: 'message', value: 'Thank you for your stay booking request. We are checking availability and will message you shortly.', visible: true },
                    { id: 'summary', type: 'booking_summary', value: 'Show stay details', visible: true },
                    { id: 'btn_whatsapp', type: 'connect_whatsapp', label: 'Message Front Desk on WhatsApp', url: 'https://wa.me/', visible: true },
                    { id: 'btn_livechat', type: 'connect_livechat', label: 'Chat Live with Host', slug: '', visible: true },
                    { id: 'btn', type: 'button', label: 'Done', url: '', visible: true }
                ]
            }
        },
        fields: [
            { id: 'hvs1', label: 'Hotel ya Villa', type: 'select', required: true, options: ['Hotel', 'Villa'], stepId: 'step-stay-type' },
            { id: 'hvs2', label: 'Check in and check out', type: 'date_time_calendar', required: true, options: ['range=true'], stepId: 'step-dates' },
            { id: 'hvs3', label: 'Villa types', type: 'select', required: false, dependsOnFieldId: 'hvs1', options: [
                'Luxury Pool Villa | Villa',
                'Beachfront Villa | Villa',
                'Garden Oasis Villa | Villa'
            ], stepId: 'step-selection' },
            { id: 'hvs4', label: 'Villa - 1-4bhk', type: 'select', required: false, dependsOnFieldId: 'hvs1', options: [
                '1 BHK | Villa',
                '2 BHK | Villa',
                '3 BHK | Villa',
                '4 BHK | Villa'
            ], stepId: 'step-selection' },
            { id: 'hvs5', label: 'Hotel Room Type', type: 'select', required: false, dependsOnFieldId: 'hvs1', options: [
                'Executive Deluxe Room | Hotel',
                'Premium Suite | Hotel',
                'Presidential Suite | Hotel'
            ], stepId: 'step-selection' },
            { id: 'hvs6', label: 'Number of pax', type: 'number', required: true, stepId: 'step-guests' },
            { id: 'hvs7', label: 'Guest Full Name', type: 'text', required: true, stepId: 'step-guests' },
            { id: 'hvs8', label: 'WhatsApp / Phone Number', type: 'tel', required: true, stepId: 'step-guests' },
            { id: 'hvs9', label: 'Special Requests / Notes', type: 'textarea', required: false, stepId: 'step-summary' }
        ]
    },
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
    }
];
