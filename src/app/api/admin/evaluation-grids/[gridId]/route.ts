// src/app/api/admin/evaluation-grids/[gridId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const ALLOWED = [UserRole.UAT_OPERATOR, UserRole.SUPER_ADMIN] as UserRole[];
interface Params { params: { gridId: string } }

const PatchSchema = z.object({
  versionLabel: z.string().min(1).optional(),
  description:  z.string().nullable().optional(),
  thresholds:   z.object({
    levels: z.array(z.object({ label: z.string(), minPercent: z.number().min(0).max(100) })).min(1),
  }).optional(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED.includes(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const grid = await prisma.evaluationGrid.findUnique({
    where: { id: params.gridId },
    include: {
      criteria: { orderBy: { displayOrder: "asc" } },
      _count:   { select: { scores: true } },
    },
  });
  if (!grid) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(grid);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED.includes(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const updated = await prisma.evaluationGrid.update({
    where: { id: params.gridId },
    data: {
      ...(parsed.data.versionLabel !== undefined && { versionLabel: parsed.data.versionLabel }),
      ...(parsed.data.description  !== undefined && { description:  parsed.data.description }),
      ...(parsed.data.thresholds   !== undefined && { thresholds:   parsed.data.thresholds }),
    },
  });
  return NextResponse.json(updated);
}

// DELETE — only allowed if no scores reference this grid
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== UserRole.SUPER_ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const scoreCount = await prisma.associationScore.count({ where: { gridId: params.gridId } });
  if (scoreCount > 0) return NextResponse.json({ error: "Nu se poate șterge o grilă care are scoruri asociate." }, { status: 409 });

  await prisma.evaluationCriterion.deleteMany({ where: { gridId: params.gridId } });
  await prisma.evaluationGrid.delete({ where: { id: params.gridId } });
  return NextResponse.json({ success: true });
}
