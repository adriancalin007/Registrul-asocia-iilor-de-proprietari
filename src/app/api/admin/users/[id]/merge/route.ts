/**
 * POST /api/admin/users/[id]/merge
 * Unifică un cont PENDING_MERGE cu un cont civil existent (detectat după CNP).
 * [id] = ID-ul contului OFFICIAL care urmează să fie creat/actualizat.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission, invalidatePermissionCache } from "@/lib/permissions";
import { AccountType, UserStatus } from "@prisma/client";
import { z } from "zod";

interface Params { params: { id: string } }

const MergeSchema = z.object({
  civilUserId: z.string().min(1),
  roleName:    z.string().min(1),
  confirm:     z.literal(true),
});

export async function POST(req: NextRequest, { params }: Params) {
  const guard = await requirePermission("users.merge");
  if (guard) return guard;

  const session = await auth();
  const actorId = session!.user.id;

  const parsed = MergeSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { civilUserId, roleName } = parsed.data;

  const [civilUser, role] = await Promise.all([
    prisma.user.findUnique({ where: { id: civilUserId } }),
    prisma.role.findUnique({ where: { name: roleName } }),
  ]);

  if (!civilUser) return NextResponse.json({ error: "Contul civil nu există" }, { status: 404 });
  if (!role || role.accountType !== AccountType.OFFICIAL) {
    return NextResponse.json({ error: "Rolul nu există sau nu este OFFICIAL" }, { status: 400 });
  }

  // Promovează contul civil la OFFICIAL + adaugă rolul
  await prisma.user.update({
    where: { id: civilUserId },
    data: {
      accountType:      AccountType.OFFICIAL,
      status:           UserStatus.ACTIVE,
      createdByAdminId: actorId,
    },
  });

  await prisma.userRoleAssignment.upsert({
    where:  { userId_roleId: { userId: civilUserId, roleId: role.id } },
    update: {},
    create: { userId: civilUserId, roleId: role.id, assignedBy: actorId },
  });

  await prisma.adminAuditLog.create({
    data: {
      userId:   civilUserId,
      actorId,
      action:   "ACCOUNT_MERGED",
      metadata: { roleName, confirmedExplicitly: true },
    },
  });

  invalidatePermissionCache(civilUserId);
  return NextResponse.json({ merged: true, userId: civilUserId });
}
