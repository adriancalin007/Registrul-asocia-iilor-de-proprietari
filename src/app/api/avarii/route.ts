// src/app/api/avarii/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, AuditAction } from "@prisma/client";
import { logAudit, getClientIp } from "@/lib/audit";
import { cookies } from "next/headers";

function genTicketNumber(): string {
  const d = new Date();
  return `AV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  const canReport = ([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.OWNER] as UserRole[]).includes(role);
  if (!canReport) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { category, location, description, priority } = await req.json();

  if (!category || !location || !description) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const cookieStore = cookies();
  let associationId = cookieStore.get("asociatie_activa")?.value;

  if (!associationId) {
    if (role === UserRole.OWNER) {
      const ownership = await prisma.ownership.findFirst({
        where: { userId: session.user.id, isActive: true },
        include: { unit: { include: { building: true } } },
      });
      associationId = ownership?.unit.building.associationId;
    } else {
      const mandate = await prisma.mandate.findFirst({
        where: { userId: session.user.id, isActive: true },
      });
      associationId = mandate?.associationId;
    }
  }

  if (!associationId) return NextResponse.json({ error: "No active association" }, { status: 400 });

  const issue = await prisma.issue.create({
    data: {
      associationId,
      ticketNumber: genTicketNumber(),
      category,
      location,
      description,
      status: "OPEN",
      reportedBy: session.user.id,
    },
  });

  await logAudit({
    userId: session.user.id,
    role,
    action: AuditAction.CREATE,
    resource: "Issue",
    resourceId: issue.id,
    associationId,
    issueId: issue.id,
    metadata: { category, location, priority },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ success: true, id: issue.id });
}
