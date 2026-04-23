import { useAuthStore } from '../store/auth-store';
import { can, canAny } from '../lib/permissions';
import type { Permission } from '../types';

export function usePermission() {
  const role = useAuthStore((s) => s.user?.role);

  return {
    role,
    can: (permission: Permission) => can(role, permission),
    canAny: (permissions: Permission[]) => canAny(role, permissions),
  };
}
