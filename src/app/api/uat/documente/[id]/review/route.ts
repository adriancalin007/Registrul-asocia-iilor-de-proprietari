// src/app/api/uat/documente/[id]/review/route.ts
// POST — operator approves or rejects a DRAFT document submitted by a manager.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, DocumentStatus } from "@prisma/client";
import { z } from "zod";

const ALLOWED = [UserRole.UAT_OPERATOR, UserRole.SUPER_ADMIN] as UserRole[];

const Schema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  notes:  z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED.includes(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const doc = await prisma.document.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: "Document negăsit" }, { status: 404 });
  if (doc.status !== DocumentStatus.DRAFT) return NextResponse.json({ error: "Documentul nu este în stare DRAFT" }, { status: 409 });

  const newStatus = parsed.data.action === "APPROVE" ? DocumentStatus.PUBLISHED : DocumentStatus.ARCHIVED;

  await prisma.$transaction([
    prisma.document.update({
      where: { id: params.id },
      data: { status: newStatus, isPublic: parsed.data.action === "APPROVE" },
    }),
    prisma.documentApproval.upsert({
      where: { documentId: params.id },
      create: {
        documentId: params.id,
        approvedBy:  session.user.id,
        status:      parsed.data.action,
        notes:       parsed.data.notes ?? null,
      },
      update: {
        approvedBy:  session.user.id,
        status:      parsed.data.action,
        notes:       parsed.data.notes ?? null,
        approvedAt:  new Date(),
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
