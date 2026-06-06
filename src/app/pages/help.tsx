import { useMemo, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Input } from '../components/ui/input';
import {
  EnvelopeIcon, PhoneIcon, MagnifyingGlassIcon,
  CalendarIcon, UserGroupIcon, Cog6ToothIcon, QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../components/ui/utils';
import { EmptyState } from '../components/shared/empty-state';
import { PageHeader, PageHeaderDivider } from '../components/shared/page-header';

type CategoryId = 'appointments' | 'clients' | 'settings';

interface Faq {
  question: string;
  answer: string;
}

const FAQ_DATA: Record<CategoryId, Faq[]> = {
  appointments: [
    { question: 'How do I create a new appointment?', answer: 'Go to the Calendar page and click any available time slot, or use the "New Booking" button on the Bookings page to create an appointment step-by-step.' },
    { question: 'Can I edit or cancel an appointment?', answer: 'Yes — go to Bookings, find the appointment, and click "Manage" to change its status or delete it.' },
    { question: 'What do the different statuses mean?', answer: 'Scheduled = newly created. Confirmed = client confirmed. Completed = service finished. Cancelled = appointment was cancelled.' },
    { question: 'How do I view today\'s appointments?', answer: 'The Overview page shows everything booked today. Calendar lets you scroll through any day or week.' },
  ],
  clients: [
    { question: 'How do I add a new client?', answer: 'On the Clients page, click "Add Client". Fill in their info and save.' },
    { question: 'Where can I see a client\'s visit history?', answer: 'Click any client to open their detail panel, then switch to the History tab.' },
    { question: 'Can I add notes about preferences?', answer: 'Yes — in the client detail, the Edit tab has a Notes field.' },
    { question: 'How is the visit count calculated?', answer: 'Automatically — every appointment marked Completed adds one to that client\'s total.' },
  ],
  settings: [
    { question: 'How do I change working hours?', answer: 'Settings → Working hours. Toggle each day on/off and set open/close times. Save when done.' },
    { question: 'Can I change the shop name and contact?', answer: 'Yes — Settings → General has shop name, email, phone, and locations.' },
    { question: 'How do I add or remove staff?', answer: 'Staff page → Add. You can also toggle a staff member\'s active state without deleting them.' },
    { question: 'How do I create new services?', answer: 'Services page → New service. Pick a category, set price + duration, optionally upload a photo.' },
  ],
};

const CATEGORIES: { id: CategoryId; label: string; icon: typeof CalendarIcon }[] = [
  { id: 'appointments', label: 'Appointments', icon: CalendarIcon },
  { id: 'clients',      label: 'Clients',      icon: UserGroupIcon },
  { id: 'settings',     label: 'Settings',     icon: Cog6ToothIcon },
];

export function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryId>('appointments');

  const totalFaqs = Object.values(FAQ_DATA).reduce((n, arr) => n + arr.length, 0);

  const allFaqs = useMemo(() => (
    (Object.entries(FAQ_DATA) as [CategoryId, Faq[]][]).flatMap(([cat, list]) =>
      list.map((faq, i) => ({ ...faq, category: cat, idx: i })),
    )
  ), []);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return allFaqs.filter(f =>
      f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q),
    );
  }, [searchQuery, allFaqs]);

  return (
    // max-w-3xl keeps line length readable for FAQ copy (45-75 chars).
    <div className="space-y-5 max-w-3xl">
      {/* ─── Editorial hero ─────────────────────────── */}
      <PageHeader
        eyebrow={(
          <>
            <span>Help</span>
            <PageHeaderDivider />
            <span className="normal-case tracking-normal tabular-nums">{totalFaqs} articles</span>
            <PageHeaderDivider />
            <span className="normal-case tracking-normal">Support</span>
          </>
        )}
        title="How can we help?"
      />

      {/* ─── Operator bar — search + category tabs ─── */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-end gap-1 overflow-x-auto border-b border-border px-2">
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => { setActiveCategory(cat.id); setSearchQuery(''); }}
                aria-pressed={active}
                className={cn(
                  'relative inline-flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.label}</span>
                <span className={cn(
                  'inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums',
                  active ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground',
                )}>
                  {FAQ_DATA[cat.id].length}
                </span>
                {active && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
        <div className="p-2.5">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search across all articles…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background"
            />
          </div>
        </div>
      </div>

      {/* ─── FAQ — search results OR category accordion ─ */}
      {searchResults ? (
        searchResults.length === 0 ? (
          <EmptyState
            icon={QuestionMarkCircleIcon}
            eyebrow="No matches"
            title={`Nothing found for "${searchQuery}"`}
            description="Try a different search term, or browse a category above."
            variant="plain"
          />
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              {searchResults.map((faq) => {
                const cat = CATEGORIES.find(c => c.id === faq.category)!;
                return (
                  <AccordionItem key={`${faq.category}-${faq.idx}`} value={`${faq.category}-${faq.idx}`} className="border-border last:border-b-0 px-5">
                    <AccordionTrigger className="text-left hover:no-underline py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {cat.label}
                        </span>
                        <span className="font-medium text-foreground">{faq.question}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Accordion type="single" collapsible className="w-full">
            {FAQ_DATA[activeCategory].map((faq, index) => (
              <AccordionItem key={index} value={`${activeCategory}-${index}`} className="border-border last:border-b-0 px-5">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <span className="font-medium text-foreground">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {/* ─── Need more help? — editorial contact section ─ */}
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Still stuck?
        </p>
        <h3 className="mt-1 text-lg font-bold text-foreground">Talk to support</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Couldn't find the answer? Our team usually replies within 24 hours.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <a
            href="mailto:support@barberpro.com"
            className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-accent/30"
          >
            <EnvelopeIcon className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Email
              </p>
              <p className="mt-0.5 text-sm font-medium text-foreground truncate">
                support@barberpro.com
              </p>
            </div>
          </a>

          <a
            href="tel:+15551234567"
            className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-accent/30"
          >
            <PhoneIcon className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Phone · Mon-Fri 9-6 EST
              </p>
              <p className="mt-0.5 text-sm font-medium text-foreground tabular-nums">
                +1 (555) 123-4567
              </p>
            </div>
          </a>
        </div>
      </div>

      {/* ─── Footer version ──────────────────────────── */}
      <p className="text-center text-[11px] text-muted-foreground/70 tabular-nums pt-2">
        DeLegends Barbershop · v2.0 · April 2026
      </p>
    </div>
  );
}
