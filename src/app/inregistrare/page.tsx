// src/app/inregistrare/page.tsx
"use client";

import { useState, useTransition } from "react";

interface MembruComitet {
  id: string;
  functie: string;
  nume: string;
  prenume: string;
  telefon: string;
  email: string;
  ciUrl: string;
}

interface FormData {
  denumire: string;
  codFiscal: string;
  adresa: string;
  cartier: string;
  numePresedinte: string;
  prenumePresedinte: string;
  emailPresedinte: string;
  telefonPresedinte: string;
  nrScari: string;
  nrApartamente: string;
  docStatut: string;
  docInregistrareJudecatorie: string;
  docMandatPresedinte: string;
  docCIPresedinte: string;
  membriComitet: MembruComitet[];
  acordGDPR: boolean;
}

const CARTIERE_SECTOR1 = [
  "Aviatorilor","Băneasa","Brâncuși","Bucur-Obor","Colentina",
  "Dorobanți","Floreasca","Grivița","Herăstrău","Pajura",
  "Parcul Carol","Parcul Tineretului","Pipera","Romană",
  "Ștefan cel Mare","Victoriei","Altul",
];

const FUNCTII_COMITET = [
  "Vicepreședinte","Secretar","Cenzor","Membru comitet executiv","Casier",
];

function genId() { return Math.random().toString(36).slice(2,9); }
function membruGol(): MembruComitet {
  return { id: genId(), functie:"", nume:"", prenume:"", telefon:"", email:"", ciUrl:"" };
}

// ── Iconuri SVG inline ──────────────────────────────────────────────────────
const Icon = {
  building: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21" /></svg>,
  user: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
  document: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
  check: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  users: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>,
};

const PASI = [
  { nr: 1, label: "Date asociație", icon: Icon.building },
  { nr: 2, label: "Conducere", icon: Icon.user },
  { nr: 3, label: "Acte & Comitet", icon: Icon.document },
  { nr: 4, label: "Confirmare", icon: Icon.check },
];

