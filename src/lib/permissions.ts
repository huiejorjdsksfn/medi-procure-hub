import { AppRole, ROLE_PERMISSIONS } from '@/types/users';

export const hasPermission = (roles: AppRole[], permission: string): boolean => {
  return roles.some(role => {
    const perms = ROLE_PERMISSIONS[role];
    return perms.includes('*') || perms.includes(permission);
  });
};

export const canManageModule = (roles: AppRole[], module: string): boolean => {
  return hasPermission(roles, `${module}.manage`) || hasPermission(roles, '*');
};

export const canViewModule = (roles: AppRole[], module: string): boolean => {
  return hasPermission(roles, `${module}.view`) || canManageModule(roles, module);
};

export const canApprove = (roles: AppRole[], module: string): boolean => {
  return hasPermission(roles, `${module}.approve`) || hasPermission(roles, '*');
};

export const canCreate = (roles: AppRole[], module: string): boolean => {
  return hasPermission(roles, `${module}.create`) || canManageModule(roles, module);
};

export const isAdmin = (roles: AppRole[]): boolean => roles.includes('admin');
