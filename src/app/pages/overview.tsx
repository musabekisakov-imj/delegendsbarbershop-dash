import { useQuery } from '@tanstack/react-query';
import { appointmentsApi, clientsApi, staffApi, servicesApi } from '../lib/api';
import { PageHeader } from '../components/shared/page-header';
import { StatCard } from '../components/shared/stat-card';
import {
  CalendarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  UsersIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from '../components/ui/badge';

export function OverviewPage() {
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

  // Calculate stats
  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);
  
  const todayAppointments = appointments.filter(apt => 
    isWithinInterval(parseISO(apt.startTime), { start: todayStart, end: todayEnd })
  );

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  
  const weekAppointments = appointments.filter(apt => 
    isWithinInterval(parseISO(apt.startTime), { start: weekStart, end: weekEnd }) &&
    apt.status === 'completed'
  );

  const weeklyRevenue = weekAppointments.reduce((sum, apt) => {
    const service = services.find(s => s.id === apt.serviceId);
    return sum + (service?.price || 0);
  }, 0);

  const activeStaff = staff.filter(s => s.isActive).length;

  // Upcoming appointments (next 5)
  const upcomingAppointments = appointments
    .filter(apt => parseISO(apt.startTime) > today && apt.status !== 'cancelled')
    .sort((a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime())
    .slice(0, 5);

  // Staff on duty today
  const staffOnDuty = staff.filter(s => s.isActive).slice(0, 4);

  // Weekly revenue chart data
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const chartData = days.map((day, index) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + index);
    const dayStart = startOfDay(dayDate);
    const dayEnd = endOfDay(dayDate);
    
    const dayAppointments = appointments.filter(apt =>
      isWithinInterval(parseISO(apt.startTime), { start: dayStart, end: dayEnd }) &&
      apt.status === 'completed'
    );
    
    const revenue = dayAppointments.reduce((sum, apt) => {
      const service = services.find(s => s.id === apt.serviceId);
      return sum + (service?.price || 0);
    }, 0);
    
    return { day, revenue };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Welcome back! Here's what's happening today."
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Appointments"
          value={todayAppointments.length}
          icon={CalendarIcon}
          trend={{ value: 12, label: 'vs yesterday' }}
        />
        <StatCard
          title="Weekly Revenue"
          value={`$${weeklyRevenue.toLocaleString()}`}
          icon={CurrencyDollarIcon}
          trend={{ value: 8, label: 'vs last week' }}
        />
        <StatCard
          title="Total Clients"
          value={clients.length}
          icon={UserGroupIcon}
        />
        <StatCard
          title="Staff on Duty"
          value={activeStaff}
          icon={UsersIcon}
        />
      </div>

      {/* Charts and Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 font-semibold text-gray-900">Weekly Revenue</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem'
                }}
                formatter={(value: number) => [`$${value}`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Upcoming Appointments */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="mb-4 font-semibold text-gray-900">Upcoming Appointments</h3>
          <div className="space-y-3">
            {upcomingAppointments.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No upcoming appointments</p>
            ) : (
              upcomingAppointments.map(apt => (
                <div key={apt.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <ClockIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {apt.client.firstName} {apt.client.lastName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(parseISO(apt.startTime), 'MMM dd, HH:mm')} • {apt.service.name}
                    </p>
                  </div>
                  <Badge className={getStatusColor(apt.status)}>
                    {apt.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Staff on Duty */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="mb-4 font-semibold text-gray-900">Staff on Duty</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {staffOnDuty.map(member => (
            <div key={member.id} className="flex items-center gap-3 rounded-lg border border-gray-100 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                {member.firstName[0]}{member.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {member.firstName} {member.lastName}
                </p>
                <p className="text-xs capitalize text-gray-500">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
