// src/app/api/adeverinte/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, CertificateType, CertificateStatus, AuditAction } from "@prisma/client";
import { logAudit, getClientIp } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role !== UserRole.OWNER) {
    return NextResponse.json({ error: "Only owners can request certificates" }, { status: 403 });
  }

  const { type } = await req.json();

  if (!Object.values(CertificateType).includes(type as CertificateType)) {
    return NextResponse.json({ error: "Invalid certificate type" }, { status: 400 });
  }

  const ownership = await prisma.ownership.findFirst({
    where: { userId: session.user.id, isActive: true },
    include: { unit: { include: { building: true } } },
  });

  if (!ownership) {
    return NextResponse.json({ error: "No active ownership found" }, { status: 404 });
  }

  const associationId = ownership.unit.building.associationId;

  // Check for existing active request of the same type
  const existing = await prisma.certificate.findFirst({
    where: {
      ownershipId: ownership.id,
      type: type as CertificateType,
      status: { in: [CertificateStatus.REQUESTED, CertificateStatus.APPROVED] },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You already have an active request for this certificate type" },
      { status: 409 }
    );
  }

  const certificate = await prisma.certificate.create({
    data: {
      associationId,
      ownershipId: ownership.id,
      type: type as CertificateType,
      status: CertificateStatus.REQUESTED,
    },
  });

  await logAudit({
    userId: session.user.id,
    role,
    action: AuditAction.CREATE,
    resource: "Certificate",
    resourceId: certificate.id,
    associationId,
    certificateId: certificate.id,
    metadata: { type },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ success: true, id: certificate.id });
}
