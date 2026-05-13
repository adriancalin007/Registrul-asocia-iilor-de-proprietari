"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Association = { id: string; name: string; neighborhood: string | null };

export default function AssociationPicker({ associations }: { associations: Association[] }) {
  const router = useRouter();
  const [selecting, setSelecting] = useState<string | null>(null);

  async function select(id: string) {
    setSelecting(id);
    await fetch("/api/administrator/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ associationId: id }),
    });
    router.refresh();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <p className="section-label mb-1">Cont administrator</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Alegeți asociația</h1>
        <p className="text-sm text-slate-400 mt-1.5">
          Aveți mandate active la mai multe asociații. Selectați cu care doriți să lucrați.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {associations.map(assoc => (
          <button
            key={assoc.id}
            onClick={() => select(assoc.id)}
            disabled={!!selecting}
            className="card text-left p-6 hover:-translate-y-px hover:shadow-md transition-all flex flex-col gap-4 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-uat-400 focus:ring-offset-2"
          >
            <div
              className="w-12 h-12 rounded-2xl bg-uat-50 flex items-center justify-center flex-shrink-0"
              style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)" }}
            >
              <svg className="w-6 h-6 text-uat-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75" />
              </svg>
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 leading-snug">{assoc.name}</p>
              {assoc.neighborhood && (
                <p className="text-xs text-slate-400 mt-1">📍 {assoc.neighborhood}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              {selecting === assoc.id ? (
                <span className="text-xs text-uat-600 font-semibold">Se încarcă...</span>
              ) : (
                <span className="text-xs text-slate-400">Accesați →</span>
              )}
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400">
        Puteți schimba asociația oricând din bara laterală.
      </p>
    </div>
  );
}
