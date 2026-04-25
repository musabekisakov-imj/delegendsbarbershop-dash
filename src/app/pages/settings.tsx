import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { tenantApi } from '../lib/api';
import { useOfficeStore } from '../store/office-store';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { BuildingStorefrontIcon, PaintBrushIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { cn } from '../components/ui/utils';
import { useT, useTimeFormat } from '../hooks/use-t';
import type { Theme, Language, DayOfWeek, Tenant } from '../types';
import type { TimeFormat } from '../lib/time';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

type SettingsTab = 'general' | 'appearance' | 'hours';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const t = useT();
  const { setTheme } = useTheme();
  const officeId = useOfficeStore(s => s.currentOfficeId);
  const offices = useOfficeStore(s => s.offices);
  const currentOffice = useMemo(() => offices.find(o => o.id === officeId), [offices, officeId]);
  const [tab, setTab] = useState<SettingsTab>('general');
  // Time format lives in the language-store (persisted) — independent of
  // tenant data, applies instantly on change without a Save button.
  const [timeFormat, setTimeFormat] = useTimeFormat();

  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => tenantApi.get()
  });

  const [generalForm, setGeneralForm] = useState({
    name: tenant?.name || '',
    email: tenant?.email || '',
    phone: tenant?.phone || '',
  });

  const [appearanceForm, setAppearanceForm] = useState({
    theme: tenant?.theme || 'light' as Theme,
    language: tenant?.language || 'en' as Language
  });

  const [workingHours, setWorkingHours] = useState(tenant?.workingHours || {});

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Tenant>) => tenantApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      toast.success(t('toast.settingsSaved'));
    },
    onError: () => {
      toast.error(t('toast.settingsError'));
    }
  });

  const handleSaveGeneral = () => {
    if (!generalForm.name || !generalForm.email || !generalForm.phone) {
      toast.error(t('toast.fillRequired'));
      return;
    }
    updateMutation.mutate(generalForm);
  };

  const handleSaveAppearance = () => {
    updateMutation.mutate(appearanceForm);
  };

  const handleSaveWorkingHours = () => {
    updateMutation.mutate({ workingHours });
  };

  const updateWorkingHour = (day: string, field: 'isOpen' | 'openTime' | 'closeTime', value: string | boolean) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  // Hydrate forms when tenant data resolves (correct pattern — no setState in render).
  useEffect(() => {
    if (!tenant) return;
    setGeneralForm({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
    });
    setAppearanceForm({
      theme: tenant.theme,
      language: tenant.language,
    });
    setWorkingHours(tenant.workingHours);
  }, [tenant]);

  const TABS: { id: SettingsTab; label: string; icon: typeof BuildingStorefrontIcon }[] = [
    { id: 'general',    label: 'General',       icon: BuildingStorefrontIcon },
    { id: 'appearance', label: 'Appearance',    icon: PaintBrushIcon },
    { id: 'hours',      label: 'Working hours', icon: ClockIcon },
  ];

  return (
    // Refactoring UI: forms shouldn't stretch the full width of a dashboard
    // shell. max-w-4xl keeps input fields and labels at comfortable reading scale.
    <div className="space-y-5 max-w-4xl">
      {/* ─── Editorial hero ──────────────────────────────
          Shop Profile direction: the tenant's shop name IS
          the title (like letterhead on a barbershop's
          stationery). Eyebrow carries office count. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span>Settings</span>
            {currentOffice && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="inline-flex items-center gap-1 normal-case tracking-normal font-medium">
                  <MapPinIcon className="h-3 w-3" />
                  {currentOffice.name}
                </span>
              </>
            )}
            {tenant && tenant.offices.length > 0 && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <span className="normal-case tracking-normal tabular-nums">
                  {tenant.offices.length} {tenant.offices.length === 1 ? 'office' : 'offices'}
                </span>
              </>
            )}
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-none">
            {tenant?.name || 'Shop settings'}
          </h1>
        </div>
      </div>

      {/* ─── Underline tab bar ────────────────────────────
          Replaces the shadcn pill tabs. Same rhythm as
          Staff (Directory / Schedule) — a hairline rule
          with an active underline. */}
      <div className="flex items-end gap-1 border-b border-border overflow-x-auto">
        {TABS.map(tb => {
          const active = tab === tb.id;
          const Icon = tb.icon;
          return (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              aria-pressed={active}
              className={cn(
                'relative inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {tb.label}
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      {/* ─── General ─────────────────────────────────── */}
      {tab === 'general' && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Shop information
            </p>
            <h3 className="mt-1 text-lg font-bold text-foreground">Business details</h3>
          </div>

          <div className="space-y-5">
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Shop name *</Label>
              <Input
                value={generalForm.name}
                onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                className="mt-1.5 h-10"
                placeholder="Your barbershop name"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Email *</Label>
                <Input
                  type="email"
                  value={generalForm.email}
                  onChange={(e) => setGeneralForm({ ...generalForm, email: e.target.value })}
                  className="mt-1.5 h-10"
                  placeholder="shop@example.com"
                />
              </div>
              <div>
                <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Phone *</Label>
                <Input
                  value={generalForm.phone}
                  onChange={(e) => setGeneralForm({ ...generalForm, phone: e.target.value })}
                  className="mt-1.5 h-10 tabular-nums"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Locations</Label>
              <div className="mt-1.5 grid gap-4 sm:grid-cols-2">
                {tenant?.offices.map(office => (
                  <div key={office.id} className="rounded-xl border border-border bg-card overflow-hidden">
                    <iframe
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(office.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                      className="w-full h-40 border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      title={`Map of ${office.name}`}
                    />
                    <div className="p-3.5">
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <p className="font-medium text-foreground truncate">{office.name}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{office.address}</p>
                      {office.phone && (
                        <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{office.phone}</p>
                      )}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(office.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Open in Google Maps
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Button onClick={handleSaveGeneral}>
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Appearance ──────────────────────────────── */}
      {tab === 'appearance' && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Appearance
            </p>
            <h3 className="mt-1 text-lg font-bold text-foreground">Look and feel</h3>
          </div>

          <div className="space-y-5">
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Theme</Label>
              <Select
                value={appearanceForm.theme}
                onValueChange={(value) => {
                  const v = value as Theme;
                  setAppearanceForm({ ...appearanceForm, theme: v });
                  setTheme(v);
                }}
              >
                <SelectTrigger className="mt-1.5 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-white border border-border" />
                      Light mode
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-neutral-900 border border-neutral-700" />
                      Dark mode
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Language</Label>
              <Select value={appearanceForm.language} onValueChange={(value) => setAppearanceForm({ ...appearanceForm, language: value as Language })}>
                <SelectTrigger className="mt-1.5 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="lt">🇱🇹 Lithuanian</SelectItem>
                  <SelectItem value="ru">🇷🇺 Russian</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time format — applies instantly via the language store
                (no Save button needed). Used by Calendar grid, Bookings,
                Conflict modal, etc. via formatTime() helper. */}
            <div>
              <Label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Time format</Label>
              <Select value={timeFormat} onValueChange={(v) => setTimeFormat(v as TimeFormat)}>
                <SelectTrigger className="mt-1.5 h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs tabular-nums">14:30</span>
                      <span className="text-muted-foreground">·</span>
                      <span>24-hour</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="12h">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs tabular-nums">2:30 PM</span>
                      <span className="text-muted-foreground">·</span>
                      <span>12-hour (AM/PM)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                Applies everywhere times appear — calendar, bookings, conflicts.
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <Button onClick={handleSaveAppearance}>
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Working hours ───────────────────────────── */}
      {tab === 'hours' && (
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Working hours
            </p>
            <h3 className="mt-1 text-lg font-bold text-foreground">Weekly schedule</h3>
          </div>

          <div className="divide-y divide-border border-y border-border -mx-6">
            {DAYS.map(day => {
              const dayHours = workingHours[day] || { isOpen: false, openTime: '09:00', closeTime: '17:00' };
              return (
                <div
                  key={day}
                  className={cn(
                    'flex items-center gap-4 px-6 py-3 transition-colors',
                    !dayHours.isOpen && 'opacity-60',
                  )}
                >
                  <div className="flex items-center gap-2 w-28 shrink-0">
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full shrink-0',
                        dayHours.isOpen ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                      )}
                      aria-hidden
                    />
                    <p className="font-medium capitalize text-foreground text-sm">{day}</p>
                  </div>

                  <Switch
                    checked={dayHours.isOpen}
                    onCheckedChange={(checked) => updateWorkingHour(day, 'isOpen', checked)}
                  />

                  {dayHours.isOpen ? (
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center gap-2 flex-1">
                        <Label className="text-[11px] text-muted-foreground uppercase tracking-wider w-12">Open</Label>
                        <Input
                          type="time"
                          value={dayHours.openTime}
                          onChange={(e) => updateWorkingHour(day, 'openTime', e.target.value)}
                          className="flex-1 h-9 tabular-nums"
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        <Label className="text-[11px] text-muted-foreground uppercase tracking-wider w-12">Close</Label>
                        <Input
                          type="time"
                          value={dayHours.closeTime}
                          onChange={(e) => updateWorkingHour(day, 'closeTime', e.target.value)}
                          className="flex-1 h-9 tabular-nums"
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground flex-1">Closed</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-4">
            <Button onClick={handleSaveWorkingHours}>
              Save changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}