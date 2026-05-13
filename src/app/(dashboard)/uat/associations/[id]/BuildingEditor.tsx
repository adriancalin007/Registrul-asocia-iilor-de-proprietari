"use client";
// Building (= Scară) + Unit (= Apartament) editor for UAT operators.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Unit {
  id: string; number: string; floor: number | null;
  rooms: number | null; area: number | null;
}
interface Building {
  id: string; name: string; address: string;
  builtYear: number | null; units: Unit[];
}

interface Props {
  associationId: string;
  initialBuildings: Building[];
}

const empty = { number: "", floor: "", rooms: "", area: "" };

function UnitRow({ unit, assocId, buildingId, onReload }: {
  unit: Unit; assocId: string; buildingId: string; onReload: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    number: unit.number,
    floor:  unit.floor?.toString() ?? "",
    rooms:  unit.rooms?.toString() ?? "",
    area:   unit.area?.toString() ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true); setError(null);
    const res = await fetch(`/api/uat/associations/${assocId}/buildings/${buildingId}/units/${unit.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    setEditing(false);
    onReload();
    setSaving(false);
  }

  async function del() {
    if (!confirm(`Ștergi apartamentul ${unit.number}?`)) return;
    const res = await fetch(`/api/uat/associations/${assocId}/buildings/${buildingId}/units/${unit.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    onReload();
  }

  if (editing) return (
    <tr className="bg-amber-50">
      <td className="px-3 py-2">
        <input className="input text-sm w-16" value={form.number}
          onChange={e => setForm(f => ({ ...f, number: e.target.value }))} />
      </td>
      <td className="px-3 py-2">
        <input className="input text-sm w-16" type="number" value={form.floor}
          onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} placeholder="—" />
      </td>
      <td className="px-3 py-2">
        <input className="input text-sm w-16" type="number" value={form.rooms}
          onChange={e => setForm(f => ({ ...f, rooms: e.target.value }))} placeholder="—" />
      </td>
      <td className="px-3 py-2">
        <input className="input text-sm w-20" type="number" step="0.01" value={form.area}
          onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="—" />
      </td>
      <td className="px-3 py-2 flex gap-1">
        <button type="button" onClick={save} disabled={saving}
          className="text-xs bg-emerald-500 text-white px-2 py-1 rounded-lg hover:bg-emerald-600 disabled:opacity-50">
          ✓
        </button>
        <button type="button" onClick={() => { setEditing(false); setError(null); }}
          className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-lg">
          ✕
        </button>
        {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
      </td>
    </tr>
  );

  return (
    <tr className="hover:bg-slate-50 group">
      <td className="px-3 py-2 font-mono text-sm font-medium text-slate-900">Ap. {unit.number}</td>
      <td className="px-3 py-2 text-sm text-slate-500">{unit.floor != null ? `Et. ${unit.floor}` : "—"}</td>
      <td className="px-3 py-2 text-sm text-slate-500">{unit.rooms != null ? `${unit.rooms} cam.` : "—"}</td>
      <td className="px-3 py-2 text-sm text-slate-500">{unit.area != null ? `${unit.area} m²` : "—"}</td>
      <td className="px-3 py-2 opacity-0 group-hover:opacity-100 flex gap-1">
        <button type="button" onClick={() => setEditing(true)}
          className="text-xs text-uat-600 border border-uat-200 px-2 py-1 rounded-lg hover:bg-uat-50">
          Edit
        </button>
        <button type="button" onClick={del}
          className="text-xs text-red-500 border border-red-100 px-2 py-1 rounded-lg hover:bg-red-50">
          ✕
        </button>
      </td>
    </tr>
  );
}

function AddUnitRow({ assocId, buildingId, onReload }: { assocId: string; buildingId: string; onReload: () => void }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setSaving(true); setError(null);
    const res = await fetch(`/api/uat/associations/${assocId}/buildings/${buildingId}/units`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    setForm(empty);
    setShow(false);
    onReload();
    setSaving(false);
  }

  if (!show) return (
    <tr>
      <td colSpan={5} className="px-3 py-2">
        <button type="button" onClick={() => setShow(true)}
          className="text-xs text-uat-600 hover:text-uat-700 font-medium flex items-center gap-1">
          + Apartament
        </button>
      </td>
    </tr>
  );

  return (
    <tr className="bg-slate-50">
      <td className="px-3 py-2">
        <input className="input text-sm w-16" placeholder="Nr." value={form.number}
          onChange={e => setForm(f => ({ ...f, number: e.target.value }))} autoFocus />
      </td>
      <td className="px-3 py-2">
        <input className="input text-sm w-16" type="number" placeholder="Et." value={form.floor}
          onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} />
      </td>
      <td className="px-3 py-2">
        <input className="input text-sm w-16" type="number" placeholder="Cam." value={form.rooms}
          onChange={e => setForm(f => ({ ...f, rooms: e.target.value }))} />
      </td>
      <td className="px-3 py-2">
        <input className="input text-sm w-20" type="number" step="0.01" placeholder="m²" value={form.area}
          onChange={e => setForm(f => ({ ...f, area: e.target.value }))} />
      </td>
      <td className="px-3 py-2 flex gap-1 items-center">
        <button type="button" onClick={add} disabled={saving || !form.number.trim()}
          className="text-xs bg-uat-600 text-white px-2 py-1 rounded-lg hover:bg-uat-700 disabled:opacity-50">
          {saving ? "..." : "Adaugă"}
        </button>
        <button type="button" onClick={() => { setShow(false); setError(null); }}
          className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded-lg">
          ✕
        </button>
        {error && <span className="text-xs text-red-500 ml-1">{error}</span>}
      </td>
    </tr>
  );
}

