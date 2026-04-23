import { useState } from 'react';
import { PageHeader } from '../components/shared/page-header';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Input } from '../components/ui/input';
import { EnvelopeIcon, PhoneIcon, MagnifyingGlassIcon, CalendarIcon, UserGroupIcon, Cog6ToothIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

const faqData = {
  appointments: [
    {
      question: 'How do I create a new appointment?',
      answer: 'Go to the Calendar page and click on any available time slot, or use the "New Booking" button on the Bookings page to create an appointment step-by-step.'
    },
    {
      question: 'Can I edit or cancel an appointment?',
      answer: 'Yes, go to the Bookings page, find the appointment, and click "Manage" to change its status or delete it.'
    },
    {
      question: 'What do the different appointment statuses mean?',
      answer: 'Scheduled = newly created, Confirmed = client confirmed, Completed = service finished, Cancelled = appointment was cancelled.'
    },
    {
      question: 'How do I view today\'s appointments?',
      answer: 'The Overview page shows all of today\'s appointments. You can also use the Calendar page to view appointments by day.'
    }
  ],
  clients: [
    {
      question: 'How do I add a new client?',
      answer: 'Go to the Clients page and click the "Add Client" button. Fill in their information and save.'
    },
    {
      question: 'Where can I see a client\'s visit history?',
      answer: 'Click on any client in the Clients page to open their detail panel, then go to the "History" tab to see all past appointments.'
    },
    {
      question: 'Can I add notes about client preferences?',
      answer: 'Yes, in the client detail panel, go to the "Preferences" tab where you can edit and save notes about the client.'
    },
    {
      question: 'How is the total visits count calculated?',
      answer: 'The system automatically counts completed appointments for each client.'
    }
  ],
  settings: [
    {
      question: 'How do I change working hours?',
      answer: 'Go to Settings > Working Hours tab. Toggle each day on/off and set open/close times. Don\'t forget to save.'
    },
    {
      question: 'Can I change the shop name and contact info?',
      answer: 'Yes, go to Settings > General tab to update shop name, email, phone, and address.'
    },
    {
      question: 'How do I add or remove staff members?',
      answer: 'Go to the Staff page and click "Add Staff" to create new team members. You can toggle staff active/inactive status on their card.'
    },
    {
      question: 'How do I create new services?',
      answer: 'Go to the Services page, click "Add Service", select a category, and fill in the service details including name, price, and duration.'
    }
  ]
};

export function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Flatten all FAQs for searching
  const allFAQs = [
    ...faqData.appointments.map(faq => ({ ...faq, category: 'Appointments', icon: CalendarIcon })),
    ...faqData.clients.map(faq => ({ ...faq, category: 'Clients', icon: UserGroupIcon })),
    ...faqData.settings.map(faq => ({ ...faq, category: 'Settings & Configuration', icon: Cog6ToothIcon })),
  ];

  const filteredFAQs = searchQuery
    ? allFAQs.filter(faq =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  return (
    // Refactoring UI: FAQ copy stays readable only at ~45-75 chars per line.
    // max-w-5xl caps the line length while still feeling roomy.
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        size="subtle"
        title="Help & Support"
        description="Frequently asked questions and support information"
      />

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search help articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 bg-card border-border focus:border-blue-400 dark:border-blue-700/70 focus:ring-blue-400"
        />
      </div>

      {/* Search Results or FAQ Sections */}
      {filteredFAQs ? (
        <div className="space-y-3">
          {filteredFAQs.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border bg-muted/40 p-12 text-center">
              <QuestionMarkCircleIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <h3 className="font-semibold text-foreground mb-2">No results found</h3>
              <p className="text-sm text-muted-foreground">Try a different search term</p>
            </div>
          ) : (
            filteredFAQs.map((faq, index) => {
              const Icon = faq.icon;
              return (
                <div key={index} className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted flex-shrink-0">
                      <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-1 rounded">
                          {faq.category}
                        </span>
                      </div>
                      <h4 className="font-semibold text-foreground mb-2">{faq.question}</h4>
                      <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Appointments Section */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-base font-bold text-foreground">Appointments</h3>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {faqData.appointments.map((faq, index) => (
                <AccordionItem key={index} value={`appointments-${index}`} className="border-border">
                  <AccordionTrigger className="text-left hover:no-underline py-4">
                    <span className="font-medium text-foreground">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Clients Section */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                <UserGroupIcon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="text-base font-bold text-foreground">Clients</h3>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {faqData.clients.map((faq, index) => (
                <AccordionItem key={index} value={`clients-${index}`} className="border-border">
                  <AccordionTrigger className="text-left hover:no-underline py-4">
                    <span className="font-medium text-foreground">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Settings Section */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Cog6ToothIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-foreground">Settings & Configuration</h3>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {faqData.settings.map((faq, index) => (
                <AccordionItem key={index} value={`settings-${index}`} className="border-border">
                  <AccordionTrigger className="text-left hover:no-underline py-4">
                    <span className="font-medium text-foreground">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      )}

      {/* Contact Support */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="h-1 bookings-accent-stripe" aria-hidden />
        <div className="p-6">
        <h3 className="text-base font-bold text-foreground mb-1">Need more help?</h3>
        <p className="text-sm text-muted-foreground mb-5">
          If you couldn't find the answer you're looking for, our support team is here to help.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 flex-shrink-0">
              <EnvelopeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Email support</p>
              <p className="text-sm text-muted-foreground truncate">support@barberpro.com</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Response within 24 hours</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 flex-shrink-0">
              <PhoneIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Phone support</p>
              <p className="text-sm text-muted-foreground tabular-nums">+1 (555) 123-4567</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Mon–Fri · 9am–6pm EST</p>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Version Info */}
      <div className="rounded-xl bg-muted/40 border border-border p-5 text-center">
        <p className="text-sm text-muted-foreground">
          BarberPro Dashboard <span className="font-semibold">v2.0</span> — April 2026
        </p>
      </div>
    </div>
  );
}