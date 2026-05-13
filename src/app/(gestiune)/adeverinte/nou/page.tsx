// src/app/(dashboard)/adeverinte/nou/page.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/components/i18n/I18nProvider";

const TYPES = [
  { value: "PAYMENTS_UP_TO_DATE", labelKey: "certificates.typePaymentsUpToDate", descKey: "certificates.typePaymentsUpToDateDesc" },
  { value: "OWNERSHIP", labelKey: "certificates.typeOwnership", descKey: "certificates.typeOwnershipDesc" },
  { value: "RESERVE_FUND", labelKey: "certificates.typeReserveFund", descKey: "certificates.typeReserveFundDesc" },
  { value: "GENERAL", labelKey: "certificates.typeGeneral", descKey: "certificates.typeGeneralDesc" },
];

export default function NewCertificatePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [selectedType, setSelectedType] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!selectedType) {
      setError(t("certificates.selectTypeError"));
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/adeverinte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selectedType }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? t("common.error"));
        return;
      }

      setSubmitted(true);
      setTimeout(() => router.push("/adeverinte"), 2000);
    });
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900">{t("certificates.requestSent")}</h2>
        <p className="text-slate-500 mt-2">{t("certificates.requestSentDesc")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <Link href="/adeverinte" className="hover:text-slate-700">{t("certificates.breadcrumb")}</Link>
          <span>›</span>
          <span>{t("certificates.newBreadcrumb")}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{t("certificates.requestNew")}</h1>
        <p className="text-slate-500 mt-1">{t("certificates.selectTypeSubtitle")}</p>
      </div>

      <div className="space-y-3">
        {TYPES.map((ct) => (
          <button
            key={ct.value}
            type="button"
            onClick={() => { setSelectedType(ct.value); setError(""); }}
            className={`w-full text-left card transition-all hover:shadow-md ${
              selectedType === ct.value
                ? "border-uat-400 ring-2 ring-uat-400 ring-offset-1"
                : "hover:border-uat-200"
            }`}
          >
            <div className="card-body flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                selectedType === ct.value ? "bg-uat-600" : "bg-slate-100"
              }`}>
                <svg className={`w-5 h-5 ${selectedType === ct.value ? "text-white" : "text-slate-400"}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{t(ct.labelKey)}</p>
                <p className="text-sm text-slate-500 mt-0.5">{t(ct.descKey)}</p>
              </div>
              {selectedType === ct.value && (
                <svg className="w-5 h-5 text-uat-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="flex justify-between">
        <Link href="/adeverinte" className="btn-secondary">{t("common.cancel")}</Link>
        <button type="button" onClick={handleSubmit} disabled={isPending || !selectedType} className="btn-primary px-8">
          {isPending ? t("certificates.submitting") : t("certificates.submitRequest")}
        </button>
      </div>
    </div>
  );
}
