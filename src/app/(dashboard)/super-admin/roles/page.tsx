"use client";

import { useEffect, useState } from "react";

const ALL_NAV = [
  { href: "/dashboard",            label: "Dashboard" },
  { href: "/apartament",           label: "Apartamentul meu" },
  { href: "/scoli",                label: "Școli" },
  { href: "/documente",            label: "Documente" },
  { href: "/consultari",           label: "Consultări" },
  { href: "/adeverinte",           label: "Adeverințe" },
  { href: "/avarii",               label: "Avarii" },
  { href: "/sesizari",             label: "Sesizări" },
  { href: "/documente-oficiale",   label: "Documente oficiale" },
  { href: "/situatii-financiare",  label: "Situații financiare" },
  { href: "/furnizori",            label: "Furnizori" },
  { href: "/facturi",              label: "Facturi" },
  { href: "/lucrari",              label: "Lucrări" },
  { href: "/locatari",             label: "Locatari" },
  { href: "/financiare",           label: "Financiare" },
  { href: "/rapoarte",             label: "Rapoarte" },
];

const ROLES = ["OWNER", "MANAGER", "BOARD_PRESIDENT", "AUDITOR", "SUPPLIER"] as const;

const ROLE_LABELS: Record<string, string> = {
  OWNER:           "Proprietar",
  MANAGER:         "Administrator",
  BOARD_PRESIDENT: "Președinte CA",
  AUDITOR:         "Cenzor",
  SUPPLIER:        "Furnizor",
};

type NavConfig = Record<string, string[]>;

export default function RolesPage() {
  const [config, setConfig] = useState<NavConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/portal-config")
      .then(r => r.json())
      .then(data => { setConfig(data.navConfig ?? {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function toggle(role: string, href: string) {
    setConfig(prev => {
      const current = prev[role] ?? [];
      const next = current.includes(href)
        ? current.filter(h => h !== href)
        : [...current, href];
      return { ...prev, [role]: next };
    });
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/portal-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ navConfig: config }),
    });
    if (res.ok) {
      setSaved(true);
    } else {
      const d = await res.json();
      setError(d.error ?? "Eroare la salvare");
    }
    setSaving(false);
  }

  if (loading) return <div className="p-8 text-sm text-gray-500">Se încarcă...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Editor roluri — meniu navigare</h1>
        <p className="text-sm text-gray-500 mt-1">
          Bifează elementele de meniu vizibile pentru fiecare rol de utilizator.
          Modificările sunt salvate în baza de date și intră în vigoare imediat.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 w-48">Element meniu</th>
              {ROLES.map(role => (
                <th key={role} className="px-4 py-3 font-semibold text-gray-700 text-center">
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_NAV.map((item, i) => (
              <tr key={item.href} className={i % 2 === 0 ? "bg-gray-50/50" : ""}>
                <td className="px-4 py-2.5 text-gray-800">
                  <span className="font-medium">{item.label}</span>
                  <span className="block text-xs text-gray-400">{item.href}</span>
                </td>
                {ROLES.map(role => {
                  const checked = (config[role] ?? []).includes(item.href);
                  return (
                    <td key={role} className="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(role, item.href)}
                        className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 mt-5">
        <button
          onClick={save}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {saving ? "Se salvează..." : "Salvează configurația"}
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">Salvat cu succes</span>}
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>
    </div>
  );
}
