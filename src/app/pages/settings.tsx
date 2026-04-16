import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantApi } from '../lib/api';
import { PageHeader } from '../components/shared/page-header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import type { Theme, Language, DayOfWeek } from '../types';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function SettingsPage() {
  const queryClient = useQueryClient();
  
  const { data: tenant } = useQuery({
    queryKey: ['tenant'],
    queryFn: () => tenantApi.get()
  });

  const [generalForm, setGeneralForm] = useState({
    name: tenant?.name || '',
    email: tenant?.email || '',
    phone: tenant?.phone || '',
    address: tenant?.address || ''
  });

  const [appearanceForm, setAppearanceForm] = useState({
    theme: tenant?.theme || 'light' as Theme,
    language: tenant?.language || 'en' as Language
  });

  const [workingHours, setWorkingHours] = useState(tenant?.workingHours || {});

  const updateMutation = useMutation({
    mutationFn: (data: any) => tenantApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
      toast.success('Settings saved');
    },
    onError: () => {
      toast.error('Failed to save settings');
    }
  });

  const handleSaveGeneral = () => {
    if (!generalForm.name || !generalForm.email || !generalForm.phone) {
      toast.error('Please fill all required fields');
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

  const updateWorkingHour = (day: string, field: string, value: any) => {
    setWorkingHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  // Update forms when tenant data loads
  if (tenant && generalForm.name === '' && tenant.name !== '') {
    setGeneralForm({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      address: tenant.address
    });
    setAppearanceForm({
      theme: tenant.theme,
      language: tenant.language
    });
    setWorkingHours(tenant.workingHours);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your shop settings and preferences"
      />

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="hours">Working Hours</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Shop Information</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Shop Name *</Label>
                <Input
                  value={generalForm.name}
                  onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={generalForm.email}
                  onChange={(e) => setGeneralForm({ ...generalForm, email: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  value={generalForm.phone}
                  onChange={(e) => setGeneralForm({ ...generalForm, phone: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={generalForm.address}
                  onChange={(e) => setGeneralForm({ ...generalForm, address: e.target.value })}
                  className="mt-1"
                />
              </div>

              <Button onClick={handleSaveGeneral} className="mt-4">
                Save Changes
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="appearance">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Appearance Settings</h3>
            
            <div className="space-y-4">
              <div>
                <Label>Theme</Label>
                <Select value={appearanceForm.theme} onValueChange={(value) => setAppearanceForm({ ...appearanceForm, theme: value as Theme })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Language</Label>
                <Select value={appearanceForm.language} onValueChange={(value) => setAppearanceForm({ ...appearanceForm, language: value as Language })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="lt">Lithuanian</SelectItem>
                    <SelectItem value="ru">Russian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSaveAppearance} className="mt-4">
                Save Changes
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hours">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Working Hours</h3>
            
            <div className="space-y-4">
              {DAYS.map(day => {
                const dayHours = workingHours[day] || { isOpen: false, openTime: '09:00', closeTime: '17:00' };
                
                return (
                  <div key={day} className="flex items-center gap-4 rounded-lg border border-gray-200 p-4">
                    <div className="w-32">
                      <p className="font-medium capitalize text-gray-900">{day}</p>
                    </div>
                    
                    <Switch
                      checked={dayHours.isOpen}
                      onCheckedChange={(checked) => updateWorkingHour(day, 'isOpen', checked)}
                    />

                    {dayHours.isOpen && (
                      <>
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-gray-600">Open:</Label>
                          <Input
                            type="time"
                            value={dayHours.openTime}
                            onChange={(e) => updateWorkingHour(day, 'openTime', e.target.value)}
                            className="w-32"
                          />
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-gray-600">Close:</Label>
                          <Input
                            type="time"
                            value={dayHours.closeTime}
                            onChange={(e) => updateWorkingHour(day, 'closeTime', e.target.value)}
                            className="w-32"
                          />
                        </div>
                      </>
                    )}

                    {!dayHours.isOpen && (
                      <span className="text-sm text-gray-500">Closed</span>
                    )}
                  </div>
                );
              })}

              <Button onClick={handleSaveWorkingHours} className="mt-4">
                Save Changes
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
