// src/app/api/admin/evaluation-grids/[gridId]/criteria/[criterionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const ALLOWED = [UserRole.UAT_OPERATOR, UserRole.SUPER_ADMIN] as UserRole[];
interface Params { params: { gridId: string; criterionId: string } }

const PatchSchema = z.object({
  title:        z.string().min(1).optional(),
  description:  z.string().nullable().optional(),
  maxPoints:    z.number().int().positive().optional(),
  isEliminator: z.boolean().optional(),
  isActive:     z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  scoringBarem: z.array(z.object({ points: z.number().int(), label: z.string() })).optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED.includes(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const criterion = await prisma.evaluationCriterion.findUnique({ where: { id: params.criterionId } });
  if (!criterion || criterion.gridId !== params.gridId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const updated = await prisma.evaluationCriterion.update({
    where: { id: params.criterionId },
    data:  parsed.data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== UserRole.SUPER_ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const criterion = await prisma.evaluationCriterion.findUnique({ where: { id: params.criterionId } });
  if (!criterion || criterion.gridId !== params.gridId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasScores = await prisma.scoreItem.count({ where: { criterionId: params.criterionId } });
  if (hasScores > 0) return NextResponse.json({ error: "Nu se poate șterge un criteriu cu scoruri înregistrate." }, { status: 409 });

  await prisma.evaluationCriterion.delete({ where: { id: params.criterionId } });
  return NextResponse.json({ success: true });
}
