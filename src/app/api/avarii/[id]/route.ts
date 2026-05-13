// src/app/api/avarii/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, IssueStatus, AuditAction } from "@prisma/client";
import { logAudit, getClientIp } from "@/lib/audit";

interface Params { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  const canManage = ([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[]).includes(role);
  if (!canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { newStatus, notes, completionUrl } = await req.json();

  if (!Object.values(IssueStatus).includes(newStatus as IssueStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const issue = await prisma.issue.findUnique({ where: { id: params.id } });
  if (!issue) return NextResponse.json({ error: "Issue not found" }, { status: 404 });

  await prisma.issueStatusHistory.create({
    data: {
      issueId: issue.id,
      fromStatus: issue.status,
      toStatus: newStatus as IssueStatus,
      notes: notes || null,
      changedBy: session.user.id,
    },
  });

  await prisma.issue.update({
    where: { id: params.id },
    data: {
      status: newStatus as IssueStatus,
      completionReport: completionUrl || null,
      closedAt: newStatus === IssueStatus.CLOSED ? new Date() : null,
    },
  });

  await logAudit({
    userId: session.user.id,
    role,
    action: AuditAction.UPDATE,
    resource: "Issue",
    resourceId: issue.id,
    associationId: issue.associationId,
    issueId: issue.id,
    metadata: { fromStatus: issue.status, toStatus: newStatus, notes },
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ success: true });
}
