// src/app/api/super-admin/buildings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const associationId = req.nextUrl.searchParams.get("associationId");
  if (!associationId) return NextResponse.json({ error: "associationId required" }, { status: 400 });

  const buildings = await prisma.building.findMany({
    where: { associationId },
    select: { id: true, name: true, address: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(buildings);
}
