// src/app/api/admin/evaluation-grids/[gridId]/criteria/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const ALLOWED = [UserRole.UAT_OPERATOR, UserRole.SUPER_ADMIN] as UserRole[];
interface Params { params: { gridId: string } }

const CriterionSchema = z.object({
  number:       z.number().int().positive(),
  title:        z.string().min(1),
  description:  z.string().optional(),
  maxPoints:    z.number().int().positive(),
  isEliminator: z.boolean().default(false),
  isActive:     z.boolean().default(true),
  displayOrder: z.number().int().default(0),
  scoringBarem: z.array(z.object({ points: z.number().int(), label: z.string() })).default([]),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED.includes(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const criteria = await prisma.evaluationCriterion.findMany({
    where:   { gridId: params.gridId },
    orderBy: { displayOrder: "asc" },
  });
  return NextResponse.json(criteria);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED.includes(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const grid = await prisma.evaluationGrid.findUnique({ where: { id: params.gridId } });
  if (!grid) return NextResponse.json({ error: "Grila nu există" }, { status: 404 });

  const parsed = CriterionSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  // Check for duplicate number in this grid
  const dup = await prisma.evaluationCriterion.findUnique({
    where: { gridId_number: { gridId: params.gridId, number: parsed.data.number } },
  });
  if (dup) return NextResponse.json({ error: `Criteriul #${parsed.data.number} există deja în această grilă.` }, { status: 409 });

  const criterion = await prisma.evaluationCriterion.create({
    data: { gridId: params.gridId, ...parsed.data },
  });
  return NextResponse.json(criterion, { status: 201 });
}
