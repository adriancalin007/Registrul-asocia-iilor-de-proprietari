import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { AccountType } from "@prisma/client";
import { z } from "zod";

export async function GET() {
  const guard = await requirePermission("users.view_all");
  if (guard) return guard;

  const roles = await prisma.role.findMany({
    include: {
      permissions: { include: { permission: true } },
      _count:      { select: { assignments: true } },
    },
    orderBy: [{ accountType: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(roles.map(r => ({
    id:          r.id,
    name:        r.name,
    accountType: r.accountType,
    isSystem:    r.isSystem,
    description: r.description,
    createdAt:   r.createdAt,
    userCount:   r._count.assignments,
    permissions: r.permissions.map(rp => ({
      id:       rp.permission.id,
      key:      rp.permission.key,
      category: rp.permission.category,
    })),
  })));
}

const CreateRoleSchema = z.object({
  name:        z.string().min(2).max(50).regex(/^[A-Z0-9_]+$/, "Numai majuscule, cifre și underscore"),
  accountType: z.nativeEnum(AccountType),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const guard = await requirePermission("platform.manage_roles");
  if (guard) return guard;

  const session = await auth();
  const actorId = session!.user.id;

  const parsed = CreateRoleSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const existing = await prisma.role.findUnique({ where: { name: parsed.data.name } });
  if (existing) return NextResponse.json({ error: "Există deja un rol cu acest nume" }, { status: 409 });

  const role = await prisma.role.create({
    data: { ...parsed.data, isSystem: false },
  });

  await prisma.adminAuditLog.create({
    data: { actorId, action: "ROLE_CREATED", metadata: { roleId: role.id, name: role.name } },
  });

  return NextResponse.json(role, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const guard = await requirePermission("platform.manage_roles");
  if (guard) return guard;

  const session = await auth();
  const actorId = session!.user.id;

  const { roleId } = await req.json();
  if (!roleId) return NextResponse.json({ error: "roleId required" }, { status: 400 });

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role)          return NextResponse.json({ error: "Rolul nu există" }, { status: 404 });
  if (role.isSystem)  return NextResponse.json({ error: "Rolurile sistem nu pot fi șterse" }, { status: 400 });

  await prisma.role.delete({ where: { id: roleId } });

  await prisma.adminAuditLog.create({
    data: { actorId, action: "ROLE_DELETED", metadata: { roleId, name: role.name } },
  });

  return NextResponse.json({ deleted: true });
}
