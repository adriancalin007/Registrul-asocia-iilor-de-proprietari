// src/app/api/proprietari/[id]/route.ts
// PATCH — edit owner details  |  DELETE — deactivate ownership
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const ALLOWED = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];

const PatchSchema = z.object({
  fullName: z.string().min(2).optional(),
  email:    z.string().email().optional(),
  phone:    z.string().optional(),
  cnp:      z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED.includes(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const ownership = await prisma.ownership.findUnique({
    where: { id: params.id },
    include: { user: true },
  });
  if (!ownership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const d = parsed.data;
  const updates: Record<string, unknown> = {};
  if (d.fullName) updates.fullName = d.fullName;
  if (d.phone !== undefined) updates.phone = d.phone || null;
  if (d.cnp !== undefined) updates.cnp = d.cnp || null;

  // Only update email if it's different from what they have and not a placeholder
  if (d.email && d.email !== ownership.user.email) {
    const taken = await prisma.user.findUnique({ where: { email: d.email } });
    if (taken && taken.id !== ownership.user.id) {
      return NextResponse.json({ error: "Adresa de email este deja folosită de alt cont" }, { status: 409 });
    }
    updates.email = d.email;
    updates.emailVerified = false;
  }

  await prisma.user.update({ where: { id: ownership.userId }, data: updates });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED.includes(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownership = await prisma.ownership.findUnique({ where: { id: params.id } });
  if (!ownership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.ownership.update({
    where: { id: params.id },
    data: { isActive: false, endDate: new Date() },
  });

  return NextResponse.json({ success: true });
}
