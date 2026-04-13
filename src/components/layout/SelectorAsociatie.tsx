// src/components/layout/SelectorAsociatie.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Asociatie {
  id: string;
  denumire: string;
  adresa: string;
  nrAvarii: number;
}

interface Props {
  asociatii: Asociatie[];
  contextActiv: string | null;
}

export default function SelectorAsociatie({ asociatii, contextActiv }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deschis, setDeschis] = useState(false);

  const asociatieActiva = asociatii.find((a) => a.id === contextActiv);

  async function selecteaza(asociatieId: string) {
    if (asociatieId === contextActiv) { setDeschis(false); return; }
    startTransition(async () => {
      await fetch("/api/administrator/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asociatieId }),
      });
      setDeschis(false);
      router.refresh();
    });
  }

  if (asociatii.length === 1) {
    return (
      <div className="px-5 py-3 bg-uat-50 border-b border-uat-100">
        <p className="text-xs text-uat-500 font-medium uppercase tracking-wide">Context activ</p>
        <p className="text-sm font-semibold text-uat-800 truncate">{asociatii[0].denumire}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setDeschis(!deschis)}
        className="w-full px-5 py-3 bg-uat-50 border-b border-uat-100 text-left hover:bg-uat-100 transition-colors"
      >
        <p className="text-xs text-uat-500 font-medium uppercase tracking-wide flex items-center justify-between">
          <span>Context activ</span>
          <svg className={`w-3 h-3 transition-transform ${deschis ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </p>
        <p className="text-sm font-semibold text-uat-800 truncate mt-0.5">
          {asociatieActiva?.denumire ?? "— Selectați asociația —"}
        </p>
        {isPending && <p className="text-xs text-uat-400 mt-0.5">Se schimbă contextul...</p>}
      </button>

      {deschis && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setDeschis(false)} />
          <div className="absolute left-0 right-0 top-full bg-white border border-slate-200 shadow-xl z-20 max-h-80 overflow-y-auto">
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-xs text-slate-400 font-medium">{asociatii.length} asociații administrate</p>
            </div>
            {asociatii.map((a) => (
              <button key={a.id} type="button" onClick={() => selecteaza(a.id)} disabled={isPending}
                className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${a.id === contextActiv ? "bg-uat-50" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${a.id === contextActiv ? "text-uat-700" : "text-slate-900"}`}>
                      {a.id === contextActiv && "✓ "}{a.denumire}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{a.adresa}</p>
                  </div>
                  {a.nrAvarii > 0 && (
                    <span className="badge badge-eroare text-xs flex-shrink-0">{a.nrAvarii} avarii</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
