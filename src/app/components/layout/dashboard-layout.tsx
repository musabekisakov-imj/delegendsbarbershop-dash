import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/auth-store';
import { Header } from './header';
import { useKeyboardShortcuts } from '../../hooks/use-keyboard-shortcuts';
import { ShortcutsSheet } from '../shared/shortcuts-sheet';

// In production (Vercel) only these routes are visible; others blur with "coming soon".
// In development (localhost) the gate is disabled — all routes render normally.
const PREVIEW_ROUTES = ['/overview', '/calendar', '/analytics'];

/**
 * Client review, item 1: "No sidebar but changed to header bar"
 * Client review, item 2: "Only one side scroll"
 *
 * This layout is deliberately minimal:
 *   - A sticky <Header> with brand + utilities + nav all in one bar
 *   - A single <main> that is the page-scroll container — no nested overflow
 *   - The document body itself is *not* scroll-locked, so the browser's own
 *     scrollbar is the only scroll in view (one scroll, not two)
 */
export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  // Auth is hydrated once in main.tsx before React mounts — no effect here.
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useKeyboardShortcuts({ onShowHelp: () => setShortcutsOpen(true) });

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  const isPreviewRoute = !import.meta.env.PROD
    || PREVIEW_ROUTES.some(r => location.pathname === r || location.pathname.startsWith(r + '/'));

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Single scroll container — the page itself scrolls.
          No max-width cap here: dashboards (calendar, bookings grid, analytics)
          benefit from full viewport width. Reading-heavy pages can self-cap
          with an inner `max-w-*` if they want to. `key={pathname}` re-mounts
          the subtree on route change so the page-enter fade animation fires. */}
      <main>
        <div key={location.pathname} className="page-enter px-4 py-6 md:px-6 lg:px-8">
          {isPreviewRoute ? (
            <Outlet />
          ) : (
            <div className="relative min-h-[calc(100vh-80px)]">
              {/* Blurred page content underneath */}
              <div className="pointer-events-none select-none opacity-30">
                <Outlet />
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4">
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-10 py-8 shadow-xl text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <LockClosedIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-foreground">Coming soon</p>
                    <p className="mt-1 text-sm text-muted-foreground max-w-[240px]">
                      This section is still being built. Check back soon.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <ShortcutsSheet open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
