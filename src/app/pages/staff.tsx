import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffApi, shiftsApi } from '../lib/api';
import { PageHeader } from '../components/shared/page-header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import type { Staff, StaffRole, DayOfWeek } from '../types';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function StaffPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'barber' as StaffRole,
    isActive: true
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => staffApi.getAll()
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => shiftsApi.getAll()
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Staff, 'id' | 'createdAt'>) => staffApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member added');
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to add staff member');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Staff> }) =>
      staffApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Staff member updated');
    },
    onError: () => {
      toast.error('Failed to update staff member');
    }
  });

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'barber',
      isActive: true
    });
  };

  const handleCreate = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast.error('Please fill all required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    updateMutation.mutate({ id, data: { isActive: !isActive } });
  };

  const filteredStaff = staff.filter(member => {
    if (activeFilter === 'active') return member.isActive;
    if (activeFilter === 'inactive') return !member.isActive;
    return true;
  });

  const getStaffShifts = (staffId: string) => {
    return shifts.filter(s => s.staffId === staffId);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Manage your team members and schedules"
        action={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Staff
          </Button>
        }
      />

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2">
            <Button
              variant={activeFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('all')}
            >
              All
            </Button>
            <Button
              variant={activeFilter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('active')}
            >
              Active
            </Button>
            <Button
              variant={activeFilter === 'inactive' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter('inactive')}
            >
              Inactive
            </Button>
          </div>

          {/* Staff Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStaff.length === 0 ? (
              <div className="col-span-full rounded-xl border border-gray-200 bg-white p-12 text-center">
                <p className="text-sm text-gray-500">No staff members found</p>
              </div>
            ) : (
              filteredStaff.map(member => (
                <div key={member.id} className="rounded-xl border border-gray-200 bg-white p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                        {member.firstName[0]}{member.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-sm capitalize text-gray-600">{member.role}</p>
                        <p className="mt-1 text-xs text-gray-500">{member.email}</p>
                        <p className="text-xs text-gray-500">{member.phone}</p>
                      </div>
                    </div>
                    <Badge className={member.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {member.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                    <span className="text-sm text-gray-600">Active Status</span>
                    <Switch
                      checked={member.isActive}
                      onCheckedChange={() => handleToggleActive(member.id, member.isActive)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <div className="rounded-xl border border-gray-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      Staff Member
                    </th>
                    {DAYS.map(day => (
                      <th key={day} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        {day.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {staff.filter(s => s.isActive).map(member => {
                    const memberShifts = getStaffShifts(member.id);
                    
                    return (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                              {member.firstName[0]}{member.lastName[0]}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="text-sm capitalize text-gray-500">{member.role}</p>
                            </div>
                          </div>
                        </td>
                        {DAYS.map(day => {
                          const shift = memberShifts.find(s => s.dayOfWeek === day);
                          return (
                            <td key={day} className="px-6 py-4">
                              {shift ? (
                                <div className="text-sm">
                                  <div className="font-medium text-gray-900">{shift.startTime}</div>
                                  <div className="text-gray-500">{shift.endTime}</div>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Staff Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>First Name *</Label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="John"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Doe"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@barberpro.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Role *</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value as StaffRole })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="barber">Barber</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <Label>Active Status</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreate} className="flex-1">
                Add Staff Member
              </Button>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
