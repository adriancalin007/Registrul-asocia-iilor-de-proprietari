// src/app/api/uat/associations/[id]/review/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { logUATAudit } from "@/lib/audit";

interface Params { params: { id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { action, missingItems, rejectionReason } = await req.json();

  const association = await prisma.association.findUnique({ where: { id: params.id }, include: { uat: true } });
  if (!association) return NextResponse.json({ error: "Association not found" }, { status: 404 });

  const operator = await prisma.uATOperator.findUnique({ where: { userId: session.user.id } });
  const uatId = operator?.uatId ?? association.uatId;

  if (action === "START_REVIEW") {
    await prisma.association.update({ where: { id: params.id }, data: { status: "UNDER_REVIEW" } });
    await logUATAudit({ userId: session.user.id, uatId, action: "UPDATE", resource: "Association", resourceId: params.id, metadata: { action: "Started review" } });
    return NextResponse.json({ success: true });
  }

  if (action === "REQUEST_COMPLETION") {
    if (!missingItems?.trim()) return NextResponse.json({ error: "Please describe what is missing" }, { status: 400 });

    const existingRounds = await prisma.completionRound.count({ where: { associationId: params.id } });
    const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const round = await prisma.completionRound.create({
      data: {
        associationId: params.id,
        roundNumber: existingRounds + 1,
        requestedBy: session.user.id,
        missingItems,
        tokenExpiresAt,
      },
    });

    await prisma.association.update({ where: { id: params.id }, data: { status: "NEEDS_COMPLETION" } });

    const completionUrl = `${process.env.NEXTAUTH_URL}/complete-file/${round.completionToken}`;
    await logUATAudit({ userId: session.user.id, uatId, action: "UPDATE", resource: "Association", resourceId: params.id, metadata: { action: "Requested completion", round: round.roundNumber } });

    return NextResponse.json({ success: true, completionUrl, token: round.completionToken });
  }

  if (action === "VALIDATE") {
    const docs = association.registrationDocs as Record<string, unknown> ?? {};
    const president = docs.president as Record<string, string> | undefined;
    const administrator = docs.administrator as Record<string, string> | undefined;
    const cenzor = docs.cenzor as Record<string, string> | undefined;
    const committee = docs.executiveCommittee as Array<Record<string, string>> | undefined;

    const hasName = (p: Record<string, string> | undefined): boolean => {
      if (!p) return false;
      if (p.entityType === "company") return !!(p.companyName?.trim());
      return !!(p.firstName?.trim() || p.lastName?.trim());
    };

    const missing: string[] = [];
    if (!hasName(president)) missing.push("Președinte CA");
    if (!hasName(administrator)) missing.push("Administrator");
    if (!hasName(cenzor)) missing.push("Cenzor");
    if (!committee || committee.length < 2) missing.push("Minim 2 membri CEX");

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Nu se poate valida. Lipsesc: ${missing.join(", ")}.` },
        { status: 400 }
      );
    }

    await prisma.association.update({
      where: { id: params.id },
      data: { status: "ACTIVE", validatedAt: new Date(), validatedBy: session.user.id, rejectionReason: null },
    });
    await logUATAudit({ userId: session.user.id, uatId, action: "APPROVE", resource: "Association", resourceId: params.id, metadata: { name: association.name } });
    return NextResponse.json({ success: true });
  }

  if (action === "REJECT") {
    if (!rejectionReason?.trim()) return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
    await prisma.association.update({ where: { id: params.id }, data: { status: "REJECTED", rejectionReason } });
    await logUATAudit({ userId: session.user.id, uatId, action: "REJECT", resource: "Association", resourceId: params.id, metadata: { reason: rejectionReason } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
