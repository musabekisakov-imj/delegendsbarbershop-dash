import {
  HomeIcon, CalendarIcon, ClipboardDocumentListIcon, UserGroupIcon,
  UsersIcon, ScissorsIcon, Cog6ToothIcon, ChartBarIcon, ShieldCheckIcon,
  QuestionMarkCircleIcon, ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import type { Permission } from '../../types';
import type { TranslationKey } from '../../i18n';

export interface NavItem {
  key: TranslationKey;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requires?: Permission;
}

export const NAV: NavItem[] = [
  { key: 'nav.overview',  href: '/overview',  icon: HomeIcon },
  { key: 'nav.analytics', href: '/analytics', icon: ChartBarIcon,            requires: 'analytics.view' },
  { key: 'nav.calendar',  href: '/calendar',  icon: CalendarIcon },
  { key: 'nav.bookings',  href: '/bookings',  icon: ClipboardDocumentListIcon },
  { key: 'nav.clients',   href: '/clients',   icon: UserGroupIcon,            requires: 'clients.view' },
  { key: 'nav.staff',     href: '/staff',     icon: UsersIcon,                requires: 'staff.view' },
  { key: 'nav.services',  href: '/services',  icon: ScissorsIcon,             requires: 'services.view' },
  { key: 'nav.products',  href: '/products',  icon: ShoppingBagIcon,          requires: 'services.view' },
  { key: 'nav.accounts',  href: '/accounts',  icon: ShieldCheckIcon,          requires: 'accounts.view' },
  { key: 'nav.settings',  href: '/settings',  icon: Cog6ToothIcon,            requires: 'settings.view' },
  { key: 'nav.help',      href: '/help',      icon: QuestionMarkCircleIcon },
];

// Legacy aliases — remove once all consumers are updated to NAV.
export const PRIMARY_NAV = NAV;
export const MANAGE_NAV: NavItem[] = [];
