import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission, invalidatePermissionCache } from "@/lib/permissions";
import { z } from "zod";

interface Params { params: { id: string } }

const AssignSchema = z.object({
  roleId: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: Params) {
  const guard = await requirePermission("users.assign_roles");
  if (guard) return guard;

  const session = await auth();
  const actorId = session!.user.id;

  const parsed = AssignSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { roleId } = parsed.data;

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return NextResponse.json({ error: "Rolul nu există" }, { status: 404 });

  await prisma.userRoleAssignment.upsert({
    where:  { userId_roleId: { userId: params.id, roleId } },
    update: {},
    create: { userId: params.id, roleId, assignedBy: actorId },
  });

  await prisma.adminAuditLog.create({
    data: {
      userId: params.id, actorId,
      action: "ROLE_ASSIGNED",
      metadata: { roleId, roleName: role.name },
    },
  });

  invalidatePermissionCache(params.id);
  return NextResponse.json({ assigned: true, role: { id: role.id, name: role.name } });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const guard = await requirePermission("users.assign_roles");
  if (guard) return guard;

  const session = await auth();
  const actorId = session!.user.id;

  const { roleId } = await req.json();
  if (!roleId) return NextResponse.json({ error: "roleId required" }, { status: 400 });

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return NextResponse.json({ error: "Rolul nu există" }, { status: 404 });

  await prisma.userRoleAssignment.deleteMany({
    where: { userId: params.id, roleId },
  });

  await prisma.adminAuditLog.create({
    data: {
      userId: params.id, actorId,
      action: "ROLE_REMOVED",
      metadata: { roleId, roleName: role.name },
    },
  });

  invalidatePermissionCache(params.id);
  return NextResponse.json({ removed: true });
}
