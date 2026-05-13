// src/app/api/furnizori/route.ts — List and create suppliers
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, SupplierStatus } from "@prisma/client";
import { cookies } from "next/headers";
import { z } from "zod";

// Suppliers belong exclusively to the association's admin sphere — UAT operators have no access
const MANAGER_ROLES = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];

async function resolveUatId(userId: string, role: UserRole): Promise<string | null> {
  if (role === UserRole.UAT_OPERATOR) {
    const op = await prisma.uATOperator.findUnique({ where: { userId } });
    return op?.uatId ?? null;
  }
  if (role === UserRole.SUPER_ADMIN) {
    const uat = await prisma.uAT.findFirst();
    return uat?.id ?? null;
  }
  const cookieStore = cookies();
  const assocId = cookieStore.get("asociatie_activa")?.value
    ?? (await prisma.mandate.findFirst({ where: { userId, isActive: true } }))?.associationId;
  if (!assocId) return null;
  const assoc = await prisma.association.findUnique({ where: { id: assocId } });
  return assoc?.uatId ?? null;
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!MANAGER_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const uatId = await resolveUatId(session.user.id, role);
  if (!uatId) return NextResponse.json({ error: "No UAT found" }, { status: 400 });

  // Everyone sees PENDING + VERIFIED; only privileged see SUSPENDED/REJECTED too
  const isPrivileged = ([UserRole.SUPER_ADMIN, UserRole.UAT_OPERATOR] as UserRole[]).includes(role);

  const suppliers = await prisma.supplier.findMany({
    where: {
      uatId,
      ...(isPrivileged ? {} : { status: { in: [SupplierStatus.PENDING, SupplierStatus.VERIFIED] } }),
    },
    include: {
      ratings: { select: { score: true, raterRole: true } },
      _count: { select: { associations: true } },
    },
    orderBy: [{ status: "asc" }, { companyName: "asc" }],
  });

  return NextResponse.json(suppliers);
}

const SupplierSchema = z.object({
  companyName:       z.string().min(2),
  fiscalCode:        z.string().min(2),
  email:             z.string().email().optional().or(z.literal("")),
  phone:             z.string().optional(),
  address:           z.string().optional(),
  serviceCategories: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!MANAGER_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const uatId = await resolveUatId(session.user.id, role);
  if (!uatId) return NextResponse.json({ error: "No UAT found" }, { status: 400 });

  const body = await req.json();
  const parsed = SupplierSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const existing = await prisma.supplier.findUnique({ where: { fiscalCode: parsed.data.fiscalCode } });
  if (existing) return NextResponse.json({ error: "Furnizor cu acest CUI există deja", id: existing.id }, { status: 409 });

  // All authorized roles create suppliers as VERIFIED directly
  const { email, ...rest } = parsed.data;
  const supplier = await prisma.supplier.create({
    data: {
      uatId,
      ...rest,
      email: email || "",
      serviceAreas: [],
      qualificationDocs: [],
      status: SupplierStatus.VERIFIED,
      verifiedBy: session.user.id,
      verifiedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true, id: supplier.id });
}
