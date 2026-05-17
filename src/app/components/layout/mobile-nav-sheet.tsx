import { NavLink, useNavigate } from 'react-router';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { cn } from '../ui/utils';
import { useT, useLanguage } from '../../hooks/use-t';
import { usePermission } from '../../hooks/use-permission';
import { useAuthStore } from '../../store/auth-store';
import { NAV } from './nav-config';
import type { Language } from '../../types';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'lt', label: 'LT' },
];

export function MobileNavSheet() {
  const t = useT();
  const navigate = useNavigate();
  const { can } = usePermission();
  const [language, setLanguage] = useLanguage();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  const visibleNav = NAV.filter(item => !item.requires || can(item.requires));

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() || 'U'
    : 'U';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Identity header */}
      <div className="px-4 py-5 border-b border-border flex items-center gap-3 shrink-0">
        <Avatar className="h-10 w-10 rounded-full shrink-0">
          <AvatarFallback className="rounded-full bg-brand text-brand-foreground text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
          </p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>

      {/* Nav links */}
      <nav
        className="flex-1 overflow-y-auto px-2 py-3"
        aria-label="Primary navigation"
      >
        <div className="space-y-0.5">
          {visibleNav.map(item => (
            <NavLink
              key={item.key}
              to={item.href}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-[7px] px-3 py-2.5 text-sm transition-colors min-h-[44px]',
                isActive
                  ? 'bg-brand-soft text-brand-soft-foreground font-medium'
                  : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{t(item.key)}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer — language + logout */}
      <div className="shrink-0 border-t border-border px-4 py-4 space-y-3">
        <div className="flex items-center gap-1">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              className={cn(
                'flex-1 rounded-[7px] py-1.5 text-xs font-semibold transition-colors',
                language === l.code
                  ? 'bg-brand-soft text-brand-soft-foreground'
                  : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-[7px] px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors min-h-[44px]"
        >
          <ArrowRightStartOnRectangleIcon className="h-5 w-5 shrink-0" />
          {t('common.logout')}
        </button>
      </div>
    </div>
  );
}
