import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi } from '../lib/api';
import { PageHeader } from '../components/shared/page-header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { useNavigate } from 'react-router';
import { format, parseISO } from 'date-fns';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import type { AppointmentStatus } from '../types';

export function BookingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(null);

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.getAllWithDetails()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      appointmentsApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Appointment updated');
      setSelectedAppointment(null);
    },
    onError: () => {
      toast.error('Failed to update appointment');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment deleted');
      setSelectedAppointment(null);
    },
    onError: () => {
      toast.error('Failed to delete appointment');
    }
  });

  // Filter appointments
  const filteredAppointments = appointments
    .filter(apt => {
      const matchesSearch = searchQuery === '' ||
        apt.client.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.client.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        apt.service.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime());

  const selectedApt = appointments.find(apt => apt.id === selectedAppointment);

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        description="Manage all appointments and bookings"
        action={
          <Button onClick={() => navigate('/bookings/new')}>
            <PlusIcon className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by client or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AppointmentStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Appointments List */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Staff
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                    No appointments found
                  </td>
                </tr>
              ) : (
                filteredAppointments.map(apt => (
                  <tr key={apt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {apt.client.firstName} {apt.client.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{apt.client.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{apt.service.name}</div>
                      <div className="text-sm text-gray-500">${apt.service.price}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {apt.staff.firstName} {apt.staff.lastName}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {format(parseISO(apt.startTime), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(parseISO(apt.startTime), 'HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={getStatusColor(apt.status)}>
                        {apt.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAppointment(apt.id)}
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appointment Detail Modal */}
      <Dialog open={selectedAppointment !== null} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Appointment</DialogTitle>
          </DialogHeader>
          
          {selectedApt && (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-4 space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-600">Client:</span>
                  <p className="text-sm text-gray-900">
                    {selectedApt.client.firstName} {selectedApt.client.lastName}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Service:</span>
                  <p className="text-sm text-gray-900">{selectedApt.service.name} (${selectedApt.service.price})</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Staff:</span>
                  <p className="text-sm text-gray-900">
                    {selectedApt.staff.firstName} {selectedApt.staff.lastName}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Date & Time:</span>
                  <p className="text-sm text-gray-900">
                    {format(parseISO(selectedApt.startTime), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-600">Status:</span>
                  <p className="text-sm">
                    <Badge className={getStatusColor(selectedApt.status)}>
                      {selectedApt.status}
                    </Badge>
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Change Status:</p>
                <div className="grid grid-cols-2 gap-2">
                  {['scheduled', 'confirmed', 'completed', 'cancelled'].map(status => (
                    <Button
                      key={status}
                      variant={selectedApt.status === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateMutation.mutate({ id: selectedApt.id, status: status as AppointmentStatus })}
                      disabled={selectedApt.status === status}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this appointment?')) {
                      deleteMutation.mutate(selectedApt.id);
                    }
                  }}
                  className="flex-1"
                >
                  Delete
                </Button>
                <Button variant="outline" onClick={() => setSelectedAppointment(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
