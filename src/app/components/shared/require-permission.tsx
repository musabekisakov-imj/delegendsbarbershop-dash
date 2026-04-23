import { Navigate } from 'react-router';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import type { Permission } from '../../types';
import { usePermission } from '../../hooks/use-permission';
import { EmptyState } from './empty-state';
import { Button } from '../ui/button';

interface RequirePermissionProps {
  permission: Permission;
  children: React.ReactNode;
  /** If `redirect` is set, a user without the permission is bounced there instead of seeing the empty state. */
  redirect?: string;
}

/**
 * Route-level guard. Renders children if the current user has the permission;
 * otherwise either redirects (useful for unauthenticated flows) or shows a
 * friendly "no access" card that keeps the user on the route so they can see
 * what they lack without losing context.
 */
export function RequirePermission({ permission, children, redirect }: RequirePermissionProps) {
  const { can, role } = usePermission();

  if (can(permission)) return <>{children}</>;
  if (redirect) return <Navigate to={redirect} replace />;

  return (
    <EmptyState
      icon={LockClosedIcon}
      title="You don't have access to this page"
      description={
        role
          ? `Your role (${role}) can't view this section. Ask an owner to grant access.`
          : 'Sign in with an account that has access to this section.'
      }
      action={
        <Button variant="ghost" onClick={() => history.back()}>
          Go back
        </Button>
      }
    />
  );
}
