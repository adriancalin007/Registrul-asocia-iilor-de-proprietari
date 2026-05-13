"use client";
// src/app/(dashboard)/uat/associations/[id]/scoring/ScoringForm.tsx
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { CLASSIFICATION_LABELS, CLASSIFICATION_BADGE, calculateScore } from "@/lib/scoring";
import type { ScoreClassification } from "@prisma/client";

type BaremLevel = { points: number; label: string };

type Criterion = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  maxPoints: number;
  isEliminator: boolean;
  scoringBarem: BaremLevel[];
};

type Grid = {
  id: string;
  versionLabel: string;
  thresholds: unknown;
  criteria: Criterion[];
};

type ExistingScore = {
  id: string;
  calculatedAt: string;
  totalPoints: number;
  maxPossible: number;
  classification: ScoreClassification;
  hasMissingEliminator: boolean;
  isPublic: boolean;
  notes: string | null;
  grid: { versionLabel: string };
  items: { criterionId: string; pointsAwarded: number; criterion: { title: string; number: number } }[];
};

interface Props {
  associationId: string;
  associationName: string;
  grid: Grid;
  existingScores: ExistingScore[];
}

export default function ScoringForm({ associationId, associationName, grid, existingScores }: Props) {
  const router = useRouter();

  const initialPoints = useMemo(
    () => Object.fromEntries(grid.criteria.map(c => [c.id, 0])),
    [grid.criteria],
  );

  const [points, setPoints] = useState<Record<string, number>>(initialPoints);
  const [notes, setNotes]   = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [expandedScore, setExpandedScore] = useState<string | null>(null);

  const preview = useMemo(() =>
    calculateScore(
      grid.criteria.map(c => ({
        criterionId:   c.id,
        pointsAwarded: points[c.id] ?? 0,
        maxPoints:     c.maxPoints,
        isEliminator:  c.isEliminator,
      })),
      grid.thresholds,
    ),
  [points, grid]);

  function setPoint(criterionId: string, value: number, max: number) {
    setPoints(p => ({ ...p, [criterionId]: Math.max(0, Math.min(max, value)) }));
  }

  function fillFromBarem(criterionId: string, pts: number, max: number) {
    setPoint(criterionId, pts, max);
  }

  async function submit() {
    setSaving(true); setError(null);
    const items = grid.criteria.map(c => ({ criterionId: c.id, pointsAwarded: points[c.id] ?? 0 }));
    const res = await fetch(`/api/uat/associations/${associationId}/scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gridId: grid.id, isPublic, notes: notes.trim() || undefined, items }),
    });
    setSaving(false);
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Eroare la salvare"); return; }
    router.refresh();
    setPoints(initialPoints);
    setNotes("");
  }

  return (
    <div className="space-y-6">
      {/* Score history */}
      {existingScores.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">Evaluări anterioare</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {existingScores.map(s => {
              const badgeClass = CLASSIFICATION_BADGE[s.classification];
              const isExpanded = expandedScore === s.id;
              return (
                <div key={s.id}>
                  <button
                    onClick={() => setExpandedScore(isExpanded ? null : s.id)}
                    className="w-full flex items-center justify-between px-6 py-3 hover:bg-slate-50 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${badgeClass}`}>
                        {CLASSIFICATION_LABELS[s.classification]}
                      </span>
                      <span className="text-sm text-slate-700 font-medium">
                        {s.totalPoints}/{s.maxPossible} pt ({Math.round((s.totalPoints / s.maxPossible) * 100)}%)
                      </span>
                      {s.hasMissingEliminator && (
                        <span className="text-xs text-red-500 font-medium">⚠ criteriu eliminator neîndeplinit</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>{s.grid.versionLabel}</span>
                      {s.isPublic && <span className="text-emerald-600">public</span>}
                      <span>{new Date(s.calculatedAt).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span className="text-slate-300">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-4 space-y-1.5">
                      {s.notes && (
                        <p className="text-sm text-slate-500 italic mb-2">{s.notes}</p>
                      )}
                      {s.items.sort((a, b) => a.criterion.number - b.criterion.number).map(item => (
                        <div key={item.criterionId} className="flex items-center gap-2 text-sm">
                          <span className="text-slate-400 w-5 text-right flex-shrink-0">#{item.criterion.number}</span>
                          <span className="flex-1 text-slate-700 truncate">{item.criterion.title}</span>
                          <span className="font-medium text-slate-900 flex-shrink-0">{item.pointsAwarded} pt</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New scoring form */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Evaluare nouă</h2>
            <p className="text-xs text-slate-400 mt-0.5">Grilă: {grid.versionLabel}</p>
          </div>
          {/* Live preview badge */}
          <div className={`text-sm px-3 py-1.5 rounded-xl border font-semibold ${CLASSIFICATION_BADGE[preview.classification]}`}>
            {CLASSIFICATION_LABELS[preview.classification]}
            <span className="font-normal ml-2 opacity-75">
              {preview.totalPoints}/{preview.maxPossible} pt · {Math.round(preview.percentage)}%
            </span>
          </div>
        </div>

        {preview.hasMissingEliminator && (
          <div className="mx-6 mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            Un sau mai multe criterii eliminatorii nu sunt îndeplinite — clasificarea este limitată la cel mult Avertisment.
          </div>
        )}

        <div className="px-3 space-y-1 pb-4">
          {grid.criteria.map(c => {
            const barem = c.scoringBarem ?? [];
            const current = points[c.id] ?? 0;
            return (
              <div key={c.id} className="px-3 py-3 rounded-xl hover:bg-slate-50 group">
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-1.5 flex-shrink-0 mt-1">
                    <span className="text-xs font-bold text-slate-400 w-5 text-right">#{c.number}</span>
                    {c.isEliminator && (
                      <span title="Criteriu eliminator" className="text-xs bg-red-50 text-red-500 border border-red-100 px-1 py-0 rounded font-semibold leading-4">E</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">{c.title}</p>
                    {c.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{c.description}</p>
                    )}

                    {/* Barem quick-select */}
                    {barem.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {barem.sort((a, b) => b.points - a.points).map((b, i) => (
                          <button
                            key={i}
                            onClick={() => fillFromBarem(c.id, b.points, c.maxPoints)}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                              current === b.points
                                ? "bg-uat-600 text-white border-uat-600"
                                : "bg-white text-slate-600 border-slate-200 hover:border-uat-400 hover:text-uat-700"
                            }`}
                          >
                            {b.points} pt — {b.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Manual numeric input */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={c.maxPoints}
                      value={current}
                      onChange={e => setPoint(c.id, Number(e.target.value), c.maxPoints)}
                      className="input text-sm w-16 text-center"
                    />
                    <span className="text-xs text-slate-400">/{c.maxPoints}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-2 ml-10">
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        c.isEliminator && current === 0
                          ? "bg-red-400"
                          : current === c.maxPoints
                          ? "bg-emerald-400"
                          : "bg-uat-400"
                      }`}
                      style={{ width: `${c.maxPoints > 0 ? (current / c.maxPoints) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer: notes + options + submit */}
        <div className="border-t border-slate-100 px-6 py-4 space-y-3">
          <div>
            <label className="label-text">Note evaluare</label>
            <textarea
              className="input text-sm"
              rows={2}
              placeholder="Observații, mențiuni, documente verificate..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
            Publicare scor pe pagina publică a asociației
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              onClick={submit}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? "Se salvează..." : "Salvează evaluarea"}
            </button>
            <span className="text-xs text-slate-400">
              {associationName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
