"use client";
// Client card for manager multi-association dashboard.
// On click, sets the active association via the context API then refreshes.

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Props = {
  id: string;
  name: string;
  neighborhood: string | null;
  isActive: boolean;
  avariiOpen: number;
  sesizariOpen: number;
};

export default function AssociationCard({ id, name, neighborhood, isActive, avariiOpen, sesizariOpen }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function activate() {
    if (isActive) return;
    const res = await fetch("/api/administrator/context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ associationId: id }),
    });
    if (res.ok) startTransition(() => router.push("/asociatia-mea"));
  }

  const hasAlerts = avariiOpen > 0 || sesizariOpen > 0;

  return (
    <button
      onClick={activate}
      disabled={pending}
      className={`w-full text-left rounded-2xl border p-5 transition-all duration-150 ${
        isActive
          ? "bg-uat-50 border-uat-200 shadow-sm ring-1 ring-uat-300/40"
          : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-md hover:-translate-y-px"
      } ${pending ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900 truncate">{name}</p>
            {isActive && (
              <span className="text-[10px] font-bold bg-uat-600 text-white px-1.5 py-0.5 rounded-full leading-none">
                ACTIV
              </span>
            )}
          </div>
          {neighborhood && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">📍 {neighborhood}</p>
          )}
        </div>
        {hasAlerts && (
          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500 mt-1.5" />
        )}
      </div>

      <div className="flex items-center gap-3">
        {avariiOpen > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-full">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {avariiOpen} {avariiOpen === 1 ? "avarie" : "avarii"}
          </span>
        )}
        {sesizariOpen > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            {sesizariOpen} {sesizariOpen === 1 ? "sesizare" : "sesizări"}
          </span>
        )}
        {!hasAlerts && (
          <span className="text-xs text-emerald-600 font-medium">✓ Fără alerte</span>
        )}
      </div>
    </button>
  );
}
