import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth-store';
import { useOfficeStore } from '../../store/office-store';
import { tenantApi } from '../../lib/api';
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
  const setOffices = useOfficeStore(s => s.setOffices);
  const currentOfficeId = useOfficeStore(s => s.currentOfficeId);
  const setOfficeId = useOfficeStore(s => s.setOfficeId);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => tenantApi.get(),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!tenant?.offices?.length) return;
    setOffices(tenant.offices);
    const ids = tenant.offices.map((o: { id: string }) => o.id);
    if (!ids.includes(currentOfficeId)) setOfficeId(ids[0]);
  }, [tenant, setOffices, currentOfficeId, setOfficeId]);

  useKeyboardShortcuts({ onShowHelp: () => setShortcutsOpen(true) });

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-64 bg-[radial-gradient(circle_at_top,rgba(24,95,165,0.08),transparent_60%)]"
      />
      <Header />

      <main className="relative z-10">
        <div key={location.pathname} className="page-enter px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      <ShortcutsSheet open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
