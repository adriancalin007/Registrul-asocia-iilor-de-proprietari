import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requirePermission("users.view_all");
  if (guard) return guard;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      rbacRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      ownerships: {
        include: {
          unit: {
            include: {
              building: { include: { association: { select: { id: true, name: true, address: true } } } },
            },
          },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Audit log pentru acest user
  const auditLogs = await prisma.adminAuditLog.findMany({
    where: { OR: [{ userId: params.id }, { actorId: params.id }] },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    id:              user.id,
    email:           user.email,
    fullName:        user.fullName,
    firstName:       user.firstName,
    lastName:        user.lastName,
    phone:           user.phone,
    cnp:             user.cnp,
    status:          user.status,
    accountType:     user.accountType,
    isActive:        user.isActive,
    createdAt:       user.createdAt,
    lastLoginAt:     user.lastLoginAt,
    mustChangePassword: user.mustChangePassword,
    civicType:       user.civicType,
    domiciliuSector: user.domiciliuSector,
    createdByAdminId: user.createdByAdminId,
    roles: user.rbacRoles.map(a => ({
      id:          a.role.id,
      name:        a.role.name,
      accountType: a.role.accountType,
      assignedAt:  a.assignedAt,
      permissions: a.role.permissions.map(rp => rp.permission.key),
    })),
    ownerships: user.ownerships.map(o => ({
      id:              o.id,
      unitId:          o.unitId,
      unitNumber:      o.unit.number,
      floor:           o.unit.floor,
      area:            o.unit.area,
      shareRatio:      o.unit.shareRatio,
      buildingName:    o.unit.building.name,
      associationId:   o.unit.building.association?.id   ?? null,
      associationName: o.unit.building.association?.name ?? "—",
      associationAddr: o.unit.building.association?.address ?? null,
      startDate:       o.startDate,
      isActive:        o.isActive,
    })),
    auditLogs: auditLogs.map(l => ({
      id:        l.id,
      action:    l.action,
      actorId:   l.actorId,
      metadata:  l.metadata,
      createdAt: l.createdAt,
    })),
  });
}
