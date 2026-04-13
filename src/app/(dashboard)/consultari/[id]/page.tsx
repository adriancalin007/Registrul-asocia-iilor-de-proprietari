// src/app/(dashboard)/consultari/[id]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Rol } from "@prisma/client";
import Link from "next/link";
import ExprimaVot from "./ExprimaVot";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Consultare digitală" };

interface Props { params: { id: string } }

export default async function DetaliiConsultarePage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const rol = session.user.rol as Rol;
  const userId = session.user.id;

  const consultare = await prisma.consultare.findUnique({
    where: { id: params.id },
    include: { raspunsuri: true },
  });

  if (!consultare) notFound();

  const optiuni = consultare.optiuni as string[];
  const esteActiva = consultare.stare === "ACTIVA" && new Date(consultare.dataExpirare) > new Date();

  // Verificăm dacă proprietarul a răspuns deja
  let proprietateId: string | null = null;
  let aRaspuns = false;
  let raspunsExistent: number | null = null;

  if (rol === Rol.PROPRIETAR) {
    const proprietate = await prisma.proprietate.findFirst({
      where: { utilizatorId: userId, activ: true },
    });
    proprietateId = proprietate?.id ?? null;

    if (proprietateId) {
      const raspuns = await prisma.raspunsConsultare.findUnique({
        where: { consultareId_proprietateId: { consultareId: consultare.id, proprietateId } },
      });
      aRaspuns = !!raspuns;
      raspunsExistent = raspuns?.optiuneIndex ?? null;
    }
  }

  // Statistici răspunsuri (agregate — anonime în raport)
  const distributiePeOptiuni = optiuni.map((_, idx) => ({
    optiune: optiuni[idx],
    count: consultare.raspunsuri.filter(r => r.optiuneIndex === idx).length,
  }));
  const totalRaspunsuri = consultare.raspunsuri.length;

  const poateInchide = [Rol.PRESEDINTE_CA, Rol.ADMINISTRATOR].includes(rol) && consultare.stare === "ACTIVA";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <Link href="/consultari" className="hover:text-slate-700">Consultări</Link>
          <span>›</span><span className="truncate">{consultare.subiect}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">{consultare.subiect}</h1>
          <span className={`text-sm px-3 py-1 rounded-full border font-medium flex-shrink-0 ${
            consultare.stare === "ACTIVA" ? "bg-green-100 text-green-800 border-green-200" :
            "bg-slate-100 text-slate-600 border-slate-200"
          }`}>
            {consultare.stare === "ACTIVA" ? "Activă" : consultare.stare}
          </span>
        </div>
        <div className="flex gap-4 mt-2 text-sm text-slate-400">
          <span>📅 {new Date(consultare.dataStart).toLocaleDateString("ro-RO")} — {new Date(consultare.dataExpirare).toLocaleDateString("ro-RO")}</span>
          <span>💬 {totalRaspunsuri} răspunsuri</span>
        </div>
      </div>

      {consultare.descriere && (
        <div className="card card-body">
          <p className="text-slate-700 leading-relaxed">{consultare.descriere}</p>
        </div>
      )}

      {/* Exprimare punct de vedere — proprietar */}
      {rol === Rol.PROPRIETAR && esteActiva && proprietateId && (
        <ExprimaVot
          consultareId={consultare.id}
          proprietateId={proprietateId}
          optiuni={optiuni}
          aRaspuns={aRaspuns}
          raspunsExistent={raspunsExistent}
        />
      )}

      {rol === Rol.PROPRIETAR && aRaspuns && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-green-500 text-xl">✓</span>
          <div>
            <p className="font-medium text-green-800">Ați exprimat deja punctul de vedere</p>
            <p className="text-sm text-green-600">Opțiunea selectată: <strong>{raspunsExistent !== null ? optiuni[raspunsExistent] : ""}</strong></p>
          </div>
        </div>
      )}

      {/* Rezultate agregate */}
      {(rol !== Rol.PROPRIETAR || !esteActiva || consultare.stare === "INCHISA") && totalRaspunsuri > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">Distribuție puncte de vedere</h2>
            <p className="text-xs text-slate-400 mt-0.5">Date agregate — anonime</p>
          </div>
          <div className="card-body space-y-3">
            {distributiePeOptiuni.map(({ optiune, count }) => {
              const procent = totalRaspunsuri > 0 ? Math.round((count / totalRaspunsuri) * 100) : 0;
              return (
                <div key={optiune}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{optiune}</span>
                    <span className="text-slate-500">{count} ({procent}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className="bg-uat-600 h-2.5 rounded-full transition-all" style={{ width: `${procent}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
              Total: {totalRaspunsuri} puncte de vedere exprimate
            </p>
          </div>
        </div>
      )}

      {/* Acțiuni administrator */}
      {poateInchide && (
        <div className="card border-slate-200">
          <div className="card-body">
            <p className="text-sm text-slate-500 mb-3">
              La închiderea consultării, se generează automat raportul agregat pentru dosarul AGA.
            </p>
            <a href={`/api/consultari/${consultare.id}/raport`}
              className="btn-secondary text-sm mr-3">
              📄 Exportă raport PDF
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
