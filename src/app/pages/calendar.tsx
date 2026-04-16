import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi, clientsApi, staffApi, servicesApi } from '../lib/api';
import { PageHeader } from '../components/shared/page-header';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { format, parseISO, setHours, setMinutes, startOfDay } from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import type { Appointment } from '../types';

const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => 8 + i); // 8am - 8pm

export function CalendarPage() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ hour: number } | null>(null);
  
  const [formData, setFormData] = useState({
    clientId: '',
    staffId: '',
    serviceId: '',
    notes: ''
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.getAllWithDetails()
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.getAll()
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => staffApi.getAll()
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.getAll()
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Appointment, 'id' | 'createdAt'>) => appointmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Appointment created');
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to create appointment');
    }
  });

  const resetForm = () => {
    setFormData({ clientId: '', staffId: '', serviceId: '', notes: '' });
    setSelectedSlot(null);
  };

  const handleSlotClick = (hour: number) => {
    setSelectedSlot({ hour });
    setIsCreateModalOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedSlot || !formData.clientId || !formData.staffId || !formData.serviceId) {
      toast.error('Please fill all required fields');
      return;
    }

    const service = services.find(s => s.id === formData.serviceId);
    if (!service) return;

    const startTime = setMinutes(setHours(startOfDay(selectedDate), selectedSlot.hour), 0);
    const endTime = new Date(startTime.getTime() + service.duration * 60000);

    createMutation.mutate({
      clientId: formData.clientId,
      staffId: formData.staffId,
      serviceId: formData.serviceId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      status: 'scheduled',
      notes: formData.notes
    });
  };

  const dayAppointments = appointments.filter(apt => {
    const aptDate = parseISO(apt.startTime);
    return format(aptDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
  });

  const getAppointmentForSlot = (hour: number) => {
    return dayAppointments.find(apt => {
      const aptHour = parseISO(apt.startTime).getHours();
      return aptHour === hour;
    });
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Day view of appointments and time slots"
      />

      {/* Date Navigator */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
        <Button variant="outline" size="sm" onClick={() => changeDate(-1)}>
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <h2 className="font-semibold text-gray-900">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</h2>
          <p className="text-sm text-gray-600">{dayAppointments.length} appointments</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => changeDate(1)}>
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Time Grid */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="grid divide-y divide-gray-200">
          {TIME_SLOTS.map(hour => {
            const appointment = getAppointmentForSlot(hour);
            const isAvailable = !appointment;

            return (
              <div
                key={hour}
                onClick={() => isAvailable && handleSlotClick(hour)}
                className={`flex items-center gap-4 p-4 transition-colors ${
                  isAvailable ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50'
                }`}
              >
                <div className="w-20 text-sm font-medium text-gray-600">
                  {format(setHours(new Date(), hour), 'HH:mm')}
                </div>
                <div className="flex-1">
                  {appointment ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <p className="font-medium text-blue-900">
                        {appointment.client.firstName} {appointment.client.lastName}
                      </p>
                      <p className="text-sm text-blue-700">
                        {appointment.service.name} • {appointment.staff.firstName} {appointment.staff.lastName}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">Available</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Appointment Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Appointment</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedSlot && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <strong>Time:</strong> {format(selectedDate, 'MMM dd, yyyy')} at {format(setHours(new Date(), selectedSlot.hour), 'HH:mm')}
              </div>
            )}

            <div>
              <Label>Client *</Label>
              <Select value={formData.clientId} onValueChange={(value) => setFormData({ ...formData, clientId: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Service *</Label>
              <Select value={formData.serviceId} onValueChange={(value) => setFormData({ ...formData, serviceId: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} (${service.price})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Staff Member *</Label>
              <Select value={formData.staffId} onValueChange={(value) => setFormData({ ...formData, staffId: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staff.filter(s => s.isActive).map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any special notes..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSubmit} className="flex-1">
                Create Appointment
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
