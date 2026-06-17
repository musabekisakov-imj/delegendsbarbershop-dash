import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  HomeIcon, CalendarIcon, ClipboardDocumentListIcon, UserGroupIcon, UsersIcon,
  ScissorsIcon, ShoppingBagIcon, Cog6ToothIcon, QuestionMarkCircleIcon, ChartBarIcon, ShieldCheckIcon,
  Bars3Icon, XMarkIcon, SunIcon, MoonIcon, CheckIcon,
  ArrowRightStartOnRectangleIcon, UserCircleIcon, ChevronDownIcon, EllipsisHorizontalIcon,
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
import { accountsApi, staffApi } from '../../lib/api';
import type { Language, Permission, StaffRole } from '../../types';
import type { TranslationKey } from '../../i18n';

// Shared shell for the three container-style controls (location, search, language).
// Single source of truth — edit here to resize the whole cluster at once.
export const CONTAINER_SHELL =
  'inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200/85 bg-white px-3.5 ' +
  'text-[14px] font-bold text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_-22px_rgba(15,23,42,0.65)] transition-all duration-200 ' +
  'hover:-translate-y-px hover:border-[#2563EB]/30 hover:bg-[#FBFCFF] hover:text-slate-950 hover:shadow-[0_14px_30px_-24px_rgba(37,99,235,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/28 ' +
  'dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-100 dark:hover:bg-white/[0.08] dark:hover:text-white';

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
  { key: 'nav.products',  href: '/products',  icon: ShoppingBagIcon, requires: 'services.view' },
  { key: 'nav.accounts',  href: '/accounts',  icon: ShieldCheckIcon, requires: 'accounts.view' },
  { key: 'nav.settings',  href: '/settings',  icon: Cog6ToothIcon, requires: 'settings.view' },
  { key: 'nav.help',      href: '/help',      icon: QuestionMarkCircleIcon },
];

