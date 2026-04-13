// src/app/api/uat/associations/[id]/geocode/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface Params { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { lat, lng } = await req.json();
  if (typeof lat !== "number" || typeof lng !== "number") return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });

  await prisma.association.update({ where: { id: params.id }, data: { latitude: lat, longitude: lng, geocodedAt: new Date() } });
  return NextResponse.json({ success: true });
}
