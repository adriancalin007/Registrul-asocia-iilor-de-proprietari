// src/app/(dashboard)/consultari/nou/page.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/components/i18n/I18nProvider";

export default function NewConsultationPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [optionsText, setOptionsText] = useState("Yes\nNo\nAbstain");

  const [form, setForm] = useState({
    title: "", description: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
  });

  function update(field: string, val: string) {
    setForm(p => ({ ...p, [field]: val }));
    setErrors(p => ({ ...p, [field]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = t("consultations.subjectRequired");
    if (!form.endDate) errs.endDate = t("consultations.endDateRequired");
    if (form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      errs.endDate = t("consultations.endDateError");
    }
    const options = optionsText.split("\n").map(o => o.trim()).filter(Boolean);
    if (options.length < 2) errs.options = t("consultations.optionsRequired");
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    startTransition(async () => {
      const res = await fetch("/api/consultari", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          options: optionsText.split("\n").map(o => o.trim()).filter(Boolean),
          startsAt: form.startDate,
          expiresAt: form.endDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ general: data.error ?? t("common.error") }); return; }
      setSubmitted(true);
      setTimeout(() => router.push("/consultari"), 1500);
    });
  }

  if (submitted) return (
    <div className="max-w-lg mx-auto text-center py-20">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-slate-900">{t("consultations.started")}</h2>
      <p className="text-slate-500 mt-1">{t("consultations.startedDesc")}</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <Link href="/consultari" className="hover:text-slate-700">{t("consultations.breadcrumb")}</Link>
          <span>›</span>
          <span>{t("consultations.newBreadcrumb")}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{t("consultations.newTitle")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("consultations.newSubtitle")}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-body space-y-5">
            <div>
              <label className="label">{t("consultations.subjectLabel")} <span className="text-red-500">*</span></label>
              <input type="text" value={form.title} onChange={e => update("title", e.target.value)}
                placeholder={t("consultations.subjectPlaceholder")}
                className={`input ${errors.title ? "border-red-400" : ""}`} />
              {errors.title && <p className="text-red-500 text-xs mt-1">⚠ {errors.title}</p>}
            </div>

            <div>
              <label className="label">{t("consultations.descriptionLabel")}</label>
              <textarea value={form.description} onChange={e => update("description", e.target.value)}
                placeholder={t("consultations.descriptionPlaceholder")}
                rows={3} className="input resize-none" />
            </div>

            <div>
              <label className="label">
                {t("consultations.optionsLabel")} <span className="text-red-500">*</span>
              </label>
              <textarea value={optionsText}
                onChange={e => { setOptionsText(e.target.value); setErrors(p => ({ ...p, options: "" })); }}
                placeholder={t("consultations.optionsPlaceholder")}
                rows={4} className={`input resize-none font-mono text-sm ${errors.options ? "border-red-400" : ""}`} />
              <p className="text-xs text-slate-400 mt-1">{t("consultations.optionsHint")}</p>
              {errors.options && <p className="text-red-500 text-xs mt-1">⚠ {errors.options}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{t("consultations.startDateLabel")}</label>
                <input type="date" value={form.startDate} onChange={e => update("startDate", e.target.value)}
                  className="input" />
              </div>
              <div>
                <label className="label">{t("consultations.endDateLabel")} <span className="text-red-500">*</span></label>
                <input type="date" value={form.endDate} onChange={e => update("endDate", e.target.value)}
                  className={`input ${errors.endDate ? "border-red-400" : ""}`} />
                {errors.endDate && <p className="text-red-500 text-xs mt-1">⚠ {errors.endDate}</p>}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <p className="font-medium mb-1">{t("consultations.importantTitle")}</p>
              <p>{t("consultations.importantText")}</p>
            </div>

            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700 text-sm">⚠ {errors.general}</p>
              </div>
            )}
          </div>
          <div className="card-header border-t border-b-0 flex justify-between">
            <Link href="/consultari" className="btn-secondary">{t("common.cancel")}</Link>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? t("consultations.starting") : t("consultations.startButton")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
