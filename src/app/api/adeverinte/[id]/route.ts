// src/app/api/adeverinte/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, CertificateStatus, AuditAction } from "@prisma/client";
import { logAudit, getClientIp } from "@/lib/audit";

interface Params { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  const canManage = ([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[]).includes(role);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { action, notes } = await req.json();

  if (!["APPROVE", "REJECT", "ISSUE"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const certificate = await prisma.certificate.findUnique({ where: { id: params.id } });
  if (!certificate) return NextResponse.json({ error: "Certificate not found" }, { status: 404 });

  let newStatus: CertificateStatus;
  let pdfUrl: string | undefined;

  if (action === "APPROVE") {
    newStatus = CertificateStatus.APPROVED;
  } else if (action === "REJECT") {
    if (!notes?.trim()) {
      return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
    }
    newStatus = CertificateStatus.REJECTED;
  } else {
    newStatus = CertificateStatus.ISSUED;
    pdfUrl = `/adeverinte/${certificate.id}/pdf`;
  }

  await prisma.certificate.update({
    where: { id: params.id },
    data: {
      status: newStatus,
      notes: notes ?? null,
      approvedBy: session.user.id,
      issuedAt: action === "ISSUE" ? new Date() : null,
      expiresAt: action === "ISSUE"
        ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
        : null,
      pdfUrl: pdfUrl ?? null,
    },
  });

  await logAudit({
    userId: session.user.id,
    role,
    action: action === "REJECT" ? AuditAction.REJECT : AuditAction.APPROVE,
    resource: "Certificate",
    resourceId: certificate.id,
    associationId: certificate.associationId,
    certificateId: certificate.id,
    metadata: { action, type: certificate.type, notes },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ success: true, status: newStatus });
}
