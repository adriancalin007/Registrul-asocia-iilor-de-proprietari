// src/app/api/cartea-imobilului/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, ResidentType } from "@prisma/client";
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

  const residents = await prisma.resident.findMany({
    where: {
      unit: { building: { associationId: assocId } },
      isActive: true,
    },
    orderBy: [{ unit: { number: "asc" } }, { fullName: "asc" }],
    include: {
      unit: {
        select: { number: true, floor: true, building: { select: { name: true } } },
      },
    },
  });

  return NextResponse.json(residents);
}

const ResidentSchema = z.object({
  unitId:    z.string().min(1),
  fullName:  z.string().min(2),
  cnp:       z.string().optional(),
  type:      z.nativeEnum(ResidentType).default(ResidentType.OWNER),
  startDate: z.string(),
  notes:     z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role as UserRole;
  if (!ALLOWED.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = ResidentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const resident = await prisma.resident.create({
    data: { ...parsed.data, startDate: new Date(parsed.data.startDate) },
  });

  return NextResponse.json({ success: true, id: resident.id });
}
