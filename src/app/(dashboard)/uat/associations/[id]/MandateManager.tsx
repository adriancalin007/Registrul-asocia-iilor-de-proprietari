"use client";
// src/app/(dashboard)/uat/associations/[id]/MandateManager.tsx

import { useState, useEffect } from "react";

type Mandate = {
  id: string;
  role: string;
  startDate: string;
  expiresAt: string | null;
  isActive: boolean;
  user: { id: string; fullName: string; email: string; phone: string | null };
};

interface Props {
  associationId: string;
  initialMandates: Mandate[];
}

const ROLE_BADGE: Record<string, string> = {
  MANAGER:         "bg-blue-50 text-blue-700",
  BOARD_PRESIDENT: "bg-purple-50 text-purple-700",
  AUDITOR:         "bg-amber-50 text-amber-700",
};
const ROLE_LABEL: Record<string, string> = {
  MANAGER:         "Administrator",
  BOARD_PRESIDENT: "Președinte CA",
  AUDITOR:         "Cenzor",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });
}

function AccessButtons({ userId, userName }: { userId: string; userName: string }) {
  const [action, setAction] = useState<null | "invite" | "password">(null);
  const [tempPassword, setTempPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() { setAction(null); setTempPassword(""); setMessage(null); setError(null); setInviteUrl(null); }

  async function sendInvite() {
    setWorking(true); setError(null);
    const res = await fetch(`/api/uat/users/${userId}/invite`, { method: "POST" });
    const data = await res.json();
    setWorking(false);
    if (!res.ok) { setError(data.error); return; }
    setInviteUrl(data.inviteUrl);
    setMessage(data.emailSent ? `Email trimis la ${userName}.` : "Email neconfigurat — copiați linkul:");
  }

  async function setPassword() {
    if (tempPassword.length < 8) { setError("Minim 8 caractere."); return; }
    setWorking(true); setError(null);
    const res = await fetch(`/api/uat/users/${userId}/set-password`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: tempPassword }),
    });
    const data = await res.json();
    setWorking(false);
    if (!res.ok) { setError(data.error); return; }
    setMessage("Parolă temporară setată."); setTempPassword(""); setAction(null);
  }

  if (message) return (
    <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-800 space-y-1.5">
      <p>✓ {message}</p>
      {inviteUrl && (
        <div className="flex gap-1.5 items-center">
          <input readOnly value={inviteUrl} className="flex-1 text-xs bg-white border border-emerald-200 rounded-lg px-2 py-1 text-slate-700 min-w-0" />
          <button onClick={() => navigator.clipboard.writeText(inviteUrl)} className="text-xs text-uat-600 font-semibold whitespace-nowrap hover:underline">Copiază</button>
        </div>
      )}
      <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600">Închide</button>
    </div>
  );

  return (
    <div className="mt-2 space-y-2">
      {action === null && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setAction("invite"); sendInvite(); }}
            className="text-xs border border-uat-200 text-uat-700 px-3 py-1.5 rounded-lg hover:bg-uat-50 transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Trimite invitație
          </button>
          <button onClick={() => setAction("password")}
            className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
            Parolă temporară
          </button>
        </div>
      )}
      {action === "invite" && working && <p className="text-xs text-slate-400">Se generează linkul...</p>}
      {action === "password" && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
          <div className="flex gap-2">
            <input type="password" value={tempPassword} onChange={e => setTempPassword(e.target.value)}
              placeholder="Minim 8 caractere" className="input text-sm flex-1" />
            <button onClick={setPassword} disabled={working} className="btn-primary text-xs whitespace-nowrap">
              {working ? "..." : "Setează"}
            </button>
            <button onClick={reset} className="btn-ghost text-xs">Anulează</button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

// ── Per-role section (president / admin / auditors) ────────────────────────────

function RoleSection({
  title, roleKey, active, history, associationId, onReload,
}: {
  title: string;
  roleKey: "BOARD_PRESIDENT" | "MANAGER" | "AUDITOR";
  active: Mandate[];
  history: Mandate[];
  associationId: string;
  onReload: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", startDate: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function add() {
    setSaving(true); setError(null); setSuccess(null);
    const res = await fetch(`/api/uat/associations/${associationId}/mandates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role: roleKey }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    setSuccess(data.userCreated ? `Cont creat pentru ${form.fullName}.` : `Mandat atribuit lui ${form.fullName}.`);
    setShowForm(false);
    setForm({ fullName: "", email: "", phone: "", startDate: new Date().toISOString().slice(0, 10) });
    await onReload();
  }

  async function deactivate(m: Mandate) {
    if (!confirm(`Dezactivezi mandatul lui ${m.user.fullName}?`)) return;
    setRemoving(m.id);
    await fetch(`/api/uat/associations/${associationId}/mandates`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mandateId: m.id }),
    });
    await onReload();
    setRemoving(null);
  }

  return (
    <div className="border-b border-slate-100 last:border-0">
      {/* Header */}
      <div className="px-6 py-3 bg-slate-50/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[roleKey]}`}>
            {ROLE_LABEL[roleKey]}
          </span>
          {active.length === 0 && (
            <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium">Necompletat</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <button onClick={() => setShowHistory(v => !v)}
              className="text-xs text-slate-400 hover:text-slate-600">
              {showHistory ? "Ascunde" : `Istoric (${history.length})`}
            </button>
          )}
          <button onClick={() => { setShowForm(v => !v); setError(null); setSuccess(null); }}
            className="text-xs text-uat-600 font-semibold hover:text-uat-700">
            {showForm ? "Anulează" : "+ Adaugă"}
          </button>
        </div>
      </div>

      {/* Active mandates */}
      {active.map(m => (
        <div key={m.id} className="px-6 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 text-sm">{m.user.fullName}</p>
              <p className="text-xs text-slate-500">{m.user.email}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Din {fmtDate(m.startDate)}
                {m.expiresAt && ` până la ${fmtDate(m.expiresAt)}`}
              </p>
              <AccessButtons userId={m.user.id} userName={m.user.fullName} />
            </div>
            <button onClick={() => deactivate(m)} disabled={removing === m.id}
              className="text-xs text-red-500 hover:text-red-700 border border-red-100 hover:border-red-300 px-3 py-1.5 rounded-lg disabled:opacity-50 flex-shrink-0">
              {removing === m.id ? "..." : "Dezactivează"}
            </button>
          </div>
        </div>
      ))}

      {active.length === 0 && !showForm && (
        <div className="px-6 py-3 text-sm text-slate-400 italic">Niciun mandat activ.</div>
      )}

      {/* History */}
      {showHistory && history.length > 0 && (
        <div className="px-6 pb-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Mandate expirate</p>
          <div className="space-y-2">
            {history.map(m => (
              <div key={m.id} className="flex items-center gap-3 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                <span className="font-medium text-slate-700 truncate">{m.user.fullName}</span>
                <span className="text-slate-400 shrink-0">
                  {fmtDate(m.startDate)} – {m.expiresAt ? fmtDate(m.expiresAt) : "?"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="mx-6 my-3 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label-text">Nume complet *</label>
              <input className="input text-sm" value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div>
              <label className="label-text">Email *</label>
              <input className="input text-sm" type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ion.popescu@email.ro" />
            </div>
            <div>
              <label className="label-text">Telefon</label>
              <input className="input text-sm" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="07xx xxx xxx" />
            </div>
            <div>
              <label className="label-text">Data start mandat *</label>
              <input className="input text-sm" type="date" value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
          </div>
          {active.length > 0 && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Mandatul curent al lui {active[0].user.fullName} va fi dezactivat automat la data de start.
            </p>
          )}
          <p className="text-xs text-slate-400">Dacă emailul nu există, contul se creează automat.</p>
          {error   && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-sm text-emerald-600">✓ {success}</p>}
          <div className="flex gap-2">
            <button onClick={add} disabled={saving || !form.email.trim() || !form.fullName.trim()} className="btn-primary text-sm">
              {saving ? "Se salvează..." : "Atribuie mandat"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">Anulează</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MandateManager({ associationId, initialMandates }: Props) {
  const [mandates, setMandates] = useState<Mandate[]>(initialMandates);

  async function reload() {
    const r = await fetch(`/api/uat/associations/${associationId}/mandates?all=true`);
    if (r.ok) setMandates(await r.json());
  }

  // Fetch all mandates (including history) on mount
  useEffect(() => { reload(); }, [associationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const active   = (role: string) => mandates.filter(m => m.role === role && m.isActive);
  const history  = (role: string) => mandates.filter(m => m.role === role && !m.isActive);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="font-semibold text-slate-900">Conturi platformă</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Accesele de tip Manager se atribuie administratorului și președintelui din structura de conducere.
        </p>
      </div>

      <RoleSection title="Conducere" roleKey="BOARD_PRESIDENT"
        active={active("BOARD_PRESIDENT")} history={history("BOARD_PRESIDENT")}
        associationId={associationId} onReload={reload} />

      <RoleSection title="Management" roleKey="MANAGER"
        active={active("MANAGER")} history={history("MANAGER")}
        associationId={associationId} onReload={reload} />

      <RoleSection title="Cenzor / Auditor" roleKey="AUDITOR"
        active={active("AUDITOR")} history={history("AUDITOR")}
        associationId={associationId} onReload={reload} />
    </div>
  );
}
