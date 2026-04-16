import { PageHeader } from '../components/shared/page-header';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';

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
  return (
    <div className="space-y-6">
      <PageHeader
        title="Help & Support"
        description="Frequently asked questions and support information"
      />

      {/* FAQ Sections */}
      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Appointments</h3>
          <Accordion type="single" collapsible className="w-full">
            {faqData.appointments.map((faq, index) => (
              <AccordionItem key={index} value={`appointments-${index}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Clients</h3>
          <Accordion type="single" collapsible className="w-full">
            {faqData.clients.map((faq, index) => (
              <AccordionItem key={index} value={`clients-${index}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Settings & Configuration</h3>
          <Accordion type="single" collapsible className="w-full">
            {faqData.settings.map((faq, index) => (
              <AccordionItem key={index} value={`settings-${index}`}>
                <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      {/* Contact Support */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-blue-900">Need More Help?</h3>
        <p className="mb-4 text-sm text-blue-800">
          If you couldn't find the answer you're looking for, our support team is here to help.
        </p>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg bg-white p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <EnvelopeIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Email Support</p>
              <p className="text-sm text-gray-600">support@barberpro.com</p>
              <p className="text-xs text-gray-500">Response within 24 hours</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-white p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <PhoneIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Phone Support</p>
              <p className="text-sm text-gray-600">+1 (555) 123-4567</p>
              <p className="text-xs text-gray-500">Mon-Fri, 9am-6pm EST</p>
            </div>
          </div>
        </div>
      </div>

      {/* Version Info */}
      <div className="rounded-lg bg-gray-50 p-4 text-center">
        <p className="text-sm text-gray-600">
          BarberPro Dashboard v2.0 — April 2026
        </p>
      </div>
    </div>
  );
}
