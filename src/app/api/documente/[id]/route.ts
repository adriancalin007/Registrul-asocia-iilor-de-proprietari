// src/app/api/documente/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, DocumentStatus } from "@prisma/client";
import { z } from "zod";

const MANAGER_ROLES = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];

const PatchSchema = z.object({
  title:        z.string().min(2).optional(),
  category:     z.string().min(1).optional(),
  folder:       z.string().nullable().optional(),
  description:  z.string().nullable().optional(),
  fileUrl:      z.string().optional(),
  isPublic:     z.boolean().optional(),
  status:       z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  documentDate: z.string().nullable().optional(),
  expiresAt:    z.string().nullable().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doc = await prisma.document.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: "Document negăsit" }, { status: 404 });

  return NextResponse.json(doc);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!MANAGER_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const doc = await prisma.document.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: "Document negăsit" }, { status: 404 });

  const { documentDate, expiresAt, folder, status, ...rest } = parsed.data;

  const updated = await prisma.document.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(folder !== undefined && { folder: folder?.trim() || null }),
      ...(documentDate !== undefined && { documentDate: documentDate ? new Date(documentDate) : null }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      ...(status !== undefined && { status: status as DocumentStatus }),
    },
  });

  return NextResponse.json({ success: true, id: updated.id });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!MANAGER_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const doc = await prisma.document.findUnique({ where: { id: params.id } });
  if (!doc) return NextResponse.json({ error: "Document negăsit" }, { status: 404 });

  await prisma.document.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
