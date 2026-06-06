import { AppRole, ROLE_PERMISSIONS, ADMIN_ROLES } from '@/types/users';

/** Roles that bypass all permission checks — full wildcard */
const SUPER_ROLES: AppRole[] = ['superadmin', 'admin', 'webmaster'];

/**
 * Returns true if any of the user's roles grants the specified permission.
 * Admin-tier roles (superadmin, admin, webmaster) always return true.
 */
export const hasPermission = (roles: AppRole[], permission: string): boolean => {
  if (roles.some(r => SUPER_ROLES.includes(r))) return true;
  return roles.some(role => {
    const perms = ROLE_PERMISSIONS[role];
    if (!perms) return false;
    return perms.includes('*') || perms.includes(permission);
  });
};

export const canManageModule = (roles: AppRole[], module: string): boolean =>
  hasPermission(roles, `${module}.manage`) || isAdmin(roles);

export const canViewModule = (roles: AppRole[], module: string): boolean =>
  hasPermission(roles, `${module}.view`) || canManageModule(roles, module);

export const canApprove = (roles: AppRole[], module: string): boolean =>
  hasPermission(roles, `${module}.approve`) || isAdmin(roles);

export const canCreate = (roles: AppRole[], module: string): boolean =>
  hasPermission(roles, `${module}.create`) || canManageModule(roles, module);

/**
 * True if the user holds any admin-tier role.
 * Covers superadmin, admin, and webmaster.
 */
export const isAdmin = (roles: AppRole[]): boolean =>
  roles.some(r => ADMIN_ROLES.includes(r));

export { SUPER_ROLES };
