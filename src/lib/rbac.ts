// src/lib/rbac.ts
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type Permission =
  | "association:view" | "association:create" | "association:validate" | "association:configure"
  | "document:view" | "document:upload" | "document:approve" | "document:delete"
  | "consultation:view" | "consultation:initiate" | "consultation:respond" | "consultation:close"
  | "certificate:request" | "certificate:approve" | "certificate:issue"
  | "issue:report" | "issue:manage" | "issue:close"
  | "supplier:view" | "supplier:register" | "supplier:verify" | "supplier:submit_quote"
  | "rfq:view" | "rfq:create" | "rfq:approve" | "rfq:award"
  | "agm:manage" | "agm:archive_resolution"
  | "financial:view" | "financial:import" | "financial:audit"
  | "uat:dashboard" | "uat:reports" | "uat:audit" | "uat:communications" | "uat:configure"
  | "system:configure" | "system:full_audit";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    "document:view", "consultation:view", "consultation:respond",
    "certificate:request", "issue:report", "supplier:view",
  ],
  MANAGER: [
    "association:view", "association:configure",
    "document:view", "document:upload", "document:approve",
    "consultation:view", "certificate:approve", "certificate:issue",
    "issue:report", "issue:manage", "issue:close",
    "supplier:view", "rfq:view", "rfq:create",
    "agm:manage", "financial:view", "financial:import",
  ],
  BOARD_PRESIDENT: [
    "association:view", "document:view", "document:upload", "document:approve",
    "consultation:view", "consultation:initiate", "consultation:close",
    "certificate:approve", "issue:report", "issue:manage",
    "supplier:view", "rfq:view", "rfq:approve", "rfq:award",
    "agm:manage", "agm:archive_resolution", "financial:view",
  ],
  AUDITOR: [
    "financial:view", "financial:audit", "document:view", "association:view",
  ],
  SUPPLIER: [
    "rfq:view", "supplier:submit_quote",
  ],
  UAT_OPERATOR: [
    "association:view", "association:validate", "supplier:verify",
    "uat:dashboard", "uat:reports", "uat:audit", "uat:communications", "uat:configure",
  ],
  POLICE_OPERATOR: [
    "uat:dashboard", "uat:reports", "uat:communications",
  ],
  SUPER_ADMIN: [
    "association:view", "association:create", "association:validate", "association:configure",
    "document:view", "document:upload", "document:approve", "document:delete",
    "consultation:view", "consultation:initiate", "consultation:respond", "consultation:close",
    "certificate:request", "certificate:approve", "certificate:issue",
    "issue:report", "issue:manage", "issue:close",
    "supplier:view", "supplier:register", "supplier:verify", "supplier:submit_quote",
    "rfq:view", "rfq:create", "rfq:approve", "rfq:award",
    "agm:manage", "agm:archive_resolution",
    "financial:view", "financial:import", "financial:audit",
    "uat:dashboard", "uat:reports", "uat:audit", "uat:communications", "uat:configure",
    "system:configure", "system:full_audit",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export async function getUserRole(userId: string): Promise<{ role: UserRole | null; uatId?: string; associationId?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      superAdminAccount: true,
      uatOperatorAccount: true,
      supplierAccount: true,
      mandates: { where: { isActive: true }, orderBy: { startDate: "desc" } },
      ownerships: { where: { isActive: true } },
    },
  });

  if (!user) return { role: null };
  if (user.superAdminAccount) return { role: UserRole.SUPER_ADMIN };
  if (user.uatOperatorAccount) {
    const isPolice = user.uatOperatorAccount.operatorType === "POLICE";
    return {
      role: isPolice ? UserRole.POLICE_OPERATOR : UserRole.UAT_OPERATOR,
      uatId: user.uatOperatorAccount.uatId,
    };
  }

  const priorityRoles = [UserRole.BOARD_PRESIDENT, UserRole.MANAGER, UserRole.AUDITOR];
  for (const r of priorityRoles) {
    const mandate = user.mandates.find(m => m.role === r);
    if (mandate) return { role: r, associationId: mandate.associationId };
  }

  if (user.supplierAccount) return { role: UserRole.SUPPLIER };
  if (user.ownerships.length > 0) return { role: UserRole.OWNER };

  return { role: null };
}

export function getDefaultRouteForRole(role: UserRole): string {
  const routes: Record<UserRole, string> = {
    SUPER_ADMIN:      "/dashboard",
    UAT_OPERATOR:     "/uat",
    POLICE_OPERATOR:  "/uat/sesizari",
    BOARD_PRESIDENT:  "/dashboard",
    MANAGER:          "/dashboard",
    AUDITOR:          "/financials",
    SUPPLIER:         "/suppliers/quotes",
    OWNER:            "/dashboard",
  };
  return routes[role] ?? "/dashboard";
}

export const ROLE_ROUTES: Record<UserRole, string[]> = {
  OWNER:            ["/dashboard", "/documents", "/consultations", "/certificates", "/issues"],
  MANAGER:          ["/dashboard", "/documents", "/issues", "/suppliers", "/certificates", "/agm", "/financials"],
  BOARD_PRESIDENT:  ["/dashboard", "/documents", "/consultations", "/certificates", "/issues", "/suppliers", "/agm", "/financials"],
  AUDITOR:          ["/financials", "/documents"],
  SUPPLIER:         ["/suppliers/quotes", "/suppliers/profile"],
  UAT_OPERATOR:     ["/uat", "/uat/associations", "/uat/suppliers", "/uat/reports", "/uat/audit", "/uat/map"],
  POLICE_OPERATOR:  ["/uat/sesizari"],
  SUPER_ADMIN:      ["/dashboard", "/uat", "/associations", "/documents", "/consultations", "/certificates", "/issues", "/suppliers", "/agm", "/financials"],
};
