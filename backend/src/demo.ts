export type DemoTemplate = { id: string; name: string; title: string; body?: string }

export const DEMO_TEMPLATES: Record<string, DemoTemplate[]> = {
  sms: [
    { id: 'sms-welcome', name: 'Welcome SMS', title: 'Welcome SMS', body: 'Welcome to our store!' },
    { id: 'sms-promo', name: 'Promo SMS', title: 'Promo SMS', body: 'Special offer today only.' }
  ],
  rcs: [
    { id: 'rcs-welcome', name: 'Welcome RCS', title: 'Welcome RCS', body: 'Rich message welcome.' }
  ],
  email: [
    { id: 'email-welcome', name: 'Welcome Email', title: 'Welcome Email', body: '<p>Welcome aboard!</p>' },
    { id: 'email-cart', name: 'Cart reminder', title: 'Cart reminder', body: '<p>Your cart is waiting.</p>' }
  ],
  voice: [
    { id: 'voice-reminder', name: 'Voice reminder', title: 'Voice reminder', body: 'Automated voice script.' }
  ]
}

export const DEMO_CONTACT_LISTS = [
  { id: 1, name: 'Newsletter subscribers', contacts_count: 1250 },
  { id: 2, name: 'VIP customers', contacts_count: 340 }
]

export const DEMO_TOTAL_CONTACTS = 2500

export const DEMO_CONTACTS = [
  { id: 101, first_name: 'Anna', last_name: 'Lee', email: 'anna@example.com', phone: '+33600000001' },
  { id: 102, first_name: 'Marc', last_name: 'Dupont', email: 'marc@example.com', phone: '+33600000002' },
  { id: 103, first_name: 'Sofia', last_name: 'Martin', email: 'sofia@example.com', phone: '+33600000003' }
]
