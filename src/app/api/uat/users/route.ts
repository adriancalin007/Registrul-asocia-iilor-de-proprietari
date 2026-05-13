import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const UAT_ROLES: UserRole[] = [UserRole.UAT_OPERATOR, UserRole.SUPER_ADMIN];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role as UserRole;
  if (!UAT_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q              = searchParams.get("q")              ?? "";
  const roleFilter     = searchParams.get("role")           ?? "";
  const neighborhood   = searchParams.get("neighborhood")   ?? "";
  const assocId        = searchParams.get("assocId")        ?? "";
  const classification = searchParams.get("classification") ?? "";

  const isOperator = role === UserRole.UAT_OPERATOR;

  // Build association-scoped filter when neighborhood / assocId / classification provided
  let mandateAssocIds: string[] | null = null;
  if (neighborhood || assocId || classification) {
    const assocWhere: Record<string, unknown> = {};
    if (neighborhood) assocWhere.neighborhood = neighborhood;
    if (assocId)      assocWhere.id = assocId;
    if (classification) {
      assocWhere.scores = { some: { isPublic: true, classification } };
    }
    const matchedAssocs = await prisma.association.findMany({
      where: assocWhere,
      select: { id: true },
    });
    mandateAssocIds = matchedAssocs.map(a => a.id);
  }

  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" as const } },
      { email:    { contains: q, mode: "insensitive" as const } },
    ];
  }

  // Operators cannot see superadmins or other operators
  if (isOperator) {
    where.superAdminAccount  = null;
    where.uatOperatorAccount = null;
  }

  // Narrow to users with a mandate in the matched associations
  if (mandateAssocIds !== null) {
    where.mandates = {
      some: { associationId: { in: mandateAssocIds }, isActive: true },
    };
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      superAdminAccount:  { select: { id: true } },
      uatOperatorAccount: { select: { id: true, operatorType: true } },
      supplierAccount:    { select: { id: true } },
      mandates: {
        where: { isActive: true },
        orderBy: { startDate: "desc" },
        include: { association: { select: { id: true, name: true, neighborhood: true } } },
      },
      ownerships: { where: { isActive: true }, take: 1, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const result = users.map(user => {
    let derivedRole: string | null = null;

    if (user.superAdminAccount) {
      derivedRole = "SUPER_ADMIN";
    } else if (user.uatOperatorAccount) {
      derivedRole = user.uatOperatorAccount.operatorType === "POLICE" ? "POLICE_OPERATOR" : "UAT_OPERATOR";
    } else {
      const priority: UserRole[] = [UserRole.BOARD_PRESIDENT, UserRole.MANAGER, UserRole.AUDITOR];
      for (const r of priority) {
        if (user.mandates.some(m => m.role === r)) { derivedRole = r; break; }
      }
      if (!derivedRole && user.supplierAccount)     derivedRole = "SUPPLIER";
      if (!derivedRole && user.ownerships.length)   derivedRole = "OWNER";
    }

    return {
      id:                 user.id,
      fullName:           user.fullName,
      email:              user.email,
      phone:              user.phone,
      isActive:           user.isActive,
      createdAt:          user.createdAt,
      lastLoginAt:        user.lastLoginAt,
      mustChangePassword: user.mustChangePassword,
      derivedRole,
      mandates: user.mandates.map(m => ({
        role:            m.role,
        associationId:   m.association.id,
        associationName: m.association.name,
        mandateId:       m.id,
      })),
      hasUatAccount:        !!user.uatOperatorAccount,
      hasSuperAdminAccount: !!user.superAdminAccount,
    };
  });

  const filtered = roleFilter ? result.filter(u => u.derivedRole === roleFilter) : result;
  return NextResponse.json(filtered);
}
