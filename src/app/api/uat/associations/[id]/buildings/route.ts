// src/app/api/uat/associations/[id]/buildings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface Params { params: { id: string } }

function uatGuard(role: UserRole) {
  return role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (uatGuard(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const buildings = await prisma.building.findMany({
    where: { associationId: params.id },
    include: { units: { orderBy: [{ floor: "asc" }, { number: "asc" }] } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(buildings);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (uatGuard(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, address, builtYear } = await req.json();
  if (!name?.trim() || !address?.trim()) {
    return NextResponse.json({ error: "Nume și adresă obligatorii" }, { status: 400 });
  }

  const building = await prisma.building.create({
    data: {
      associationId: params.id,
      name: name.trim(),
      address: address.trim(),
      builtYear: builtYear ? parseInt(builtYear) : null,
      staircaseCount: 1,
    },
    include: { units: true },
  });
  return NextResponse.json(building, { status: 201 });
}
