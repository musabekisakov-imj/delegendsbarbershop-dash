# FOUND_ISSUES — Week-view refactor follow-ups

These were observed during the Week-view refactor but deferred to keep the diff focused. None are blockers; some were originally in the spec and intentionally scoped out, others surfaced as side-channel finds.

## Deferred from this round's spec

### 1. Out-of-bounds appointment clamp + arrow indicators
- **Spec asked**: clamp appointments outside `[dayStartHour, dayEndHour]` and surface `ti-arrow-up` / `ti-arrow-down` on the tile.
- **Status**: Not implemented. Out-of-bounds appointments today render at negative/overflow `top` and are clipped by the column's `overflow-hidden` — they vanish silently rather than visibly clamping. In production this is rare (bookings stay within business hours), but a salon that runs 22:00–02:00 with `dayEndHour=22` would lose the late tiles.
- **Where to add**: `src/app/components/calendar/week-view.tsx`, the `bucket?.appts.map(apt => …)` block. Pre-clamp `start/end` to the visible range, set a `clampedTop`/`clampedBottom` flag, render `<ArrowUpIcon className="h-2.5 w-2.5" />` / `<ArrowDownIcon />` in the tile's top-right corner.

### 2. Day-off overlay color in dark mode
- Used `var(--border)` for the diagonal stripe, which resolves to a low-contrast value in dark mode. The "DAY OFF" label is legible (contrasted bg-canvas plate), but the stripes themselves are nearly invisible.
- **Where to refine**: define a dedicated `--day-off-stripe` CSS var in `src/styles/theme.css` light + dark blocks (light `#E4E4E7`, dark `#3F3F46` per spec).

## Surfaced as side-channel findings (pre-existing, not introduced by this round)

### 3. Module-scope `Math.random` in LocationEditModal
- `src/app/pages/settings-sections/business.tsx:277` — `id: \`office-${Math.random().toString(36).substring(2, 9)}\`` is computed at component mount, not on Save. Re-opening the modal yields a stale id baked into the initial draft.
- **Fix**: move the id generation inside the `onSave` callback (or behind a `useState` initializer that runs only on create).

### 4. Stale `useState` callback antipattern
- `src/app/pages/settings-sections/business.tsx:281` — `useState(() => setDraft(office ?? draft))` uses `useState` as if it were `useEffect`. The callback only runs on mount, so re-opening for a different office never resets the draft.
- **Fix**: replace with `useEffect(() => setDraft(office ?? blank), [office])`.

### 5. WeekView break aggregation collapses naturally but the field stays
- After per-staff filtering, `breaksPerDay` always emits `count: 1` (a barber can't have two simultaneous breaks of the same type). The aggregation logic at `week-view.tsx:209-248` is intact but functionally unused. Could simplify to a flat list; deferred because the cost is one Map lookup per render and removing it touches subtle diffs.

### 6. `BLOCK_ICON` could move to `lib/tokens.ts`
- Both `week-view.tsx:42-47` and `calendar.tsx:4621-4638` carry their own break-type → icon maps. Consolidating into `tokens.ts` would prevent the next divergence (one currently uses `HeartIcon` for `rest`, the other uses something else — nothing forces them to stay in sync).

### 7. Grid staff header cards could use `StaffCard variant="grid"`
- The Grid view sticky header (`calendar.tsx:~6453`) still renders inline `<button>` elements. We refactored them to use `StaffCard` in this round, but the `StaffCard` grid variant currently duplicates some click/border-r logic that lives in `calendar.tsx` (e.g. `i < visibleStaffCount - 1 && 'border-r'` and `minWidth` inline style). Could be cleaner if `StaffCard` accepted a `bordered` prop.
- Low priority — currently works correctly, the coupling is explicit and legible.

## Out-of-scope per the original spec

- Day view (untouched)
- Grid view (untouched)
- DB / API changes (none — pure client refactor)
- New dependencies (none — heroicons only)
- Auto-switch BACK to Week when the viewport grows ≥768 (deliberate non-goal — would surprise the user mid-task)
- Editing breaks from Week view (Day grid remains canonical)
- Heatmap / occupancy density overlay
- Per-staff focus syncing with `focusedStaffId` (deliberate — Week selector and Day/Grid focus are independent concerns)
