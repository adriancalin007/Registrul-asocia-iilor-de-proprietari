"use client";
// src/app/(dashboard)/dashboard/ServicePanel.tsx
//
// Reusable 4-state panel for inline civic services.
// States: idle → loading → success | error

import { useState, ReactNode } from "react";

export type PanelState = "idle" | "loading" | "success" | "error";

interface ServicePanelProps {
  /** Panel title (e.g. "CNAS — Asigurare") */
  title: string;
  /** Short description shown in idle state */
  description: string;
  /** Icon (emoji or small element) */
  icon: ReactNode;
  /** Label on the action button (idle state) */
  actionLabel: string;
  /** Called when user clicks the action button — returns data or throws */
  onFetch: () => Promise<{ success: boolean; data: unknown; fallbackUrl: string; userMessage?: string | null }>;
  /** Renders the success body given the returned data */
  renderSuccess: (data: unknown) => ReactNode;
  /** Optional accent color class for the icon background, e.g. "bg-blue-50" */
  accentClass?: string;
  /** Optional extra content rendered between header and action button (idle state only) */
  beforeAction?: ReactNode;
}

export default function ServicePanel({
  title,
  description,
  icon,
  actionLabel,
  onFetch,
  renderSuccess,
  accentClass = "bg-uat-50",
  beforeAction,
}: ServicePanelProps) {
  const [state, setState] = useState<PanelState>("idle");
  const [result, setResult] = useState<{ success: boolean; data: unknown; fallbackUrl: string; userMessage?: string | null } | null>(null);

  async function handleClick() {
    setState("loading");
    try {
      const res = await onFetch();
      setResult(res);
      setState(res.success ? "success" : "error");
    } catch {
      setResult(null);
      setState("error");
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl ${accentClass} flex items-center justify-center flex-shrink-0 text-xl`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-900 text-sm leading-tight">{title}</p>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>

      {/* Body */}
      {state === "idle" && (
        <div className="space-y-2">
          {beforeAction}
          <button
            onClick={handleClick}
            className="w-full py-2 px-4 rounded-lg bg-uat-600 text-white text-sm font-medium hover:bg-uat-700 transition-colors"
          >
            {actionLabel}
          </button>
        </div>
      )}

      {state === "loading" && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-500">
          <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-uat-600 rounded-full animate-spin" />
          Se încarcă…
        </div>
      )}

      {state === "success" && result?.data != null && (
        <div>
          {renderSuccess(result.data)}
          <button
            onClick={() => setState("idle")}
            className="mt-3 text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Reîncearcă
          </button>
        </div>
      )}

      {state === "error" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            {result?.userMessage ?? "Serviciul nu este disponibil momentan."}
          </p>
          {result?.fallbackUrl && (
            <a
              href={result.fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-uat-600 hover:underline"
            >
              Deschide portalul oficial
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          )}
          <button
            onClick={() => setState("idle")}
            className="block text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Reîncearcă
          </button>
        </div>
      )}
    </div>
  );
}
