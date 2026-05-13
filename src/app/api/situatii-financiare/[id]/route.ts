import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, SituatieFinanciaraStatus } from "@prisma/client";
import { z } from "zod";

interface Params { params: { id: string } }

const UAT_ROLES: UserRole[] = [UserRole.UAT_OPERATOR, UserRole.SUPER_ADMIN];
const SUBMIT_ROLES: UserRole[] = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN];

const PatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("SUBMIT"),
    notes:  z.string().optional(),
  }),
  z.object({
    action: z.literal("APPROVE"),
    notes:  z.string().optional(),
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
  const doc = await prisma.situatieFinanciara.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { action } = parsed.data;

  if (action === "SUBMIT") {
    if (!SUBMIT_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (doc.status !== SituatieFinanciaraStatus.DRAFT && doc.status !== SituatieFinanciaraStatus.REJECTED) {
      return NextResponse.json({ error: "Documentul nu mai poate fi trimis" }, { status: 400 });
    }
    await prisma.situatieFinanciara.update({
      where: { id: params.id },
      data: {
        status:      SituatieFinanciaraStatus.SUBMITTED,
        submittedAt: new Date(),
        submittedBy: session.user.id,
        notes:       parsed.data.notes,
      },
    });

    // Notify UAT operators
    const assoc = await prisma.association.findUnique({ where: { id: doc.associationId }, select: { uatId: true, name: true } });
    if (assoc) {
      const operators = await prisma.uATOperator.findMany({
        where: { uatId: assoc.uatId },
        select: { userId: true },
      });
      await prisma.notification.createMany({
        data: operators.map(op => ({
          recipientId:   op.userId,
          associationId: doc.associationId,
          channel:       "IN_APP" as const,
          title:         "Situație financiară nouă",
          body:          `Asociația ${assoc.name} a depus o situație financiară pentru verificare.`,
        })),
      });
    }
    return NextResponse.json({ success: true });
  }

  if (action === "APPROVE") {
    if (!UAT_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (doc.status !== SituatieFinanciaraStatus.SUBMITTED) {
      return NextResponse.json({ error: "Documentul nu este în așteptare" }, { status: 400 });
    }
    await prisma.situatieFinanciara.update({
      where: { id: params.id },
      data: {
        status:     SituatieFinanciaraStatus.ACCEPTED,
        approvedBy: session.user.id,
        approvedAt: new Date(),
        notes:      parsed.data.notes,
      },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "REJECT") {
    if (!UAT_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (doc.status !== SituatieFinanciaraStatus.SUBMITTED) {
      return NextResponse.json({ error: "Documentul nu este în așteptare" }, { status: 400 });
    }
    await prisma.situatieFinanciara.update({
      where: { id: params.id },
      data: {
        status:          SituatieFinanciaraStatus.REJECTED,
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
  const allowed: UserRole[] = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.UAT_OPERATOR, UserRole.SUPER_ADMIN];
  if (!allowed.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const doc = await prisma.situatieFinanciara.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (doc.status === SituatieFinanciaraStatus.ACCEPTED && !([UserRole.UAT_OPERATOR, UserRole.SUPER_ADMIN] as UserRole[]).includes(role)) {
    return NextResponse.json({ error: "Nu poți șterge un document acceptat" }, { status: 403 });
  }

  await prisma.situatieFinanciara.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
