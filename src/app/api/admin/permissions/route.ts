import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, invalidatePermissionCache } from "@/lib/permissions";
import { z } from "zod";

// GET — lista tuturor permisiunilor, grupate pe categorii
export async function GET() {
  const guard = await requirePermission("users.view_all");
  if (guard) return guard;

  const permissions = await prisma.permission.findMany({
    include: { roles: { include: { role: true } } },
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  return NextResponse.json(permissions.map(p => ({
    id:          p.id,
    key:         p.key,
    category:    p.category,
    description: p.description,
    assignedTo:  p.roles.map(rp => ({ id: rp.role.id, name: rp.role.name })),
  })));
}

const PatchSchema = z.object({
  roleId:       z.string().min(1),
  permissionId: z.string().min(1),
  assign:       z.boolean(), // true = asignează, false = dezasignează
});

// PATCH — asignare / dezasignare permisiune la/de la un rol
export async function PATCH(req: NextRequest) {
  const guard = await requirePermission("platform.manage_roles");
  if (guard) return guard;

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { roleId, permissionId, assign } = parsed.data;

  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return NextResponse.json({ error: "Rolul nu există" }, { status: 404 });

  if (assign) {
    await prisma.rolePermission.upsert({
      where:  { roleId_permissionId: { roleId, permissionId } },
      update: {},
      create: { roleId, permissionId },
    });
  } else {
    await prisma.rolePermission.deleteMany({ where: { roleId, permissionId } });
  }

  // Invalidează cache-ul pentru toți userii care au acest rol
  const assignments = await prisma.userRoleAssignment.findMany({ where: { roleId } });
  for (const a of assignments) invalidatePermissionCache(a.userId);

  return NextResponse.json({ updated: true });
}
