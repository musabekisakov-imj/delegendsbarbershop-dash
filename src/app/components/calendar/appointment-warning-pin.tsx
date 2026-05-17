import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../ui/utils';
import type { AppointmentWarning } from '../../lib/appointment-warning';

const SEVERITY_COLOR: Record<AppointmentWarning['severity'], string> = {
  high: 'text-danger',
  medium: 'text-warning',
  low: 'text-caution',
};

export function AppointmentWarningPin({
  warning,
  size = 'sm',
}: {
  warning: AppointmentWarning;
  size?: 'sm' | 'md';
}) {
  const px = size === 'sm' ? 14 : 16;
  const tooltip = import.meta.env.PROD
    ? warning.message
    : `${warning.message} [${warning.code}]`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'absolute top-[6px] right-[6px] pointer-events-auto shrink-0',
            SEVERITY_COLOR[warning.severity],
          )}
          style={{ width: px, height: px }}
          aria-label={tooltip}
          role="img"
          onClick={ev => { ev.stopPropagation(); ev.preventDefault(); }}
        >
          <ExclamationTriangleIcon style={{ width: px, height: px }} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
