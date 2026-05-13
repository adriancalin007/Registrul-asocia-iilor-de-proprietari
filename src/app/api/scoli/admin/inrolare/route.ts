// src/app/api/scoli/admin/inrolare/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

function isAdmin(role: UserRole) {
  return role === UserRole.MANAGER || role === UserRole.BOARD_PRESIDENT
    || role === UserRole.UAT_OPERATOR || role === UserRole.SUPER_ADMIN;
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!isAdmin(role)) return NextResponse.json({ error: "Acces interzis" }, { status: 403 });

  const { inrolareId, action } = await req.json(); // action: "APPROVE" | "REJECT"
  if (!inrolareId || !["APPROVE", "REJECT"].includes(action)) {
    return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  }

  const updated = await prisma.inrolare.update({
    where: { id: inrolareId },
    data: {
      status: action === "APPROVE" ? "APPROVED" : "REJECTED",
      approvedAt: new Date(),
      approvedBy: session.user.id,
    },
  });

  return NextResponse.json(updated);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!isAdmin(role)) return NextResponse.json({ error: "Acces interzis" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const scoalaId = searchParams.get("scoalaId");
  const statusFilter = searchParams.get("status") ?? "PENDING";

  const inrolari = await prisma.inrolare.findMany({
    where: {
      status: statusFilter as "PENDING" | "APPROVED" | "REJECTED",
      ...(scoalaId ? { clasa: { scoalaId } } : {}),
    },
    include: {
      user: { select: { fullName: true, email: true } },
      clasa: {
        include: { scoala: { select: { id: true, name: true } } },
      },
    },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json(inrolari);
}
