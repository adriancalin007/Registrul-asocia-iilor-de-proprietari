// src/app/api/financiare/[id]/archiva/route.ts — Archive a finalized period
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface Params { params: { id: string } }

export async function PATCH(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[]).includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const period = await prisma.expensePeriod.findUnique({ where: { id: params.id } });
  if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 });
  if (period.status === "DRAFT") {
    return NextResponse.json({ error: "Cannot archive a draft period — generate the payment list first" }, { status: 400 });
  }
  if (period.status === "ARCHIVED") {
    return NextResponse.json({ error: "Already archived" }, { status: 400 });
  }

  await prisma.expensePeriod.update({
    where: { id: params.id },
    data: { status: "ARCHIVED" },
  });

  return NextResponse.json({ success: true });
}
