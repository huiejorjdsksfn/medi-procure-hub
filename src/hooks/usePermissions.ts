import { useAuth, ProcurementRole } from '@/contexts/AuthContext';
import { hasPermission, canManageModule, canViewModule, canApprove, canCreate, isAdmin } from '@/lib/permissions';
import { AppRole } from '@/types/users';

export const usePermissions = () => {
  const { roles, isAdminTier } = useAuth();
  const typedRoles = roles as AppRole[];

  return {
    hasPermission: (permission: string) => hasPermission(typedRoles, permission),
    canManage:     (module: string)     => canManageModule(typedRoles, module),
    canView:       (module: string)     => canViewModule(typedRoles, module),
    canApprove:    (module: string)     => canApprove(typedRoles, module),
    canCreate:     (module: string)     => canCreate(typedRoles, module),
    /** True when user holds superadmin, admin, or webmaster */
    isAdmin:       isAdminTier || isAdmin(typedRoles),
    roles:         typedRoles,
  };
};
