import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/auth-store';
import { authApi } from '../lib/api';
import { initializeMockData } from '../lib/mock-data';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../components/ui/dropdown-menu';
import { ThemeToggle } from '../components/layout/theme-toggle';
import {
  ArrowRightIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  CheckIcon,
  CalendarDaysIcon,
  UsersIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useT, useLanguage } from '../hooks/use-t';
import type { Language } from '../types';

const LANGS: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'lt', label: 'Lietuvių' },
];

// Blue focus ring shared by the inputs — #2563EB border + soft glow.
const FOCUS_RING =
  'focus-visible:border-blue-600 focus-visible:ring-4 focus-visible:ring-blue-600/15';

// Left-panel value props, each paired with its icon.
const FEATURES = [
  { icon: CalendarDaysIcon, key: 'login.featureCalendar' as const },
  { icon: UsersIcon, key: 'login.featureSync' as const },
  { icon: ShieldCheckIcon, key: 'login.featureAccess' as const },
];

// One-time entry cascade: children rise in top-to-bottom with a small stagger.
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};
const rise = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function LoginPage() {
  const navigate = useNavigate();
  const t = useT();
  const [lang, setLang] = useLanguage();
  const { isAuthenticated, login } = useAuthStore();
  const [email, setEmail] = useState('admin@delegends.com');
  const [password, setPassword] = useState('demo1234');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    initializeMockData();
    if (isAuthenticated) {
      navigate('/overview');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await authApi.login(email, password);
      login(response.user, response.token);
      toast.success(t('toast.welcome'));
      navigate('/overview');
    } catch {
      toast.error(t('toast.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // No password-reset backend yet — surface a friendly toast.
  const soon = () => toast.info(t('login.soon'));
  const activeLang = LANGS.find((l) => l.code === lang)?.label ?? 'English';

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#F6F9FF] px-4 py-10 text-foreground dark:bg-[#070B12] sm:px-6 lg:px-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(37,99,235,0.12),transparent_36%),radial-gradient(circle_at_78%_72%,rgba(14,165,233,0.10),transparent_34%)] dark:bg-[radial-gradient(circle_at_28%_18%,rgba(37,99,235,0.24),transparent_34%),radial-gradient(circle_at_78%_72%,rgba(14,165,233,0.14),transparent_34%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.58] [background-image:radial-gradient(circle_at_1px_1px,rgba(37,99,235,0.10)_1px,transparent_0)] [background-size:24px_24px] dark:opacity-[0.18] dark:[background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)]"
      />

      <div className="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/88 px-1.5 py-1.5 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.60)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] sm:right-6 sm:top-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Change language"
              className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-950/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/35 dark:text-white/85 dark:hover:bg-white/[0.08]"
            >
              <GlobeAltIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{activeLang}</span>
              <span className="sm:hidden">{lang.toUpperCase()}</span>
              <ChevronDownIcon className="h-3.5 w-3.5 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            {LANGS.map(({ code, label }) => (
              <DropdownMenuItem
                key={code}
                onSelect={() => setLang(code)}
                className="flex items-center justify-between"
              >
                <span>{label}</span>
                {lang === code && <CheckIcon className="h-3.5 w-3.5 text-blue-600" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <ThemeToggle />
      </div>

      {/* Split card — blue brand panel + sign-in form */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative grid w-full max-w-[1040px] overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(10,21,37,0.04),0_30px_72px_-38px_rgba(15,23,42,0.48)] dark:border-white/10 dark:bg-[#10151F] lg:min-h-[640px] lg:grid-cols-[0.94fr_1.06fr]"
      >
        <div className="relative hidden flex-col justify-between gap-10 overflow-hidden bg-[#2563EB] p-10 text-white lg:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.22),transparent_28%),linear-gradient(145deg,rgba(96,165,250,0.50),rgba(37,99,235,0)_42%)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-22 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.28)_1px,transparent_0)] [background-size:24px_24px]"
          />

          <motion.div variants={rise} className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
              <img src="/icon-192.png" alt="DeLegends Barbershop" className="h-8 w-8 object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-lg font-black tracking-tight text-white">DeLegends</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-100/80">
                Barbershop
              </p>
            </div>
          </motion.div>

          <div className="relative">
            <motion.p
              variants={rise}
              className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-100/78"
            >
              {t('login.teamConsole')}
            </motion.p>
            <motion.h2
              variants={rise}
              className="mt-4 max-w-[440px] text-4xl font-black leading-[1.04] tracking-tight text-white"
            >
              {t('login.brandHeadline')}
            </motion.h2>
            <motion.p variants={rise} className="mt-5 max-w-sm text-base font-medium leading-7 text-blue-50/88">
              {t('login.brandSub')}
            </motion.p>

            <div className="mt-10 space-y-3">
              {FEATURES.map(({ icon: Icon, key }) => (
                <motion.div
                  key={key}
                  variants={rise}
                  className="flex items-center gap-4 rounded-2xl border border-white/18 bg-white/[0.14] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/14">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-bold">{t(key)}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center p-6 sm:p-10 lg:px-14 lg:py-12">
          <motion.div variants={rise} className="mb-9 flex items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563EB] shadow-sm dark:bg-white">
              <img src="/icon-192.png" alt="DeLegends Barbershop" className="h-7 w-7 object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-lg font-black tracking-tight text-foreground">DeLegends</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                Barbershop
              </p>
            </div>
          </motion.div>

          <motion.p
            variants={rise}
            className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400"
          >
            {t('login.teamConsole')}
          </motion.p>
          <motion.h1
            variants={rise}
            className="mt-3 text-4xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl"
          >
            {t('login.welcome')}
          </motion.h1>
          <motion.p variants={rise} className="mt-3 max-w-sm text-base font-medium leading-6 text-slate-600 dark:text-slate-300">
            {t('login.subtitle')}
          </motion.p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <motion.div variants={rise}>
              <Label
                htmlFor="email"
                className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300"
              >
                {t('login.email')}
              </Label>
              <div className="relative mt-1.5">
                <EnvelopeIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('login.emailPlaceholder')}
                  required
                  autoComplete="email"
                  className={`h-14 rounded-2xl border-slate-200 bg-white pl-12 text-[15px] font-semibold shadow-[0_2px_8px_-6px_rgba(15,23,42,0.35)] transition-colors placeholder:text-slate-400 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04] dark:placeholder:text-white/35 ${FOCUS_RING}`}
                />
              </div>
            </motion.div>

            <motion.div variants={rise}>
              <Label
                htmlFor="password"
                className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300"
              >
                {t('login.password')}
              </Label>
              <div className="relative mt-1.5">
                <LockClosedIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className={`h-14 rounded-2xl border-slate-200 bg-white pl-12 pr-12 text-[15px] font-semibold shadow-[0_2px_8px_-6px_rgba(15,23,42,0.35)] transition-colors placeholder:text-slate-400 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.04] dark:placeholder:text-white/35 ${FOCUS_RING}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-950/[0.04] hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 dark:hover:bg-white/[0.08] dark:hover:text-white"
                >
                  {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </motion.div>

            <motion.div variants={rise}>
              <Button
                type="submit"
                className="group h-14 w-full rounded-2xl text-[15px] font-bold shadow-[0_16px_30px_-18px_rgba(37,99,235,0.95)] active:scale-[0.99]"
                loading={isLoading}
              >
                {isLoading ? (
                  t('login.signingIn')
                ) : (
                  <>
                    {t('login.signIn')}
                    <ArrowRightIcon className="ml-1.5 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </motion.div>

            <motion.div
              variants={rise}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]"
            >
              <span className="text-[11px] font-medium text-slate-500 dark:text-white/55">{t('login.secure')}</span>
              <button
                type="button"
                onClick={soon}
                className="rounded-lg px-1 text-sm font-bold text-blue-600 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {t('login.forgot')}
              </button>
            </motion.div>
          </form>

          <motion.p
            variants={rise}
            className="mt-8 text-center text-[11px] font-medium text-muted-foreground/70"
          >
            © 2026 DeLegends Barbershop
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
