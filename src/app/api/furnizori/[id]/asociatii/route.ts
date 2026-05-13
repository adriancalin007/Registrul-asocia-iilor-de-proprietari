// GET  /api/furnizori/[id]/asociatii — list allocations + manager's available associations
// POST /api/furnizori/[id]/asociatii — allocate supplier to an association
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const ALLOWED_ROLES = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!ALLOWED_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supplier = await prisma.supplier.findUnique({ where: { id: params.id } });
  if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Current allocations for this supplier
  const allocations = await prisma.supplierAssociation.findMany({
    where: { supplierId: params.id },
    include: { association: { select: { id: true, name: true, neighborhood: true } } },
    orderBy: { addedAt: "asc" },
  });

  // Associations managed by this user (for the "add" dropdown)
  let managed: { id: string; name: string; neighborhood: string | null }[] = [];
  if (role === UserRole.SUPER_ADMIN) {
    const all = await prisma.association.findMany({
      where: { status: "ACTIVE", uatId: supplier.uatId },
      select: { id: true, name: true, neighborhood: true },
      orderBy: { name: "asc" },
    });
    managed = all;
  } else {
    const mandates = await prisma.mandate.findMany({
      where: { userId: session.user.id, isActive: true },
      include: { association: { select: { id: true, name: true, neighborhood: true, status: true } } },
    });
    managed = mandates
      .filter(m => m.association.status === "ACTIVE")
      .map(m => ({ id: m.association.id, name: m.association.name, neighborhood: m.association.neighborhood }));
  }

  const allocatedIds = new Set(allocations.map(a => a.associationId));
  const available = managed.filter(a => !allocatedIds.has(a.id));

  return NextResponse.json({
    allocations: allocations.map(a => ({
      id: a.id,
      associationId: a.association.id,
      name: a.association.name,
      neighborhood: a.association.neighborhood,
      addedAt: a.addedAt,
    })),
    available,
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!ALLOWED_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { associationId } = await req.json();
  if (!associationId) return NextResponse.json({ error: "associationId required" }, { status: 400 });

  // Verify the manager actually manages this association (unless SUPER_ADMIN)
  if (role !== UserRole.SUPER_ADMIN) {
    const mandate = await prisma.mandate.findFirst({
      where: { userId: session.user.id, associationId, isActive: true },
    });
    if (!mandate) return NextResponse.json({ error: "Nu gestionați această asociație" }, { status: 403 });
  }

  const record = await prisma.supplierAssociation.upsert({
    where: { supplierId_associationId: { supplierId: params.id, associationId } },
    create: { supplierId: params.id, associationId, addedBy: session.user.id },
    update: {},
  });

  return NextResponse.json({ success: true, id: record.id });
}
