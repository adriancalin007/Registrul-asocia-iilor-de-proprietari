"use client";
// src/components/layout/AssociationSwitcher.tsx
// Dropdown for managers/board-presidents with multiple association mandates

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type AssocOption = { id: string; name: string; neighborhood: string | null };

export default function AssociationSwitcher({
  associations,
  activeId,
}: {
  associations: AssocOption[];
  activeId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const active = associations.find(a => a.id === activeId) ?? associations[0] ?? null;

  if (associations.length <= 1) {
    // Single association — just show the name, no switcher needed
    return (
      <div className="mx-3 mb-3 px-3 py-2.5 rounded-xl bg-uat-50 border border-uat-100">
        <p className="text-xs text-uat-500 font-medium uppercase tracking-wide leading-none mb-1">Asociație activă</p>
        <p className="text-sm font-semibold text-uat-900 leading-snug truncate" title={active?.name ?? ""}>{active?.name ?? "—"}</p>
        {active?.neighborhood && <p className="text-xs text-uat-400 mt-0.5 truncate" title={active.neighborhood}>{active.neighborhood}</p>}
      </div>
    );
  }

  async function switchTo(id: string) {
    setOpen(false);
    if (id === activeId) return;
    const res = await fetch("/api/administrator/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ associationId: id }),
    });
    if (res.ok) {
      startTransition(() => router.refresh());
    }
  }

  return (
    <div className="mx-3 mb-3 relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2.5 rounded-xl bg-uat-50 border border-uat-100 hover:border-uat-300 transition-colors text-left"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-uat-500 font-medium uppercase tracking-wide leading-none mb-1">
              {pending ? "Se schimbă…" : "Asociație activă"}
            </p>
            <p className="text-sm font-semibold text-uat-900 leading-snug truncate" title={active?.name ?? ""}>{active?.name ?? "—"}</p>
            {active?.neighborhood && <p className="text-xs text-uat-400 mt-0.5 truncate" title={active.neighborhood}>{active.neighborhood}</p>}
          </div>
          <svg
            className={`w-4 h-4 text-uat-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 overflow-hidden">
            {associations.map(a => (
              <button
                key={a.id}
                onClick={() => switchTo(a.id)}
                className={`w-full text-left px-4 py-2.5 hover:bg-uat-50 transition-colors ${a.id === activeId ? "bg-uat-50" : ""}`}
              >
                <p className={`text-sm font-medium truncate ${a.id === activeId ? "text-uat-700" : "text-slate-700"}`} title={a.name}>
                  {a.id === activeId && <span className="mr-1">✓</span>}
                  {a.name}
                </p>
                {a.neighborhood && <p className="text-xs text-slate-400 mt-0.5">{a.neighborhood}</p>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
