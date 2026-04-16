import { NavLink } from 'react-router';
import {
  HomeIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  UsersIcon,
  ScissorsIcon,
  BookOpenIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../components/ui/utils';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const navigation = [
  { name: 'Overview', href: '/overview', icon: HomeIcon },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { name: 'Bookings', href: '/bookings', icon: ClipboardDocumentListIcon },
  { name: 'Clients', href: '/clients', icon: UserGroupIcon },
  { name: 'Staff', href: '/staff', icon: UsersIcon },
  { name: 'Services', href: '/services', icon: ScissorsIcon },
  { name: 'Catalog', href: '/catalog', icon: BookOpenIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  { name: 'Help', href: '/help', icon: QuestionMarkCircleIcon }
];

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-300 lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          !isOpen && 'lg:w-0 lg:border-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <ScissorsIcon className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900">BarberPro</span>
          </div>
          <button
            onClick={onToggle}
            className="lg:hidden -mr-2 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn('h-5 w-5', isActive ? 'text-blue-600' : 'text-gray-400')} />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        
        {/* User Section */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
              AU
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">Admin User</p>
              <p className="truncate text-xs text-gray-500">BarberPro Shop</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
