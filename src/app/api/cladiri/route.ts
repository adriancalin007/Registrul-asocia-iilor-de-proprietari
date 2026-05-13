// src/app/api/cladiri/route.ts — Create buildings (scări / corpuri)
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

const BuildingSchema = z.object({
  name:    z.string().min(1, "Numele este obligatoriu"),
  address: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED.includes(session.user.role as UserRole))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const associationId = await resolveAssocId(session.user.id);
  if (!associationId) return NextResponse.json({ error: "No active association" }, { status: 400 });

  const parsed = BuildingSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  // Check for duplicate name within association
  const existing = await prisma.building.findFirst({
    where: { associationId, name: parsed.data.name },
  });
  if (existing) return NextResponse.json({ error: "Există deja o scară/corp cu acest nume" }, { status: 409 });

  const building = await prisma.building.create({
    data: {
      associationId,
      name:    parsed.data.name,
      address: parsed.data.address ?? "",
    },
  });

  return NextResponse.json({ success: true, id: building.id, name: building.name });
}
