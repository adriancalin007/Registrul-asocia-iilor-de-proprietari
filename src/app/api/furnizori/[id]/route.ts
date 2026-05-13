// src/app/api/furnizori/[id]/route.ts — Verify / suspend / reject a supplier
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, SupplierStatus } from "@prisma/client";

interface Params { params: { id: string } }

const PRIVILEGED = [UserRole.SUPER_ADMIN, UserRole.UAT_OPERATOR] as UserRole[];

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!PRIVILEGED.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { status, rejectionReason } = await req.json() as { status: SupplierStatus; rejectionReason?: string };

  const supplier = await prisma.supplier.update({
    where: { id: params.id },
    data: {
      status,
      rejectionReason: status === SupplierStatus.REJECTED ? (rejectionReason ?? null) : null,
      verifiedBy: status === SupplierStatus.VERIFIED ? session.user.id : undefined,
      verifiedAt: status === SupplierStatus.VERIFIED ? new Date() : undefined,
    },
  });

  return NextResponse.json({ success: true, supplier });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!PRIVILEGED.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.supplier.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
