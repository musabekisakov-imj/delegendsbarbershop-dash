# Handoff: redesign `ServicePickerSheet` (card-based)

Target: turn the spreadsheet-row service picker into a card-grid picker
(Linear × Stripe × Fresha feel). Do this in a FRESH session — the session that
wrote this was at heavy context/cost.

## Where it lives
- Component: `src/app/pages/calendar.tsx` → `function ServicePickerSheet({ ... })` near **line ~3516**.
  (Read it first — confirm the exact current line; the file is ~9k lines.)
- Rendered twice inside `AppointmentDetailModal` (also in calendar.tsx, ~line 1235 and ~1260):
  once for the primary service, once per pending "Add next service" slot.

## Current prop contract (DO NOT break — both call sites rely on it)
```ts
<ServicePickerSheet
  open: boolean
  onClose: () => void
  services: Service[]          // from serviceList
  categories: Category[]
  staffName: string
  selectedIds: string[]        // currently 0–1 ids (single-select per slot)
  onSelect: (serviceId: string) => void   // picks ONE service, then caller closes
  t: (key, vars?) => string
/>
```
Service shape (`src/app/types/index.ts`): `{ id, name, price, duration, categoryId, description, ... }`.
Category: `{ id, name, color, sortOrder }`.

## IMPORTANT caveat — single vs multi select
The picker today is **single-select**: `onSelect(id)` fires once and the parent closes
the sheet + sets that one service. The redesign spec ("Selected Services" summary,
"Add Services" plural, running total) implies **multi-select**.

Pick one path and note it in the PR:
- **A (low risk, keep contract):** Visually upgrade to cards but keep single-pick —
  tapping a card calls `onSelect(id)` and closes. Drop the "selected summary/total"
  (or show it only as a single highlighted card). Smallest change, no parent edits.
- **B (full spec, more work):** Make the sheet manage a local `Set<string>` of picks,
  show the sticky summary + total, and add an "Add Services" button that commits.
  Requires a new `onSelectMany(ids: string[])` prop and updating BOTH call sites in
  `AppointmentDetailModal` (the pending-slot flow expects one service per slot, so
  multi-select there needs the parent to create multiple slots). Confirm with the user
  before doing B — it touches the booking flow, not just visuals.

Recommended: **A** unless the user explicitly wants multi-add in one sheet.

## Visual target (the spec)
- **Modal:** ~920px wide, `rounded-3xl` (24px), `shadow-[0_25px_60px_rgba(15,23,42,0.18)]`.
- **Header:** title "Add Services" + subtitle "Choose additional services for this booking."
- **Search:** prominent input with leading `MagnifyingGlassIcon`, rounded, filters by name/description live. (Skip the "Recent: …" chips unless trivial — there's no recent-search store yet.)
- **Layout:** 2-column grid on desktop (`sm:grid-cols-2`), grouped by category with a
  light section label (small, not the big dot separators). Optional "Popular" group can
  be skipped — there's no popularity field on Service.
- **Service card:**
  ```
  ✂ <name>            (ScissorsIcon tile + bold name)
  <description>       (muted, line-clamp-2)
  <duration> min • €<price>
  [ Add ]  → when selected: green, "✓ Added"
  ```
  Selected style: `bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-500`,
  with a `✓ Added` badge (CheckIcon).
- **Sticky footer:** `Selected: N services · <total>min · €<total>` on the left,
  `Cancel` + `Add Services` buttons on the right. (Footer total only meaningful in path B.)

## Constraints (project rules)
- i18n: every string via `t()`. Add keys to `src/app/i18n/{en,ru,lt}.ts` together.
  Likely new keys: `picker.title`, `picker.subtitle`, `picker.search`, `picker.add`,
  `picker.added`, `picker.selectedCount`, `picker.addServices`. Reuse `common.cancel`,
  `common.minAbbr`.
- Icons: heroicons only (`ScissorsIcon`, `MagnifyingGlassIcon`, `CheckIcon` already imported in calendar.tsx).
- Colors: tokens/Tailwind only — emerald for selected, `bg-card`/`border-border` for cards.
- Must work light + dark + en/ru/lt.

## Verify
- Calendar has demo bookings now (current-month seed already merged). Open a booking →
  detail modal → the Service card / "Add next service" → opens this sheet.
- Check: search filters, card select toggles green "Added", footer total updates (path B),
  Cancel closes, picking commits the service to the slot. Test dark mode + a narrow width.

## Status of the rest of this session's work (already committed + pushed)
Branch `fix/calendar-multiservice-tz-payment` (dashboard repo), PR #2:
- Appointment detail modal redesign (carded).
- Sidebar staff roster (role / presence / today count).
- Current-month appointment seed (schema v18).
- Login page redesign (owner console, logo, theme toggle, glass card).
Deployed-link env wiring + the empty-calendar root cause are documented in the session.
