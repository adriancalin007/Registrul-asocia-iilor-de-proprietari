// src/app/api/uat/associations/[id]/scores/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { calculateScore } from "@/lib/scoring";

const ALLOWED = [UserRole.UAT_OPERATOR, UserRole.SUPER_ADMIN] as UserRole[];
interface Params { params: { id: string } }

const ScoreItemSchema = z.object({
  criterionId:   z.string().min(1),
  pointsAwarded: z.number().int().min(0),
  notes:         z.string().optional(),
  evidenceUrl:   z.string().optional(),
});

const CreateScoreSchema = z.object({
  gridId:   z.string().min(1),
  isPublic: z.boolean().default(false),
  notes:    z.string().optional(),
  items:    z.array(ScoreItemSchema).min(1),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED.includes(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const scores = await prisma.associationScore.findMany({
    where:   { associationId: params.id },
    include: {
      grid:  { select: { versionLabel: true } },
      items: { include: { criterion: { select: { title: true, number: true, maxPoints: true, isEliminator: true } } } },
    },
    orderBy: { calculatedAt: "desc" },
  });
  return NextResponse.json(scores);
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED.includes(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const association = await prisma.association.findUnique({ where: { id: params.id } });
  if (!association) return NextResponse.json({ error: "Association not found" }, { status: 404 });

  const parsed = CreateScoreSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { gridId, isPublic, notes, items } = parsed.data;

  // Fetch criteria for this grid to validate + compute
  const criteria = await prisma.evaluationCriterion.findMany({
    where: { gridId, isActive: true },
  });
  const criteriaMap = new Map(criteria.map(c => [c.id, c]));

  for (const item of items) {
    const c = criteriaMap.get(item.criterionId);
    if (!c) return NextResponse.json({ error: `Criteriu necunoscut: ${item.criterionId}` }, { status: 400 });
    if (item.pointsAwarded > c.maxPoints) {
      return NextResponse.json({ error: `Punctaj depășit pentru criteriul "${c.title}": max ${c.maxPoints}` }, { status: 400 });
    }
  }

  const grid = await prisma.evaluationGrid.findUnique({ where: { id: gridId } });

  const scoreResult = calculateScore(
    items.map(i => {
      const c = criteriaMap.get(i.criterionId)!;
      return { criterionId: i.criterionId, pointsAwarded: i.pointsAwarded, maxPoints: c.maxPoints, isEliminator: c.isEliminator };
    }),
    grid?.thresholds,
  );

  const score = await prisma.associationScore.create({
    data: {
      associationId:       params.id,
      gridId,
      totalPoints:         scoreResult.totalPoints,
      maxPossible:         scoreResult.maxPossible,
      classification:      scoreResult.classification,
      hasMissingEliminator: scoreResult.hasMissingEliminator,
      isPublic,
      calculatedBy:        session.user.id,
      notes:               notes ?? null,
      items: {
        create: items.map(i => ({
          criterionId:   i.criterionId,
          pointsAwarded: i.pointsAwarded,
          notes:         i.notes ?? null,
          evidenceUrl:   i.evidenceUrl ?? null,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json({ ...score, ...scoreResult }, { status: 201 });
}
