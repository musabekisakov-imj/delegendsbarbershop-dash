# BarberPro — Handoff & Demo Guide

One-pager for handing this project to the client. Print this or send as PDF.

**Live URL:** https://barber-dash-inky.vercel.app
**Login:** any email + any password (demo mode)

---

## 60-second demo flow (for the Loom recording you'll send the client)

Open the live URL with devtools closed. Record with Loom at 1080p.

1. **Login** with `admin@barberpro.com` / anything (2s)
2. **Overview** — point to the 4 KPI tiles + today's schedule + weekly chart (8s)
3. **Calendar** — switch day→week, drag a booking to a new slot, show the now-line (10s)
4. **Bookings** — click a row → detail modal → hit Reschedule → change time → save (8s)
5. **Clients** — open any client → scroll the recent visits preview → Book button → jumps to New Booking prefilled (8s)
6. **Staff → Schedule tab** — click a day's time chip → edit start/end in popover → save (6s)
7. **Staff → Edit a staff member** — show the dialog with photo upload + weekly schedule with Vacation/Sick/Training statuses (6s)
8. **Office switcher** (topbar) — switch from Office 1 to Office 2, show how everything re-scopes (3s)
9. **Language switcher** — flip to Russian, show everything translated, flip back (3s)
10. **Dark mode toggle** — sun/moon icon, everything adapts (3s)

Keep it tight — don't narrate every feature. Let the UI speak.

---

## Script to send the client (copy-paste)

> Hi [Name],
>
> The dashboard is ready. Here's everything you need:
>
> **Live:** https://barber-dash-inky.vercel.app
>
> **Login:** Use any of these emails + any password to try different roles:
> - `admin@barberpro.com` — Owner (full access)
> - `manager@barberpro.com` — Manager (manage operations)
> - `sarah@barberpro.com` — Receptionist (bookings + clients)
> - `maria@barberpro.com` — Barber (only her own appointments)
>
> **Install on tablet/phone:** Open the URL in Chrome/Safari, use the "Install app" option in the browser menu. It runs like a native app.
>
> **Languages:** English, Russian, Lithuanian — flag icon in the top bar.
> **Themes:** Light + dark — sun/moon icon next to the flag.
>
> **What's done** (README has the full list):
> - 11 fully working pages: Overview, Calendar, Bookings, New booking, Clients, Staff (with weekly schedule editor), Services, Team & access, Analytics, Settings, Help
> - Multi-office support (switch between your two locations in one tap)
> - Role-based permissions (owner / manager / receptionist / barber)
> - Drag-and-drop reschedule on the calendar
> - Soft-delete with Undo on every delete
> - Cross-office double-booking prevention
> - Bulk actions on bookings (mark complete / no-show / cancel / delete)
> - CSV export + print on every list
> - Photo uploads for staff avatars and service images
> - Three languages, light + dark mode, fully responsive
>
> **What still needs backend** (Phase 2 — already started):
> - The NestJS scaffold lives in `server/` (Postgres + Prisma + JWT auth + Resend email). Schema is complete, auth and the appointments module are working. The remaining domain modules (clients, staff, services, schedules) and the frontend swap are Phase 1 work — that's the next sprint.
> - Until that ships, data is per-device localStorage and login is demo-mode (any email/password).
> - Email confirmations + cancellations to clients work in the backend (Resend) — needs a verified sender domain to go live.
> - SMS reminders are not in scope for this phase.
>
> Loom video walkthrough: [link when you record it]
>
> Everything source code is in the repo. If you want someone else to extend it later, point them to the README and HANDOFF.md — they'll have the full picture in 15 minutes.

---

## Screenshots to capture (send as PNGs alongside the Loom)

Open each page, hit ⌘-shift-4 (Mac) or Win+Shift+S (Windows). Save as `screenshots/01-overview.png` etc.

1. **01-login.png** — the branded login page
2. **02-overview.png** — KPIs + chart + today's schedule, all populated
3. **03-calendar-day.png** — day view with a few bookings in staff columns
4. **04-calendar-week.png** — week grid view
5. **05-bookings-list.png** — list view with status filter chips
6. **06-booking-detail.png** — detail modal open, reschedule expanded
7. **07-clients.png** — clients list with visit counts + notes snippets
8. **08-client-detail.png** — client detail modal with stats band + recent visits
9. **09-staff-schedule.png** — Schedule tab with the week grid, click a chip open
10. **10-staff-edit.png** — staff edit dialog with weekly default + photo upload
11. **11-settings.png** — shop settings page
12. **12-dark-mode.png** — Overview in dark mode
13. **13-mobile.png** — iPhone frame (DevTools device toolbar) showing any page

---

## What to tell the client if they push back on scope

> "The frontend is complete and shippable today. It works for a single-device receptionist setup right now. For multi-device live sync, add backend later — that's a separate ~€3,500 project. Everything I built is structured so the swap is surgical, not a rewrite."

---

## Post-handoff support

The README has the "Backend (Phase 2)" section. If a future developer picks it up, they can:

- Read `src/app/lib/api.ts` — the single file to swap for real fetches
- Read `src/app/lib/query-keys.ts` — cache invalidation rule
- Read `src/app/types/index.ts` — full type surface, mirrors `server/prisma/schema.prisma`
- Read `src/app/lib/permissions.ts` — role matrix
- Read `server/README.md` — Phase 0 scaffold + Phase 1 module roadmap
- Run `npm install && npm run dev` to get the frontend live in 30 seconds
- Run the steps in `server/README.md` to get the backend up locally

Tell the client: **"If you hire anyone else to extend this, have them read the root README + HANDOFF.md + server/README.md first. It's all there."**
