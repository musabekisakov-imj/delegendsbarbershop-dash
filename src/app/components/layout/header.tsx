import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router';
import {
  HomeIcon, CalendarIcon, ClipboardDocumentListIcon, UserGroupIcon, UsersIcon,
  ScissorsIcon, Cog6ToothIcon, QuestionMarkCircleIcon, ChartBarIcon, ShieldCheckIcon,
  Bars3Icon, XMarkIcon, SunIcon, MoonIcon, CheckIcon,
  ArrowRightStartOnRectangleIcon, UserCircleIcon, GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from 'next-themes';
import { cn } from '../ui/utils';
import { useT, useLanguage } from '../../hooks/use-t';
import { useAuthStore } from '../../store/auth-store';
import { usePermission } from '../../hooks/use-permission';
import { OfficeSwitcher } from '../office-switcher';
import { GlobalSearch } from '../global-search';
import { NotificationsBell } from '../notifications-bell';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import type { Language, Permission, StaffRole } from '../../types';
import type { TranslationKey } from '../../i18n';

// Map each role to its translation key so the user-menu badge localizes correctly.
const ROLE_TRANSLATION_KEY: Record<StaffRole, TranslationKey> = {
  owner:        'staff.roleOwner',
  manager:      'staff.roleManager',
  barber:       'staff.roleBarber',
  receptionist: 'staff.roleReceptionist',
};

// ─── Nav config ───────────────────────────────────
const NAV: { key: TranslationKey; href: string; icon: typeof HomeIcon; requires?: Permission }[] = [
  { key: 'nav.overview',  href: '/overview',  icon: HomeIcon },
  { key: 'nav.analytics', href: '/analytics', icon: ChartBarIcon, requires: 'analytics.view' },
  { key: 'nav.calendar',  href: '/calendar',  icon: CalendarIcon },
  { key: 'nav.bookings',  href: '/bookings',  icon: ClipboardDocumentListIcon },
  { key: 'nav.clients',   href: '/clients',   icon: UserGroupIcon, requires: 'clients.view' },
  { key: 'nav.staff',     href: '/staff',     icon: UsersIcon,    requires: 'staff.view' },
  { key: 'nav.services',  href: '/services',  icon: ScissorsIcon, requires: 'services.view' },
  { key: 'nav.accounts',  href: '/accounts',  icon: ShieldCheckIcon, requires: 'accounts.view' },
  { key: 'nav.settings',  href: '/settings',  icon: Cog6ToothIcon, requires: 'settings.view' },
  { key: 'nav.help',      href: '/help',      icon: QuestionMarkCircleIcon },
];

const LANGUAGES: { code: Language; flag: string; label: string; short: string }[] = [
  { code: 'en', flag: '🇺🇸', label: 'English',  short: 'EN' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский',  short: 'RU' },
  { code: 'lt', flag: '🇱🇹', label: 'Lietuvių', short: 'LT' },
];

// ─── Header ───────────────────────────────────────
// Single-row on desktop (>=xl): brand | nav (icon+label) | utilities
// Single-row on tablet (md..xl):  brand | nav (icon-only w/ tooltip) | utilities
// Single-row on mobile (<md):     brand | hamburger (slides nav panel down)
//
// Previous 2-row implementation ate ~104px of vertical on every page.
export function Header() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const { can } = usePermission();
  const visibleNav = NAV.filter(item => !item.requires || can(item.requires));
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() || 'U'
    : 'U';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-14 items-center gap-2 px-4 md:px-6">
        {/* Brand — two-line stacked logotype: "DeLegends" as the dominant
            18 px Bold mark, "barbershop" as a small wide-tracked secondary
            line. Left-aligned to the icon's right edge so the eye reads
            ✂ → D → L → e... in one stroke. "barbershop" is hardcoded as a
            logotype element (not translated) — same way "Apple Inc." stays
            English across locales. */}
        <NavLink to="/overview" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <ScissorsIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-[18px] font-bold tracking-tight text-foreground">
              {t('brand.name')}
            </span>
            <span className="mt-1 text-[10px] font-medium tracking-[0.22em] uppercase text-muted-foreground">
              barbershop
            </span>
          </div>
        </NavLink>

        {/* Desktop nav (inline) — overflow-hidden + min-w-0 prevents
            children with whitespace-nowrap from bleeding into the
            right-side utilities. Labels appear ONLY at 2xl (≥1536px)
            because below that, 10 labels + utilities don't fit cleanly. */}
        <nav
          className="hidden md:flex items-center gap-0.5 flex-1 min-w-0 ml-2 overflow-hidden"
          aria-label="Primary navigation"
        >
          {visibleNav.map(item => (
            <NavLink
              key={item.key}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'group relative inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'font-medium text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
              title={t(item.key)}
            >
              {({ isActive }) => (
                <>
                  <item.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                  {/* Label only at 2xl+ — at smaller widths, icon + tooltip */}
                  <span className="hidden 2xl:inline">{t(item.key)}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Push utilities right on mobile where nav is hidden */}
        <div className="flex-1 md:hidden" />

        {/* Utilities */}
        <div className="hidden md:block">
          <OfficeSwitcher />
        </div>

        <div className="hidden md:block">
          <GlobalSearch />
        </div>

        {/* Icon-button cluster — all 30×30, rounded-[7px], gap-1.5 */}
        <div className="hidden md:flex items-center gap-1.5 ml-1">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                aria-label="Change language"
              >
                <GlobeAltIcon className="h-[18px] w-[18px]" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1">
              <LanguagePicker />
            </PopoverContent>
          </Popover>

          <ThemeToggle />

          <NotificationsBell />

          {/* User avatar → dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex h-[30px] w-[30px] items-center justify-center rounded-[7px] hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                aria-label="User menu"
              >
                <div className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-indigo-100 text-[11px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  {initials}
                </div>
              </button>
            </PopoverTrigger>
          <PopoverContent align="end" className="w-60 p-1">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-semibold text-foreground truncate">
                {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              {user?.role && (
                <span className="mt-1.5 inline-flex text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded px-1.5 py-0.5">
                  {t(ROLE_TRANSLATION_KEY[user.role])}
                </span>
              )}
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 mt-1 text-sm text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <UserCircleIcon className="h-4 w-4 text-muted-foreground" />
              My profile
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <ArrowRightStartOnRectangleIcon className="h-4 w-4 text-muted-foreground" />
              {t('common.logout')}
            </button>
          </PopoverContent>
          </Popover>
        </div>{/* end icon-button cluster */}

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="md:hidden rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav panel */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border/70" aria-label="Primary navigation">
          <ul className="flex flex-col px-2 py-2 gap-0.5">
            {visibleNav.map(item => (
              <li key={item.key}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'font-medium text-muted-foreground hover:bg-accent hover:text-foreground',
                    )
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span>{t(item.key)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 px-3 pb-3 pt-1 border-t border-border/50">
            <OfficeSwitcher />
            <div className="flex-1">
              <GlobalSearch />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

// ─── Subcomponents ───────────────────────────────

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Two-mode toggle: light ↔ dark. Icon hints at the *next* mode so the
  // affordance reads as "click to advance."
  const next = resolvedTheme === 'light' ? 'dark' : 'light';
  const label = next === 'dark' ? 'Switch to dark mode' : 'Switch to light mode';
  return (
    <button
      onClick={() => setTheme(next)}
      className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-[7px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      aria-label={label}
      title={label}
    >
      {resolvedTheme === 'light' ? (
        <MoonIcon className="h-[18px] w-[18px]" />
      ) : (
        <SunIcon className="h-[18px] w-[18px]" />
      )}
    </button>
  );
}

function LanguageFlag() {
  const [language] = useLanguage();
  const current = LANGUAGES.find(l => l.code === language) ?? LANGUAGES[0];
  return (
    <>
      <span className="text-sm leading-none">{current.flag}</span>
      <span className="hidden sm:inline tabular-nums text-xs font-semibold">{current.short}</span>
    </>
  );
}

function LanguagePicker() {
  const [language, setLanguage] = useLanguage();
  return (
    <>
      {LANGUAGES.map(l => {
        const active = language === l.code;
        return (
          <button
            key={l.code}
            onClick={() => setLanguage(l.code)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors',
              active ? 'bg-accent text-accent-foreground font-medium' : 'text-foreground hover:bg-accent/60',
            )}
          >
            <span className="text-sm leading-none">{l.flag}</span>
            <span className="flex-1 text-left">{l.label}</span>
            {active && <CheckIcon className="h-4 w-4 text-primary shrink-0" />}
          </button>
        );
      })}
    </>
  );
}
