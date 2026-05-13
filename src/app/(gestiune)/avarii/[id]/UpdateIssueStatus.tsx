// src/app/(dashboard)/avarii/[id]/UpdateIssueStatus.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";

interface Props {
  issueId: string;
  currentStatus: string;
}

const TRANSITIONS: Record<string, { status: string; labelKey: string; style: string }[]> = {
  OPEN: [
    { status: "IN_PROGRESS", labelKey: "issues.markInProgress", style: "btn-primary" },
    { status: "RESOLVED", labelKey: "issues.markResolved", style: "btn-secondary" },
  ],
  IN_PROGRESS: [
    { status: "RESOLVED", labelKey: "issues.markResolved", style: "btn-primary" },
  ],
  RESOLVED: [
    { status: "CLOSED", labelKey: "issues.closeFile", style: "btn-secondary" },
    { status: "IN_PROGRESS", labelKey: "issues.reopenIssue", style: "btn-ghost" },
  ],
};

export default function UpdateIssueStatus({ issueId, currentStatus }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [completionUrl, setCompletionUrl] = useState("");
  const [error, setError] = useState("");

  const transitions = TRANSITIONS[currentStatus] ?? [];

  async function handleUpdate(newStatus: string) {
    startTransition(async () => {
      const res = await fetch(`/api/avarii/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStatus, notes, completionUrl }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Update failed."); return; }
      router.refresh();
    });
  }

  if (transitions.length === 0) return null;

  return (
    <div className="card border-uat-200">
      <div className="card-body space-y-4">
        <h2 className="font-semibold text-slate-900">{t("issues.updateStatusTitle")}</h2>

        <div>
          <label className="label text-sm">{t("issues.notesLabel")}</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder={t("issues.notesPlaceholder")}
            rows={2} className="input resize-none text-sm" />
        </div>

        {currentStatus === "RESOLVED" && (
          <div>
            <label className="label text-sm">{t("issues.completionLinkLabel")}</label>
            <input type="url" value={completionUrl} onChange={e => setCompletionUrl(e.target.value)}
              placeholder="https://drive.google.com/..." className="input text-sm" />
          </div>
        )}

        {error && <p className="text-red-600 text-sm">⚠ {error}</p>}

        <div className="flex gap-3 flex-wrap">
          {transitions.map(tr => (
            <button key={tr.status} type="button" onClick={() => handleUpdate(tr.status)}
              disabled={isPending} className={tr.style}>
              {isPending ? t("issues.updating") : t(tr.labelKey)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
