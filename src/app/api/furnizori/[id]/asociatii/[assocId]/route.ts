// DELETE /api/furnizori/[id]/asociatii/[assocId] — remove supplier-association link
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const ALLOWED_ROLES = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; assocId: string } }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!ALLOWED_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Verify the manager actually manages this association (unless SUPER_ADMIN)
  if (role !== UserRole.SUPER_ADMIN) {
    const mandate = await prisma.mandate.findFirst({
      where: { userId: session.user.id, associationId: params.assocId, isActive: true },
    });
    if (!mandate) return NextResponse.json({ error: "Nu gestionați această asociație" }, { status: 403 });
  }

  await prisma.supplierAssociation.deleteMany({
    where: { supplierId: params.id, associationId: params.assocId },
  });

  return NextResponse.json({ success: true });
}
