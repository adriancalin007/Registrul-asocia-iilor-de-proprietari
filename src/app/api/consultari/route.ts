// src/app/api/consultari/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, ConsultationStatus, AuditAction } from "@prisma/client";
import { logAudit, getClientIp } from "@/lib/audit";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  const canInitiate = ([UserRole.BOARD_PRESIDENT, UserRole.MANAGER, UserRole.SUPER_ADMIN] as UserRole[]).includes(role);
  if (!canInitiate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { title, description, options, startsAt, expiresAt } = await req.json();

  if (!title || !options || options.length < 2 || !expiresAt) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const cookieStore = cookies();
  let associationId = cookieStore.get("asociatie_activa")?.value;
  if (!associationId) {
    const mandate = await prisma.mandate.findFirst({ where: { userId: session.user.id, isActive: true } });
    associationId = mandate?.associationId;
  }
  if (!associationId) return NextResponse.json({ error: "No active association" }, { status: 400 });

  const consultation = await prisma.consultation.create({
    data: {
      associationId,
      title,
      description,
      options,
      status: ConsultationStatus.ACTIVE,
      startsAt: new Date(startsAt),
      expiresAt: new Date(expiresAt),
      initiatedBy: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    role,
    action: AuditAction.CREATE,
    resource: "Consultation",
    resourceId: consultation.id,
    associationId,
    consultationId: consultation.id,
    metadata: { title },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ success: true, id: consultation.id });
}
