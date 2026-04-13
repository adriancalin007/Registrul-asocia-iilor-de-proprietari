// src/app/(dashboard)/avarii/[id]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Rol } from "@prisma/client";
import Link from "next/link";
import ActualizareStareAvarie from "./ActualizareStareAvarie";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Detalii Avarie" };

interface Props { params: { id: string } }

const CULORI_STARE: Record<string, string> = {
  DESCHISA: "bg-red-100 text-red-800 border-red-200",
  IN_LUCRU: "bg-amber-100 text-amber-800 border-amber-200",
  REZOLVATA: "bg-blue-100 text-blue-800 border-blue-200",
  INCHISA: "bg-slate-100 text-slate-600 border-slate-200",
};

export default async function DetaliiAvariePage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const rol = session.user.rol as Rol;

  const avarie = await prisma.avarie.findUnique({
    where: { id: params.id },
    include: { istoricStari: { orderBy: { timestamp: "desc" } } },
  });

  if (!avarie) notFound();

  const poateGestiona = [Rol.ADMINISTRATOR, Rol.PRESEDINTE_CA].includes(rol);

  const ETICHETA_STARE: Record<string, string> = {
    DESCHISA: "Deschisă", IN_LUCRU: "În lucru",
    REZOLVATA: "Rezolvată", INCHISA: "Închisă",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <Link href="/avarii" className="hover:text-slate-700">Avarii</Link>
          <span>›</span>
          <span className="font-mono text-xs">{avarie.numarInregistrare}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">{avarie.categorie}</h1>
          <span className={`text-sm px-3 py-1 rounded-full border font-medium flex-shrink-0 ${CULORI_STARE[avarie.stare]}`}>
            {ETICHETA_STARE[avarie.stare]}
          </span>
        </div>
      </div>

      {/* Detalii */}
      <div className="card">
        <div className="card-body space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Locație</p>
              <p className="font-medium text-slate-900">{avarie.locatie}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-0.5">Data înregistrării</p>
              <p className="font-medium text-slate-900">{new Date(avarie.creatLa).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">Descriere</p>
            <p className="text-slate-800 leading-relaxed">{avarie.descriere}</p>
          </div>
          {avarie.pvReceptie && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-sm text-green-800 font-medium">PV Recepție atașat</p>
              <a href={avarie.pvReceptie} target="_blank" rel="noopener noreferrer"
                className="text-sm text-green-600 hover:underline">{avarie.pvReceptie}</a>
            </div>
          )}
        </div>
      </div>

      {/* Gestionare stare */}
      {poateGestiona && avarie.stare !== "INCHISA" && (
        <ActualizareStareAvarie avarieId={avarie.id} stareActuala={avarie.stare} />
      )}

      {/* Istoric stări */}
      {avarie.istoricStari.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">Istoric</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {avarie.istoricStari.map(s => (
              <div key={s.id} className="px-6 py-3 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-xs">
                  {s.stareNoua === "IN_LUCRU" ? "🟡" : s.stareNoua === "REZOLVATA" ? "🔵" : "⚫"}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {ETICHETA_STARE[s.stareVeche]} → {ETICHETA_STARE[s.stareNoua]}
                  </p>
                  {s.observatii && <p className="text-sm text-slate-500 mt-0.5">{s.observatii}</p>}
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0">
                  {new Date(s.timestamp).toLocaleDateString("ro-RO")}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
