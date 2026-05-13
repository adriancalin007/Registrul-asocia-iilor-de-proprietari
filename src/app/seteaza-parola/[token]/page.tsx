"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SeteazaParolaPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "done">("loading");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/seteaza-parola/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setUserName(data.name ?? "");
          setStatus("valid");
        } else {
          setStatus("invalid");
        }
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) { setError("Parola trebuie să aibă cel puțin 8 caractere."); return; }
    if (password !== confirm) { setError("Parolele nu coincid."); return; }

    setSaving(true);
    const res = await fetch(`/api/seteaza-parola/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error ?? "Eroare."); return; }

    setStatus("done");
    setTimeout(() => router.push("/login"), 2500);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">

          {status === "loading" && (
            <div className="text-center text-slate-400 text-sm py-4">Se verifică linkul...</div>
          )}

          {status === "invalid" && (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <h1 className="text-base font-bold text-slate-900">Link invalid sau expirat</h1>
              <p className="text-sm text-slate-500">Solicită un nou link de activare de la operatorul UAT.</p>
            </div>
          )}

          {status === "valid" && (
            <>
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-uat-50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-uat-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <h1 className="text-lg font-bold text-slate-900">Activare cont</h1>
                {userName && (
                  <p className="text-sm text-slate-500 mt-1">Bun venit, <strong>{userName}</strong>! Setează-ți parola pentru a continua.</p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label-text">Parolă nouă</label>
                  <input type="password" className="input" value={password}
                    onChange={e => setPassword(e.target.value)} placeholder="Minim 8 caractere" required autoFocus />
                </div>
                <div>
                  <label className="label-text">Confirmă parola</label>
                  <input type="password" className="input" value={confirm}
                    onChange={e => setConfirm(e.target.value)} placeholder="Repetă parola" required />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700">{error}</div>
                )}

                <button type="submit" disabled={saving} className="btn-primary w-full">
                  {saving ? "Se salvează..." : "Activează contul"}
                </button>
              </form>
            </>
          )}

          {status === "done" && (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h1 className="text-base font-bold text-slate-900">Cont activat!</h1>
              <p className="text-sm text-slate-500">Parola a fost setată. Vei fi redirecționat la autentificare...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
