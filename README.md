# BarberPro Dashboard

Production-polish barbershop management dashboard for a two-office shop. React + TypeScript + Vite.

**Live:** https://barber-dash-inky.vercel.app

---

## For the shop owner — quick start

1. Open the live URL on any device (phone, tablet, desktop).
2. Sign in. Demo accepts any email/password — the login you use determines the role you play.
3. Start exploring from the top nav: Overview → Calendar → Bookings → Clients → Staff → Services → Team & access → Analytics → Settings.

### Demo logins (test different roles)

| Email | Role | What they can do |
|---|---|---|
| `admin@barberpro.com` | Owner | Everything — full access across both offices |
| `manager@barberpro.com` | Manager | Manage staff, services, schedules, bookings (Office 1) |
| `sarah@barberpro.com` | Receptionist | Bookings + clients for Office 1, no team/finance access |
| `maria@barberpro.com` | Barber | Only her own appointments on Overview + Bookings |
| `tomas@barberpro.com` | Invited receptionist (pending) | Can't log in yet — shows the invite flow |

Password is ignored — any value works. Pick one from the list to see how permissions differ.

### Install on tablet / phone

In Chrome or Safari, use "Install BarberPro" from the browser menu (or the ⊕ icon in the desktop address bar). Installs as a standalone app with home-screen icon, no browser chrome.

---

## What's in the app

| Page | Purpose |
|---|---|
| **Overview** | Today's KPIs — bookings, revenue, active staff, no-shows. Next-up callout. Welcome checklist for new shops. |
| **Calendar** | Day / week views with drag-and-drop reschedule, staff columns, now-line, shift + break overlays, owner override. |
| **Bookings** | Day-scoped list or grid with filter chips, bulk status actions, soft-delete + Undo, CSV export, print day schedule. |
| **New booking** | 5-step wizard with autocomplete client lookup, live summary sidebar, conflict detection + override. |
| **Clients** | Rich directory with VIP, visit count, gender, last-seen, notes snippets, tappable phone, soft-delete with archive view. |
| **Staff** | Team directory + weekly schedule editor with Working / Day off / Vacation / Sick / Training statuses. |
| **Services** | Menu with uploaded photos or gradient heroes, category filter, per-office pricing. |
| **Team & access** | Account invites + role permissions matrix (owner / manager / barber / receptionist). |
| **Analytics** | Revenue charts, top services, staff performance, client retention. |
| **Settings** | Shop details, office addresses (Google Maps), theme, language, working hours. |
| **Help** | FAQ for common questions. |

---

## Key features

- **Multi-office** — switch between offices via the topbar. All data (calendar, bookings, clients, services) scopes automatically.
- **Role-based permissions** — Owner sees everything. Manager manages operations. Receptionist manages bookings + clients. Barber sees only their own chair.
- **Cross-office conflict detection** — a barber can't be double-booked across offices. Owner/manager can override when needed.
- **Drag-and-drop reschedule** on the calendar — snap to 15-minute increments.
- **Bulk actions** — select multiple bookings to mark complete, no-show, cancel, or delete — coordinated with a single summary toast ("3 of 20 failed").
- **Soft-delete + Undo** — deleting a client or appointment archives it. The Undo toast restores the exact record — id, createdAt, notes all preserved.
- **No-show tracking** — dedicated status, amber palette, surfaces on Overview KPI. The #1 thing salon owners ask for.
- **Inline reschedule** — change any appointment's time from the detail modal, preserves audit trail.
- **Photo uploads** — staff avatars + service photos. Canvas-compressed to 512px / 120 KB max.
- **Tappable phone + SMS** — `tel:` and `sms:` links on every appointment row and detail modal.
- **Weekly schedule with absences** — Working, Day off, Vacation, Sick, Training. Shifts and absences visible on the calendar.
- **Three languages** — English, Russian, Lithuanian. Full coverage, flag-switcher in the topbar.
- **Light + dark themes** — via next-themes.
- **Optimistic updates** — status changes feel instant; rollback on API error.
- **CSV export + print** on every list page.
- **Global search** — `⌘K` / `Ctrl+K` searches clients, staff, services, and bookings across both offices.

---

## Where the data lives

The app currently stores everything in the browser's `localStorage`:

- Data is **private to each device**.
- Clearing browser data resets the app to seed state.
- **Multiple devices don't sync** — each iPad has its own copy.

This is the right setup for a demo, training, or a single receptionist on one device. **For a live multi-device salon**, the app needs a real backend — see "Backend swap guide" below.

---

## Backend (Phase 2 — in progress)

