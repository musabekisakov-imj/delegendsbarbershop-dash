import Link from 'next/link';
import { ArrowRightIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/shared/page-header';
import { publicApi, ApiError } from '@/lib/api';
import { getServerT, getServerLang } from '@/lib/i18n';
import { formatLtPhone, telHref } from '@/lib/lt';
import { translateServiceName } from '@/lib/translate-service';
import { ManageActions } from './_client';

export const dynamic = 'force-dynamic';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function ManageBookingPage({ params }: { params: { id: string } }) {
  const t = getServerT();
  const lang = getServerLang();

  let booking: Awaited<ReturnType<typeof publicApi.getBooking>> | null = null;
  try {
    booking = await publicApi.getBooking(params.id);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 404) throw err;
  }

  if (!booking) {
    return (
      <>
        <PageHeader
          eyebrow={t.manage.not_found_eyebrow}
          title={t.manage.not_found_title}
          accent=""
          sub={t.manage.not_found_body}
        />
        <section className="page pb-32">
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="inline-flex items-center bg-foreground text-background pl-5 py-0 pr-0 text-sm font-semibold hover:bg-primary hover:text-primary-foreground transition-colors duration-200">
              <span>{t.manage.back_home}</span>
              <span className="border-l border-background/20 p-3 ml-5 inline-flex items-center">
                <ArrowRightIcon className="h-4 w-4" />
              </span>
            </Link>
            <Link href="/book" className="inline-flex items-center bg-primary text-primary-foreground pl-5 py-0 pr-0 text-sm font-semibold hover:bg-foreground hover:text-background transition-colors duration-200">
              <span>{t.manage.book_again}</span>
              <span className="border-l border-black/30 p-3 ml-5 inline-flex items-center">
                <ArrowRightIcon className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </section>
      </>
    );
  }

  const start = new Date(booking.startTime);
  const dateLabel = start.toLocaleDateString(
    lang === 'lt' ? 'lt-LT' : lang === 'ru' ? 'ru-RU' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  );
  const timeLabel = start.toLocaleTimeString(
    lang === 'lt' ? 'lt-LT' : lang === 'ru' ? 'ru-RU' : 'en-GB',
    { hour: '2-digit', minute: '2-digit' },
  );

  const isCancelled = booking.status === 'cancelled' || booking.status === 'no_show';

  return (
    <>
      <PageHeader
        eyebrow={isCancelled ? t.manage.cancelled_eyebrow : t.manage.eyebrow}
        title={isCancelled ? t.manage.cancelled_title : t.manage.title}
        accent=""
        sub={isCancelled ? t.manage.cancelled_body : t.manage.sub}
      />

      <section className="page pb-32">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 card p-8 sm:p-10">
            <div className="eyebrow mb-6">{t.manage.visit_label}</div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
              <Row label={t.confirm.sum_service} value={translateServiceName(booking.serviceName, lang)} />
              <Row label={t.confirm.sum_master} value={booking.staffName} />
              <Row label={t.confirm.sum_date} value={`${dateLabel} · ${timeLabel}`} />
              <Row label={t.booking.sum_price} value={`€${booking.price.toFixed(2)}`} tabular />
              <Row label={t.confirm.sum_salon} value={booking.officeName} />
              <Row label={t.confirm.sum_address} value={booking.officeAddress} />
              <Row label={t.confirm.sum_id} value={booking.appointmentId} mono />
            </dl>

            <div className="mt-10 pt-6 border-t border-border flex flex-wrap items-center gap-3">
              <a
                href={telHref(booking.officePhone)}
                className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
              >
                <PhoneIcon className="h-4 w-4" />
                <span className="tabular">{formatLtPhone(booking.officePhone)}</span>
              </a>
              <span className="text-foreground/30">·</span>
              <span className="text-xs text-foreground/55">{t.manage.call_to_change}</span>
            </div>
          </div>

          <aside className="lg:col-span-5 lg:col-start-8 space-y-5">
            {!isCancelled ? (
              <>
                <ManageActions
                  id={booking.appointmentId}
                  staffId={booking.staffId}
                  duration={booking.duration}
                />
                <p className="text-xs text-foreground/55 leading-relaxed">{t.manage.too_late}</p>
              </>
            ) : (
              <Link
                href="/book"
                className="inline-flex items-center bg-primary text-primary-foreground pl-5 py-0 pr-0 text-sm font-semibold hover:bg-foreground hover:text-background transition-colors duration-200"
              >
                <span>{t.manage.book_again}</span>
                <span className="border-l border-black/30 p-3 ml-5 inline-flex items-center">
                  <ArrowRightIcon className="h-4 w-4" />
                </span>
              </Link>
            )}

            <Link
              href="/locations"
              className="inline-flex items-center gap-2 text-xs text-foreground/55 hover:text-foreground transition-colors uppercase tracking-[0.18em] font-mono"
            >
              <MapPinIcon className="h-3.5 w-3.5" />
              {t.nav.locations}
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}

function Row({ label, value, mono, tabular }: { label: string; value: string; mono?: boolean; tabular?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.18em] text-foreground/45 font-mono mb-1">{label}</dt>
      <dd className={`text-sm text-foreground ${mono ? 'font-mono break-all' : ''} ${tabular ? 'tabular' : ''}`}>{value}</dd>
    </div>
  );
}
