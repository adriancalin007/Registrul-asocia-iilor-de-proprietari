"use client";
import { useState, useEffect, useCallback } from "react";

const ROLE_LABEL: Record<string, string> = {
  MANAGER: "Administrator",
  BOARD_PRESIDENT: "Președinte CA",
  AUDITOR: "Cenzor",
};
const ROLE_BADGE: Record<string, string> = {
  MANAGER: "bg-blue-50 text-blue-700",
  BOARD_PRESIDENT: "bg-purple-50 text-purple-700",
  AUDITOR: "bg-amber-50 text-amber-700",
};

type ManagerMandate = {
  role: string;
  associationName: string;
  associationId: string;
  mandateId: string;
  since: string;
};

type Manager = {
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    isActive: boolean;
    lastLoginAt: string | null;
    mustChangePassword: boolean;
    createdAt: string;
  };
  mandates: ManagerMandate[];
};

type Activity = {
  loginCount: number;
  documentCount: number;
  certificateCount: number;
  issueCount: number;
  consultationCount: number;
  recentLogins: string[];
};

function ActivityPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/uat/managers/${userId}/activity`)
      .then(r => r.json())
      .then(data => { setActivity(data); setLoading(false); });
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Raport activitate</h3>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <p className="text-sm text-slate-400 text-center py-8">Se încarcă...</p>
          ) : activity ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Autentificări", value: activity.loginCount, icon: "🔑" },
                  { label: "Documente încărcate", value: activity.documentCount, icon: "📄" },
                  { label: "Adeverințe aprobate", value: activity.certificateCount, icon: "✅" },
                  { label: "Avarii raportate", value: activity.issueCount, icon: "🔧" },
                  { label: "Consultări inițiate", value: activity.consultationCount, icon: "💬" },
                ].map(item => (
                  <div key={item.label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-lg font-bold text-slate-900">{item.icon} {item.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>

              {activity.recentLogins.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                    Ultimele autentificări
                  </p>
                  <div className="space-y-1">
                    {activity.recentLogins.map((dt, i) => (
                      <p key={i} className="text-sm text-slate-600">
                        {new Date(dt).toLocaleString("ro-RO")}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Nu s-au putut încărca datele.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function EditModal({ manager, onClose, onSaved }: {
  manager: Manager; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({ fullName: manager.user.fullName, phone: manager.user.phone ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true); setError(null);
    const res = await fetch(`/api/uat/managers/${manager.user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Editează manager</h3>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label-text">Nume complet</label>
            <input className="input" value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
          </div>
          <div>
            <label className="label-text">Telefon</label>
            <input className="input" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving} className="btn-primary">
              {saving ? "Se salvează..." : "Salvează"}
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">Anulează</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [activityUserId, setActivityUserId] = useState<string | null>(null);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [inviteResult, setInviteResult] = useState<{ userId: string; url: string; sent: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/uat/managers");
    if (r.ok) setManagers(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(userId: string, isActive: boolean) {
    await fetch(`/api/uat/managers/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setManagers(ms => ms.map(m =>
      m.user.id === userId ? { ...m, user: { ...m.user, isActive: !isActive } } : m
    ));
  }

  async function sendInvite(userId: string) {
    const res = await fetch(`/api/uat/users/${userId}/invite`, { method: "POST" });
    const data = await res.json();
    if (res.ok) setInviteResult({ userId, url: data.inviteUrl, sent: data.emailSent });
  }

  const filtered = managers.filter(m => {
    const matchesSearch = search === "" ||
      m.user.fullName.toLowerCase().includes(search.toLowerCase()) ||
      m.user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "ALL" ||
      m.mandates.some(md => md.role === roleFilter);
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Manageri</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Administratori, președinți și cenzori cu acces pe platformă
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Caută după nume sau email..."
          className="input w-72"
        />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input w-44">
          <option value="ALL">Toate rolurile</option>
          <option value="MANAGER">Administrator</option>
          <option value="BOARD_PRESIDENT">Președinte CA</option>
          <option value="AUDITOR">Cenzor</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">Se încarcă...</div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            {search || roleFilter !== "ALL" ? "Niciun rezultat." : "Nu există manageri înregistrați."}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(({ user, mandates }) => (
              <div key={user.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{user.fullName}</p>
                      {!user.isActive && (
                        <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                          Dezactivat
                        </span>
                      )}
                      {user.mustChangePassword && (
                        <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                          Trebuie să schimbe parola
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{user.email}</p>
                    {user.phone && <p className="text-xs text-slate-400">{user.phone}</p>}

                    {/* Mandates */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {mandates.map(m => (
                        <div key={m.mandateId} className="flex items-center gap-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[m.role] ?? "bg-slate-100 text-slate-600"}`}>
                            {ROLE_LABEL[m.role] ?? m.role}
                          </span>
                          <span className="text-xs text-slate-400 truncate max-w-40">{m.associationName}</span>
                        </div>
                      ))}
                    </div>

                    {/* Last login */}
                    <p className="text-xs text-slate-400 mt-1.5">
                      {user.lastLoginAt
                        ? `Ultimul login: ${new Date(user.lastLoginAt).toLocaleString("ro-RO")}`
                        : "Nu s-a autentificat niciodată"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center gap-2 flex-wrap justify-end">
                    <button type="button" onClick={() => setActivityUserId(user.id)}
                      title="Raport activitate"
                      className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      Activitate
                    </button>
                    <button type="button" onClick={() => sendInvite(user.id)}
                      title="Trimite link de activare"
                      className="text-xs border border-uat-200 text-uat-700 px-3 py-1.5 rounded-lg hover:bg-uat-50 transition-colors">
                      Invitație
                    </button>
                    <button type="button" onClick={() => setEditingManager({ user, mandates })}
                      className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      Editează
                    </button>
                    <button type="button" onClick={() => toggleActive(user.id, user.isActive)}
                      className={`text-xs border px-3 py-1.5 rounded-lg transition-colors ${
                        user.isActive
                          ? "border-red-100 text-red-600 hover:bg-red-50"
                          : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      }`}>
                      {user.isActive ? "Dezactivează" : "Reactivează"}
                    </button>
                  </div>
                </div>

                {/* Invite result inline */}
                {inviteResult?.userId === user.id && (
                  <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800 space-y-2">
                    <p>✓ {inviteResult.sent ? "Email trimis." : "Email neconfigurat — copiați linkul:"}</p>
                    {!inviteResult.sent && (
                      <div className="flex gap-2">
                        <input readOnly value={inviteResult.url}
                          className="flex-1 text-xs bg-white border border-emerald-200 rounded-lg px-2 py-1.5 text-slate-700" />
                        <button type="button"
                          onClick={() => navigator.clipboard.writeText(inviteResult.url)}
                          className="text-xs text-uat-600 font-semibold hover:underline whitespace-nowrap">
                          Copiază
                        </button>
                      </div>
                    )}
                    <button type="button" onClick={() => setInviteResult(null)}
                      className="text-xs text-slate-400 hover:text-slate-600">
                      Închide
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {activityUserId && (
        <ActivityPanel userId={activityUserId} onClose={() => setActivityUserId(null)} />
      )}
      {editingManager && (
        <EditModal
          manager={editingManager}
          onClose={() => setEditingManager(null)}
          onSaved={() => { setEditingManager(null); load(); }}
        />
      )}
    </div>
  );
}
