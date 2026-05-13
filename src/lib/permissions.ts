/**
 * RBAC dinamic — verificare permisiuni prin baza de date.
 * Permisiunile sunt definite în tabelele rbac_* și gestionate de superadmin.
 * Acest modul este separat de src/lib/rbac.ts (sistemul vechi static).
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// ─── Tipuri ───────────────────────────────────────────────────────────────────

export type PermissionKey =
  | "users.view_all"
  | "users.create_civil"
  | "users.create_official"
  | "users.merge"
  | "users.deactivate"
  | "users.assign_roles"
  | "associations.read"
  | "associations.approve"
  | "associations.configure"
  | "documents.read"
  | "documents.approve"
  | "audit.view"
  | "reports.view"
  | "platform.configure"
  | "platform.manage_roles";

export type UserPermissionsResult = {
  userId: string;
  permissions: PermissionKey[];
  roles: { id: string; name: string; accountType: string }[];
};

// ─── Cache în memorie (TTL 60s) — evită N+1 pe fiecare request ───────────────

const cache = new Map<string, { perms: PermissionKey[]; exp: number }>();
const CACHE_TTL = 60_000;

function cacheGet(userId: string) {
  const entry = cache.get(userId);
  if (!entry || Date.now() > entry.exp) return null;
  return entry.perms;
}
function cacheSet(userId: string, perms: PermissionKey[]) {
  cache.set(userId, { perms, exp: Date.now() + CACHE_TTL });
}
export function invalidatePermissionCache(userId: string) {
  cache.delete(userId);
}

// ─── Core ────────────────────────────────────────────────────────────────────

/**
 * Returnează toate permisiunile agregate ale unui user din toate rolurile sale RBAC.
 */
export async function getUserPermissions(userId: string): Promise<UserPermissionsResult> {
  const cached = cacheGet(userId);

  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  const roles = assignments.map(a => ({
    id:          a.role.id,
    name:        a.role.name,
    accountType: a.role.accountType,
  }));

  const permsSet = new Set<PermissionKey>();
  for (const a of assignments) {
    for (const rp of a.role.permissions) {
      permsSet.add(rp.permission.key as PermissionKey);
    }
  }

  const permissions = Array.from(permsSet);

  if (!cached) cacheSet(userId, permissions);

  return { userId, permissions, roles };
}

/**
 * Verifică dacă un user are o permisiune specifică.
 * Folosește cache-ul intern pentru eficiență.
 */
export async function hasPermission(userId: string, key: PermissionKey): Promise<boolean> {
  const cached = cacheGet(userId);
  if (cached) return cached.includes(key);

  const { permissions } = await getUserPermissions(userId);
  return permissions.includes(key);
}

/**
 * Middleware pentru API routes — returnează 403 dacă userul nu are permisiunea.
 *
 * @example
 * const guard = await requirePermission("associations.approve");
 * if (guard) return guard; // 401 sau 403 ca NextResponse
 */
export async function requirePermission(
  key: PermissionKey,
  req?: NextRequest,
): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await hasPermission(session.user.id, key);
  if (!allowed) {
    return NextResponse.json(
      { error: "Forbidden", required: key },
      { status: 403 },
    );
  }
  return null;
}

/**
 * Verifică dacă un user are oricare din rolurile RBAC date.
 */
export async function hasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
  const count = await prisma.userRoleAssignment.count({
    where: {
      userId,
      role: { name: { in: roleNames } },
    },
  });
  return count > 0;
}
