import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  const isUAT = role === UserRole.UAT_OPERATOR || role === UserRole.SUPER_ADMIN;

  const thread = await prisma.comunicareThread.findUnique({
    where: { id: params.id },
    include: {
      association: { select: { id: true, name: true, neighborhood: true } },
      initiator: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { id: true, name: true, role: true } },
        },
      },
    },
  });

  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Non-UAT users can only see threads from their association
  if (!isUAT) {
    const cookieStore = cookies();
    const assocId = cookieStore.get("asociatie_activa")?.value ?? thread.associationId;
    if (thread.associationId !== assocId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json(thread);
}
