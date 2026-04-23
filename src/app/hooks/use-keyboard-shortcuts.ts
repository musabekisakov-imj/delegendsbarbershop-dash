import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';

// Returns true if focus is in an input / textarea / contenteditable — in which case
// we skip letter shortcuts so typing doesn't trigger navigation.
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

interface Options {
  onShowHelp: () => void;
}

// Global shortcuts. ⌘K is handled by the GlobalSearch component itself.
// "G then X" is a GitHub-style leader-key pattern: press G, then within 1.5s press
// C/B/S/O/L/T/P to jump to calendar/bookings/services/overview/clients/staff/settings.
export function useKeyboardShortcuts({ onShowHelp }: Options) {
  const navigate = useNavigate();
  const gPressed = useRef(false);
  const gTimer = useRef<number | null>(null);

  useEffect(() => {
    const clearG = () => {
      gPressed.current = false;
      if (gTimer.current) window.clearTimeout(gTimer.current);
      gTimer.current = null;
    };

    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in a form field
      if (isTypingTarget(e.target)) {
        // One exception: `/` to focus search is universal
        if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
          const isSearchInput =
            e.target instanceof HTMLElement && e.target.tagName === 'INPUT' &&
            (e.target as HTMLInputElement).type === 'search';
          if (!isSearchInput) return;
        }
        return;
      }

      // Don't intercept modifier combos (⌘K handled elsewhere, ⌘S is browser)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // Leader-key "g then X"
      if (gPressed.current) {
        const routes: Record<string, string> = {
          o: '/overview',
          c: '/calendar',
          b: '/bookings',
          l: '/clients',
          t: '/staff',
          s: '/services',
          p: '/settings',
          h: '/help',
        };
        const route = routes[key];
        if (route) {
          e.preventDefault();
          navigate(route);
        }
        clearG();
        return;
      }

      if (key === 'g') {
        gPressed.current = true;
        gTimer.current = window.setTimeout(clearG, 1500);
        return;
      }

      // Direct shortcuts
      if (key === 'n') {
        e.preventDefault();
        navigate('/bookings/new');
        return;
      }
      if (key === '?') {
        e.preventDefault();
        onShowHelp();
        return;
      }
      if (key === '/') {
        // Focus the first search input on the page
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[placeholder*="Search" i], input[type="search"]',
        );
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      clearG();
    };
  }, [navigate, onShowHelp]);
}
