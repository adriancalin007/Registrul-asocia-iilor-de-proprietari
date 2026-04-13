// src/app/(dashboard)/adeverinte/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Rol } from "@prisma/client";
import Link from "next/link";
import AprobareAdeverinta from "./AprobareAdeverinta";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Adeverințe" };

export default async function AdeverintePage() {
  const session = await auth();
  if (!session) redirect("/login");

  const rol = session.user.rol as Rol;
  const userId = session.user.id;

  // ── PROPRIETAR — vede propriile adeverințe ──────────────────
  if (rol === Rol.PROPRIETAR) {
    const proprietate = await prisma.proprietate.findFirst({
      where: { utilizatorId: userId, activ: true },
      include: {
        apartament: {
          include: { bloc: { include: { asociatie: true } } },
        },
      },
    });

    const adeverinte = proprietate
      ? await prisma.adeverinta.findMany({
          where: { proprietateId: proprietate.id },
          orderBy: { creatLa: "desc" },
        })
      : [];

    const culoriStare: Record<string, string> = {
      SOLICITATA: "badge-asteptare",
      APROBATA: "badge-info",
      RESPINSA: "badge-eroare",
      EMISA: "badge-activ",
      EXPIRATA: "badge-inactiv",
    };

    const etichetaStare: Record<string, string> = {
      SOLICITATA: "Solicitată",
      APROBATA: "Aprobată",
      RESPINSA: "Respinsă",
      EMISA: "Emisă",
      EXPIRATA: "Expirată",
    };

    const tipEticheta: Record<string, string> = {
      PLATI_LA_ZI: "Plăți la zi",
      PROPRIETATE: "Proprietate",
      FOND_RULMENT: "Fond de rulment",
      GENERALA: "Generală",
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Adeverințele mele</h1>
            {proprietate && (
              <p className="text-slate-500 mt-1 text-sm">
                Ap. {proprietate.apartament.numar} · {proprietate.apartament.bloc.asociatie.denumire}
              </p>
            )}
          </div>
          {proprietate && (
            <Link href="/adeverinte/nou" className="btn-primary">
              + Solicită adeverință
            </Link>
          )}
        </div>

        <div className="card">
          <div className="divide-y divide-slate-100">
            {adeverinte.length === 0 ? (
              <div className="card-body text-center py-12">
                <svg className="w-12 h-12 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
                <p className="text-slate-400 text-sm mb-4">Nu aveți adeverințe solicitate</p>
                {proprietate && (
                  <Link href="/adeverinte/nou" className="btn-primary inline-flex">
                    Solicită prima adeverință
                  </Link>
                )}
              </div>
            ) : (
              adeverinte.map((a) => (
                <div key={a.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-900">
                        Adeverință {tipEticheta[a.tip] ?? a.tip}
                      </p>
                      <span className={`badge text-xs ${culoriStare[a.stare] ?? "badge-info"}`}>
                        {etichetaStare[a.stare] ?? a.stare}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Solicitată: {new Date(a.dataSolicitat).toLocaleDateString("ro-RO")}
                      {a.dataEmitere && ` · Emisă: ${new Date(a.dataEmitere).toLocaleDateString("ro-RO")}`}
                    </p>
                    {a.observatii && (
                      <p className="text-sm text-slate-500 mt-1">{a.observatii}</p>
                    )}
                  </div>
                  <div>
                    {a.stare === "EMISA" && a.calePDF && (
                      <a
                        href={a.calePDF}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary text-sm"
                      >
                        Descarcă PDF
                      </a>
                    )}
                    {a.stare === "EMISA" && !a.calePDF && (
                      <Link href={`/adeverinte/${a.id}/pdf`} className="btn-primary text-sm">
                        Generează PDF
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── ADMINISTRATOR / PRESEDINTE_CA — gestionează solicitările ─
  const cookieStore = cookies();
  const asociatieActivaId = cookieStore.get("asociatie_activa")?.value;

  let asociatieId: string | undefined = asociatieActivaId;
  if (!asociatieId) {
    const mandat = await prisma.mandat.findFirst({
      where: { utilizatorId: userId, activ: true },
    });
    asociatieId = mandat?.asociatieId;
  }

  if (!asociatieId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-slate-400">Nu aveți acces la nicio asociație.</p>
      </div>
    );
  }

  const adeverinte = await prisma.adeverinta.findMany({
    where: { asociatieId },
    orderBy: { creatLa: "desc" },
    include: {
      proprietate: {
        include: {
          utilizator: { select: { numeComplet: true, email: true } },
          apartament: { select: { numar: true } },
        },
      },
    },
  });

  const pendinte = adeverinte.filter((a) => a.stare === "SOLICITATA");
  const restul = adeverinte.filter((a) => a.stare !== "SOLICITATA");

  const culoriStare: Record<string, string> = {
    SOLICITATA: "badge-asteptare",
    APROBATA: "badge-info",
    RESPINSA: "badge-eroare",
    EMISA: "badge-activ",
    EXPIRATA: "badge-inactiv",
  };

  const tipEticheta: Record<string, string> = {
    PLATI_LA_ZI: "Plăți la zi",
    PROPRIETATE: "Proprietate",
    FOND_RULMENT: "Fond de rulment",
    GENERALA: "Generală",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Adeverințe</h1>

      {/* Solicitări în așteptare */}
      {pendinte.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse inline-block" />
            {pendinte.length} solicitare(i) în așteptare
          </h2>
          {pendinte.map((a) => (
            <div key={a.id} className="card border-yellow-200">
              <div className="card-body space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-900">
                      Adeverință {tipEticheta[a.tip] ?? a.tip}
                    </p>
                    <p className="text-sm text-slate-600 mt-0.5">
                      {a.proprietate.utilizator.numeComplet} — Ap. {a.proprietate.apartament.numar}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {a.proprietate.utilizator.email} · Solicitat: {new Date(a.dataSolicitat).toLocaleDateString("ro-RO")}
                    </p>
                  </div>
                  <span className="badge badge-asteptare flex-shrink-0">Așteptare</span>
                </div>
                <AprobareAdeverinta
                  adeverintaId={a.id}
                  operatorId={userId}
                  asociatieId={asociatieId!}
                  tip={a.tip}
                  proprietar={a.proprietate.utilizator.numeComplet}
                  apartament={a.proprietate.apartament.numar}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Istoricul adeverințelor */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Toate adeverințele</h2>
          <span className="text-sm text-slate-500">{adeverinte.length} total</span>
        </div>
        <div className="divide-y divide-slate-100">
          {adeverinte.length === 0 ? (
            <div className="card-body text-center py-8 text-slate-400 text-sm">
              Nu există adeverințe solicitate încă.
            </div>
          ) : (
            adeverinte.map((a) => (
              <div key={a.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-slate-900">
                      {tipEticheta[a.tip] ?? a.tip} — Ap. {a.proprietate.apartament.numar}
                    </p>
                    <span className={`badge text-xs ${culoriStare[a.stare] ?? "badge-info"}`}>
                      {a.stare}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {a.proprietate.utilizator.numeComplet} · {new Date(a.dataSolicitat).toLocaleDateString("ro-RO")}
                  </p>
                </div>
                {a.stare === "EMISA" && a.calePDF && (
                  <a href={a.calePDF} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs py-1.5 px-3">
                    PDF
                  </a>
                )}
                {a.stare === "EMISA" && !a.calePDF && (
                  <Link href={`/adeverinte/${a.id}/pdf`} className="btn-secondary text-xs py-1.5 px-3">
                    Generează PDF
                  </Link>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
