import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";

async function resolveAssociationId(userId: string, role: UserRole, cookieAssocId: string | undefined) {
  if (cookieAssocId) return cookieAssocId;
  if (role === UserRole.OWNER) {
    const ownership = await prisma.ownership.findFirst({
      where: { userId, isActive: true },
      include: { unit: { include: { building: true } } },
    });
    return ownership?.unit.building.associationId ?? null;
  }
  const mandate = await prisma.mandate.findFirst({ where: { userId, isActive: true } });
  return mandate?.associationId ?? null;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  const isUAT = role === UserRole.UAT_OPERATOR || role === UserRole.SUPER_ADMIN;

  if (isUAT) {
    // UAT sees all threads across all associations
    const threads = await prisma.comunicareThread.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        association: { select: { id: true, name: true, neighborhood: true } },
        initiator: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { messages: true } },
      },
    });
    return NextResponse.json(threads);
  }

  const cookieStore = cookies();
  const associationId = await resolveAssociationId(
    session.user.id,
    role,
    cookieStore.get("asociatie_activa")?.value,
  );
  if (!associationId) return NextResponse.json({ error: "No active association" }, { status: 400 });

  const threads = await prisma.comunicareThread.findMany({
    where: { associationId },
    orderBy: { updatedAt: "desc" },
    include: {
      initiator: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
  });
  return NextResponse.json(threads);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  const allowed = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.OWNER] as UserRole[];
  if (!allowed.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { subject, body, attachmentUrl, attachmentName } = await req.json();
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
  }

  const cookieStore = cookies();
  const associationId = await resolveAssociationId(
    session.user.id,
    role,
    cookieStore.get("asociatie_activa")?.value,
  );
  if (!associationId) return NextResponse.json({ error: "No active association" }, { status: 400 });

  const thread = await prisma.comunicareThread.create({
    data: {
      associationId,
      initiatorId: session.user.id,
      subject: subject.trim(),
      messages: {
        create: {
          senderId: session.user.id,
          body: body.trim(),
          attachmentUrl: attachmentUrl ?? null,
          attachmentName: attachmentName ?? null,
          isFromUAT: false,
        },
      },
    },
  });

  return NextResponse.json({ id: thread.id }, { status: 201 });
}
