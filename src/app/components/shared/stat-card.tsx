import { cn } from '../ui/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-6', className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className="mt-2 flex items-center gap-1 text-sm">
              <span className={cn('font-medium', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-gray-600">{trend.label}</span>
            </p>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
      </div>
    </div>
  );
}
