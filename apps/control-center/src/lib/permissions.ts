import type * as schema from "@/lib/db/schema";

type Role = (typeof schema.roleEnum.enumValues)[number];

export const roleHierarchy: Record<Role, number> = {
  client: 0,
  admin: 1,
};

export function hasRole(userRole: Role, requiredRole: Role) {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function canStartRun(role: Role) {
  return hasRole(role, "client");
}

export function canManageWorkflows(role: Role) {
  return hasRole(role, "admin");
}
