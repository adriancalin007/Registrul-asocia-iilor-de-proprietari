// src/app/asociatii/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import { AssociationStatus } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CLASSIFICATION_LABELS, CLASSIFICATION_BADGE } from "@/lib/scoring";
import type { ScoreClassification } from "@prisma/client";
import DepunereActeModal from "./DepunereActeModal";
import type { Metadata } from "next";

const PUBLIC_STATUSES: AssociationStatus[] = [
  AssociationStatus.ACTIVE,
  AssociationStatus.OFFICIAL_REGISTRY,
];

interface Props { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await prisma.association.findFirst({
    where: { id: params.id, status: { in: PUBLIC_STATUSES } },
    select: { name: true },
  });
  return { title: a ? `${a.name} | Sector 1` : "Asociație" };
}

export default async function AsociatiePage({ params }: Props) {
  const association = await prisma.association.findFirst({
    where: { id: params.id, status: { in: PUBLIC_STATUSES } },
    select: {
      id:            true,
      name:          true,
      status:        true,
      address:       true,
      rawAddress:    true,
      neighborhood:  true,
      fiscalCode:    true,
      registrationNumber: true,
      courtDossierNumber: true,
      registrationYear:   true,
      scores: {
        where:   { isPublic: true },
        orderBy: { calculatedAt: "desc" },
        take:    5,
        select: {
          totalPoints:         true,
          maxPossible:         true,
          classification:      true,
          hasMissingEliminator: true,
          calculatedAt:        true,
          notes:               true,
          grid: { select: { versionLabel: true } },
        },
      },
      _count: { select: { buildings: true } },
    },
  });

  if (!association) notFound();

  const displayAddress = association.rawAddress ?? association.address;
  const latestScore = association.scores[0] ?? null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
            <Link href="/asociatii" className="hover:text-slate-600">Asociații</Link>
            <span>›</span>
            <span className="text-slate-700 truncate">{association.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{association.name}</h1>
          {displayAddress && <p className="text-slate-500">{displayAddress}</p>}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Identity card */}
        <div className="card card-body">
          <h2 className="font-semibold text-slate-900 mb-4">Date de identificare</h2>
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            {association.fiscalCode && (
              <>
                <dt className="text-slate-400">Cod fiscal</dt>
                <dd className="font-medium text-slate-900">{association.fiscalCode}</dd>
              </>
            )}
            {association.registrationNumber && (
              <>
                <dt className="text-slate-400">Nr. înregistrare</dt>
                <dd className="font-medium text-slate-900">{association.registrationNumber}</dd>
              </>
            )}
            {association.courtDossierNumber && (
              <>
                <dt className="text-slate-400">Nr. dosar judecătorie</dt>
                <dd className="font-medium text-slate-900">{association.courtDossierNumber}</dd>
              </>
            )}
            {association.registrationYear && (
              <>
                <dt className="text-slate-400">An înregistrare</dt>
                <dd className="font-medium text-slate-900">{association.registrationYear}</dd>
              </>
            )}
            {association.neighborhood && (
              <>
                <dt className="text-slate-400">Cartier</dt>
                <dd className="font-medium text-slate-900">{association.neighborhood}</dd>
              </>
            )}
          </dl>
        </div>

        {/* Latest score */}
        {latestScore && (
          <div className="card card-body">
            <h2 className="font-semibold text-slate-900 mb-3">Conformitate</h2>
            <div className="flex items-center gap-4 mb-3">
              <span className={`text-base px-4 py-1.5 rounded-full border font-semibold ${CLASSIFICATION_BADGE[latestScore.classification as ScoreClassification]}`}>
                {CLASSIFICATION_LABELS[latestScore.classification as ScoreClassification]}
              </span>
              <div>
                <p className="text-lg font-bold text-slate-900">
                  {latestScore.totalPoints}/{latestScore.maxPossible} puncte
                  <span className="text-sm font-normal text-slate-400 ml-2">
                    ({Math.round((latestScore.totalPoints / latestScore.maxPossible) * 100)}%)
                  </span>
                </p>
                <p className="text-xs text-slate-400">
                  {latestScore.grid.versionLabel} ·{" "}
                  {new Date(latestScore.calculatedAt).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
            {latestScore.hasMissingEliminator && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠ Un sau mai multe criterii eliminatorii nu sunt îndeplinite.
              </p>
            )}
            {latestScore.notes && (
              <p className="text-sm text-slate-500 italic mt-2">{latestScore.notes}</p>
            )}

            {/* Score history */}
            {association.scores.length > 1 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Istoric evaluări</p>
                <div className="space-y-1.5">
                  {association.scores.slice(1).map((s, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CLASSIFICATION_BADGE[s.classification as ScoreClassification]}`}>
                        {CLASSIFICATION_LABELS[s.classification as ScoreClassification]}
                      </span>
                      <span className="text-slate-500">{s.totalPoints}/{s.maxPossible} pt</span>
                      <span className="text-slate-400 text-xs">
                        {new Date(s.calculatedAt).toLocaleDateString("ro-RO")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="card p-6 bg-uat-50 border-uat-200">
          <h2 className="font-semibold text-uat-900 mb-1">Actualizați dosarul asociației</h2>
          <p className="text-sm text-uat-700 mb-4">
            Dacă reprezentați această asociație, puteți depune documentele necesare pentru evaluare sau actualizare.
          </p>
          <DepunereActeModal associationId={association.id} associationName={association.name} />
        </div>
      </div>
    </div>
  );
}
