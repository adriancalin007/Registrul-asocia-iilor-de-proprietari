import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission, invalidatePermissionCache } from "@/lib/permissions";
import { UserStatus } from "@prisma/client";
import { z } from "zod";

interface Params { params: { id: string } }

const Schema = z.object({
  status: z.nativeEnum(UserStatus),
  reason: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requirePermission("users.deactivate");
  if (guard) return guard;

  const session = await auth();
  const actorId = session!.user.id;

  if (params.id === actorId) {
    return NextResponse.json({ error: "Nu puteți modifica propriul status" }, { status: 400 });
  }

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { status, reason } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await prisma.user.update({
    where: { id: params.id },
    data: {
      status,
      isActive: status === UserStatus.ACTIVE,
    },
  });

  await prisma.adminAuditLog.create({
    data: {
      userId:   params.id,
      actorId,
      action:   "STATUS_CHANGED",
      metadata: { from: user.status, to: status, reason: reason ?? null },
    },
  });

  invalidatePermissionCache(params.id);
  return NextResponse.json({ status });
}
