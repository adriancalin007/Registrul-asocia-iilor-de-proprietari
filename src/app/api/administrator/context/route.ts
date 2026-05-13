// src/app/api/administrator/context/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, AuditAction } from "@prisma/client";
import { logAudit, getClientIp } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  const canSwitch = ([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[]).includes(role);
  if (!canSwitch) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { associationId } = await req.json();
  if (!associationId) return NextResponse.json({ error: "associationId required" }, { status: 400 });

  if (role !== UserRole.SUPER_ADMIN) {
    const mandate = await prisma.mandate.findFirst({
      where: { userId: session.user.id, associationId, isActive: true },
    });
    if (!mandate) return NextResponse.json({ error: "No active mandate" }, { status: 403 });
  }

  const association = await prisma.association.findUnique({ where: { id: associationId } });
  if (!association || association.status !== "ACTIVE") {
    return NextResponse.json({ error: "Association is not active" }, { status: 400 });
  }

  await logAudit({
    userId: session.user.id,
    role,
    action: AuditAction.CONTEXT_SWITCH,
    resource: "Association",
    resourceId: associationId,
    associationId,
    metadata: { name: association.name },
    ipAddress: getClientIp(req),
  });

  const response = NextResponse.json({ success: true, association: association.name });
  response.cookies.set("asociatie_activa", associationId, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 8 * 60 * 60,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("asociatie_activa");
  return response;
}
