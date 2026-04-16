import { NavLink } from 'react-router';
import {
  HomeIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../components/ui/utils';

const mobileNavigation = [
  { name: 'Overview', href: '/overview', icon: HomeIcon },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { name: 'Bookings', href: '/bookings', icon: ClipboardDocumentListIcon },
  { name: 'Clients', href: '/clients', icon: UserGroupIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon }
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white md:hidden">
      <div className="flex items-center justify-around">
        {mobileNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors',
                isActive ? 'text-blue-600' : 'text-gray-600'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('h-6 w-6', isActive ? 'text-blue-600' : 'text-gray-400')} />
                <span>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
