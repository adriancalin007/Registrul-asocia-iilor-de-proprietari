"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function AcceptaInvitatiePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword]   = useState("");
  const [confirm,  setConfirm]    = useState("");
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState<string | null>(null);
  const [done,     setDone]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Parola trebuie să aibă minim 8 caractere"); return; }
    if (password !== confirm)  { setError("Parolele nu coincid"); return; }

    setLoading(true); setError(null);
    const res = await fetch(`/api/accepta-invitatie/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Link invalid sau expirat"); setLoading(false); return; }
    setDone(true);
    setTimeout(() => router.push("/login"), 2500);
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Cont activat!</h2>
        <p className="text-slate-500 text-sm">Vei fi redirecționat la pagina de conectare...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 max-w-sm w-full">
        <div className="mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "linear-gradient(135deg, #4f5fe8 0%, #3040c8 100%)" }}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Activează contul</h1>
          <p className="text-slate-500 text-sm mt-1">Alege o parolă pentru a accesa platforma.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Parolă nouă</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required minLength={8} autoFocus
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none"
              placeholder="Minim 8 caractere"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Confirmare parolă</label>
            <input
              type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              required
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-uat-500 focus:outline-none"
              placeholder="Repetă parola"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #4f5fe8 0%, #3040c8 100%)" }}>
            {loading ? "Se salvează..." : "Activează contul"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Ai deja cont? <Link href="/login" className="text-uat-600 hover:underline">Conectează-te</Link>
        </p>
      </div>
    </div>
  );
}
