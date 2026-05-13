// src/app/api/admin/evaluation-grids/[gridId]/activate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface Params { params: { gridId: string } }

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== UserRole.SUPER_ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Deactivate all other grids, then activate this one
  await prisma.$transaction([
    prisma.evaluationGrid.updateMany({ data: { isActive: false } }),
    prisma.evaluationGrid.update({ where: { id: params.gridId }, data: { isActive: true } }),
  ]);

  return NextResponse.json({ success: true });
}
