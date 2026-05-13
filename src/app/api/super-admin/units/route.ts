// src/app/api/super-admin/units/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buildingId = req.nextUrl.searchParams.get("buildingId");
  if (!buildingId) return NextResponse.json({ error: "buildingId required" }, { status: 400 });

  const units = await prisma.unit.findMany({
    where: { buildingId },
    select: { id: true, number: true, floor: true, area: true },
    orderBy: { number: "asc" },
  });

  return NextResponse.json(units);
}
