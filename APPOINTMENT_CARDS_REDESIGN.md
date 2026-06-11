# Handoff: redesign calendar appointment / break tiles

Goal: premium, compact calendar cards (Linear / Notion Calendar / Fresha feel).
Do this in a FRESH session — the originating session was at ~$4k / heavy context.

## Where the tiles live (find exact lines first — `calendar.tsx` is ~9k lines)
Appointment + break tiles render in THREE view modes — a redesign must cover all,
or refactor into one shared tile component used by each:
- **Grid view** tile (staff columns × hours) — the main one. Search for the appointment
  tile button around `calendar.tsx:5400–5860` (markers: `ScissorsIcon` in tile ~5493,
  status stripe, hover-card preview ~5436, drag-to-reschedule title ~5817).
- **Day agenda** tile and **Week view** tile — separate render paths (components
  `DayAgenda` / `week-view.tsx` in `src/app/components/calendar/`).
- **Break / lunch / blocked** tiles — `legacyMeta` map ~`calendar.tsx:5592` (uses
  `ClockIcon`, lunch fork icon `CustomForkKnifeIcon`); breaks use a semantic palette.

Recommendation: extract a single `<AppointmentTile variant=... />` + `<BlockTile />`
and reuse across grid/day/week so this never drifts again. Confirm scope with user
(shared refactor vs just restyle grid tiles).

## Reuse existing tokens (don't hardcode hex — `src/app/lib/tokens.ts`)
- `STATUS_DOT[status]`, `STATUS_PILL[status]`, `STATUS_STRIPE[status]` — status colors.
- `getStaffColor(idx)` + `staffColorMap` (id→idx) — per-staff hue for the left border.
- Break/lunch semantic palette already exists (see `legacyMeta`).
- `cn()` from `components/ui/utils`. Heroicons only.

## Spec (the five card types)

**Appointment — single service**
```
● <Customer name>   (bold)
<Service name>      (secondary/muted)
<2:00 PM – 2:30 PM> (bottom-right, tabular-nums)
```
White bg, 1px border `#E5E7EB` (`border-border`), **colored left border** = staff hue
(`getStaffColor`) or status, rounded 12–16px (`rounded-xl`), soft shadow, hover elevation.

**Appointment — multi-service** (apt.services.length > 1)
```
● <Customer name>
<Primary> + N more
<125 min>  •  €<total>
```
Do NOT list every service — summary only. Small duration badge. Use `apt.totalPrice`.

**Selected / VIP**
```
● <Customer>
<Service + Service>
<2:00 PM – 3:00 PM>          [VIP]
```
Soft highlight bg `#EFF6FF` + border `#2563EB` (`bg-blue-50 border-blue-500`). Small VIP badge.
NOTE: there is no `vip`/`selected` flag on Appointment today — decide the trigger
(selected state in calendar, or add a `client.vip` field). Confirm with user.

**Lunch**
```
🍴 Lunch   13:00–14:00   1h
```
Bg `#FFF7ED` border `#FDBA74` (`bg-orange-50 border-orange-300`). Rounded pill, NO stripes.

**Blocked time**
```
🔒 Blocked Time
<Staff Meeting>
14:00–15:00
```
Bg `#F8FAFC` border `#CBD5E1` (`bg-slate-50 border-slate-300`), small lock icon, neutral.

## Colors (map to Tailwind, not raw hex where a token exists)
| Type | bg | border |
|---|---|---|
| Appointment | #FFFFFF | #E5E7EB |
| Lunch | #FFF7ED | #FDBA74 |
| Blocked | #F8FAFC | #CBD5E1 |
| Selected/VIP | #EFF6FF | #2563EB |

## Interactions
Hover: slight elevation + stronger shadow + border darkens. No gradients, no glass.
Keep tiles compact enough for short calendar cells (15-min slots) — text truncates,
time can hide on very short tiles. Must stay readable in light + dark.

## Constraints
- i18n via `t()` (VIP/Lunch/Blocked labels → keys in en/ru/lt).
- Tokens/Tailwind only, heroicons only, light+dark, don't break drag-to-reschedule
  (tiles are drag sources — keep the `title`, drag handlers, onClick-to-open intact).

## Verify
Demo bookings exist (current-month seed merged). Open Calendar → Grid/Day/Week,
check each tile type renders, hover elevates, click opens the detail modal, drag still works.

## Prior handoffs in this repo
- `SERVICE_PICKER_REDESIGN.md` — card-based service picker (also pending).
