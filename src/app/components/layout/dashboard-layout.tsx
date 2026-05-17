import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { useAuthStore } from '../../store/auth-store';
import { Header } from './header';
import { useKeyboardShortcuts } from '../../hooks/use-keyboard-shortcuts';
import { ShortcutsSheet } from '../shared/shortcuts-sheet';


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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <div key={location.pathname} className="page-enter px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      <ShortcutsSheet open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