export default function InregistrarePage() {
  const [pas, setPas] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [erori, setErori] = useState<Record<string, string>>({});
  const [trimis, setTrimis] = useState(false);
  const [nrInregistrare, setNrInregistrare] = useState("");

  const [form, setForm] = useState<FormData>({
    denumire: "", codFiscal: "", adresa: "", cartier: "",
    numePresedinte: "", prenumePresedinte: "",
    emailPresedinte: "", telefonPresedinte: "",
    nrScari: "1", nrApartamente: "",
    docStatut: "", docInregistrareJudecatorie: "",
    docMandatPresedinte: "", docCIPresedinte: "",
    membriComitet: [membruGol(), membruGol()],
    acordGDPR: false,
  });

  function update(camp: keyof Omit<FormData,"membriComitet">, val: string | boolean) {
    setForm(p => ({ ...p, [camp]: val }));
    setErori(p => ({ ...p, [camp]: "" }));
  }

  function updateMembru(idx: number, camp: keyof MembruComitet, val: string) {
    setForm(p => {
      const m = [...p.membriComitet];
      m[idx] = { ...m[idx], [camp]: val };
      return { ...p, membriComitet: m };
    });
    setErori(p => ({ ...p, [`m_${idx}_${camp}`]: "" }));
  }

  function adaugaMembru() {
    if (form.membriComitet.length < 6)
      setForm(p => ({ ...p, membriComitet: [...p.membriComitet, membruGol()] }));
  }

  function stergeMembru(idx: number) {
    if (form.membriComitet.length > 2)
      setForm(p => ({ ...p, membriComitet: p.membriComitet.filter((_,i) => i !== idx) }));
  }

  function val1(): boolean {
    const e: Record<string,string> = {};
    if (!form.denumire.trim()) e.denumire = "Obligatoriu";
    if (!form.codFiscal.trim()) e.codFiscal = "Obligatoriu";
    if (!/^\d{4,10}$/.test(form.codFiscal.replace(/\s/g,""))) e.codFiscal = "4-10 cifre";
    if (!form.adresa.trim()) e.adresa = "Obligatoriu";
    if (!form.cartier) e.cartier = "Selectați cartierul";
    if (!form.nrApartamente || parseInt(form.nrApartamente) < 1) e.nrApartamente = "Obligatoriu";
    setErori(e); return Object.keys(e).length === 0;
  }

  function val2(): boolean {
    const e: Record<string,string> = {};
    if (!form.numePresedinte.trim()) e.numePresedinte = "Obligatoriu";
    if (!form.prenumePresedinte.trim()) e.prenumePresedinte = "Obligatoriu";
    if (!form.emailPresedinte.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailPresedinte))
      e.emailPresedinte = "Email invalid";
    if (!form.telefonPresedinte.trim()) e.telefonPresedinte = "Obligatoriu";
    setErori(e); return Object.keys(e).length === 0;
  }

  function val3(): boolean {
    const e: Record<string,string> = {};
    if (!form.docStatut.trim()) e.docStatut = "Obligatoriu";
    if (!form.docInregistrareJudecatorie.trim()) e.docInregistrareJudecatorie = "Obligatoriu";
    if (!form.docMandatPresedinte.trim()) e.docMandatPresedinte = "Obligatoriu";
    if (!form.docCIPresedinte.trim()) e.docCIPresedinte = "Obligatoriu";
    form.membriComitet.forEach((m, i) => {
      if (!m.functie) e[`m_${i}_functie`] = "Selectați";
      if (!m.nume.trim()) e[`m_${i}_nume`] = "Obligatoriu";
      if (!m.prenume.trim()) e[`m_${i}_prenume`] = "Obligatoriu";
      if (!m.ciUrl.trim()) e[`m_${i}_ciUrl`] = "Obligatoriu";
    });
    setErori(e); return Object.keys(e).length === 0;
  }

  function val4(): boolean {
    const e: Record<string,string> = {};
    if (!form.acordGDPR) e.acordGDPR = "Acordul este obligatoriu";
    setErori(e); return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!val4()) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/inregistrare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            codFiscal: form.codFiscal.replace(/\s/g,""),
            numeReprezentant: `${form.numePresedinte} ${form.prenumePresedinte}`,
            emailReprezentant: form.emailPresedinte,
            telefonReprezentant: form.telefonPresedinte,
            nrBlocuri: form.nrScari,
            membriComitet: form.membriComitet.map(m => ({
              ...m, nume: `${m.nume} ${m.prenume}`.trim()
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) { setErori({ general: data.eroare ?? "Eroare." }); return; }
        setNrInregistrare(data.nrInregistrare);
        setTrimis(true);
      } catch { setErori({ general: "Eroare de rețea." }); }
    });
  }

  if (trimis) return (
    <div className="text-center py-16">
      <div className="w-24 h-24 rounded-full bg-green-500/20 border-2 border-green-400/30 flex items-center justify-center mx-auto mb-6">
        <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-white mb-3">Cerere înregistrată cu succes!</h1>
      <div className="inline-block bg-white/10 backdrop-blur rounded-2xl px-6 py-3 mb-6">
        <p className="text-uat-300 text-sm">Număr de înregistrare</p>
        <p className="text-white font-mono font-bold text-xl">{nrInregistrare}</p>
      </div>
      <p className="text-uat-300 max-w-md mx-auto">
        Cererea va fi analizată de operatorul UAT. Veți fi contactat la adresa{" "}
        <span className="text-white font-medium">{form.emailPresedinte}</span> cu decizia de validare.
      </p>
      <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-5 max-w-sm mx-auto text-left">
        <p className="text-uat-200 font-semibold text-sm mb-3">Pașii următori</p>
        {["Operatorul UAT verifică actele și datele depuse",
          "Primiți email de validare sau respingere cu motivare",
          "La validare, activați contul și completați registrul locativ"].map((t,i) => (
          <div key={i} className="flex gap-3 text-sm text-uat-300 mb-2">
            <span className="w-5 h-5 rounded-full bg-uat-600/50 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
            {t}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      {/* Titlu */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white">Înregistrare Asociație de Proprietari</h1>
        <p className="text-uat-300 mt-2 max-w-lg mx-auto">
          Completați formularul în 4 pași pentru a înregistra asociația în platforma digitală a Sectorului 1
        </p>
      </div>

      {/* Indicator pași — design nou */}
      <div className="flex items-center justify-center mb-10">
        {PASI.map((p, i) => (
          <div key={p.nr} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                pas > p.nr ? "bg-green-500 shadow-lg shadow-green-500/30" :
                pas === p.nr ? "bg-white shadow-lg shadow-white/20" :
                "bg-white/10"
              }`}>
                <span className={pas > p.nr ? "text-white" : pas === p.nr ? "text-uat-800" : "text-white/40"}>
                  {pas > p.nr
                    ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    : p.icon}
                </span>
              </div>
              <span className={`text-xs font-medium hidden sm:block ${pas === p.nr ? "text-white" : "text-white/40"}`}>
                {p.label}
              </span>
            </div>
            {i < PASI.length - 1 && (
              <div className={`w-12 md:w-20 h-0.5 mx-2 mb-5 rounded-full ${pas > p.nr ? "bg-green-500" : "bg-white/10"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Card formular */}
      <div className="bg-white rounded-3xl shadow-2xl shadow-uat-950/40 overflow-hidden">

        {/* PAS 1 ── Date asociație */}
        {pas === 1 && (
          <div className="p-8 md:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-uat-50 flex items-center justify-center text-uat-600">{Icon.building}</div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Date asociație</h2>
                <p className="text-sm text-slate-400">Informații de bază despre asociație</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="label">Denumire completă <span className="text-red-500">*</span></label>
                <input type="text" value={form.denumire} onChange={e => update("denumire", e.target.value)}
                  placeholder="ex: Asociația de Proprietari Nr. 123 Sector 1"
                  className={`input ${erori.denumire ? "border-red-400 bg-red-50" : ""}`} />
                {erori.denumire && <p className="text-red-500 text-xs mt-1 flex items-center gap-1">⚠ {erori.denumire}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Cod fiscal (CIF) <span className="text-red-500">*</span></label>
                  <input type="text" value={form.codFiscal} onChange={e => update("codFiscal", e.target.value)}
                    placeholder="ex: 12345678"
                    className={`input ${erori.codFiscal ? "border-red-400 bg-red-50" : ""}`} />
                  {erori.codFiscal && <p className="text-red-500 text-xs mt-1">⚠ {erori.codFiscal}</p>}
                </div>
                <div>
                  <label className="label">Cartier <span className="text-red-500">*</span></label>
                  <select value={form.cartier} onChange={e => update("cartier", e.target.value)}
                    className={`input ${erori.cartier ? "border-red-400 bg-red-50" : ""}`}>
                    <option value="">— Selectați —</option>
                    {CARTIERE_SECTOR1.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {erori.cartier && <p className="text-red-500 text-xs mt-1">⚠ {erori.cartier}</p>}
                </div>
              </div>

              <div>
                <label className="label">Adresa sediului asociației <span className="text-red-500">*</span></label>
                <input type="text" value={form.adresa} onChange={e => update("adresa", e.target.value)}
                  placeholder="ex: Str. Exemplu nr. 10, bl. A"
                  className={`input ${erori.adresa ? "border-red-400 bg-red-50" : ""}`} />
                {erori.adresa && <p className="text-red-500 text-xs mt-1">⚠ {erori.adresa}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Număr scări</label>
                  <input type="number" min="1" value={form.nrScari} onChange={e => update("nrScari", e.target.value)} className="input" />
                </div>
                <div>
                  <label className="label">Număr apartamente <span className="text-red-500">*</span></label>
                  <input type="number" min="1" value={form.nrApartamente} onChange={e => update("nrApartamente", e.target.value)}
                    placeholder="ex: 48"
                    className={`input ${erori.nrApartamente ? "border-red-400 bg-red-50" : ""}`} />
                  {erori.nrApartamente && <p className="text-red-500 text-xs mt-1">⚠ {erori.nrApartamente}</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <button type="button" onClick={() => val1() && setPas(2)}
                className="btn-primary px-8 py-2.5 rounded-xl">
                Continuă <span className="ml-1">→</span>
              </button>
            </div>
          </div>
        )}

        {/* PAS 2 ── Date Președinte CA */}
        {pas === 2 && (
          <div className="p-8 md:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-uat-50 flex items-center justify-center text-uat-600">{Icon.user}</div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Date Președinte Comitet Executiv</h2>
                <p className="text-sm text-slate-400">Persoana care reprezintă legal asociația</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nume <span className="text-red-500">*</span></label>
                  <input type="text" value={form.numePresedinte} onChange={e => update("numePresedinte", e.target.value)}
                    placeholder="ex: Popescu"
                    className={`input ${erori.numePresedinte ? "border-red-400 bg-red-50" : ""}`} />
                  {erori.numePresedinte && <p className="text-red-500 text-xs mt-1">⚠ {erori.numePresedinte}</p>}
                </div>
                <div>
                  <label className="label">Prenume <span className="text-red-500">*</span></label>
                  <input type="text" value={form.prenumePresedinte} onChange={e => update("prenumePresedinte", e.target.value)}
                    placeholder="ex: Ion"
                    className={`input ${erori.prenumePresedinte ? "border-red-400 bg-red-50" : ""}`} />
                  {erori.prenumePresedinte && <p className="text-red-500 text-xs mt-1">⚠ {erori.prenumePresedinte}</p>}
                </div>
              </div>

              <div>
                <label className="label">Adresă email <span className="text-red-500">*</span></label>
                <input type="email" value={form.emailPresedinte} onChange={e => update("emailPresedinte", e.target.value)}
                  placeholder="ex: ion.popescu@email.ro"
                  className={`input ${erori.emailPresedinte ? "border-red-400 bg-red-50" : ""}`} />
                {erori.emailPresedinte && <p className="text-red-500 text-xs mt-1">⚠ {erori.emailPresedinte}</p>}
              </div>

              <div>
                <label className="label">Telefon <span className="text-red-500">*</span></label>
                <input type="tel" value={form.telefonPresedinte} onChange={e => update("telefonPresedinte", e.target.value)}
                  placeholder="ex: 0721 000 000"
                  className={`input ${erori.telefonPresedinte ? "border-red-400 bg-red-50" : ""}`} />
                {erori.telefonPresedinte && <p className="text-red-500 text-xs mt-1">⚠ {erori.telefonPresedinte}</p>}
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button type="button" onClick={() => setPas(1)} className="btn-secondary rounded-xl">← Înapoi</button>
              <button type="button" onClick={() => val2() && setPas(3)} className="btn-primary px-8 py-2.5 rounded-xl">Continuă →</button>
            </div>
          </div>
        )}

        {/* PAS 3 ── Acte + Comitet */}
        {pas === 3 && (
          <div className="p-8 md:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-uat-50 flex items-center justify-center text-uat-600">{Icon.document}</div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Acte obligatorii și Comitet executiv</h2>
                <p className="text-sm text-slate-400">Introduceți linkuri Google Drive / WeTransfer etc.</p>
              </div>
            </div>

            {/* Acte */}
            <div className="bg-slate-50 rounded-2xl p-5 mb-6 space-y-4">
              <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-uat-600 text-white text-xs flex items-center justify-center">1</span>
                Acte obligatorii
              </h3>
              {[
                { camp: "docStatut" as const, label: "Statut asociație" },
                { camp: "docInregistrareJudecatorie" as const, label: "Dovadă înregistrare judecătorie" },
                { camp: "docMandatPresedinte" as const, label: "Contract de mandat Președinte CA" },
                { camp: "docCIPresedinte" as const, label: "Copie CI Președinte CA" },
              ].map(({ camp, label }) => (
                <div key={camp}>
                  <label className="label text-xs">{label} <span className="text-red-500">*</span></label>
                  <div className="flex gap-2">
                    <input type="url" value={form[camp]} onChange={e => update(camp, e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className={`input text-sm ${erori[camp] ? "border-red-400 bg-red-50" : ""}`} />
                  </div>
                  {erori[camp] && <p className="text-red-500 text-xs mt-1">⚠ {erori[camp]}</p>}
                </div>
              ))}
            </div>

            {/* Membri comitet */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-700 text-sm flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-uat-600 text-white text-xs flex items-center justify-center">2</span>
                  Membrii Comitetului Executiv
                  <span className="text-xs text-slate-400 font-normal">(minim 2, maxim 6)</span>
                </h3>
                {form.membriComitet.length < 6 && (
                  <button type="button" onClick={adaugaMembru}
                    className="text-sm text-uat-600 hover:text-uat-800 font-medium flex items-center gap-1">
                    <span className="text-lg leading-none">+</span> Adaugă
                  </button>
                )}
              </div>

              {form.membriComitet.map((m, idx) => (
                <div key={m.id} className="border border-slate-200 rounded-2xl p-5 space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Membru {idx + 1}</span>
                    {form.membriComitet.length > 2 && (
                      <button type="button" onClick={() => stergeMembru(idx)}
                        className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1">
                        ✕ Șterge
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="label text-xs">Funcție <span className="text-red-500">*</span></label>
                      <select value={m.functie} onChange={e => updateMembru(idx, "functie", e.target.value)}
                        className={`input text-sm ${erori[`m_${idx}_functie`] ? "border-red-400" : ""}`}>
                        <option value="">— Selectați —</option>
                        {FUNCTII_COMITET.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                      {erori[`m_${idx}_functie`] && <p className="text-red-500 text-xs mt-1">⚠</p>}
                    </div>
                    <div>
                      <label className="label text-xs">Nume <span className="text-red-500">*</span></label>
                      <input type="text" value={m.nume} onChange={e => updateMembru(idx, "nume", e.target.value)}
                        placeholder="Popescu"
                        className={`input text-sm ${erori[`m_${idx}_nume`] ? "border-red-400" : ""}`} />
                    </div>
                    <div>
                      <label className="label text-xs">Prenume <span className="text-red-500">*</span></label>
                      <input type="text" value={m.prenume} onChange={e => updateMembru(idx, "prenume", e.target.value)}
                        placeholder="Ion"
                        className={`input text-sm ${erori[`m_${idx}_prenume`] ? "border-red-400" : ""}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs">Telefon (opțional)</label>
                      <input type="tel" value={m.telefon} onChange={e => updateMembru(idx, "telefon", e.target.value)}
                        placeholder="0721 000 000" className="input text-sm" />
                    </div>
                    <div>
                      <label className="label text-xs">Email (opțional)</label>
                      <input type="email" value={m.email} onChange={e => updateMembru(idx, "email", e.target.value)}
                        placeholder="email@exemplu.ro" className="input text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="label text-xs">Link copie CI <span className="text-red-500">*</span></label>
                    <input type="url" value={m.ciUrl} onChange={e => updateMembru(idx, "ciUrl", e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className={`input text-sm ${erori[`m_${idx}_ciUrl`] ? "border-red-400" : ""}`} />
                    {erori[`m_${idx}_ciUrl`] && <p className="text-red-500 text-xs mt-1">⚠ {erori[`m_${idx}_ciUrl`]}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-8">
              <button type="button" onClick={() => setPas(2)} className="btn-secondary rounded-xl">← Înapoi</button>
              <button type="button" onClick={() => val3() && setPas(4)} className="btn-primary px-8 py-2.5 rounded-xl">Continuă →</button>
            </div>
          </div>
        )}

        {/* PAS 4 ── Confirmare */}
        {pas === 4 && (
          <div className="p-8 md:p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-uat-50 flex items-center justify-center text-uat-600">{Icon.check}</div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Verificare și confirmare</h2>
                <p className="text-sm text-slate-400">Verificați datele înainte de trimitere</p>
              </div>
            </div>

            {/* Sumar */}
            <div className="space-y-4 mb-6">
              {/* Asociație */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Asociație</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
                  <span className="text-slate-400">Denumire</span><span className="font-medium text-slate-900">{form.denumire}</span>
                  <span className="text-slate-400">CIF</span><span className="text-slate-900">{form.codFiscal}</span>
                  <span className="text-slate-400">Adresă</span><span className="text-slate-900">{form.adresa}</span>
                  <span className="text-slate-400">Cartier</span><span className="text-slate-900">{form.cartier}</span>
                  <span className="text-slate-400">Structură</span><span className="text-slate-900">{form.nrApartamente} apt. · {form.nrScari} scări</span>
                </div>
              </div>

              {/* Președinte */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Președinte CA</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
                  <span className="text-slate-400">Nume</span><span className="font-medium text-slate-900">{form.numePresedinte} {form.prenumePresedinte}</span>
                  <span className="text-slate-400">Email</span><span className="text-slate-900">{form.emailPresedinte}</span>
                  <span className="text-slate-400">Telefon</span><span className="text-slate-900">{form.telefonPresedinte}</span>
                </div>
              </div>

              {/* Acte */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Acte depuse</p>
                <div className="space-y-1.5">
                  {[
                    ["Statut", form.docStatut],
                    ["Înregistrare judecătorie", form.docInregistrareJudecatorie],
                    ["Mandat Președinte", form.docMandatPresedinte],
                    ["CI Președinte", form.docCIPresedinte],
                  ].map(([l,u]) => (
                    <div key={l} className="flex items-center gap-2 text-sm">
                      <span className="text-green-500 flex-shrink-0">✓</span>
                      <span className="text-slate-500 flex-shrink-0">{l}:</span>
                      <a href={u} target="_blank" rel="noopener noreferrer" className="text-uat-600 hover:underline truncate">{u}</a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comitet */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Comitet executiv ({form.membriComitet.length} membri)</p>
                <div className="space-y-1.5">
                  {form.membriComitet.map((m,i) => (
                    <div key={m.id} className="flex items-center gap-2 text-sm">
                      <span className="text-green-500">✓</span>
                      <span className="font-medium text-slate-900">{m.nume} {m.prenume}</span>
                      <span className="text-slate-400">—</span>
                      <span className="text-slate-600">{m.functie}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* GDPR */}
            <div className={`border rounded-2xl p-5 mb-6 ${erori.acordGDPR ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.acordGDPR} onChange={e => update("acordGDPR", e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-uat-600 focus:ring-uat-500" />
                <span className="text-sm text-slate-700">
                  Am citit și sunt de acord cu prelucrarea datelor cu caracter personal ale membrilor
                  comitetului executiv de către Primăria Sectorului 1 București, în scopul verificării cererii
                  de înregistrare, conform Regulamentului (UE) 2016/679 (GDPR). Confirm că am obținut
                  acordul fiecărei persoane ale cărei date le-am furnizat.
                </span>
              </label>
              {erori.acordGDPR && <p className="text-red-500 text-sm mt-2 ml-7">⚠ {erori.acordGDPR}</p>}
            </div>

            {erori.general && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-700 text-sm">⚠ {erori.general}</p>
              </div>
            )}

            <div className="flex justify-between">
              <button type="button" onClick={() => setPas(3)} className="btn-secondary rounded-xl">← Înapoi</button>
              <button type="button" onClick={handleSubmit} disabled={isPending}
                className="btn-primary px-8 py-2.5 rounded-xl">
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Se trimite...
                  </span>
                ) : "Trimite cererea"}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-uat-400 text-sm mt-6">
        Aveți deja cont?{" "}
        <a href="/login" className="text-uat-300 hover:text-white underline">Autentificați-vă aici</a>
      </p>
    </div>
  );
}
