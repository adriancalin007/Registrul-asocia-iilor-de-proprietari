// src/app/api/uat/associations/[id]/buildings/[bid]/units/[uid]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface Params { params: { id: string; bid: string; uid: string } }

function uatGuard(role: UserRole) {
  return role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN;
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (uatGuard(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { number, floor, rooms, area } = await req.json();
  const unit = await prisma.unit.update({
    where: { id: params.uid, buildingId: params.bid },
    data: {
      ...(number != null && { number: String(number).trim() }),
      floor:  floor  != null ? parseInt(floor)  : null,
      rooms:  rooms  != null ? parseInt(rooms)  : null,
      area:   area   != null ? parseFloat(area) : null,
    },
  });
  return NextResponse.json(unit);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (uatGuard(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const hasOwner = await prisma.ownership.count({
    where: { unitId: params.uid, isActive: true },
  });
  if (hasOwner > 0) {
    return NextResponse.json({ error: "Apartament cu proprietar activ — nu poate fi șters" }, { status: 400 });
  }

  await prisma.unit.delete({ where: { id: params.uid, buildingId: params.bid } });
  await prisma.building.update({
    where: { id: params.bid },
    data: { unitCount: { decrement: 1 } },
  });
  return NextResponse.json({ success: true });
}
