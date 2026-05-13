// src/app/api/super-admin/operators/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const Schema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("UAT_OPERATOR"),
    fullName: z.string().min(2),
    email: z.string().email(),
    jobTitle: z.string().optional(),
    uatId: z.string().min(1, "UAT is required"),
  }),
  z.object({
    role: z.literal("SUPER_ADMIN"),
    fullName: z.string().min(2),
    email: z.string().email(),
  }),
  z.object({
    role: z.literal("MANAGER"),
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    associationId: z.string().min(1, "Association is required"),
    startDate: z.string().min(1, "Start date is required"),
  }),
  z.object({
    role: z.literal("BOARD_PRESIDENT"),
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    associationId: z.string().min(1, "Association is required"),
    startDate: z.string().min(1, "Start date is required"),
  }),
  z.object({
    role: z.literal("OWNER"),
    fullName: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    unitId: z.string().min(1, "Apartment is required"),
    ownerType: z.enum(["OWNER", "TENANT", "CO_OWNER"]).default("OWNER"),
    startDate: z.string().min(1, "Start date is required"),
  }),
]);

async function findOrCreateUser(email: string, fullName: string, phone?: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { user: existing, created: false };

  const nameParts = fullName.trim().split(" ");
  const firstName = nameParts.slice(0, -1).join(" ") || fullName;
  const lastName  = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
  const tempHash  = await bcrypt.hash(`RESET_${Math.random().toString(36).slice(2)}`, 10);

  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      firstName,
      lastName,
      phone: phone || null,
      passwordHash: tempHash,
      emailVerified: false,
      isActive: true,
    },
  });
  return { user, created: true };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const data = parsed.data;

  // Check email conflict
  const existing = await prisma.user.findUnique({ where: { email: data.email } });

  // For roles that create a new context (not just user), even if user exists we continue
  // but we need to check for duplicate contexts
  if (data.role === "UAT_OPERATOR" || data.role === "SUPER_ADMIN") {
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
  }

  switch (data.role) {
    case "UAT_OPERATOR": {
      const { user } = await findOrCreateUser(data.email, data.fullName);
      await prisma.uATOperator.create({
        data: { userId: user.id, uatId: data.uatId, jobTitle: data.jobTitle || null },
      });
      return NextResponse.json({ success: true, userId: user.id, created: true });
    }

    case "SUPER_ADMIN": {
      const { user } = await findOrCreateUser(data.email, data.fullName);
      await prisma.superAdmin.create({ data: { userId: user.id } });
      return NextResponse.json({ success: true, userId: user.id, created: true });
    }

    case "MANAGER":
    case "BOARD_PRESIDENT": {
      const { user, created } = await findOrCreateUser(data.email, data.fullName, (data as { phone?: string }).phone);

      // Check if they already have an active mandate for this association+role
      const existingMandate = await prisma.mandate.findFirst({
        where: { userId: user.id, associationId: data.associationId, role: data.role as UserRole, isActive: true },
      });
      if (existingMandate) {
        return NextResponse.json({ error: "This person already has an active mandate for this association" }, { status: 409 });
      }

      // Deactivate any previous mandate of the same role in this association
      await prisma.mandate.updateMany({
        where: { associationId: data.associationId, role: data.role as UserRole, isActive: true },
        data: { isActive: false, expiresAt: new Date() },
      });

      await prisma.mandate.create({
        data: {
          associationId: data.associationId,
          userId: user.id,
          role: data.role as UserRole,
          startDate: new Date(data.startDate),
          isActive: true,
        },
      });

      return NextResponse.json({ success: true, userId: user.id, created });
    }

    case "OWNER": {
      const { user, created } = await findOrCreateUser(data.email, data.fullName, (data as { phone?: string }).phone);

      // Check for existing active ownership on this unit
      const existingOwnership = await prisma.ownership.findFirst({
        where: { unitId: data.unitId, userId: user.id, isActive: true },
      });
      if (existingOwnership) {
        return NextResponse.json({ error: "This person already has an active ownership for this apartment" }, { status: 409 });
      }

      await prisma.ownership.create({
        data: {
          unitId: data.unitId,
          userId: user.id,
          type: data.ownerType,
          startDate: new Date(data.startDate),
          isActive: true,
        },
      });

      return NextResponse.json({ success: true, userId: user.id, created });
    }
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  if (userId === session.user.id) {
    return NextResponse.json({ error: "Cannot deactivate your own account" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
