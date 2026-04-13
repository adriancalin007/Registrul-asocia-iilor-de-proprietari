// src/app/(dashboard)/consultari/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Rol } from "@prisma/client";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Consultări digitale" };

const CULORI: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
  ACTIVA: "bg-green-100 text-green-800 border-green-200",
  INCHISA: "bg-blue-100 text-blue-800 border-blue-200",
  ANULATA: "bg-red-100 text-red-800 border-red-200",
};

const ETICHETA: Record<string, string> = {
  DRAFT: "Draft", ACTIVA: "Activă", INCHISA: "Închisă", ANULATA: "Anulată",
};

export default async function ConsultariPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const rol = session.user.rol as Rol;
  const userId = session.user.id;

  const cookieStore = cookies();
  let asociatieId = cookieStore.get("asociatie_activa")?.value;

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

  const consultari = await prisma.consultare.findMany({
    where: { asociatieId },
    orderBy: { creatLa: "desc" },
    include: { _count: { select: { raspunsuri: true } } },
  });

  // Pentru proprietar: ce consultări a răspuns deja
  let raspunsuriDate: string[] = [];
  if (rol === Rol.PROPRIETAR) {
    const proprietate = await prisma.proprietate.findFirst({
      where: { utilizatorId: userId, activ: true },
    });
    if (proprietate) {
      const raspunsuri = await prisma.raspunsConsultare.findMany({
        where: { proprietateId: proprietate.id },
        select: { consultareId: true },
      });
      raspunsuriDate = raspunsuri.map(r => r.consultareId);
    }
  }

  const poateInitia = [Rol.PRESEDINTE_CA, Rol.ADMINISTRATOR].includes(rol);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Consultări digitale</h1>
        {poateInitia && (
          <Link href="/consultari/nou" className="btn-primary">+ Inițiază consultare</Link>
        )}
      </div>

      <div className="space-y-3">
        {consultari.length === 0 ? (
          <div className="card card-body text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium">Nicio consultare digitală</p>
            {poateInitia && <Link href="/consultari/nou" className="btn-primary inline-flex mt-4">Inițiază prima consultare</Link>}
          </div>
        ) : consultari.map(c => {
          const aRaspuns = raspunsuriDate.includes(c.id);
          const esteActiva = c.stare === "ACTIVA";
          const expira = new Date(c.dataExpirare);
          const zileRamase = Math.ceil((expira.getTime() - Date.now()) / 86400000);

          return (
            <Link key={c.id} href={`/consultari/${c.id}`} className="card hover:shadow-md transition-all block">
              <div className="card-body flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ${
                  esteActiva ? "bg-green-50" : "bg-slate-50"
                }`}>
                  {esteActiva ? "💬" : c.stare === "INCHISA" ? "✅" : "📋"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-slate-900">{c.subiect}</p>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${CULORI[c.stare]}`}>
                      {ETICHETA[c.stare]}
                    </span>
                    {rol === Rol.PROPRIETAR && esteActiva && (
                      aRaspuns
                        ? <span className="text-xs text-green-600 font-medium">✓ Ați exprimat punctul de vedere</span>
                        : <span className="text-xs text-amber-600 font-medium animate-pulse">⚡ Așteptăm punctul dvs. de vedere</span>
                    )}
                  </div>
                  {c.descriere && <p className="text-sm text-slate-500 truncate">{c.descriere}</p>}
                  <div className="flex gap-4 mt-1 text-xs text-slate-400">
                    <span>📊 {c._count.raspunsuri} răspunsuri</span>
                    {esteActiva && zileRamase > 0 && (
                      <span className={zileRamase <= 3 ? "text-red-500 font-medium" : ""}>
                        ⏱ {zileRamase} zile rămase
                      </span>
                    )}
                    <span>{new Date(c.dataStart).toLocaleDateString("ro-RO")} — {expira.toLocaleDateString("ro-RO")}</span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
