// src/app/(dashboard)/consultari/[id]/ExpressView.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";

interface Props {
  consultationId: string;
  ownershipId: string;
  options: string[];
  hasResponded: boolean;
  existingResponse: number | null;
}

export default function ExpressView({ consultationId, ownershipId, options, hasResponded, existingResponse }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<number | null>(existingResponse);
  const [submitted, setSubmitted] = useState(hasResponded);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (selected === null) { setError(t("consultations.selectOption")); return; }

    startTransition(async () => {
      const res = await fetch(`/api/consultari/${consultationId}/raspuns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownershipId, optionIndex: selected }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? t("common.error")); return; }
      setSubmitted(true);
      router.refresh();
    });
  }

  if (submitted) return null;

  return (
    <div className="card border-uat-200 bg-uat-50/30">
      <div className="card-body space-y-4">
        <h2 className="font-semibold text-slate-900">{t("consultations.expressView")}</h2>
        <div className="space-y-2">
          {options.map((opt, idx) => (
            <button key={idx} type="button" onClick={() => { setSelected(idx); setError(""); }}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all font-medium ${
                selected === idx
                  ? "border-uat-500 bg-uat-50 text-uat-800"
                  : "border-slate-200 bg-white text-slate-700 hover:border-uat-300"
              }`}>
              <span className={`inline-block w-5 h-5 rounded-full border-2 mr-3 align-middle ${
                selected === idx ? "border-uat-500 bg-uat-500" : "border-slate-300"
              }`} />
              {opt}
            </button>
          ))}
        </div>
        {error && <p className="text-red-500 text-sm">⚠ {error}</p>}
        <button type="button" onClick={handleSubmit} disabled={isPending || selected === null}
          className="btn-primary w-full">
          {isPending ? t("consultations.submitting") : t("consultations.confirmView")}
        </button>
        <p className="text-xs text-slate-400 text-center">{t("consultations.anonymous")}</p>
      </div>
    </div>
  );
}
