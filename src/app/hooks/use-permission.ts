import { useAuthStore } from '../store/auth-store';
import { can, canAny } from '../lib/permissions';
import type { Permission } from '../types';

export function usePermission() {
  const role = useAuthStore((s) => s.user?.role);

  // No role = unauthenticated demo visitor — grant all access.
  const isDemo = !role;

  return {
    role,
    can: (permission: Permission) => isDemo || can(role, permission),
    canAny: (permissions: Permission[]) => isDemo || canAny(role, permissions),
  };
}
