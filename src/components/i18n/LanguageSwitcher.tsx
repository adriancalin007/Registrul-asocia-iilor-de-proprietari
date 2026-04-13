"use client";
// src/components/i18n/LanguageSwitcher.tsx
import { useI18n } from "./I18nProvider";
import type { Locale } from "@/lib/i18n";

const FLAG: Record<Locale, string> = {
  ro: "🇷🇴",
  en: "🇬🇧",
};

const LABEL: Record<Locale, string> = {
  ro: "RO",
  en: "EN",
};

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  const other: Locale = locale === "ro" ? "en" : "ro";

  return (
    <button
      type="button"
      onClick={() => setLocale(other)}
      title={`Switch to ${other === "ro" ? "Română" : "English"}`}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-sm font-medium text-slate-600"
    >
      <span className="text-base leading-none">{FLAG[locale]}</span>
      <span className="text-xs">{LABEL[locale]}</span>
    </button>
  );
}
