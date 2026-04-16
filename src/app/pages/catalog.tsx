import { useQuery } from '@tanstack/react-query';
import { servicesApi, categoriesApi } from '../lib/api';
import { PageHeader } from '../components/shared/page-header';
import { ClockIcon, CurrencyDollarIcon, ScissorsIcon } from '@heroicons/react/24/outline';

export function CatalogPage() {
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => servicesApi.getAll()
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll()
  });

  const servicesByCategory = categories.map(category => ({
    category,
    services: services.filter(s => s.categoryId === category.id)
  }));

  // Pre-built packages
  const packages = [
    {
      id: 'pkg-1',
      name: 'Executive Package',
      description: 'Complete grooming experience',
      services: ['Haircut', 'Beard Trim', 'Styling'],
      price: 85,
      originalPrice: 100,
      duration: 80
    },
    {
      id: 'pkg-2',
      name: 'Quick Refresh',
      description: 'Fast and fresh',
      services: ['Haircut', 'Beard Trim'],
      price: 55,
      originalPrice: 60,
      duration: 50
    },
    {
      id: 'pkg-3',
      name: 'Premium Makeover',
      description: 'The complete transformation',
      services: ['Haircut', 'Hair Color', 'Styling'],
      price: 145,
      originalPrice: 170,
      duration: 150
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Catalog"
        description="Browse all available services and packages"
      />

      {/* Packages Section */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Featured Packages</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {packages.map(pkg => (
            <div key={pkg.id} className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600">
                <ScissorsIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
              <p className="mt-1 text-sm text-gray-600">{pkg.description}</p>
              
              <div className="mt-4 space-y-1">
                {pkg.services.map((service, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    {service}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-end justify-between border-t border-blue-100 pt-4">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">${pkg.price}</span>
                    <span className="text-sm text-gray-500 line-through">${pkg.originalPrice}</span>
                  </div>
                  <p className="text-xs text-gray-600">Save ${pkg.originalPrice - pkg.price}</p>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <ClockIcon className="h-4 w-4" />
                  {pkg.duration}m
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Services by Category */}
      <div className="space-y-8">
        <h2 className="text-xl font-semibold text-gray-900">All Services</h2>
        
        {servicesByCategory.map(({ category, services: categoryServices }) => (
          <div key={category.id}>
            <h3 className="mb-4 text-lg font-medium text-gray-900">{category.name}</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoryServices.map(service => (
                <div key={service.id} className="rounded-xl border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <ScissorsIcon className="h-5 w-5 text-gray-600" />
                  </div>
                  
                  <h4 className="text-lg font-medium text-gray-900">{service.name}</h4>
                  <p className="mt-2 text-sm text-gray-600">{service.description}</p>
                  
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <CurrencyDollarIcon className="h-4 w-4" />
                        <span className="font-semibold text-gray-900">{service.price}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <ClockIcon className="h-4 w-4" />
                        {service.duration}m
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-sm text-gray-500">No services available</p>
          </div>
        )}
      </div>
    </div>
  );
}
