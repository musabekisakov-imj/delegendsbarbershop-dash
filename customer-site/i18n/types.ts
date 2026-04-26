// Translation key surface — typed so missing keys are a build error.
// 3 supported languages: lt (default), en, ru.

export type Lang = 'lt' | 'en' | 'ru';
export const LANGS: Lang[] = ['lt', 'en', 'ru'];
export const LANG_LABEL: Record<Lang, string> = { lt: 'LT', en: 'EN', ru: 'RU' };
export const LANG_NAME: Record<Lang, string> = {
  lt: 'Lietuvių',
  en: 'English',
  ru: 'Русский',
};

export interface Translations {
  meta: {
    title: string;
    description: string;
  };
  nav: {
    services: string;
    team: string;
    locations: string;
    story: string;
    book: string;
  };
  hero: {
    line1: string;
    line2: string;
    accent1: string;
    accent2: string;
    paragraph: string;
  };
  stats: {
    salons: string;
    masters: string;
    services: string;
    days: string;
    est: string;
    booking: string;
    masters_sub: string;
    services_sub: string;
    days_sub: string;
    est_sub: string;
    booking_sub: string;
    salons_sub: string;
  };
  manifesto: {
    eyebrow: string;
    title_a: string;
    title_b: string;
    title_a_accent: string;
    title_b_accent: string;
    body1: string;
    body2: string;
    cta: string;
  };
  services_preview: {
    eyebrow: string;
    title: string;
    title_accent: string;
    cta: string;
  };
  team_preview: {
    eyebrow: string;
    title_a: string;
    title_b_accent: string;
    cta: string;
    experience: string;
  };
  locations_preview: {
    eyebrow: string;
    title_a: string;
    title_b: string;
    title_b_accent: string;
    cta: string;
  };
  hours: {
    week: string;
    fri: string;
    sat: string;
  };
  live: {
    today: string;
    with_master: string;
    free_slots: string;
    all_booked: string;
    next_day: string;
    all: string;
  };
  closing: {
    eyebrow: string;
    title_a: string;
    title_b: string;
    title_accent: string;
    body: string;
    cta: string;
    fineprint: string;
  };
  newsletter: {
    eyebrow: string;
    title_a: string;
    title_accent: string;
    body: string;
    placeholder: string;
    consent: string;
    consent_link: string;
    submit: string;
    success: string;
  };
  footer: {
    tagline: string;
    open_now: string;
    nav_label: string;
    book_link: string;
    legal_company: string;
    legal_vat: string;
    privacy: string;
    terms: string;
  };
  cookie: {
    eyebrow: string;
    body_a: string;
    body_link: string;
    body_b: string;
    accept: string;
    accept_short: string;
    reject: string;
    close_label: string;
  };
  booking: {
    back: string;
    progress_step1: string;
    progress_step2: string;
    progress_step3: string;
    progress_step4: string;
    flow_subtitle: string;
    step_label: (n: number, total: number) => string;
    step1_title: string;
    step2_title: string;
    step2_disabled: string;
    step3_title: string;
    step3_disabled: string;
    step4_title: string;
    step4_accent: string;
    step4_disabled: string;
    salon_label: string;
    contact_label: string;
    field_first: string;
    field_last: string;
    field_email: string;
    field_phone: string;
    phone_hint: string;
    summary_title: string;
    sum_service: string;
    sum_master: string;
    sum_salon: string;
    sum_address: string;
    sum_date: string;
    sum_time: string;
    sum_price: string;
    submit: string;
    submitting: string;
    fineprint: string;
    error_conflict: string;
    error_generic: string;
    available_at: string;
    checking: string;
    no_slots: string;
    no_slots_error: string;
    duration_visit: string;
  };
  confirm: {
    eyebrow: string;
    title_a: string;
    title_accent: (date: string, time: string) => string;
    body: string;
    sum_service: string;
    sum_master: string;
    sum_salon: string;
    sum_address: string;
    sum_date: string;
    sum_id: string;
    add_calendar: string;
    home: string;
    empty_eyebrow: string;
    empty_title: string;
    empty_cta: string;
  };
  page: {
    services: { eyebrow: string; title: string; accent: string; sub: string; vat_note: string; filter: string; all: string; cta_eyebrow: string; cta_title_a: string; cta_title_accent: string; cta: string };
    team: { eyebrow: string; title: string; accent: string; sub: string; cta_eyebrow: string; cta_title_a: string; cta_title_accent: string; cta: string };
    locations: { eyebrow: string; title: string; accent: string; sub: string; salon_label: string; map_open: string; hours: string; cta: string };
    story: { eyebrow: string; title: string; accent: string; sub: string };
  };
  ui: {
    select_master: string;
    duration_min: string;
    select_arrow: string;
    next_open: string;
  };
}
