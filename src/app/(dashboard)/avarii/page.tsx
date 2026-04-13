// src/app/(dashboard)/avarii/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Rol } from "@prisma/client";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Avarii & Mentenanță" };

const CULORI_STARE: Record<string, string> = {
  DESCHISA: "bg-red-100 text-red-800 border-red-200",
  IN_LUCRU: "bg-amber-100 text-amber-800 border-amber-200",
  REZOLVATA: "bg-blue-100 text-blue-800 border-blue-200",
  INCHISA: "bg-slate-100 text-slate-600 border-slate-200",
};

const ETICHETA_STARE: Record<string, string> = {
  DESCHISA: "Deschisă",
  IN_LUCRU: "În lucru",
  REZOLVATA: "Rezolvată",
  INCHISA: "Închisă",
};

const ICON_STARE: Record<string, string> = {
  DESCHISA: "🔴",
  IN_LUCRU: "🟡",
  REZOLVATA: "🔵",
  INCHISA: "⚫",
};

export default async function AvariiPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const rol = session.user.rol as Rol;
  const userId = session.user.id;

  const cookieStore = cookies();
  const asociatieActivaId = cookieStore.get("asociatie_activa")?.value;

  let asociatieId: string | undefined = asociatieActivaId;
  if (!asociatieId) {
    if (rol === Rol.PROPRIETAR) {
      const prop = await prisma.proprietate.findFirst({
        where: { utilizatorId: userId, activ: true },
        include: { apartament: { include: { bloc: true } } },
      });
      asociatieId = prop?.apartament.bloc.asociatieId;
    } else {
      const mandat = await prisma.mandat.findFirst({ where: { utilizatorId: userId, activ: true } });
      asociatieId = mandat?.asociatieId;
    }
  }

  if (!asociatieId) return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <p className="text-slate-400">Nu aveți acces la nicio asociație.</p>
    </div>
  );

  const avarii = await prisma.avarie.findMany({
    where: { asociatieId },
    orderBy: [{ stare: "asc" }, { creatLa: "desc" }],
  });

  const poateAdauga = [Rol.ADMINISTRATOR, Rol.PRESEDINTE_CA, Rol.PROPRIETAR].includes(rol);
  const poateGestiona = [Rol.ADMINISTRATOR, Rol.PRESEDINTE_CA].includes(rol);

  const stats = {
    deschise: avarii.filter(a => a.stare === "DESCHISA").length,
    inLucru: avarii.filter(a => a.stare === "IN_LUCRU").length,
    rezolvate: avarii.filter(a => a.stare === "REZOLVATA").length,
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Avarii & Mentenanță</h1>
        {poateAdauga && (
          <Link href="/avarii/nou" className="btn-primary">+ Înregistrează avarie</Link>
        )}
      </div>

      {/* Carduri statistici rapide */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Deschise", valoare: stats.deschise, culoare: "border-red-200 bg-red-50", text: "text-red-700" },
          { label: "În lucru", valoare: stats.inLucru, culoare: "border-amber-200 bg-amber-50", text: "text-amber-700" },
          { label: "Rezolvate", valoare: stats.rezolvate, culoare: "border-blue-200 bg-blue-50", text: "text-blue-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border ${s.culoare} p-4 text-center`}>
            <p className={`text-3xl font-bold ${s.text}`}>{s.valoare}</p>
            <p className="text-sm text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Lista avarii */}
      <div className="space-y-3">
        {avarii.length === 0 ? (
          <div className="card card-body text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium">Nicio avarie înregistrată</p>
            <p className="text-slate-400 text-sm mt-1">Toate sistemele funcționează normal</p>
            {poateAdauga && (
              <Link href="/avarii/nou" className="btn-primary inline-flex mt-4">+ Înregistrează prima avarie</Link>
            )}
          </div>
        ) : avarii.map(av => (
          <Link key={av.id} href={`/avarii/${av.id}`}
            className="card hover:shadow-md transition-all block">
            <div className="card-body flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ${
                av.stare === "DESCHISA" ? "bg-red-50" :
                av.stare === "IN_LUCRU" ? "bg-amber-50" :
                av.stare === "REZOLVATA" ? "bg-blue-50" : "bg-slate-50"
              }`}>
                {ICON_STARE[av.stare]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-mono text-xs text-slate-400">{av.numarInregistrare}</p>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${CULORI_STARE[av.stare]}`}>
                    {ETICHETA_STARE[av.stare]}
                  </span>
                </div>
                <p className="font-semibold text-slate-900">{av.categorie} · {av.locatie}</p>
                <p className="text-sm text-slate-500 truncate mt-0.5">{av.descriere}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-400">{new Date(av.creatLa).toLocaleDateString("ro-RO")}</p>
                <svg className="w-4 h-4 text-slate-300 ml-auto mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
