// src/app/(dashboard)/adeverinte/ApproveCertificate.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";

interface Props {
  certificateId: string;
  type: string;
  ownerName: string;
  unitNumber: string;
}

export default function ApproveCertificate({ certificateId, type, ownerName, unitNumber }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [showRejection, setShowRejection] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleAction(action: "APPROVE" | "REJECT" | "ISSUE") {
    if (action === "REJECT" && !notes.trim()) {
      setShowRejection(true);
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/adeverinte/${certificateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? t("common.error") });
        return;
      }

      setMessage({
        type: "success",
        text: action === "APPROVE" ? t("certificates.approvedMsg")
          : action === "ISSUE" ? t("certificates.issuedMsg")
          : t("certificates.rejectedMsg"),
      });

      setTimeout(() => router.refresh(), 1500);
    });
  }

  if (message) {
    return (
      <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
        message.type === "success"
          ? "bg-green-50 text-green-800 border border-green-200"
          : "bg-red-50 text-red-800 border border-red-200"
      }`}>
        {message.text}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showRejection && (
        <div>
          <label className="label text-sm">{t("certificates.rejectionReasonLabel")} <span className="text-red-500">*</span></label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("certificates.rejectionReasonPlaceholder")}
            rows={2}
            className="input resize-none text-sm"
          />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => handleAction("ISSUE")} disabled={isPending} className="btn-primary text-sm">
          {t("certificates.approveIssuePdf")}
        </button>
        <button type="button" onClick={() => handleAction("APPROVE")} disabled={isPending} className="btn-secondary text-sm">
          {t("certificates.approveWithoutPdf")}
        </button>
        <button
          type="button"
          onClick={() => showRejection ? handleAction("REJECT") : setShowRejection(true)}
          disabled={isPending}
          className="btn-danger text-sm"
        >
          {showRejection ? t("certificates.confirmRejection") : t("certificates.reject")}
        </button>
        {showRejection && (
          <button type="button" onClick={() => { setShowRejection(false); setNotes(""); }} className="btn-ghost text-sm">
            {t("certificates.cancelRejection")}
          </button>
        )}
      </div>
    </div>
  );
}
