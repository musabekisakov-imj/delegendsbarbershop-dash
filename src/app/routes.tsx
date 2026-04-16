import { createBrowserRouter, Navigate } from 'react-router';
import { DashboardLayout } from './components/layout/dashboard-layout';
import { LoginPage } from './pages/login';
import { OverviewPage } from './pages/overview';
import { CalendarPage } from './pages/calendar';
import { BookingsPage } from './pages/bookings';
import { NewBookingPage } from './pages/new-booking';
import { ClientsPage } from './pages/clients';
import { StaffPage } from './pages/staff';
import { ServicesPage } from './pages/services';
import { CatalogPage } from './pages/catalog';
import { SettingsPage } from './pages/settings';
import { HelpPage } from './pages/help';

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: LoginPage
  },
  {
    path: '/',
    Component: DashboardLayout,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: 'overview', Component: OverviewPage },
      { path: 'calendar', Component: CalendarPage },
      { path: 'bookings', Component: BookingsPage },
      { path: 'bookings/new', Component: NewBookingPage },
      { path: 'clients', Component: ClientsPage },
      { path: 'staff', Component: StaffPage },
      { path: 'services', Component: ServicesPage },
      { path: 'catalog', Component: CatalogPage },
      { path: 'settings', Component: SettingsPage },
      { path: 'help', Component: HelpPage }
    ]
  }
]);
