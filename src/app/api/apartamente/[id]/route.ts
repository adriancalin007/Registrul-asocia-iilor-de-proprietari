// src/app/api/apartamente/[id]/route.ts — Update or delete a unit
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, Prisma } from "@prisma/client";
import { z } from "zod";

const ALLOWED = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];
interface Params { params: { id: string } }

const HEATING_TYPES = ["DISTRICT", "CENTRALIZED", "INDIVIDUAL", "NONE"] as const;

const PatchSchema = z.object({
  number:           z.string().min(1).optional(),
  floor:            z.number().int().nullable().optional(),
  area:             z.number().positive().nullable().optional(),
  shareRatio:       z.number().positive().nullable().optional(),
  residents:        z.number().int().min(0).nullable().optional(),
  heatingType:      z.enum(HEATING_TYPES).optional(),
  isCompanyHQ:      z.boolean().optional(),
  companyName:      z.string().nullable().optional(),
  companyCUI:       z.string().nullable().optional(),
  customAttributes: z.record(z.union([z.string(), z.number(), z.boolean()])).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED.includes(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { customAttributes, ...rest } = parsed.data;
  const unit = await prisma.unit.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(customAttributes !== undefined
        ? { customAttributes: customAttributes === null ? Prisma.JsonNull : customAttributes }
        : {}),
    },
  });
  return NextResponse.json({ success: true, unit });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED.includes(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Only allow if no active ownerships or residents
  const unit = await prisma.unit.findUnique({
    where: { id: params.id },
    include: { _count: { select: { ownerships: true } } },
  });
  if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (unit._count.ownerships > 0) return NextResponse.json({ error: "Apartamentul are proprietari activi. Dezactivează-i mai întâi." }, { status: 400 });

  await prisma.unit.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
