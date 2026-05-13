import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const operator = await prisma.uATOperator.findUnique({
    where: { userId: session.user.id },
    select: { uatId: true },
  });

  // Get all active mandates for management roles
  const mandates = await prisma.mandate.findMany({
    where: {
      isActive: true,
      role: { in: [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.AUDITOR] },
      ...(operator ? { association: { uatId: operator.uatId } } : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          isActive: true,
          lastLoginAt: true,
          mustChangePassword: true,
          createdAt: true,
        },
      },
      association: {
        select: { id: true, name: true, neighborhood: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Deduplicate users — one entry per user with all their mandates listed
  const userMap = new Map<string, {
    user: typeof mandates[0]["user"];
    mandates: { role: string; associationName: string; associationId: string; mandateId: string; since: Date }[];
  }>();

  for (const m of mandates) {
    const existing = userMap.get(m.user.id);
    const entry = {
      role: m.role,
      associationName: m.association.name,
      associationId: m.association.id,
      mandateId: m.id,
      since: m.startDate,
    };
    if (existing) {
      existing.mandates.push(entry);
    } else {
      userMap.set(m.user.id, { user: m.user, mandates: [entry] });
    }
  }

  return NextResponse.json(Array.from(userMap.values()));
}
