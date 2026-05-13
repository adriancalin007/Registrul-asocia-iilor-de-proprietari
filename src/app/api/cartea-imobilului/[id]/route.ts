// src/app/api/cartea-imobilului/[id]/route.ts — Deactivate or delete a resident record
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const ALLOWED = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];
interface Params { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED.includes(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const resident = await prisma.resident.update({
    where: { id: params.id },
    data: {
      isActive:  body.isActive  ?? undefined,
      endDate:   body.endDate   ? new Date(body.endDate) : undefined,
      notes:     body.notes     ?? undefined,
      fullName:  body.fullName  ?? undefined,
      cnp:       body.cnp       ?? undefined,
      type:      body.type      ?? undefined,
    },
  });
  return NextResponse.json({ success: true, resident });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED.includes(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Soft delete — just mark inactive with today as endDate
  await prisma.resident.update({
    where: { id: params.id },
    data: { isActive: false, endDate: new Date() },
  });
  return NextResponse.json({ success: true });
}
