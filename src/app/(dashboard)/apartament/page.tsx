import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Apartamentul meu" };

const TIP_UNITATE_LABEL: Record<string, string> = {
  APARTAMENT: "Apartament",
  GARAJ: "Garaj",
  BOXA: "Boxă",
  SPATIU_COMERCIAL: "Spațiu comercial",
  PARCARE: "Parcare",
};

const DESTINATIE_LABEL: Record<string, string> = {
  REZIDENTIALA: "Rezidențială",
  NEREZIDENTIALA: "Nerezidențială",
  MIXTA: "Mixtă",
};

const TIP_ANEXA_LABEL: Record<string, string> = {
  BOXA: "Boxă",
  GARAJ: "Garaj",
  PARCARE: "Parcare",
  PIVNITA: "Pivniță",
  MANSARDA: "Mansardă",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-2.5 border-b border-slate-100 last:border-0 flex justify-between gap-4 items-baseline">
      <dt className="text-xs text-slate-400 shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-slate-900 text-right">{value}</dd>
    </div>
  );
}

export default async function ApartamentPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== UserRole.OWNER) redirect("/dashboard");

  const ownership = await prisma.ownership.findFirst({
    where: { userId: session.user.id, isActive: true },
    include: {
      unit: {
        include: {
          building: {
            include: {
              association: { select: { name: true, address: true, neighborhood: true } },
            },
          },
          anexe: { orderBy: [{ tipAnexa: "asc" }, { numarAnexa: "asc" }] },
          detineri: {
            where: { dataIesire: null },
            include: { persoana: { select: { nume: true, prenume: true } } },
            orderBy: { cotaProprietate: "desc" },
          },
        },
      },
    },
  });

  if (!ownership) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Apartamentul meu</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm text-amber-800 font-medium">Cont neconectat la o unitate imobiliară</p>
          <p className="text-sm text-amber-700 mt-1">Contactează administratorul asociației pentru a-ți conecta contul.</p>
        </div>
      </div>
    );
  }

  const unit = ownership.unit;
  const building = unit.building;
  const assoc = building.association;
  const hasDitl = !!(unit.numarMatricolaFiscala || unit.numarCadastral || unit.suprafataUtila);

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Apartamentul meu</p>
        <h1 className="text-2xl font-bold text-slate-900">{assoc.name}</h1>
        {assoc.neighborhood && <p className="text-sm text-slate-500 mt-0.5">{assoc.neighborhood}</p>}
      </div>

      {/* Identificare */}
      <section className="bg-white border border-slate-200/80 rounded-xl shadow-[var(--shadow-card)] p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Identificare unitate</h2>
        <dl>
          <Row label="Unitate" value={`Ap. ${unit.number}`} />
          {unit.floor !== null && (
            <Row label="Etaj" value={unit.floor === 0 ? "Parter" : `Etaj ${unit.floor}`} />
          )}
          {unit.tipUnitate && (
            <Row label="Tip" value={TIP_UNITATE_LABEL[unit.tipUnitate] ?? unit.tipUnitate} />
          )}
          {unit.destinatie && (
            <Row label="Destinație" value={DESTINATIE_LABEL[unit.destinatie] ?? unit.destinatie} />
          )}
          {unit.numarCadastral && (
            <Row label="Nr. cadastral" value={<span className="font-mono text-xs">{unit.numarCadastral}</span>} />
          )}
          {unit.numarMatricolaFiscala && (
            <Row label="Matricolă fiscală DITL" value={<span className="font-mono text-xs">{unit.numarMatricolaFiscala}</span>} />
          )}
          {unit.zonaFiscala && (
            <Row label="Zonă fiscală" value={`Zona ${unit.zonaFiscala}`} />
          )}
          <Row label="Clădire" value={building.name} />
          <Row label="Adresă" value={assoc.address} />
        </dl>
      </section>

      {/* Suprafețe */}
      {(unit.suprafataUtila || unit.suprafataConstructita || unit.area) && (
        <section className="bg-white border border-slate-200/80 rounded-xl shadow-[var(--shadow-card)] p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Suprafețe</h2>
          <dl>
            {unit.suprafataUtila && (
              <Row label="Suprafață utilă" value={`${Number(unit.suprafataUtila).toFixed(2)} m²`} />
            )}
            {unit.suprafataConstructita && (
              <Row label="Suprafață construită desfășurată" value={`${Number(unit.suprafataConstructita).toFixed(2)} m²`} />
            )}
            {!unit.suprafataUtila && unit.area && (
              <Row label="Suprafață" value={`${unit.area} m²`} />
            )}
          </dl>
        </section>
      )}

      {/* Caracteristici imobil */}
      {(unit.dataConstructie || unit.structura || unit.areInstalatii !== null) && (
        <section className="bg-white border border-slate-200/80 rounded-xl shadow-[var(--shadow-card)] p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Caracteristici imobil</h2>
          <dl>
            {unit.dataConstructie && (
              <Row label="An construcție" value={new Date(unit.dataConstructie).getFullYear()} />
            )}
            {unit.structura && (
              <Row label="Structură" value={unit.structura} />
            )}
            {unit.areInstalatii !== null && (
              <Row label="Instalații" value={unit.areInstalatii ? "Cu instalații" : "Fără instalații"} />
            )}
          </dl>
        </section>
      )}

      {/* Proprietari & cotă-parte (din DITL) */}
      {unit.detineri.length > 0 && (
        <section className="bg-white border border-slate-200/80 rounded-xl shadow-[var(--shadow-card)] p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-1">Proprietari & cotă-parte</h2>
          <p className="text-xs text-slate-400 mb-3">Date din deciziile de impunere DITL S1</p>
          <div className="space-y-0">
            {unit.detineri.map(d => (
              <div key={d.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-900 font-medium">{d.persoana.prenume} {d.persoana.nume}</span>
                <span className="text-sm font-mono text-slate-600 bg-slate-50 px-2 py-0.5 rounded">
                  {(Number(d.cotaProprietate) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cota parte din Ownership (fallback dacă nu e DITL importat) */}
      {unit.detineri.length === 0 && unit.shareRatio !== null && unit.shareRatio !== undefined && (
        <section className="bg-white border border-slate-200/80 rounded-xl shadow-[var(--shadow-card)] p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Cotă-parte</h2>
          <dl>
            <Row label="Cotă indiviziune" value={`${((unit.shareRatio ?? 0) * 100).toFixed(2)}%`} />
          </dl>
        </section>
      )}

      {/* Anexe */}
      {unit.anexe.length > 0 && (
        <section className="bg-white border border-slate-200/80 rounded-xl shadow-[var(--shadow-card)] p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Anexe</h2>
          <div className="space-y-0">
            {unit.anexe.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-900">
                  {TIP_ANEXA_LABEL[a.tipAnexa] ?? a.tipAnexa} nr. {a.numarAnexa}
                  {a.localizare && <span className="text-slate-400 text-xs ml-1">({a.localizare})</span>}
                </span>
                {a.suprafata && (
                  <span className="text-sm font-mono text-slate-600">{Number(a.suprafata).toFixed(2)} m²</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Notă DITL dacă nu e importat */}
      {!hasDitl && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
          Datele cadastrale detaliate (suprafețe DITL, cotă-parte, anexe) vor apărea după importul deciziei de impunere de către administrator.
        </div>
      )}
    </div>
  );
}
