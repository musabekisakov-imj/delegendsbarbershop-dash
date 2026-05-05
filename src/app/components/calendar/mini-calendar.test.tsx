import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MiniCalendar } from './mini-calendar';

// Regression test for the "prev/next month chevrons appeared dead" bug.
// Root cause: useEffect listed `viewMonth` in its deps, which created a
// feedback loop — user clicks `<` → viewMonth changes → effect re-runs →
// snaps viewMonth back to selectedDate's month. This test guards that fix.
//
// If someone re-introduces the snap-back regression, the "click prev" assertion
// will fail because the header still shows "May 2026" after the click.

describe('MiniCalendar — month navigation', () => {
  it('renders the selectedDate month in the header', () => {
    render(
      <MiniCalendar
        selectedDate={new Date(2026, 4, 4)} // May 4, 2026
        onSelectDate={() => {}}
        appointments={[]}
      />,
    );
    expect(screen.getByText('May 2026')).toBeInTheDocument();
  });

  it('navigates to the previous month when the < button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MiniCalendar
        selectedDate={new Date(2026, 4, 4)} // May
        onSelectDate={() => {}}
        appointments={[]}
      />,
    );

    expect(screen.getByText('May 2026')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Previous month'));
    expect(screen.getByText('April 2026')).toBeInTheDocument();
  });

  it('navigates to the next month when the > button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MiniCalendar
        selectedDate={new Date(2026, 4, 4)} // May
        onSelectDate={() => {}}
        appointments={[]}
      />,
    );

    await user.click(screen.getByLabelText('Next month'));
    expect(screen.getByText('June 2026')).toBeInTheDocument();
  });

  it('navigates multiple months in one direction without snapping back', async () => {
    const user = userEvent.setup();
    render(
      <MiniCalendar
        selectedDate={new Date(2026, 4, 4)} // May
        onSelectDate={() => {}}
        appointments={[]}
      />,
    );

    const next = screen.getByLabelText('Next month');
    await user.click(next);
    await user.click(next);
    await user.click(next);
    // May → June → July → August
    expect(screen.getByText('August 2026')).toBeInTheDocument();
  });

  it('snaps viewMonth back when selectedDate changes externally', async () => {
    // This is the OPPOSITE of the bug — the effect SHOULD fire when
    // selectedDate is updated by a parent, so the mini calendar follows along.
    // Verifies we kept that intentional behavior.
    const { rerender } = render(
      <MiniCalendar
        selectedDate={new Date(2026, 4, 4)} // May
        onSelectDate={() => {}}
        appointments={[]}
      />,
    );
    expect(screen.getByText('May 2026')).toBeInTheDocument();

    rerender(
      <MiniCalendar
        selectedDate={new Date(2026, 7, 15)} // August
        onSelectDate={() => {}}
        appointments={[]}
      />,
    );
    expect(screen.getByText('August 2026')).toBeInTheDocument();
  });

  it('fires onSelectDate when a day cell is clicked', async () => {
    const user = userEvent.setup();
    let picked: Date | null = null;
    render(
      <MiniCalendar
        selectedDate={new Date(2026, 4, 4)} // May 4
        onSelectDate={(d) => { picked = d; }}
        appointments={[]}
      />,
    );

    // Find the `15` day cell and click it
    await user.click(screen.getByRole('button', { name: '15' }));
    expect(picked).not.toBeNull();
    expect(picked!.getDate()).toBe(15);
    expect(picked!.getMonth()).toBe(4); // May (0-indexed)
  });
});
