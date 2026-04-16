import { Bars3Icon, BellIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/auth-store';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:hidden"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        
        {/* Search - Desktop only */}
        <div className="hidden md:flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 w-96">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients, appointments..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
          <kbd className="hidden lg:inline-flex items-center rounded border border-gray-200 bg-white px-1.5 py-0.5 text-xs text-gray-500">
            ⌘K
          </kbd>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <BellIcon className="h-6 w-6" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        
        {/* Logout */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="hidden md:inline-flex"
        >
          Logout
        </Button>
      </div>
    </header>
  );
}
