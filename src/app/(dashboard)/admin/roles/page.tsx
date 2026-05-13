"use client";

import { useEffect, useState, useCallback } from "react";

type PermissionRow = {
  id:          string;
  key:         string;
  category:    string;
  description: string | null;
  assignedTo:  { id: string; name: string }[];
};

type RoleRow = {
  id:          string;
  name:        string;
  accountType: string;
  isSystem:    boolean;
  description: string | null;
  userCount:   number;
  permissions: { id: string; key: string; category: string }[];
};

const ACCOUNT_COLORS: Record<string, string> = {
  OFFICIAL: "bg-purple-50 text-purple-700",
  CIVIL:    "bg-blue-50 text-blue-700",
};

export default function AdminRolesPage() {
  const [roles,       setRoles]       = useState<RoleRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState<string | null>(null); // key = `${roleId}:${permId}`

  // Create role form
  const [showCreate,  setShowCreate]  = useState(false);
  const [newName,     setNewName]     = useState("");
  const [newType,     setNewType]     = useState<"OFFICIAL" | "CIVIL">("OFFICIAL");
  const [newDesc,     setNewDesc]     = useState("");
  const [createError, setCreateError] = useState("");
  const [creating,    setCreating]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [rolesRes, permsRes] = await Promise.all([
      fetch("/api/admin/roles"),
      fetch("/api/admin/permissions"),
    ]);
    if (rolesRes.ok)  setRoles(await rolesRes.json());
    if (permsRes.ok)  setPermissions(await permsRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (roleId: string, permId: string, currentlyAssigned: boolean) => {
    const key = `${roleId}:${permId}`;
    setSaving(key);
    await fetch("/api/admin/permissions", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ roleId, permissionId: permId, assign: !currentlyAssigned }),
    });
    setSaving(null);
    load();
  };

  const handleDelete = async (roleId: string, roleName: string) => {
    if (!confirm(`Ștergeți rolul "${roleName}"? Această acțiune este ireversibilă.`)) return;
    const res = await fetch("/api/admin/roles", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ roleId }),
    });
    if (res.ok) load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    if (!/^[A-Z0-9_]+$/.test(newName)) {
      setCreateError("Numai majuscule, cifre și underscore (ex: MY_ROLE).");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/admin/roles", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: newName, accountType: newType, description: newDesc || undefined }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setCreateError(data.error ?? "Eroare."); return; }
    setNewName(""); setNewDesc(""); setShowCreate(false);
    load();
  };

  // Group permissions by category
  const categories = Array.from(new Set(permissions.map(p => p.category))).sort();

  if (loading) return <div className="py-16 text-center text-sm text-slate-400">Se încarcă...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Roluri &amp; permisiuni</h1>
          <p className="text-sm text-slate-500 mt-0.5">Matrice de asignare a permisiunilor pe roluri</p>
        </div>
        <button onClick={() => setShowCreate(s => !s)}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          + Rol nou
        </button>
      </div>

      {/* Create role form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Creare rol nou</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nume rol *</label>
              <input value={newName} onChange={e => setNewName(e.target.value.toUpperCase())}
                className="input w-full font-mono text-sm" placeholder="MY_ROLE" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tip cont</label>
              <select value={newType} onChange={e => setNewType(e.target.value as "OFFICIAL" | "CIVIL")} className="input w-full text-sm">
                <option value="OFFICIAL">OFFICIAL</option>
                <option value="CIVIL">CIVIL</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Descriere</label>
              <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
                className="input w-full text-sm" placeholder="Opțional" />
            </div>
          </div>
          {createError && <p className="text-xs text-red-600">{createError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={creating}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
              {creating ? "Se creează..." : "Creare"}
            </button>
            <button type="button" onClick={() => setShowCreate(false)}
              className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5">
              Anulare
            </button>
          </div>
        </form>
      )}

      {/* Roles summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {roles.map(r => (
          <div key={r.id} className="card p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 text-sm truncate">{r.name}</p>
                {r.description && <p className="text-xs text-slate-400 truncate">{r.description}</p>}
              </div>
              {!r.isSystem && (
                <button onClick={() => handleDelete(r.id, r.name)}
                  className="text-red-400 hover:text-red-600 shrink-0" title="Șterge rol">
                  ✕
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ACCOUNT_COLORS[r.accountType] ?? "bg-gray-100 text-gray-600"}`}>
                {r.accountType}
              </span>
              {r.isSystem && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">sistem</span>
              )}
            </div>
            <p className="text-xs text-slate-400">{r.userCount} utilizatori · {r.permissions.length} permisiuni</p>
          </div>
        ))}
      </div>

      {/* Permission matrix */}
      <div className="space-y-6">
        {categories.map(cat => {
          const catPerms = permissions.filter(p => p.category === cat);
          return (
            <div key={cat} className="card overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{cat}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500 w-64">Permisiune</th>
                      {roles.map(r => (
                        <th key={r.id} className="px-3 py-2.5 text-xs font-semibold text-slate-500 text-center min-w-[90px]">
                          {r.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {catPerms.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-2.5">
                          <p className="font-mono text-xs text-slate-700">{p.key}</p>
                          {p.description && <p className="text-xs text-slate-400 mt-0.5">{p.description}</p>}
                        </td>
                        {roles.map(r => {
                          const assigned = r.permissions.some(rp => rp.id === p.id);
                          const key = `${r.id}:${p.id}`;
                          const busy = saving === key;
                          return (
                            <td key={r.id} className="px-3 py-2.5 text-center">
                              <button
                                onClick={() => handleToggle(r.id, p.id, assigned)}
                                disabled={busy}
                                title={assigned ? "Dezasignează" : "Asignează"}
                                className={`w-5 h-5 rounded transition-colors ${busy ? "opacity-40" : ""}
                                  ${assigned
                                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                                    : "border-2 border-slate-200 hover:border-blue-400 bg-white"
                                  }`}
                              >
                                {assigned && (
                                  <svg viewBox="0 0 12 12" className="w-3 h-3 mx-auto" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M2 6l3 3 5-5" />
                                  </svg>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
