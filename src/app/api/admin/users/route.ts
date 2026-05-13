import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const guard = await requirePermission("users.view_all");
  if (guard) return guard;

  const { searchParams } = new URL(req.url);
  const q           = searchParams.get("q") ?? "";
  const roleFilter  = searchParams.get("role") ?? "";
  const typeFilter  = searchParams.get("accountType") ?? "";
  const statusFilter = searchParams.get("status") ?? "";

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { email:    { contains: q, mode: "insensitive" } },
      { cnp:      { contains: q, mode: "insensitive" } },
    ];
  }
  if (typeFilter)   where.accountType = typeFilter;
  if (statusFilter) where.status      = statusFilter;

  const users = await prisma.user.findMany({
    where,
    include: {
      rbacRoles: {
        include: { role: true },
        ...(roleFilter ? { where: { role: { name: roleFilter } } } : {}),
      },
      ownerships: { where: { isActive: true }, include: { unit: { include: { building: { include: { association: { select: { id: true, name: true } } } } } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  // Dacă filtrul de rol e activ, excludem userii fără acel rol
  const filtered = roleFilter
    ? users.filter(u => u.rbacRoles.length > 0)
    : users;

  return NextResponse.json(filtered.map(u => ({
    id:              u.id,
    email:           u.email,
    fullName:        u.fullName,
    firstName:       u.firstName,
    lastName:        u.lastName,
    phone:           u.phone,
    cnp:             u.cnp,
    status:          u.status,
    accountType:     u.accountType,
    isActive:        u.isActive,
    createdAt:       u.createdAt,
    lastLoginAt:     u.lastLoginAt,
    createdByAdminId: u.createdByAdminId,
    roles:           u.rbacRoles.map(a => ({ id: a.role.id, name: a.role.name, accountType: a.role.accountType })),
    ownerships:      u.ownerships.map(o => ({
      id:              o.id,
      unitId:          o.unitId,
      associationName: o.unit.building.association?.name ?? "—",
      associationId:   o.unit.building.association?.id   ?? null,
      unitNumber:      o.unit.number,
    })),
  })));
}