const PRIMARY_NAV_KEYS = new Set<TranslationKey>([
  'nav.overview',
  'nav.calendar',
  'nav.bookings',
  'nav.clients',
  'nav.services',
]);

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
  const [language] = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const { can } = usePermission();
  const visibleNav = NAV.filter(item => !item.requires || can(item.requires));
  const primaryNav = visibleNav.filter(item => PRIMARY_NAV_KEYS.has(item.key));
  const moreNav = visibleNav.filter(item => !PRIMARY_NAV_KEYS.has(item.key));
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentLang = LANGUAGES.find(l => l.code === language) ?? LANGUAGES[0];
  const { data: account } = useQuery({
    queryKey: ['account', user?.id],
    queryFn: () => accountsApi.getById(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
  const { data: staff = [] } = useQuery({
    queryKey: ['staff-all'],
    queryFn: () => staffApi.getAll(),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
  const linkedStaff = account?.staffId
    ? staff.find(member => member.id === account.staffId)
    : undefined;
  const avatarUrl = user?.avatarUrl || account?.avatarUrl || linkedStaff?.avatarUrl;

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() || 'U'
    : 'U';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const isRouteActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);
  const activeMoreItem = moreNav.find(item => isRouteActive(item.href));

  return (
    <header className="sticky top-0 z-40 border-b border-border/75 bg-card/92 shadow-[0_1px_0_rgba(255,255,255,0.72),0_12px_30px_-28px_rgba(15,23,42,0.5)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/86 dark:shadow-[0_1px_0_rgba(255,255,255,0.04),0_14px_36px_-30px_rgba(0,0,0,0.85)]">
      <div className="flex h-[66px] items-center gap-2 px-3 md:px-5">
        {/* Brand — emblem mark + two-line logotype. Same asset as the favicon
            and route loader, so the brand reads consistently everywhere. */}
        <NavLink to="/overview" className="group flex items-center gap-2.5 shrink-0">
          <img
            src="/icon-192.png"
            alt=""
            draggable={false}
            className="h-9 w-9 select-none rounded-full shadow-[0_8px_18px_-12px_rgba(10,21,37,0.65)] transition-all group-hover:-translate-y-px group-hover:shadow-[0_10px_22px_-12px_rgba(10,21,37,0.8)]"
          />
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-[18px] font-bold tracking-tight text-foreground">
              {t('brand.name')}
            </span>
            <span className="mt-1 text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/90">
              {t('brand.tagline')}
            </span>
          </div>
        </NavLink>

        {/* Desktop nav: segmented rail with open gaps between page pills.
            Active route gets the filled inner pill; inactive routes stay light,
            scan-friendly, and keep their icon in a small global circle. */}
        <nav
          className="hidden md:flex flex-1 min-w-0 ml-2 overflow-hidden"
          aria-label="Primary navigation"
        >
          <div className="flex max-w-full items-center gap-1.5 overflow-hidden rounded-full border border-slate-200/80 bg-slate-100/72 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_1px_2px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            {primaryNav.map(item => (
              <NavLink
                key={item.key}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'group relative inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-2.5 text-[14px] transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30',
                    isActive
                      ? 'bg-[#2563EB] text-white font-black shadow-[0_10px_22px_-14px_rgba(37,99,235,0.9),inset_0_1px_0_rgba(255,255,255,0.22)]'
                      : 'font-bold text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white',
                  )
                }
                title={t(item.key)}
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'grid h-7 w-7 place-items-center rounded-full transition-colors',
                        isActive
                          ? 'bg-white/18 text-white'
                          : 'bg-white text-slate-500 ring-1 ring-slate-200/80 group-hover:text-[#2563EB] dark:bg-white/[0.07] dark:text-slate-300 dark:ring-white/10',
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                    </span>
                    <span className={cn('hidden 2xl:inline', isActive && 'lg:inline')}>
                      {t(item.key)}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
            {moreNav.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      'group relative inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-2.5 text-[14px] transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30',
                      activeMoreItem
                        ? 'bg-[#2563EB] text-white font-black shadow-[0_10px_22px_-14px_rgba(37,99,235,0.9),inset_0_1px_0_rgba(255,255,255,0.22)]'
                        : 'font-bold text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white',
                    )}
                    aria-label={activeMoreItem ? t(activeMoreItem.key) : t('nav.more')}
                    title={activeMoreItem ? t(activeMoreItem.key) : t('nav.more')}
                    type="button"
                  >
                    <span
                      className={cn(
                        'grid h-7 w-7 place-items-center rounded-full transition-colors',
                        activeMoreItem
                          ? 'bg-white/18 text-white'
                          : 'bg-white text-slate-500 ring-1 ring-slate-200/80 group-hover:text-[#2563EB] dark:bg-white/[0.07] dark:text-slate-300 dark:ring-white/10',
                      )}
                    >
                      {activeMoreItem ? (
                        <activeMoreItem.icon className="h-4 w-4 shrink-0" />
                      ) : (
                        <EllipsisHorizontalIcon className="h-4 w-4 shrink-0" />
                      )}
                    </span>
                    <span className={cn('hidden xl:inline', activeMoreItem && 'lg:inline')}>
                      {activeMoreItem ? t(activeMoreItem.key) : t('nav.more')}
                    </span>
                    <ChevronDownIcon
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        activeMoreItem ? 'text-white/80' : 'text-slate-400 dark:text-slate-500',
                      )}
                    />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-60 p-1.5">
                  {moreNav.map(item => {
                    const isActive = isRouteActive(item.href);
                    return (
                      <button
                        key={item.key}
                        onClick={() => navigate(item.href)}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30',
                          isActive
                            ? 'bg-[#2563EB] font-bold text-white shadow-[0_10px_18px_-14px_rgba(37,99,235,0.9)]'
                            : 'font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.08]',
                        )}
                        type="button"
                      >
                        <span
                          className={cn(
                            'grid h-8 w-8 place-items-center rounded-full',
                            isActive
                              ? 'bg-white/18 text-white'
                              : 'bg-slate-100 text-slate-500 dark:bg-white/[0.07] dark:text-slate-300',
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1 text-left">{t(item.key)}</span>
                        {isActive && <CheckIcon className="h-4 w-4 shrink-0 text-white" />}
                      </button>
                    );
                  })}
                </PopoverContent>
              </Popover>
            )}
          </div>
        </nav>

        {/* Push utilities right on mobile where nav is hidden */}
        <div className="flex-1 md:hidden" />

        {/* Utility cluster — desktop only. Two visual groups separated by a divider.
            Group A (containers, 36px): location | search | language
            Group B (icon buttons, 36×36): theme | bell | avatar */}
        <div className="hidden md:flex items-center gap-2">
          {/* Group A — containers */}
          <OfficeSwitcher />
          <GlobalSearch />
          <Popover>
            <PopoverTrigger asChild>
              <button className={CONTAINER_SHELL} aria-label={t('lang.change')}>
                <span className="font-black">{currentLang.label}</span>
                <ChevronDownIcon className="h-4 w-4 text-slate-400 dark:text-slate-400" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1">
              <LanguagePicker />
            </PopoverContent>
          </Popover>

          {/* Vertical divider */}
          <span aria-hidden className="mx-1 h-7 w-px bg-slate-200 dark:bg-white/10" />

          {/* Group B — icon buttons */}
          <ThemeToggle />
          <NotificationsBell />

          {/* Avatar → dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/85 bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_-22px_rgba(15,23,42,0.65)] transition-all duration-200 hover:-translate-y-px hover:border-[#2563EB]/30 hover:bg-[#FBFCFF] hover:shadow-[0_14px_30px_-24px_rgba(37,99,235,0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/28 dark:border-white/10 dark:bg-white/[0.045] dark:text-white dark:hover:bg-white/[0.08]"
                aria-label={t('user.menu')}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user ? `${user.firstName} ${user.lastName}` : ''}
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-white dark:ring-[#0B1220]"
                    draggable={false}
                  />
                ) : (
                  <span className="text-[12px] font-black tracking-tight">{initials}</span>
                )}
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
        </div>{/* end utility cluster */}

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="md:hidden rounded-lg border border-border/70 bg-background/45 p-2 text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav panel */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border/70 bg-card/96 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.45)]" aria-label="Primary navigation">
          <ul className="flex flex-col px-2 py-2 gap-0.5">
            {visibleNav.map(item => (
              <li key={item.key}>
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      isActive
                        ? 'bg-[#2563EB] text-white font-semibold shadow-[0_10px_24px_-14px_rgba(37,99,235,0.95),inset_0_1px_0_rgba(255,255,255,0.22)] dark:bg-[#2563EB] dark:text-white'
                        : 'font-medium text-muted-foreground hover:bg-background/70 hover:text-foreground',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon className={cn('h-5 w-5', isActive ? 'text-white' : '')} />
                      <span>{t(item.key)}</span>
                    </>
                  )}
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
  const t = useT();
  const next = resolvedTheme === 'light' ? 'dark' : 'light';
  const label = next === 'dark' ? t('theme.switchToDark') : t('theme.switchToLight');
  return (
    <button
      onClick={() => setTheme(next)}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/85 bg-white text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_-22px_rgba(15,23,42,0.65)] transition-all duration-200 hover:-translate-y-px hover:border-[#2563EB]/30 hover:bg-[#FBFCFF] hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/28 dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-300 dark:hover:bg-white/[0.08] dark:hover:text-white"
      aria-label={label}
      title={label}
    >
      <SunIcon
        className={cn(
          'h-[18px] w-[18px] absolute transition-opacity duration-200',
          resolvedTheme === 'light' ? 'opacity-0' : 'opacity-100',
        )}
      />
      <MoonIcon
        className={cn(
          'h-[18px] w-[18px] absolute transition-opacity duration-200',
          resolvedTheme === 'light' ? 'opacity-100' : 'opacity-0',
        )}
      />
    </button>
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
            {active && <CheckIcon className="h-4 w-4 text-brand shrink-0" />}
          </button>
        );
      })}
    </>
  );
}
