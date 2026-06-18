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
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10 bg-[radial-gradient(circle_at_center,#FFFFFF,#F1F5FB)] dark:bg-[radial-gradient(circle_at_center,#0F172A,#020617)]">
      {/* Dot lattice — quiet texture so the backdrop doesn't read as flat */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(10,21,37,0.05)_1px,transparent_0)] [background-size:26px_26px] dark:[background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)]"
      />

      {/* Language + theme — framed utility cluster, top right */}
      <div className="absolute top-6 right-6 z-10 flex items-center gap-0.5 rounded-xl border border-border bg-card/70 px-1.5 py-1 shadow-sm backdrop-blur">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Change language"
              className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <GlobeAltIcon className="h-4 w-4" />
              {activeLang}
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
        className="relative grid w-full max-w-[1000px] overflow-hidden rounded-3xl border border-border bg-card shadow-[0_1px_2px_rgba(10,21,37,0.04),0_24px_60px_-20px_rgba(10,21,37,0.20)] lg:grid-cols-2 dark:border-white/10"
      >
        {/* ─── Left: brand panel ──────────────────────── */}
        <div className="relative hidden flex-col justify-between gap-10 bg-gradient-to-br from-blue-600 to-blue-700 p-10 text-white lg:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:24px_24px]"
          />

          <motion.div variants={rise} className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
              <img src="/logo.webp" alt="DeLegends Barbershop" className="h-7 w-7 object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-base font-bold tracking-tight">DeLegends</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-100/80">
                Barbershop
              </p>
            </div>
          </motion.div>

          <div className="relative">
            <motion.p
              variants={rise}
              className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100/80"
            >
              {t('login.teamConsole')}
            </motion.p>
            <motion.h2
              variants={rise}
              className="mt-4 text-3xl font-bold leading-tight tracking-tight"
            >
              {t('login.brandHeadline')}
            </motion.h2>
            <motion.p variants={rise} className="mt-3 max-w-sm text-sm text-blue-100/90">
              {t('login.brandSub')}
            </motion.p>

            <div className="mt-8 space-y-3">
              {FEATURES.map(({ icon: Icon, key }) => (
                <motion.div
                  key={key}
                  variants={rise}
                  className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold">{t(key)}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Right: sign-in form ────────────────────── */}
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <motion.p
            variants={rise}
            className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600"
          >
            {t('login.teamConsole')}
          </motion.p>
          <motion.h1
            variants={rise}
            className="mt-3 text-4xl font-bold tracking-tight text-foreground"
          >
            {t('login.welcome')}
          </motion.h1>
          <motion.p variants={rise} className="mt-2 text-sm text-muted-foreground">
            {t('login.subtitle')}
          </motion.p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <motion.div variants={rise}>
              <Label
                htmlFor="email"
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                {t('login.email')}
              </Label>
              <div className="relative mt-1.5">
                <EnvelopeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('login.emailPlaceholder')}
                  required
                  autoComplete="email"
                  className={`h-11 pl-10 transition-colors hover:border-foreground/25 ${FOCUS_RING}`}
                />
              </div>
            </motion.div>

            <motion.div variants={rise}>
              <Label
                htmlFor="password"
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
              >
                {t('login.password')}
              </Label>
              <div className="relative mt-1.5">
                <LockClosedIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className={`h-11 pl-10 pr-10 transition-colors hover:border-foreground/25 ${FOCUS_RING}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                >
                  {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </motion.div>

            <motion.div variants={rise}>
              <Button
                type="submit"
                className="group h-11 w-full active:scale-[0.99]"
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
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3"
            >
              <span className="text-[11px] text-muted-foreground">{t('login.secure')}</span>
              <button
                type="button"
                onClick={soon}
                className="rounded text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
              >
                {t('login.forgot')}
              </button>
            </motion.div>
          </form>

          <motion.p
            variants={rise}
            className="mt-8 text-center text-[11px] text-muted-foreground/60"
          >
            © 2026 DeLegends Barbershop
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
