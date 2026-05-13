// src/app/(dashboard)/uat/associations/[id]/scoring/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import ScoringForm from "./ScoringForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Evaluare conformitate | UAT" };

interface Props { params: { id: string } }

export default async function ScoringPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) redirect("/dashboard");

  const association = await prisma.association.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, address: true, status: true },
  });
  if (!association) notFound();

  const grid = await prisma.evaluationGrid.findFirst({
    where: { isActive: true },
    include: {
      criteria: {
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  const existingScores = await prisma.associationScore.findMany({
    where: { associationId: params.id },
    include: {
      grid:  { select: { versionLabel: true } },
      items: {
        include: { criterion: { select: { title: true, number: true } } },
      },
    },
    orderBy: { calculatedAt: "desc" },
    take: 10,
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/uat" className="hover:text-slate-600">Panou UAT</Link>
        <span>›</span>
        <Link href="/uat/associations" className="hover:text-slate-600">Asociații</Link>
        <span>›</span>
        <Link href={`/uat/associations/${params.id}`} className="hover:text-slate-600 truncate max-w-[200px]">
          {association.name}
        </Link>
        <span>›</span>
        <span className="text-slate-700">Evaluare conformitate</span>
      </div>

      <div>
        <h1 className="page-title">Evaluare conformitate</h1>
        <p className="page-subtitle">{association.name}{association.address ? ` · ${association.address}` : ""}</p>
      </div>

      {!grid ? (
        <div className="card p-8 text-center text-slate-400">
          <p className="font-medium text-slate-600 mb-1">Nicio grilă de evaluare activă</p>
          <p className="text-sm">Activați o grilă din{" "}
            <Link href="/uat/evaluation-grid" className="text-uat-600 hover:underline">
              secțiunea Grilă evaluare
            </Link>.
          </p>
        </div>
      ) : (
        <ScoringForm
          associationId={association.id}
          associationName={association.name}
          grid={{
            id:           grid.id,
            versionLabel: grid.versionLabel,
            thresholds:   grid.thresholds,
            criteria:     grid.criteria.map(c => ({
              id:           c.id,
              number:       c.number,
              title:        c.title,
              description:  c.description,
              maxPoints:    c.maxPoints,
              isEliminator: c.isEliminator,
              scoringBarem: (c.scoringBarem as { points: number; label: string }[] | null) ?? [],
            })),
          }}
          existingScores={existingScores.map(s => ({
            id:                  s.id,
            calculatedAt:        s.calculatedAt.toISOString(),
            totalPoints:         s.totalPoints,
            maxPossible:         s.maxPossible,
            classification:      s.classification,
            hasMissingEliminator: s.hasMissingEliminator,
            isPublic:            s.isPublic,
            notes:               s.notes,
            grid:                s.grid,
            items:               s.items.map(i => ({
              criterionId:   i.criterionId,
              pointsAwarded: i.pointsAwarded,
              criterion:     i.criterion,
            })),
          }))}
        />
      )}
    </div>
  );
}
