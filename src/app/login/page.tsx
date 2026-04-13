"use client";
import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/components/i18n/I18nProvider";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });
  const { t } = useI18n();

  function update(field: string, value: string) { setForm(p => ({ ...p, [field]: value })); setError(""); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password) { setError(t("auth.fillAllFields")); return; }
    startTransition(async () => {
      const result = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      if (result?.error) { setError(t("auth.invalidCredentials")); return; }
      router.push(searchParams.get("callbackUrl") ?? "/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-uat-950 via-uat-900 to-uat-800 flex items-center justify-center p-4">
      {/* Language switcher top right */}
      <div className="fixed top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {t("auth.signIn") === "Autentificare" ? "Platformă Civic-Instituțională" : "Civic-Institutional Platform"}
          </h1>
          <p className="text-uat-300 mt-1 text-sm">{t("auth.signInSubtitle")}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl shadow-uat-950/50 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">{t("auth.signIn")}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t("auth.emailLabel")}</label>
              <input type="email" value={form.email} onChange={e => update("email", e.target.value)}
                placeholder={t("auth.emailPlaceholder")} autoComplete="email" className="input" />
            </div>
            <div>
              <label className="label">{t("auth.passwordLabel")}</label>
              <input type="password" value={form.password} onChange={e => update("password", e.target.value)}
                placeholder={t("auth.passwordPlaceholder")} autoComplete="current-password" className="input" />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-700 text-sm">⚠ {error}</p>
              </div>
            )}
            <button type="submit" disabled={isPending} className="btn-primary w-full py-2.5 text-base">
              {isPending ? t("auth.signingIn") : t("auth.signInButton")}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              {t("auth.registerPrompt")}{" "}
              <a href="/register-association" className="text-uat-600 hover:text-uat-700 font-medium">
                {t("auth.registerLink")}
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-uat-400 text-xs mt-6">{t("auth.platformDescription")}</p>
      </div>
    </div>
  );
}
