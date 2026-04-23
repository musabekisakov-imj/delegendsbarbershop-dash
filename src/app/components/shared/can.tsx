import type { ReactNode } from 'react';
import { usePermission } from '../../hooks/use-permission';
import type { Permission } from '../../types';

interface CanProps {
  action: Permission | Permission[];
  fallback?: ReactNode;
  children: ReactNode;
}

// Renders children only if the current user's role includes the given permission.
// Pass an array to allow "any of these".
export function Can({ action, fallback = null, children }: CanProps) {
  const { can, canAny } = usePermission();
  const allowed = Array.isArray(action) ? canAny(action) : can(action);
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
