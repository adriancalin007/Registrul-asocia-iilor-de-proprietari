import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, DocumentOficialStatus, DocumentOficialType } from "@prisma/client";
import { z } from "zod";

interface Params { params: { id: string } }

const UAT_ROLES: UserRole[] = [UserRole.UAT_OPERATOR, UserRole.SUPER_ADMIN];
const DOC_TYPES = Object.values(DocumentOficialType);

const PatchSchema = z.discriminatedUnion("action", [
  z.object({
    action:   z.literal("APPROVE"),
    notes:    z.string().optional(),
    docType:  z.enum(DOC_TYPES as [string, ...string[]]).optional(),
  }),
  z.object({
    action:          z.literal("REJECT"),
    rejectionReason: z.string().min(5),
  }),
]);

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!UAT_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const doc = await prisma.documentOficial.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { action } = parsed.data;

  if (action === "APPROVE") {
    const finalType = (parsed.data.docType as DocumentOficialType | undefined) ?? doc.type;

    // Archive previous APPROVED doc of the same final type for the same association
    await prisma.documentOficial.updateMany({
      where: {
        associationId: doc.associationId,
        type:          finalType,
        status:        DocumentOficialStatus.APPROVED,
        id:            { not: params.id },
      },
      data: { status: DocumentOficialStatus.ARCHIVED },
    });

    await prisma.documentOficial.update({
      where: { id: params.id },
      data: {
        type:       finalType,
        status:     DocumentOficialStatus.APPROVED,
        approvedBy: session.user.id,
        approvedAt: new Date(),
        notes:      parsed.data.notes,
      },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "REJECT") {
    await prisma.documentOficial.update({
      where: { id: params.id },
      data: {
        status:          DocumentOficialStatus.REJECTED,
        rejectionReason: parsed.data.rejectionReason,
      },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  const allowedToDelete: UserRole[] = [UserRole.UAT_OPERATOR, UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN];
  if (!allowedToDelete.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.documentOficial.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
