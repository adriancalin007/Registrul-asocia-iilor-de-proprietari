// src/app/(dashboard)/consultari/[id]/ExprimaVot.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  consultareId: string;
  proprietateId: string;
  optiuni: string[];
  aRaspuns: boolean;
  raspunsExistent: number | null;
}

export default function ExprimaVot({ consultareId, proprietateId, optiuni, aRaspuns, raspunsExistent }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectat, setSelectat] = useState<number | null>(raspunsExistent);
  const [trimis, setTrimis] = useState(aRaspuns);
  const [eroare, setEroare] = useState("");

  async function handleSubmit() {
    if (selectat === null) { setEroare("Selectați o opțiune"); return; }

    startTransition(async () => {
      const res = await fetch(`/api/consultari/${consultareId}/raspuns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proprietateId, optiuneIndex: selectat }),
      });
      const data = await res.json();
      if (!res.ok) { setEroare(data.eroare ?? "Eroare."); return; }
      setTrimis(true);
      router.refresh();
    });
  }

  if (trimis) return null;

  return (
    <div className="card border-uat-200 bg-uat-50/30">
      <div className="card-body space-y-4">
        <h2 className="font-semibold text-slate-900">Exprimați punctul de vedere</h2>
        <div className="space-y-2">
          {optiuni.map((opt, idx) => (
            <button key={idx} type="button" onClick={() => { setSelectat(idx); setEroare(""); }}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all font-medium ${
                selectat === idx
                  ? "border-uat-500 bg-uat-50 text-uat-800"
                  : "border-slate-200 bg-white text-slate-700 hover:border-uat-300"
              }`}>
              <span className={`inline-block w-5 h-5 rounded-full border-2 mr-3 align-middle ${
                selectat === idx ? "border-uat-500 bg-uat-500" : "border-slate-300"
              }`} />
              {opt}
            </button>
          ))}
        </div>
        {eroare && <p className="text-red-500 text-sm">⚠ {eroare}</p>}
        <button type="button" onClick={handleSubmit} disabled={isPending || selectat === null}
          className="btn-primary w-full">
          {isPending ? "Se trimite..." : "Confirmă punctul de vedere"}
        </button>
        <p className="text-xs text-slate-400 text-center">
          Răspunsul dvs. este confidențial. În raportul agregat apare anonim.
        </p>
      </div>
    </div>
  );
}
