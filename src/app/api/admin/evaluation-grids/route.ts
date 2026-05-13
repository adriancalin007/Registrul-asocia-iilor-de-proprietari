// src/app/api/admin/evaluation-grids/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const ALLOWED = [UserRole.UAT_OPERATOR, UserRole.SUPER_ADMIN] as UserRole[];

const CreateSchema = z.object({
  versionLabel: z.string().min(1),
  description:  z.string().optional(),
  thresholds:   z.object({
    levels: z.array(z.object({ label: z.string(), minPercent: z.number().min(0).max(100) })).min(1),
  }).optional(),
  cloneFromGridId: z.string().optional(), // clone criteria from another grid
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED.includes(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const grids = await prisma.evaluationGrid.findMany({
    include: {
      criteria: { orderBy: { displayOrder: "asc" } },
      _count:   { select: { scores: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(grids);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED.includes(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { versionLabel, description, thresholds, cloneFromGridId } = parsed.data;

  const grid = await prisma.evaluationGrid.create({
    data: {
      versionLabel,
      description: description ?? null,
      isActive: false,
      thresholds: thresholds ?? {
        levels: [
          { label: "CONFORME",    minPercent: 80 },
          { label: "AVERTISMENT", minPercent: 60 },
          { label: "SOMATIE",     minPercent: 40 },
        ],
      },
      createdBy: session.user.id,
    },
  });

  // Optionally clone criteria from another grid
  if (cloneFromGridId) {
    const sourceCriteria = await prisma.evaluationCriterion.findMany({
      where: { gridId: cloneFromGridId },
      orderBy: { displayOrder: "asc" },
    });
    for (const c of sourceCriteria) {
      await prisma.evaluationCriterion.create({
        data: {
          gridId:       grid.id,
          number:       c.number,
          title:        c.title,
          description:  c.description,
          maxPoints:    c.maxPoints,
          isEliminator: c.isEliminator,
          isActive:     c.isActive,
          scoringBarem: c.scoringBarem as object,
          displayOrder: c.displayOrder,
        },
      });
    }
  }

  return NextResponse.json(grid, { status: 201 });
}
