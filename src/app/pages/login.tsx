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
  ScissorsIcon,
  ArrowRightIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  CheckIcon,
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

// One-time entry cascade: the card rises in, then its children follow
// top-to-bottom with a small stagger.
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
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10 bg-[radial-gradient(circle_at_center,#FFFFFF,#F8FAFC)] dark:bg-[radial-gradient(circle_at_center,#0F172A,#020617)]">
      {/* Dot lattice — quiet texture so the backdrop doesn't read as flat */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(10,21,37,0.05)_1px,transparent_0)] [background-size:26px_26px] dark:[background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)]"
      />
      {/* Subtle scissors watermark — barely-there brand texture */}
      <ScissorsIcon
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 -rotate-12 text-[#0A1525] opacity-[0.03] dark:text-white dark:opacity-[0.05]"
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

      {/* Card — subtle glass: translucent surface + backdrop blur.
          Top hairline (via before:) catches the light like a beveled edge. */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative w-full max-w-[460px] rounded-3xl border border-border bg-white/90 p-10 backdrop-blur-xl before:pointer-events-none before:absolute before:inset-x-10 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-blue-600/30 before:to-transparent shadow-[0_1px_2px_rgba(10,21,37,0.04),0_12px_32px_-8px_rgba(10,21,37,0.12),0_32px_64px_-16px_rgba(10,21,37,0.10)] dark:border-white/10 dark:bg-[#0F172A]/90 dark:shadow-[0_8px_60px_-12px_rgba(37,99,235,0.35)] dark:before:via-blue-400/25"
      >
        {/* Brand */}
        <motion.div variants={rise} className="flex flex-col items-center text-center">
          <div className="inline-flex items-center justify-center rounded-2xl bg-[#0A1525] px-5 py-3 shadow-md ring-1 ring-white/10">
            <img src="/logo.webp" alt="DeLegends Barbershop" className="h-8 w-auto object-contain" />
          </div>
          <p className="mt-5 text-lg font-bold tracking-tight text-foreground">DeLegends Barbershop</p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {t('login.teamConsole')}
          </p>

          <h1 className="mt-8 text-3xl font-bold tracking-tight text-foreground">
            {t('login.welcome')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('login.subtitle')}</p>
        </motion.div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <motion.div variants={rise}>
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
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
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
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

          {/* Trust note */}
          <motion.p variants={rise} className="text-center text-[11px] text-muted-foreground/70">
            {t('login.secure')}
          </motion.p>

          <motion.div variants={rise} className="text-center">
            <button
              type="button"
              onClick={soon}
              className="rounded text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
            >
              {t('login.forgot')}
            </button>
          </motion.div>
        </form>

        {/* Footer */}
        <motion.p variants={rise} className="mt-8 text-center text-[11px] text-muted-foreground/60">
          © 2026 DeLegends Barbershop
        </motion.p>
      </motion.div>
    </div>
  );
}