A NestJS + Prisma + PostgreSQL backend lives in [`server/`](./server). Status: **Phase 0 scaffold** — schema, auth, email, and the appointments module are in place. The frontend still reads/writes `src/app/lib/api.ts` against localStorage; the swap to real REST is Phase 1.

```bash
cd server
npm install && npm run db:up && npm run prisma:migrate && npm run prisma:seed
npm run start:dev      # http://localhost:3001/api/v1, Swagger at /api/docs
```

See [`server/README.md`](./server/README.md) for full setup, what's implemented, and the Phase 1 roadmap.

### Why the swap is surgical, not a rewrite

1. **Every data access goes through `src/app/lib/api.ts`**. That single file owns localStorage reads/writes today. Swap each function's body for `fetch('/api/v1/…')` and the pages won't notice.
2. **Query keys are stable and office-scoped**: `['appointments', officeId]`, `['clients', officeId]`, etc. The new REST endpoints map 1:1.
3. **Mutations already have `onMutate` / `onError` / `onSettled`** — optimistic updates work locally and will keep working against a real API.
4. **`src/app/lib/query-keys.ts::invalidateBookingGraph`** centralizes cache invalidation — one function to call after any booking mutation.
5. **Office write guard is already in place**: `appointmentsApi.update/delete/restore` accept `{ officeId }` and throw on mismatch. The server enforces the same via `req.user.tenantId`.
6. **Soft-delete is opt-in via `deletedAt`** — Prisma schema mirrors it.
7. **Error reporting** goes through `src/app/lib/report-error.ts::reportError()`. Swap the body for `Sentry.captureException()` when ready.
8. **Schema versioning** lives at the top of `src/app/lib/mock-data.ts` (`CURRENT_SCHEMA_VERSION`). Bump on breaking seed changes.

---

## Technical

- **Framework:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + Radix UI primitives
- **State:** Zustand (office, auth, language) + TanStack Query v5 (server state)
- **Routing:** React Router v7, lazy routes with Suspense + ErrorBoundary per page
- **Forms:** react-hook-form + zod
- **Charts:** Recharts (lazy-loaded only on Analytics)
- **Icons:** Heroicons (outline + solid)
- **i18n:** Custom key-based translator, three locales
- **Tests:** Vitest — booking conflicts, availability calculations, permission matrix
- **Build:** Vendor chunks split (react / radix / date-fns / forms / query) — main bundle ~206 KB / 58 KB gzip

### Development

```bash
npm install            # install dependencies
npm run dev            # start dev server on localhost:5173
npm run build          # production build to dist/
npm run test           # run tests
npm run test:watch     # watch mode
```

### Deployment (Vercel)

```bash
npx vercel --prod --yes
npx vercel alias set <new-url> barber-dash-inky.vercel.app
```

### Project structure

```
src/app/
  pages/             route-level pages (12 total)
  components/
    layout/          header, dashboard shell, mobile nav
    ui/              shared Radix-wrapped primitives (Button, Input, Dialog, …)
    shared/          app-specific shared components (ErrorBoundary, PageSkeleton, Can, …)
    calendar/        calendar-specific subcomponents
    clients/         ClientForm
  hooks/             custom hooks (useT, usePermission, useConfirm, …)
  lib/               api layer, validation, CSV, image-upload, tokens, query-keys, report-error, permissions
  i18n/              en.ts, ru.ts, lt.ts (all keys covered)
  store/             Zustand stores (office, auth, language)
  types/             TypeScript types
  routes.tsx         route definitions (lazy + permission-gated)
  App.tsx            root component
src/styles/          theme.css with tokens + animations
```

### Schema version

`localStorage` uses a `barberpro_schema_version` key. Current version: **7**. If you change the shape of the seed data, bump `CURRENT_SCHEMA_VERSION` in `mock-data.ts` — existing browsers will re-seed on next load.

---

## Known gaps (honest handoff)

- **No real backend wired to the frontend yet** — frontend reads localStorage. NestJS scaffold is in [`server/`](./server) but the swap is Phase 1.
- **No real authentication on the deployed app** — any email/password passes (mock `authApi.login` accepts anything). The server module already implements argon2 + JWT, just not connected.
- **No timezones** — all dates render in the browser's local zone. Fine for a single country; multi-country deployment needs `date-fns-tz`.
- **No SMS / email delivery** — `tel:` and `sms:` are OS handoffs, not server-sent.
- **No payment / deposit tracking** — not in scope.
- **No Sentry / observability** — `reportError` is wired but logs to console only. Swap for Sentry in one line when ready.
- **22 unit tests, 0 E2E tests** — add Playwright when the backend exists.

---

## Support

For feature requests, bug reports, or scope changes — contact your developer.
