"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FileUpload from "@/components/FileUpload";
import { useI18n } from "@/components/i18n/I18nProvider";

const CATEGORIES = [
  "Instalații sanitare (scurgeri, avarii apă)",
  "Instalații electrice",
  "Încălzire / HVAC",
  "Structură (fisuri, infiltrații)",
  "Lift",
  "Acoperiș / terasă",
  "Spații comune",
  "Instalație gaz",
  "Altele",
];

export default function NewIssuePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const [form, setForm] = useState({
    category: "", location: "", description: "", priority: "NORMAL",
  });

  function update(field: string, val: string) {
    setForm(p => ({ ...p, [field]: val }));
    setErrors(p => ({ ...p, [field]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.category) errs.category = t("issues.categoryRequired");
    if (!form.location.trim()) errs.location = t("issues.locationRequired");
    if (!form.description.trim()) errs.description = t("issues.descriptionRequired");
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    startTransition(async () => {
      const res = await fetch("/api/avarii", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, photos }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ general: data.error ?? t("common.error") }); return; }
      setSubmitted(true);
      setTimeout(() => router.push("/avarii"), 1500);
    });
  }

  if (submitted) return (
    <div className="max-w-lg mx-auto text-center py-20">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-slate-900">{t("issues.registered")}</h2>
      <p className="text-slate-500 mt-1">{t("issues.registeredDesc")}</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <Link href="/avarii" className="hover:text-slate-700">{t("issues.breadcrumb")}</Link>
          <span>›</span>
          <span>{t("issues.newBreadcrumb")}</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{t("issues.newTitle")}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="card-body space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">{t("issues.categoryLabel")} <span className="text-red-500">*</span></label>
                <select value={form.category} onChange={e => update("category", e.target.value)}
                  className={`input ${errors.category ? "border-red-400" : ""}`}>
                  <option value="">— {t("issues.selectCategory")} —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <p className="text-red-500 text-xs mt-1">⚠ {errors.category}</p>}
              </div>
              <div>
                <label className="label">{t("issues.priorityLabel")}</label>
                <select value={form.priority} onChange={e => update("priority", e.target.value)} className="input">
                  <option value="LOW">{t("issues.priorityLow")}</option>
                  <option value="NORMAL">{t("issues.priorityNormal")}</option>
                  <option value="URGENT">🔴 {t("issues.priorityUrgent")}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">{t("issues.locationLabel")} <span className="text-red-500">*</span></label>
              <input type="text" value={form.location} onChange={e => update("location", e.target.value)}
                placeholder={t("issues.locationPlaceholder")}
                className={`input ${errors.location ? "border-red-400" : ""}`} />
              {errors.location && <p className="text-red-500 text-xs mt-1">⚠ {errors.location}</p>}
            </div>

            <div>
              <label className="label">{t("issues.descriptionLabel")} <span className="text-red-500">*</span></label>
              <textarea value={form.description} onChange={e => update("description", e.target.value)}
                placeholder={t("issues.descriptionPlaceholder")}
                rows={4} className={`input resize-none ${errors.description ? "border-red-400" : ""}`} />
              {errors.description && <p className="text-red-500 text-xs mt-1">⚠ {errors.description}</p>}
            </div>

            {/* Photo/document upload */}
            <div>
              <label className="label mb-1 block">Fotografii / documente <span className="text-xs text-slate-400">(opțional)</span></label>
              <FileUpload
                accept="image/*,application/pdf"
                hint="Fotografii ale avariei sau documente relevante · max 20 MB"
                onUpload={(url) => setPhotos(prev => [...prev, url])}
              />
              {photos.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {photos.map((url, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                      <span className="text-emerald-600">✓</span>
                      <span className="truncate max-w-[140px] text-slate-600">{url.split("/").pop()}</span>
                      <button type="button" onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600 ml-1">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {errors.general && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-red-700 text-sm">⚠ {errors.general}</p>
              </div>
            )}
          </div>
          <div className="card-header border-t border-b-0 flex justify-between">
            <Link href="/avarii" className="btn-secondary">{t("common.cancel")}</Link>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? t("issues.registering") : t("issues.registerButton")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
