import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesApi, categoriesApi } from '../lib/api';
import { PageHeader } from '../components/shared/page-header';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { PlusIcon, ClockIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import type { Service, Category } from '../types';

export function ServicesPage() {
  const queryClient = useQueryClient();
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  const [serviceFormData, setServiceFormData] = useState({
    name: '',
    price: '',
    duration: '',
    categoryId: '',
    description: ''
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: ''
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.getAll()
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll()
  });

  const createServiceMutation = useMutation({
    mutationFn: (data: Omit<Service, 'id' | 'createdAt'>) => servicesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service created');
      setIsServiceModalOpen(false);
      resetServiceForm();
    },
    onError: () => {
      toast.error('Failed to create service');
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: Omit<Category, 'id' | 'createdAt'>) => categoriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category created');
      setIsCategoryModalOpen(false);
      resetCategoryForm();
    },
    onError: () => {
      toast.error('Failed to create category');
    }
  });

  const resetServiceForm = () => {
    setServiceFormData({ name: '', price: '', duration: '', categoryId: '', description: '' });
  };

  const resetCategoryForm = () => {
    setCategoryFormData({ name: '' });
  };

  const handleCreateService = () => {
    if (!serviceFormData.name || !serviceFormData.price || !serviceFormData.duration || !serviceFormData.categoryId) {
      toast.error('Please fill all required fields');
      return;
    }
    createServiceMutation.mutate({
      name: serviceFormData.name,
      price: parseFloat(serviceFormData.price),
      duration: parseInt(serviceFormData.duration),
      categoryId: serviceFormData.categoryId,
      description: serviceFormData.description
    });
  };

  const handleCreateCategory = () => {
    if (!categoryFormData.name) {
      toast.error('Please enter a category name');
      return;
    }
    createCategoryMutation.mutate({ name: categoryFormData.name });
  };

  const servicesByCategory = categories.map(category => ({
    category,
    services: services.filter(s => s.categoryId === category.id)
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        description="Manage your service offerings and categories"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)}>
              Add Category
            </Button>
            <Button onClick={() => setIsServiceModalOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </div>
        }
      />

      {/* Services by Category */}
      <div className="space-y-6">
        {servicesByCategory.map(({ category, services: categoryServices }) => (
          <div key={category.id} className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">{category.name}</h3>
            
            {categoryServices.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">No services in this category</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categoryServices.map(service => (
                  <div key={service.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{service.name}</h4>
                        <p className="mt-1 text-sm text-gray-600">{service.description}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <ClockIcon className="h-4 w-4" />
                        {service.duration} min
                      </div>
                      <span className="text-lg font-bold text-gray-900">${service.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {categories.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-sm text-gray-500">No categories yet. Create one to get started.</p>
          </div>
        )}
      </div>

      {/* Create Service Modal */}
      <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Service Name *</Label>
              <Input
                value={serviceFormData.name}
                onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                placeholder="e.g., Classic Haircut"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={serviceFormData.categoryId} onValueChange={(value) => setServiceFormData({ ...serviceFormData, categoryId: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price ($) *</Label>
                <Input
                  type="number"
                  value={serviceFormData.price}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, price: e.target.value })}
                  placeholder="35"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Duration (min) *</Label>
                <Input
                  type="number"
                  value={serviceFormData.duration}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, duration: e.target.value })}
                  placeholder="30"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={serviceFormData.description}
                onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                placeholder="Brief description of the service..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreateService} className="flex-1">
                Create Service
              </Button>
              <Button variant="outline" onClick={() => setIsServiceModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Category Name *</Label>
              <Input
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                placeholder="e.g., Haircuts"
                className="mt-1"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreateCategory} className="flex-1">
                Create Category
              </Button>
              <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
