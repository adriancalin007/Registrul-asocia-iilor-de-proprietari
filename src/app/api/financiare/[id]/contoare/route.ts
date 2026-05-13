// src/app/api/financiare/[id]/contoare/route.ts — Add / delete meter readings
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, MeterType } from "@prisma/client";
import { z } from "zod";

const ReadingSchema = z.object({
  unitId:        z.string().min(1),
  meterType:     z.nativeEnum(MeterType),
  previousIndex: z.number().nonnegative(),
  currentIndex:  z.number().nonnegative(),
  unitPrice:     z.number().nonnegative().optional(),
  readAt:        z.string(),
});

interface Params { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[]).includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const period = await prisma.expensePeriod.findUnique({ where: { id: params.id } });
  if (!period || period.status === "ARCHIVED") {
    return NextResponse.json({ error: "Period not found or archived" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = ReadingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { unitId, meterType, previousIndex, currentIndex, unitPrice, readAt } = parsed.data;
  const consumption = Math.max(0, currentIndex - previousIndex);

  const reading = await prisma.meterReading.upsert({
    where: { periodId_unitId_meterType: { periodId: params.id, unitId, meterType } },
    create: { periodId: params.id, unitId, meterType, previousIndex, currentIndex, consumption, unitPrice, readAt: new Date(readAt) },
    update: { previousIndex, currentIndex, consumption, unitPrice, readAt: new Date(readAt) },
  });

  return NextResponse.json({ success: true, id: reading.id });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[]).includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { readingId } = await req.json();
  if (!readingId) return NextResponse.json({ error: "readingId required" }, { status: 400 });

  await prisma.meterReading.deleteMany({ where: { id: readingId, periodId: params.id } });
  return NextResponse.json({ success: true });
}
