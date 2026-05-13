// src/app/api/uat/associations/[id]/buildings/[bid]/units/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface Params { params: { id: string; bid: string } }

function uatGuard(role: UserRole) {
  return role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN;
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (uatGuard(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { number, floor, rooms, area } = await req.json();
  if (!number?.trim()) return NextResponse.json({ error: "Numărul apartamentului este obligatoriu" }, { status: 400 });

  const unit = await prisma.unit.create({
    data: {
      buildingId: params.bid,
      number: number.trim(),
      floor:  floor  != null ? parseInt(floor)  : null,
      rooms:  rooms  != null ? parseInt(rooms)  : null,
      area:   area   != null ? parseFloat(area) : null,
    },
  });

  // Keep Building.unitCount in sync
  await prisma.building.update({
    where: { id: params.bid },
    data: { unitCount: { increment: 1 } },
  });

  return NextResponse.json(unit, { status: 201 });
}
