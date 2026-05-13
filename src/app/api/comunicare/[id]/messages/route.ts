import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  const isUAT = role === UserRole.UAT_OPERATOR || role === UserRole.SUPER_ADMIN;
  const isMember = ([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.OWNER] as UserRole[]).includes(role);

  if (!isUAT && !isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const thread = await prisma.comunicareThread.findUnique({ where: { id: params.id } });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (thread.status === "CLOSED") {
    return NextResponse.json({ error: "Această conversație este închisă" }, { status: 409 });
  }

  // Non-UAT: verify association ownership
  if (!isUAT) {
    const cookieStore = cookies();
    const assocId = cookieStore.get("asociatie_activa")?.value ?? thread.associationId;
    if (thread.associationId !== assocId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { body, attachmentUrl, attachmentName } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Body is required" }, { status: 400 });

  const [message] = await prisma.$transaction([
    prisma.comunicareMessage.create({
      data: {
        threadId: params.id,
        senderId: session.user.id,
        body: body.trim(),
        attachmentUrl: attachmentUrl ?? null,
        attachmentName: attachmentName ?? null,
        isFromUAT: isUAT,
      },
    }),
    prisma.comunicareThread.update({
      where: { id: params.id },
      data: {
        updatedAt: new Date(),
        status: isUAT && thread.status === "OPEN" ? "IN_PROGRESS" : undefined,
      },
    }),
  ]);

  return NextResponse.json(message, { status: 201 });
}
