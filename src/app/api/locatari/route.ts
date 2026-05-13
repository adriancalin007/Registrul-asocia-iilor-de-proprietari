// src/app/api/proprietari/route.ts
// List buildings+units+ownerships for the active association, or add a new unit+owner.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { z } from "zod";
import bcrypt from "bcryptjs";

const ALLOWED = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];

async function resolveAssocId(userId: string): Promise<string | null> {
  const cookieStore = cookies();
  const fromCookie = cookieStore.get("asociatie_activa")?.value ?? null;
  if (fromCookie) return fromCookie;
  const mandate = await prisma.mandate.findFirst({ where: { userId, isActive: true } });
  return mandate?.associationId ?? null;
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role as UserRole;
  if (!ALLOWED.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const associationId = await resolveAssocId(session.user.id);
  if (!associationId) return NextResponse.json({ error: "No active association" }, { status: 400 });

  // Return a flat list of active ownerships with unit + building included
  const ownerships = await prisma.ownership.findMany({
    where: {
      isActive: true,
      unit: { building: { associationId } },
    },
    orderBy: [
      { unit: { building: { name: "asc" } } },
      { unit: { number: "asc" } },
    ],
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true } },
      unit: {
        select: {
          id: true, number: true, floor: true,
          building: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json(ownerships);
}

const AddOwnerSchema = z.object({
  // Unit info
  buildingId:  z.string().min(1),
  unitNumber:  z.string().min(1),
  floor:       z.number().int().optional(),
  area:        z.number().positive().optional(),
  shareRatio:  z.number().positive().optional(),
  residents:   z.number().int().min(0).optional(),
  // Owner info
  fullName:    z.string().min(2),
  cnp:         z.string().optional(),
  email:       z.string().email().optional().or(z.literal("")),
  phone:       z.string().optional(),
  ownerType:   z.enum(["OWNER", "CO_OWNER"]).default("OWNER"),
  startDate:   z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role as UserRole;
  if (!ALLOWED.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = AddOwnerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const d = parsed.data;

  // Upsert unit
  const existingUnit = await prisma.unit.findFirst({
    where: { buildingId: d.buildingId, number: d.unitNumber },
  });

  const unit = existingUnit
    ? await prisma.unit.update({
        where: { id: existingUnit.id },
        data: {
          floor:      d.floor      ?? existingUnit.floor,
          area:       d.area       ?? existingUnit.area,
          shareRatio: d.shareRatio ?? existingUnit.shareRatio,
          residents:  d.residents  ?? existingUnit.residents,
        },
      })
    : await prisma.unit.create({
        data: {
          buildingId: d.buildingId,
          number:     d.unitNumber,
          floor:      d.floor,
          area:       d.area,
          shareRatio: d.shareRatio,
          residents:  d.residents,
        },
      });

  // Find or create user
  let user = d.email
    ? await prisma.user.findUnique({ where: { email: d.email } })
    : null;

  if (!user) {
    const tempHash = await bcrypt.hash(Math.random().toString(36), 10);
    user = await prisma.user.create({
      data: {
        fullName:      d.fullName,
        cnp:           d.cnp     || null,
        email:         d.email   || `noemail+${unit.id}@bloc-uat.local`,
        phone:         d.phone   || null,
        passwordHash:  tempHash,
        emailVerified: false,
        isActive:      true,
      },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: d.fullName,
        cnp:      d.cnp   ?? user.cnp,
        phone:    d.phone ?? user.phone,
      },
    });
  }

  // Deactivate previous active ownership on this unit
  await prisma.ownership.updateMany({
    where: { unitId: unit.id, isActive: true },
    data: { isActive: false, endDate: new Date() },
  });

  const ownership = await prisma.ownership.create({
    data: {
      unitId:    unit.id,
      userId:    user.id,
      type:      d.ownerType,
      startDate: new Date(d.startDate),
      isActive:  true,
    },
  });

  return NextResponse.json({ success: true, unitId: unit.id, ownershipId: ownership.id });
}
