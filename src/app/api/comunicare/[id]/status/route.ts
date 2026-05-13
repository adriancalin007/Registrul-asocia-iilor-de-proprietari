import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, ComunicareStatus } from "@prisma/client";

const VALID_STATUSES: ComunicareStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  const isUAT = role === UserRole.UAT_OPERATOR || role === UserRole.SUPER_ADMIN;
  if (!isUAT) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { status } = await req.json();
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const thread = await prisma.comunicareThread.findUnique({ where: { id: params.id } });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.comunicareThread.update({
    where: { id: params.id },
    data: { status },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
