// src/components/layout/ContextAsociatie.tsx
"use client";

import { useRouter, useTransition } from "react";
import { useState } from "react";

interface Props {
  denumire: string;
  asociatieId: string;
}

export default function ContextAsociatie({ denumire, asociatieId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirma, setConfirma] = useState(false);

  function handleSchimbare() {
    startTransition(async () => {
      // Ștergem contextul activ — redirecționăm la selector
      await fetch("/api/administrator/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asociatieId: "__clear__" }),
      });
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="px-3 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-400 mb-1">Context activ</p>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0 animate-pulse" />
        <p className="text-xs font-medium text-slate-700 truncate flex-1" title={denumire}>
          {denumire}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setConfirma(true)}
        className="text-xs text-uat-500 hover:text-uat-700 mt-1 transition-colors"
      >
        Schimbă asociația →
      </button>

      {/* Dialog confirmare schimbare context */}
      {confirma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="font-semibold text-slate-900 mb-2">Schimbare context</h3>
            <p className="text-sm text-slate-600 mb-4">
              Veți ieși din contextul <strong>{denumire}</strong> și veți fi redirecționat
              la selectorul de asociații. Acțiunea va fi înregistrată în jurnal.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSchimbare}
                disabled={isPending}
                className="btn-primary flex-1"
              >
                {isPending ? "Se schimbă..." : "Confirmă"}
              </button>
              <button
                type="button"
                onClick={() => setConfirma(false)}
                className="btn-secondary flex-1"
              >
                Anulează
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
