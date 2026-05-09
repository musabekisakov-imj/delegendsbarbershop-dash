# Week View: Single-Staff Picker Instead of Multi-Column

**Date:** 2026-05-09
**Status:** accepted

## Context

The calendar has three view modes: Day, Week, Grid. Grid view shows all staff as parallel
columns for a single day. When designing the Week view, the question was whether to show
all staff as columns across 7 days (like a full weekly matrix) or show one staff member's
full week at a time with a picker to switch between them.

A full multi-column week matrix would mean 8 staff × 7 days = 56 columns of data to render
and navigate — too dense for a dashboard header and unusable on anything smaller than a
wide desktop monitor.

## Options considered

**Option A — Multi-column week grid (all staff, 7 days)**
- Pro: See everyone's week at once
- Con: 56-column layout is unreadable; horizontal scroll nightmare on smaller screens
- Con: Performance hit rendering all appointments for all staff across a full week

**Option B — Single-staff week view with picker (chosen)**
- Pro: Clean 7-column layout, one day per column
- Pro: Staff picker fits in the header toolbar without adding a separate filter row
- Pro: Picker can show "N appointments this week" per staff — useful at a glance
- Con: Can only see one staff member at a time

## Decision

Single-staff week view with a grid-layout staff picker popover in the header toolbar.
The picker shows avatar + first name + week appointment count per staff member.
Staff shown in the picker mirrors the grid view's staff filter (`visibleStaff`), not all
active staff — so the two views stay in sync when filters are active.

The picker trigger button shows the selected staff's gradient avatar with initials,
full name, and week count. Chevron animates on open/close (framer-motion).
Popover opens with `align="start"` (left-anchored).

## Consequences

- `weekViewStaffId` is persisted in Zustand so the selection survives navigation
- Auto-reset effect runs when `visibleStaff` changes (staff deactivated or filtered out)
  and picks alphabetically-first visible staff member
- `weekStaffApptCount` only counts appointments for `visibleStaff` — consistent with grid
- Week view appointment data: `appointments.filter(a => a.staffId === weekViewStaffId)`
- If/when a backend arrives, week view should still query only the selected staff's
  appointments for the week range — not all staff