function BuildingCard({ building, assocId, onReload }: { building: Building; assocId: string; onReload: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: building.name, address: building.address, builtYear: building.builtYear?.toString() ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveBuilding() {
    setSaving(true); setError(null);
    const res = await fetch(`/api/uat/associations/${assocId}/buildings/${building.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSaving(false); return; }
    setEditing(false);
    onReload();
    setSaving(false);
  }

  async function deleteBuilding() {
    if (!confirm(`Ștergi scara "${building.name}"? Toate apartamentele vor fi șterse.`)) return;
    const res = await fetch(`/api/uat/associations/${assocId}/buildings/${building.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    onReload();
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80">
        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <input className="input text-sm w-32" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Scara 1" />
            <input className="input text-sm flex-1" value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Adresă" />
            <input className="input text-sm w-20" type="number" value={form.builtYear}
              onChange={e => setForm(f => ({ ...f, builtYear: e.target.value }))} placeholder="An" />
            <button type="button" onClick={saveBuilding} disabled={saving}
              className="text-xs bg-emerald-500 text-white px-2 py-1.5 rounded-lg hover:bg-emerald-600 disabled:opacity-50">
              ✓
            </button>
            <button type="button" onClick={() => { setEditing(false); setError(null); }}
              className="text-xs bg-slate-200 text-slate-600 px-2 py-1.5 rounded-lg">
              ✕
            </button>
            {error && <span className="text-xs text-red-500">{error}</span>}
          </div>
        ) : (
          <>
            <button type="button" onClick={() => setOpen(o => !o)}
              className="flex items-center gap-3 flex-1 text-left">
              <svg className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${open ? "rotate-90" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              <div>
                <span className="font-semibold text-slate-900 text-sm">{building.name}</span>
                <span className="text-xs text-slate-400 ml-2">{building.address}</span>
                {building.builtYear && <span className="text-xs text-slate-300 ml-2">· {building.builtYear}</span>}
              </div>
              <span className="ml-auto text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {building.units.length} ap.
              </span>
            </button>
            <div className="flex gap-1 ml-3">
              <button type="button" onClick={() => { setEditing(true); setOpen(true); }}
                className="text-xs text-uat-600 border border-uat-200 px-2 py-1 rounded-lg hover:bg-uat-50">
                Edit
              </button>
              <button type="button" onClick={deleteBuilding}
                className="text-xs text-red-500 border border-red-100 px-2 py-1 rounded-lg hover:bg-red-50">
                ✕
              </button>
            </div>
          </>
        )}
      </div>

      {/* Units table */}
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wide">
                <th className="px-3 py-2 font-semibold">Nr.</th>
                <th className="px-3 py-2 font-semibold">Etaj</th>
                <th className="px-3 py-2 font-semibold">Camere</th>
                <th className="px-3 py-2 font-semibold">Supraf.</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {building.units.map(u => (
                <UnitRow key={u.id} unit={u} assocId={assocId} buildingId={building.id} onReload={onReload} />
              ))}
              <AddUnitRow assocId={assocId} buildingId={building.id} onReload={onReload} />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function BuildingEditor({ associationId, initialBuildings }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [buildings, setBuildings] = useState<Building[]>(initialBuildings);
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", address: "", builtYear: "" });
  const [addError, setAddError] = useState<string | null>(null);

  function reload() {
    startTransition(() => { router.refresh(); });
    // Also re-fetch locally for instant feedback
    fetch(`/api/uat/associations/${associationId}/buildings`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setBuildings(data); });
  }

  async function addBuilding() {
    setAddError(null);
    const res = await fetch(`/api/uat/associations/${associationId}/buildings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newForm),
    });
    const data = await res.json();
    if (!res.ok) { setAddError(data.error); return; }
    setNewForm({ name: "", address: "", builtYear: "" });
    setShowAdd(false);
    reload();
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Structură — Scări și Apartamente</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Fiecare intrare/scară este o unitate distinctă cu apartamentele sale
          </p>
        </div>
        <button type="button" onClick={() => setShowAdd(v => !v)}
          className="text-xs bg-uat-600 text-white px-3 py-1.5 rounded-lg hover:bg-uat-700 transition-colors">
          {showAdd ? "Anulează" : "+ Scară nouă"}
        </button>
      </div>

      {showAdd && (
        <div className="mx-6 mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-800">Scară / Intrare nouă</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-text">Denumire *</label>
              <input className="input text-sm" value={newForm.name}
                onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Scara 1" />
            </div>
            <div>
              <label className="label-text">Adresă *</label>
              <input className="input text-sm" value={newForm.address}
                onChange={e => setNewForm(f => ({ ...f, address: e.target.value }))}
                placeholder="Str. Exemplu nr. 1A" />
            </div>
            <div>
              <label className="label-text">An construcție</label>
              <input className="input text-sm" type="number" value={newForm.builtYear}
                onChange={e => setNewForm(f => ({ ...f, builtYear: e.target.value }))}
                placeholder="1980" />
            </div>
          </div>
          {addError && <p className="text-sm text-red-600">{addError}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={addBuilding}
              disabled={!newForm.name.trim() || !newForm.address.trim() || isPending}
              className="btn-primary text-sm">
              Adaugă scara
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setAddError(null); }}
              className="btn-ghost text-sm">
              Anulează
            </button>
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        {buildings.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            Nicio scară înregistrată. Adaugă prima scară.
          </div>
        ) : (
          buildings.map(b => (
            <BuildingCard key={b.id} building={b} assocId={associationId} onReload={reload} />
          ))
        )}
      </div>
    </div>
  );
}
