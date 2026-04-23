import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { tenantApi } from '../lib/api';
import { PageHeader } from '../components/shared/page-header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BuildingStorefrontIcon, PaintBrushIcon, ClockIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useT } from '../hooks/use-t';
import type { Theme, Language, DayOfWeek, Tenant } from '../types';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const t = useT();
  const { setTheme } = useTheme();

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

  return (
    // Refactoring UI: forms shouldn't stretch the full width of a dashboard shell.
    // max-w-4xl keeps input fields and labels at a comfortable reading scale.
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        size="subtle"
        title="Settings"
        description="Configure your shop settings and preferences"
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="inline-flex h-12 items-center justify-center rounded-xl bg-muted p-1">
          <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <BuildingStorefrontIcon className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <PaintBrushIcon className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="hours" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <ClockIcon className="h-4 w-4 mr-2" />
            Working Hours
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <BuildingStorefrontIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Shop Information</h3>
                <p className="text-sm text-muted-foreground">Update your business details</p>
              </div>
            </div>
            
            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium text-foreground">Shop Name *</Label>
                <Input
                  value={generalForm.name}
                  onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                  className="mt-2 h-11"
                  placeholder="Your Barbershop Name"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <Label className="text-sm font-medium text-foreground">Email *</Label>
                  <Input
                    type="email"
                    value={generalForm.email}
                    onChange={(e) => setGeneralForm({ ...generalForm, email: e.target.value })}
                    className="mt-2 h-11"
                    placeholder="shop@example.com"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground">Phone *</Label>
                  <Input
                    value={generalForm.phone}
                    onChange={(e) => setGeneralForm({ ...generalForm, phone: e.target.value })}
                    className="mt-2 h-11"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">Locations</Label>
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
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
                          <BuildingStorefrontIcon className="h-4 w-4 text-muted-foreground shrink-0" />
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
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Open in Google Maps
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={handleSaveGeneral} className="shadow-sm">
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="appearance">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <PaintBrushIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Appearance Settings</h3>
                <p className="text-sm text-muted-foreground">Customize the look and feel</p>
              </div>
            </div>
            
            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium text-foreground">Theme</Label>
                <Select
                  value={appearanceForm.theme}
                  onValueChange={(value) => {
                    const v = value as Theme;
                    setAppearanceForm({ ...appearanceForm, theme: v });
                    setTheme(v);
                  }}
                >
                  <SelectTrigger className="mt-2 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-white border-2 border-neutral-300" />
                        Light Mode
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full bg-neutral-900 border-2 border-neutral-700" />
                        Dark Mode
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-foreground">Language</Label>
                <Select value={appearanceForm.language} onValueChange={(value) => setAppearanceForm({ ...appearanceForm, language: value as Language })}>
                  <SelectTrigger className="mt-2 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">🇺🇸 English</SelectItem>
                    <SelectItem value="lt">🇱🇹 Lithuanian</SelectItem>
                    <SelectItem value="ru">🇷🇺 Russian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t">
                <Button onClick={handleSaveAppearance} className="shadow-sm">
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hours">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <ClockIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Working Hours</h3>
                <p className="text-sm text-muted-foreground">Set your weekly schedule</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {DAYS.map(day => {
                const dayHours = workingHours[day] || { isOpen: false, openTime: '09:00', closeTime: '17:00' };
                
                return (
                  <div 
                    key={day} 
                    className={`flex items-center gap-4 rounded-xl border p-5 transition-all ${
                      dayHours.isOpen 
                        ? 'border-emerald-200 dark:border-emerald-900/50 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/40' 
                        : 'border-border bg-muted/40'
                    }`}
                  >
                    <div className="w-32">
                      <p className="font-semibold capitalize text-foreground">{day}</p>
                    </div>
                    
                    <Switch
                      checked={dayHours.isOpen}
                      onCheckedChange={(checked) => updateWorkingHour(day, 'isOpen', checked)}
                    />

                    {dayHours.isOpen ? (
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-2 flex-1">
                          <Label className="text-sm text-muted-foreground w-12">Open:</Label>
                          <Input
                            type="time"
                            value={dayHours.openTime}
                            onChange={(e) => updateWorkingHour(day, 'openTime', e.target.value)}
                            className="flex-1 h-10"
                          />
                        </div>
                        
                        <div className="flex items-center gap-2 flex-1">
                          <Label className="text-sm text-muted-foreground w-12">Close:</Label>
                          <Input
                            type="time"
                            value={dayHours.closeTime}
                            onChange={(e) => updateWorkingHour(day, 'closeTime', e.target.value)}
                            className="flex-1 h-10"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground flex-1">Closed</span>
                    )}
                  </div>
                );
              })}

              <div className="pt-4 border-t">
                <Button onClick={handleSaveWorkingHours} className="shadow-sm">
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}