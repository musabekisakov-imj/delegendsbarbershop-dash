import type { Metadata } from 'next';
import { publicApi } from '@/lib/api';
import type { Office, Service, PublicStaff } from '@/lib/types';
import { BookingFlow } from '@/components/booking/booking-flow';

export const metadata: Metadata = {
  title: 'Susitarti laiką',
  description: 'Užsisakykite vizitą per minutę.',
};

// Always SSR — booking state is per-visit, no prerender benefit.
export const dynamic = 'force-dynamic';

// Server component fetches the catalog server-side, then hands the booking
// state machine to a client component below the fold.
export default async function BookPage() {
  const [offices, services, staff] = await Promise.all([
    publicApi.offices().catch(() => [] as Office[]),
    publicApi.services().catch(() => [] as Service[]),
    publicApi.staff().catch(() => [] as PublicStaff[]),
  ]);

  if (offices.length === 0 || services.length === 0 || staff.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="eyebrow mb-4">Sistemos pranešimas</div>
          <h1 className="display text-3xl mb-4">Užsakymai laikinai nepasiekiami.</h1>
          <p className="text-sm text-ink-muted">
            Pabandykite vėliau arba paskambinkite tiesiogiai į saloną.
          </p>
        </div>
      </main>
    );
  }

  return <BookingFlow offices={offices} services={services} staff={staff} />;
}
