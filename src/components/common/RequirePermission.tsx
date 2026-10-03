import React from 'react';
import { usePermission } from '../../hooks/usePermission';
import { Permission } from '../../lib/permissions';

interface RequirePermissionProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequirePermission({ permission, children, fallback = null }: RequirePermissionProps) {
  const { hasPermission } = usePermission(permission);
  if (!hasPermission) return <>{fallback}</>;
  return <>{children}</>;
}
