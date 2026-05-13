// src/lib/scoring.ts
import { ScoreClassification } from "@prisma/client";

interface CriterionInput {
  criterionId: string;
  pointsAwarded: number;
  maxPoints: number;
  isEliminator: boolean;
}

interface ThresholdLevel {
  label: string;   // matches ScoreClassification key
  minPercent: number;
}

interface Thresholds {
  levels: ThresholdLevel[];
}

export interface ScoreResult {
  totalPoints: number;
  maxPossible: number;
  percentage: number;
  classification: ScoreClassification;
  hasMissingEliminator: boolean;
}

const DEFAULT_THRESHOLDS: ThresholdLevel[] = [
  { label: "CONFORME",    minPercent: 80 },
  { label: "AVERTISMENT", minPercent: 60 },
  { label: "SOMATIE",     minPercent: 40 },
];

function parseThresholds(raw: unknown): ThresholdLevel[] {
  try {
    const t = raw as Thresholds;
    if (Array.isArray(t?.levels) && t.levels.length > 0) return t.levels;
  } catch { /* ignore */ }
  return DEFAULT_THRESHOLDS;
}

export function calculateScore(
  items: CriterionInput[],
  thresholds?: unknown,
): ScoreResult {
  const total = items.reduce((sum, i) => sum + i.pointsAwarded, 0);
  const max   = items.reduce((sum, i) => sum + i.maxPoints,     0);

  const hasMissingEliminator = items.some(
    i => i.isEliminator && i.pointsAwarded === 0,
  );

  const percentage = max > 0 ? (total / max) * 100 : 0;

  let classification: ScoreClassification = "SANCTIUNE";

  if (!hasMissingEliminator) {
    const levels = parseThresholds(thresholds).sort(
      (a, b) => b.minPercent - a.minPercent,
    );
    for (const level of levels) {
      if (percentage >= level.minPercent) {
        classification = level.label as ScoreClassification;
        break;
      }
    }
  } else {
    // Missing eliminator: cap at AVERTISMENT regardless of score
    const levels = parseThresholds(thresholds).sort(
      (a, b) => b.minPercent - a.minPercent,
    );
    const natural = levels.find(l => percentage >= l.minPercent);
    const naturalClass = (natural?.label ?? "SANCTIUNE") as ScoreClassification;
    // Only cap downward: CONFORME → AVERTISMENT; AVERTISMENT/SOMATIE/SANCTIUNE → unchanged
    classification =
      naturalClass === "CONFORME" ? "AVERTISMENT" : naturalClass;
  }

  return { totalPoints: total, maxPossible: max, percentage, classification, hasMissingEliminator };
}

export const CLASSIFICATION_LABELS: Record<ScoreClassification, string> = {
  CONFORME:    "Conformă",
  AVERTISMENT: "Avertisment",
  SOMATIE:     "Somație",
  SANCTIUNE:   "Sancțiune contravențională",
};

export const CLASSIFICATION_BADGE: Record<ScoreClassification, string> = {
  CONFORME:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  AVERTISMENT: "bg-amber-50 text-amber-700 border-amber-200",
  SOMATIE:     "bg-orange-50 text-orange-700 border-orange-200",
  SANCTIUNE:   "bg-red-50 text-red-700 border-red-200",
};
