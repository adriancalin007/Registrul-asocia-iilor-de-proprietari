// src/app/api/uat/associations/[id]/buildings/[bid]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface Params { params: { id: string; bid: string } }

function uatGuard(role: UserRole) {
  return role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN;
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (uatGuard(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, address, builtYear } = await req.json();
  const building = await prisma.building.update({
    where: { id: params.bid, associationId: params.id },
    data: {
      ...(name?.trim()    && { name: name.trim() }),
      ...(address?.trim() && { address: address.trim() }),
      ...(builtYear !== undefined && { builtYear: builtYear ? parseInt(builtYear) : null }),
    },
    include: { units: true },
  });
  return NextResponse.json(building);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (uatGuard(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Block deletion if units have ownerships
  const hasOwners = await prisma.ownership.count({
    where: { unit: { buildingId: params.bid }, isActive: true },
  });
  if (hasOwners > 0) {
    return NextResponse.json({ error: "Nu se poate șterge — există proprietari activi" }, { status: 400 });
  }

  await prisma.unit.deleteMany({ where: { buildingId: params.bid } });
  await prisma.building.delete({ where: { id: params.bid, associationId: params.id } });
  return NextResponse.json({ success: true });
}
