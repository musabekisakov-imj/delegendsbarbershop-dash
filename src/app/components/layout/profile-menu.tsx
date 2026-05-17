import { useNavigate } from 'react-router';
import { useTheme } from 'next-themes';
import {
  UserCircleIcon, GlobeAltIcon, SunIcon, MoonIcon,
  QuestionMarkCircleIcon, ArrowRightStartOnRectangleIcon, CheckIcon,
} from '@heroicons/react/24/outline';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem,
  DropdownMenuPortal, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { cn } from '../ui/utils';
import { useT, useLanguage } from '../../hooks/use-t';
import { useAuthStore } from '../../store/auth-store';
import { gradientFor } from '../../lib/tokens';
import type { Language, StaffRole } from '../../types';
import type { TranslationKey } from '../../i18n';

const ROLE_TRANSLATION_KEY: Record<StaffRole, TranslationKey> = {
  owner:        'staff.roleOwner',
  manager:      'staff.roleManager',
  barber:       'staff.roleBarber',
  receptionist: 'staff.roleReceptionist',
};

const LANGUAGES: { code: Language; flag: string; label: string }[] = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'ru', flag: '🇷🇺', label: 'Русский' },
  { code: 'lt', flag: '🇱🇹', label: 'Lietuvių' },
];

export function ProfileMenu() {
  const t = useT();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const [language, setLanguage] = useLanguage();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  const initials = user
    ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() || 'U'
    : 'U';

  const gradient = user ? gradientFor(user.id) : 'from-indigo-500 to-violet-500';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-full hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
          aria-label="User menu"
        >
          <Avatar className="h-7 w-7 rounded-full">
            <AvatarFallback
              className="rounded-full bg-brand text-brand-foreground text-[11px] font-medium"
            >
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {/* Identity header */}
        <DropdownMenuLabel className="font-normal px-3 py-2">
          <p className="text-sm font-semibold text-foreground truncate">
            {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
          </p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          {user?.role && (
            <span className="mt-1.5 inline-flex text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded px-1.5 py-0.5">
              {t(ROLE_TRANSLATION_KEY[user.role])}
            </span>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => navigate('/profile')}>
            <UserCircleIcon className="h-4 w-4 mr-2 text-muted-foreground" />
            {t('header.profile.myProfile')}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {/* Language sub-menu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <GlobeAltIcon className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="flex-1">{t('header.profile.language')}</span>
              <span className="ml-auto text-xs text-muted-foreground font-medium">
                {language.toUpperCase()}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="min-w-[160px]">
                {LANGUAGES.map(l => (
                  <DropdownMenuCheckboxItem
                    key={l.code}
                    checked={language === l.code}
                    onCheckedChange={() => setLanguage(l.code)}
                  >
                    <span className="mr-2 text-sm">{l.flag}</span>
                    {l.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          {/* Theme sub-menu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {resolvedTheme === 'dark' ? (
                <MoonIcon className="h-4 w-4 mr-2 text-muted-foreground" />
              ) : (
                <SunIcon className="h-4 w-4 mr-2 text-muted-foreground" />
              )}
              <span className="flex-1">{t('header.profile.theme')}</span>
              <span className="ml-auto text-xs text-muted-foreground font-medium capitalize">
                {resolvedTheme}
              </span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="min-w-[140px]">
                <DropdownMenuRadioGroup
                  value={resolvedTheme ?? 'light'}
                  onValueChange={setTheme}
                >
                  <DropdownMenuRadioItem value="light">
                    <SunIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                    {t('header.profile.theme.light')}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    <MoonIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                    {t('header.profile.theme.dark')}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuItem onSelect={() => navigate('/help')}>
            <QuestionMarkCircleIcon className="h-4 w-4 mr-2 text-muted-foreground" />
            {t('nav.help')}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
          <ArrowRightStartOnRectangleIcon className="h-4 w-4 mr-2" />
          {t('common.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
