import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appointmentsApi, clientsApi, staffApi, servicesApi } from '../lib/api';
import { PageHeader } from '../components/shared/page-header';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { useNavigate } from 'react-router';
import { format, setHours, setMinutes, startOfDay, addDays } from 'date-fns';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import type { Appointment } from '../types';

const STEPS = ['Client', 'Service', 'Staff', 'Date & Time', 'Confirm'];
const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => 8 + i);

export function NewBookingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    clientId: '',
    serviceId: '',
    staffId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10',
    notes: ''
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.getAll()
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.getAll()
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => staffApi.getAll()
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Appointment, 'id' | 'createdAt'>) => appointmentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Booking created successfully');
      navigate('/bookings');
    },
    onError: () => {
      toast.error('Failed to create booking');
    }
  });

  const selectedClient = clients.find(c => c.id === formData.clientId);
  const selectedService = services.find(s => s.id === formData.serviceId);
  const selectedStaff = staff.find(s => s.id === formData.staffId);

  const canGoNext = () => {
    switch (currentStep) {
      case 0: return formData.clientId !== '';
      case 1: return formData.serviceId !== '';
      case 2: return formData.staffId !== '';
      case 3: return formData.date !== '' && formData.time !== '';
      default: return true;
    }
  };

  const handleNext = () => {
    if (canGoNext()) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = () => {
    if (!formData.clientId || !formData.serviceId || !formData.staffId || !selectedService) {
      toast.error('Please complete all steps');
      return;
    }

    const startTime = setMinutes(
      setHours(startOfDay(new Date(formData.date)), parseInt(formData.time)),
      0
    );
    const endTime = new Date(startTime.getTime() + selectedService.duration * 60000);

    createMutation.mutate({
      clientId: formData.clientId,
      serviceId: formData.serviceId,
      staffId: formData.staffId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      status: 'scheduled',
      notes: formData.notes
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <Label>Select Client *</Label>
            <Select value={formData.clientId} onValueChange={(value) => setFormData({ ...formData, clientId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.firstName} {client.lastName} - {client.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClient && (
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm font-medium text-blue-900">
                  {selectedClient.firstName} {selectedClient.lastName}
                </p>
                <p className="text-sm text-blue-700">{selectedClient.email}</p>
                <p className="text-sm text-blue-700">{selectedClient.phone}</p>
                <p className="mt-2 text-sm text-blue-700">
                  Total visits: {selectedClient.totalVisits}
                </p>
              </div>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <Label>Select Service *</Label>
            <div className="grid gap-3">
              {services.map(service => (
                <button
                  key={service.id}
                  onClick={() => setFormData({ ...formData, serviceId: service.id })}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    formData.serviceId === service.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{service.name}</p>
                      <p className="text-sm text-gray-600">{service.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${service.price}</p>
                      <p className="text-sm text-gray-500">{service.duration} min</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <Label>Select Staff Member *</Label>
            <div className="grid gap-3">
              {staff.filter(s => s.isActive).map(member => (
                <button
                  key={member.id}
                  onClick={() => setFormData({ ...formData, staffId: member.id })}
                  className={`flex items-center gap-4 rounded-lg border-2 p-4 text-left transition-colors ${
                    formData.staffId === member.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                    {member.firstName[0]}{member.lastName[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {member.firstName} {member.lastName}
                    </p>
                    <p className="text-sm capitalize text-gray-600">{member.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label>Select Date *</Label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {Array.from({ length: 7 }, (_, i) => {
                  const date = addDays(new Date(), i);
                  const dateStr = format(date, 'yyyy-MM-dd');
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setFormData({ ...formData, date: dateStr })}
                      className={`rounded-lg border-2 p-3 text-center transition-colors ${
                        formData.date === dateStr
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-xs text-gray-600">{format(date, 'EEE')}</p>
                      <p className="text-lg font-semibold text-gray-900">{format(date, 'd')}</p>
                      <p className="text-xs text-gray-600">{format(date, 'MMM')}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label>Select Time *</Label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {TIME_SLOTS.map(hour => (
                  <button
                    key={hour}
                    onClick={() => setFormData({ ...formData, time: hour.toString() })}
                    className={`rounded-lg border-2 p-3 text-center transition-colors ${
                      formData.time === hour.toString()
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">
                      {format(setHours(new Date(), hour), 'HH:mm')}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-600">Client</p>
                <p className="text-sm text-gray-900">
                  {selectedClient?.firstName} {selectedClient?.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Service</p>
                <p className="text-sm text-gray-900">
                  {selectedService?.name} (${selectedService?.price}, {selectedService?.duration} min)
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Staff Member</p>
                <p className="text-sm text-gray-900">
                  {selectedStaff?.firstName} {selectedStaff?.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Date & Time</p>
                <p className="text-sm text-gray-900">
                  {format(new Date(formData.date), 'MMMM dd, yyyy')} at{' '}
                  {format(setHours(new Date(), parseInt(formData.time)), 'HH:mm')}
                </p>
              </div>
            </div>

            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any special notes or requests..."
                className="mt-1"
                rows={4}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Booking"
        description="Create a new appointment step by step"
      />

      {/* Progress Steps */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    index < currentStep
                      ? 'border-green-500 bg-green-500 text-white'
                      : index === currentStep
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {index < currentStep ? (
                    <CheckCircleIcon className="h-6 w-6" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <p className={`mt-2 text-xs font-medium ${index <= currentStep ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step}
                </p>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 w-12 ${
                    index < currentStep ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">{STEPS[currentStep]}</h3>
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          Back
        </Button>
        {currentStep < STEPS.length - 1 ? (
          <Button onClick={handleNext} disabled={!canGoNext()} className="flex-1">
            Next
          </Button>
        ) : (
          <Button onClick={handleSubmit} className="flex-1">
            Create Booking
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate('/bookings')}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
