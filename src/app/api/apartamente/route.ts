// src/app/api/apartamente/route.ts — List and create/update units
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { z } from "zod";

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

  const assocId = await resolveAssocId(session.user.id);
  if (!assocId) return NextResponse.json({ error: "No active association" }, { status: 400 });

  const buildings = await prisma.building.findMany({
    where: { associationId: assocId },
    orderBy: { name: "asc" },
    include: {
      units: {
        orderBy: { number: "asc" },
        include: {
          _count: { select: { ownerships: true } },
          ownerships: {
            where: { isActive: true },
            select: { id: true, type: true, user: { select: { fullName: true } } },
          },
        },
      },
    },
  });

  return NextResponse.json(buildings);
}

const HEATING_TYPES = ["DISTRICT", "CENTRALIZED", "INDIVIDUAL", "NONE"] as const;

const UnitSchema = z.object({
  buildingId:       z.string().min(1),
  number:           z.string().min(1),
  floor:            z.number().int().optional(),
  area:             z.number().positive().optional(),
  shareRatio:       z.number().positive().optional(),
  residents:        z.number().int().min(0).optional(),
  heatingType:      z.enum(HEATING_TYPES).optional(),
  isCompanyHQ:      z.boolean().optional(),
  companyName:      z.string().optional(),
  companyCUI:       z.string().optional(),
  customAttributes: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role as UserRole;
  if (!ALLOWED.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = UnitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const existing = await prisma.unit.findFirst({
    where: { buildingId: parsed.data.buildingId, number: parsed.data.number },
  });
  if (existing) return NextResponse.json({ error: "Apartamentul există deja în această scară", id: existing.id }, { status: 409 });

  const unit = await prisma.unit.create({ data: parsed.data });
  return NextResponse.json({ success: true, id: unit.id });
}
