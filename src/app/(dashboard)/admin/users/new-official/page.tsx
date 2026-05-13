"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CivilMatch = {
  id:          string;
  email:       string;
  fullName:    string;
  accountType: string;
  status:      string;
  roles:       string[];
  ownerships:  string[];
};

type OfficialRole = { id: string; name: string; description: string | null };

export default function NewOfficialPage() {
  const router = useRouter();

  const [roles,       setRoles]      = useState<OfficialRole[]>([]);
  const [form, setForm] = useState({
    email: "", fullName: "", firstName: "", lastName: "",
    phone: "", cnp: "", roleName: "", tempPassword: "",
  });
  const [cnpMatches,   setCnpMatches]  = useState<CivilMatch[]>([]);
  const [cnpChecked,   setCnpChecked]  = useState(false);
  const [showMerge,    setShowMerge]   = useState(false);
  const [mergeTarget,  setMergeTarget] = useState<CivilMatch | null>(null);
  const [refuseMerge,  setRefuseMerge] = useState(false);
  const [justification, setJustification] = useState("");
  const [saving,       setSaving]      = useState(false);
  const [error,        setError]       = useState("");
  const [success,      setSuccess]     = useState("");

  useEffect(() => {
    fetch("/api/admin/roles")
      .then(r => r.json())
      .then((data: OfficialRole[]) => setRoles(data.filter(r => (r as any).accountType === "OFFICIAL")));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const checkCnp = async () => {
    if (form.cnp.length !== 13) return;
    const res = await fetch(`/api/admin/users/create-official?cnp=${form.cnp}`);
    if (!res.ok) return;
    const data = await res.json();
    setCnpMatches(data.users ?? []);
    setCnpChecked(true);
    if (data.found) setShowMerge(true);
  };

  const handleMergeConfirm = (user: CivilMatch) => {
    setMergeTarget(user);
    setRefuseMerge(false);
    setJustification("");
  };

  const handleMergeRefuse = () => {
    setMergeTarget(null);
    setRefuseMerge(true);
    setShowMerge(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.roleName) { setError("Selectați un rol."); return; }
    if (refuseMerge && justification.length < 10) {
      setError("Justificarea refuzului trebuie să aibă minim 10 caractere.");
      return;
    }

    setSaving(true);
    const body: Record<string, unknown> = {
      email:        form.email,
      fullName:     form.fullName,
      firstName:    form.firstName || undefined,
      lastName:     form.lastName  || undefined,
      phone:        form.phone     || undefined,
      cnp:          form.cnp       || undefined,
      roleName:     form.roleName,
      tempPassword: form.tempPassword,
    };

    if (mergeTarget) {
      body.mergeWithUserId = mergeTarget.id;
    } else if (refuseMerge) {
      body.mergeRefused       = true;
      body.mergeJustification = justification;
    }

    const res = await fetch("/api/admin/users/create-official", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) { setError(data.error ?? "Eroare."); return; }

    setSuccess("Cont creat cu succes.");
    const uid = data.userId ?? data.merged;
    if (uid) router.push(`/admin/users/${uid}`);
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Cont funcționar nou</h1>
        <p className="text-sm text-slate-500 mt-0.5">Creare cont OFFICIAL cu rol RBAC asignat</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
          <input name="email" type="email" required value={form.email} onChange={handleChange}
            className="input w-full" placeholder="functionar@sector1.ro" />
        </div>

        {/* Nume complet */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nume complet *</label>
          <input name="fullName" required value={form.fullName} onChange={handleChange}
            className="input w-full" placeholder="Ion Popescu" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Prenume</label>
            <input name="firstName" value={form.firstName} onChange={handleChange}
              className="input w-full" placeholder="Ion" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nume familie</label>
            <input name="lastName" value={form.lastName} onChange={handleChange}
              className="input w-full" placeholder="Popescu" />
          </div>
        </div>

        {/* Telefon */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Telefon</label>
          <input name="phone" value={form.phone} onChange={handleChange}
            className="input w-full" placeholder="07xx xxx xxx" />
        </div>

        {/* CNP cu detecție */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">CNP</label>
          <input name="cnp" value={form.cnp} onChange={handleChange}
            onBlur={checkCnp} maxLength={13}
            className="input w-full font-mono" placeholder="1234567890123" />
          {cnpChecked && cnpMatches.length === 0 && (
            <p className="text-xs text-emerald-600 mt-1">Niciun cont civil existent cu acest CNP.</p>
          )}
          {refuseMerge && (
            <p className="text-xs text-amber-600 mt-1">Merge refuzat — se va crea cont separat.</p>
          )}
        </div>

        {/* Rol */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Rol RBAC *</label>
          <select name="roleName" required value={form.roleName} onChange={handleChange} className="input w-full">
            <option value="">— Selectați rolul —</option>
            {roles.map(r => (
              <option key={r.id} value={r.name}>{r.name}{r.description ? ` — ${r.description}` : ""}</option>
            ))}
          </select>
        </div>

        {/* Parolă temporară */}
        {!mergeTarget && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Parolă temporară *</label>
            <input name="tempPassword" type="password" required={!mergeTarget} value={form.tempPassword}
              onChange={handleChange} className="input w-full" placeholder="min. 8 caractere" />
            <p className="text-xs text-slate-400 mt-1">Utilizatorul va fi obligat să o schimbe la prima autentificare.</p>
          </div>
        )}

        {/* Merge selectat */}
        {mergeTarget && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
            <p className="text-sm font-semibold text-amber-800">Cont civil identificat pentru merge:</p>
            <p className="text-sm text-amber-700">{mergeTarget.fullName} — {mergeTarget.email}</p>
            <p className="text-xs text-amber-600">Roluri: {mergeTarget.roles.join(", ") || "niciun rol"}</p>
            <p className="text-xs text-amber-600">Proprietăți: {mergeTarget.ownerships.join(", ") || "—"}</p>
            <button type="button" onClick={() => { setMergeTarget(null); setShowMerge(cnpMatches.length > 0); }}
              className="text-xs text-red-600 hover:underline mt-1">
              Anulare merge
            </button>
          </div>
        )}

        {/* Justificare refuz merge */}
        {refuseMerge && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Justificare refuz merge *</label>
            <textarea value={justification} onChange={e => setJustification(e.target.value)}
              rows={3} className="input w-full resize-none"
              placeholder="Minim 10 caractere — motivul pentru care se creează cont separat" />
          </div>
        )}

        {error   && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{success}</p>}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
            {saving ? "Se salvează..." : mergeTarget ? "Confirmă merge" : "Crează cont"}
          </button>
          <button type="button" onClick={() => router.back()}
            className="text-sm text-slate-600 hover:text-slate-900 px-4 py-2">
            Înapoi
          </button>
        </div>
      </form>

      {/* Modal merge */}
      {showMerge && !mergeTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Cont civil existent detectat</h2>
            <p className="text-sm text-slate-600">
              CNP-ul introdus coincide cu {cnpMatches.length === 1 ? "un cont civil existent" : `${cnpMatches.length} conturi civile`}.
              Doriți să unificați contul?
            </p>

            <div className="space-y-3">
              {cnpMatches.map(u => (
                <div key={u.id} className="border border-slate-200 rounded-lg p-3">
                  <p className="font-medium text-slate-900 text-sm">{u.fullName}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                  {u.ownerships.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">Proprietăți: {u.ownerships.join(", ")}</p>
                  )}
                  <button onClick={() => { handleMergeConfirm(u); setShowMerge(false); }}
                    className="mt-2 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md font-medium transition-colors">
                    Merge cu acest cont
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button onClick={handleMergeRefuse}
                className="text-sm text-red-600 hover:underline">
                Refuz merge — creez cont separat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
