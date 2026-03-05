import { useAuth, ProcurementRole } from '@/contexts/AuthContext';
import { hasPermission, canManageModule, canViewModule, canApprove, canCreate, isAdmin } from '@/lib/permissions';
import { AppRole } from '@/types/users';

export const usePermissions = () => {
  const { roles } = useAuth();
  const typedRoles = roles as AppRole[];

  return {
    hasPermission: (permission: string) => hasPermission(typedRoles, permission),
    canManage: (module: string) => canManageModule(typedRoles, module),
    canView: (module: string) => canViewModule(typedRoles, module),
    canApprove: (module: string) => canApprove(typedRoles, module),
    canCreate: (module: string) => canCreate(typedRoles, module),
    isAdmin: isAdmin(typedRoles),
    roles: typedRoles,
  };
};
