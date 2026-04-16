import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi, appointmentsApi } from '../lib/api';
import { PageHeader } from '../components/shared/page-header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { MagnifyingGlassIcon, PlusIcon, UserIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import type { Client } from '../types';

export function ClientsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: ''
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.getAll()
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => appointmentsApi.getAllWithDetails()
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Client, 'id' | 'createdAt' | 'totalVisits' | 'lastVisitAt'>) =>
      clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client created');
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast.error('Failed to create client');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
      clientsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client updated');
      setIsEditing(false);
    },
    onError: () => {
      toast.error('Failed to update client');
    }
  });

  const resetForm = () => {
    setFormData({ firstName: '', lastName: '', email: '', phone: '', notes: '' });
  };

  const handleCreate = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast.error('Please fill all required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = (clientId: string) => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast.error('Please fill all required fields');
      return;
    }
    updateMutation.mutate({ id: clientId, data: formData });
  };

  const filteredClients = clients.filter(client =>
    searchQuery === '' ||
    client.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone.includes(searchQuery)
  );

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const clientAppointments = selectedClient
    ? appointments.filter(apt => apt.clientId === selectedClient.id)
        .sort((a, b) => parseISO(b.startTime).getTime() - parseISO(a.startTime).getTime())
    : [];

  const openClientDetail = (client: Client) => {
    setSelectedClientId(client.id);
    setFormData({
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      notes: client.notes
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Manage your client database"
        action={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        }
      />

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Search clients by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Clients Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredClients.length === 0 ? (
          <div className="col-span-full rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-sm text-gray-500">No clients found</p>
          </div>
        ) : (
          filteredClients.map(client => (
            <button
              key={client.id}
              onClick={() => openClientDetail(client)}
              className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                {client.firstName[0]}{client.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">
                  {client.firstName} {client.lastName}
                </p>
                <p className="text-sm text-gray-600">{client.email}</p>
                <p className="text-sm text-gray-600">{client.phone}</p>
                <p className="mt-2 text-xs text-gray-500">
                  {client.totalVisits} visits
                  {client.lastVisitAt && ` • Last: ${format(parseISO(client.lastVisitAt), 'MMM dd')}`}
                </p>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Client Detail Sheet */}
      <Sheet open={selectedClientId !== null} onOpenChange={() => setSelectedClientId(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          {selectedClient && (
            <>
              <SheetHeader>
                <SheetTitle>Client Details</SheetTitle>
              </SheetHeader>

              <Tabs defaultValue="overview" className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                  <TabsTrigger value="preferences">Preferences</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="flex items-center gap-4 rounded-lg bg-gray-50 p-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-lg font-medium text-blue-700">
                      {selectedClient.firstName[0]}{selectedClient.lastName[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedClient.firstName} {selectedClient.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{selectedClient.email}</p>
                      <p className="text-sm text-gray-600">{selectedClient.phone}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="text-sm text-gray-600">Total Visits</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">{selectedClient.totalVisits}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-4">
                      <p className="text-sm text-gray-600">Last Visit</p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {selectedClient.lastVisitAt
                          ? format(parseISO(selectedClient.lastVisitAt), 'MMM dd, yyyy')
                          : 'Never'}
                      </p>
                    </div>
                  </div>

                  {selectedClient.notes && (
                    <div className="rounded-lg bg-yellow-50 p-4">
                      <p className="text-sm font-medium text-yellow-900">Notes</p>
                      <p className="mt-1 text-sm text-yellow-800">{selectedClient.notes}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="space-y-3">
                  {clientAppointments.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500">No appointment history</p>
                  ) : (
                    clientAppointments.map(apt => (
                      <div key={apt.id} className="rounded-lg border border-gray-200 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{apt.service.name}</p>
                            <p className="text-sm text-gray-600">
                              {format(parseISO(apt.startTime), 'MMM dd, yyyy HH:mm')}
                            </p>
                            <p className="text-sm text-gray-600">
                              with {apt.staff.firstName} {apt.staff.lastName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">${apt.service.price}</p>
                            <p className="text-xs capitalize text-gray-500">{apt.status}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="preferences" className="space-y-4">
                  {isEditing ? (
                    <>
                      <div className="space-y-4">
                        <div>
                          <Label>First Name *</Label>
                          <Input
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Last Name *</Label>
                          <Input
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Email *</Label>
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Phone *</Label>
                          <Input
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Notes</Label>
                          <Textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="mt-1"
                            rows={4}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleUpdate(selectedClient.id)} className="flex-1">
                          Save Changes
                        </Button>
                        <Button variant="outline" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-gray-600">First Name</p>
                          <p className="text-sm text-gray-900">{selectedClient.firstName}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Last Name</p>
                          <p className="text-sm text-gray-900">{selectedClient.lastName}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Email</p>
                          <p className="text-sm text-gray-900">{selectedClient.email}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Phone</p>
                          <p className="text-sm text-gray-900">{selectedClient.phone}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-600">Notes</p>
                          <p className="text-sm text-gray-900">{selectedClient.notes || 'No notes'}</p>
                        </div>
                      </div>
                      <Button onClick={() => setIsEditing(true)} className="w-full">
                        Edit Client
                      </Button>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Client Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
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
                placeholder="john@example.com"
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
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any preferences or notes..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreate} className="flex-1">
                Create Client
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
