import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { DashboardLayout } from './components/layout/dashboard-layout';
import { LoginPage } from './pages/login';
import { RouteFallback } from './components/shared/page-skeleton';
import { ErrorBoundary } from './components/shared/error-boundary';
import { RequirePermission } from './components/shared/require-permission';
import type { Permission } from './types';

// ─── Lazy-loaded page chunks ─────────────────────────────────────
// Each page becomes its own bundle — only loads when the user navigates there.
// First-paint on `/login` no longer pulls calendar grid + Recharts + cmdk etc.
const OverviewPage = lazy(() => import('./pages/overview').then(m => ({ default: m.OverviewPage })));
const CalendarPage = lazy(() => import('./pages/calendar').then(m => ({ default: m.CalendarPage })));
const BookingsPage = lazy(() => import('./pages/bookings').then(m => ({ default: m.BookingsPage })));
const NewBookingPage = lazy(() => import('./pages/new-booking').then(m => ({ default: m.NewBookingPage })));
const ClientsPage = lazy(() => import('./pages/clients').then(m => ({ default: m.ClientsPage })));
const StaffPage = lazy(() => import('./pages/staff').then(m => ({ default: m.StaffPage })));
const ServicesPage = lazy(() => import('./pages/services').then(m => ({ default: m.ServicesPage })));
const ProductsPage = lazy(() => import('./pages/products').then(m => ({ default: m.ProductsPage })));
const SettingsPage = lazy(() => import('./pages/settings').then(m => ({ default: m.SettingsPage })));
const HelpPage = lazy(() => import('./pages/help').then(m => ({ default: m.HelpPage })));
const AnalyticsPage = lazy(() => import('./pages/analytics').then(m => ({ default: m.AnalyticsPage })));
const AccountsPage = lazy(() => import('./pages/accounts').then(m => ({ default: m.AccountsPage })));
const ProfilePage = lazy(() => import('./pages/profile').then(m => ({ default: m.ProfilePage })));

// Wrap each lazy page with Suspense + ErrorBoundary so one broken chunk
// doesn't white-screen the whole app and loading states are consistent.
// When `requires` is passed, the page is additionally gated by a permission —
// users without access see the no-access card instead of the page.
const page = (Component: React.ComponentType, requires?: Permission) => {
  const content = (
    <Suspense fallback={<RouteFallback />}>
      <Component />
    </Suspense>
  );
  return (
    <ErrorBoundary>
      {requires ? <RequirePermission permission={requires}>{content}</RequirePermission> : content}
    </ErrorBoundary>
  );
};

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: LoginPage,
  },
  {
    path: '/',
    Component: DashboardLayout,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: 'overview', element: page(OverviewPage) },
      { path: 'analytics', element: page(AnalyticsPage) },
      { path: 'calendar', element: page(CalendarPage) },
      { path: 'bookings', element: page(BookingsPage) },
      { path: 'bookings/new', element: page(NewBookingPage) },
      { path: 'clients', element: page(ClientsPage) },
      { path: 'staff', element: page(StaffPage) },
      { path: 'services', element: page(ServicesPage) },
      { path: 'products', element: page(ProductsPage) },
      { path: 'accounts', element: page(AccountsPage) },
      { path: 'profile', element: page(ProfilePage) },
      { path: 'settings', element: page(SettingsPage) },
      { path: 'help', element: page(HelpPage) },
    ],
  },
]);
