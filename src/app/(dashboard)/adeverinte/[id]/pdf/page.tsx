// src/app/(dashboard)/adeverinte/[id]/pdf/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import PrintButton from "./PrintButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Adeverință PDF" };

interface Props { params: { id: string } }

const TIP_TITLU: Record<string, string> = {
  PLATI_LA_ZI: "ADEVERINȚĂ DE PLĂȚI LA ZI",
  PROPRIETATE: "ADEVERINȚĂ DE PROPRIETATE",
  FOND_RULMENT: "ADEVERINȚĂ FOND DE RULMENT",
  GENERALA: "ADEVERINȚĂ",
};

const TIP_CONTINUT: Record<string, (data: {
  proprietar: string;
  apartament: string;
  bloc: string;
  asociatie: string;
  adresa: string;
}) => string> = {
  PLATI_LA_ZI: (d) =>
    `Se adeverește că ${d.proprietar}, proprietar/locatar al apartamentului nr. ${d.apartament} din ${d.bloc}, ` +
    `aparținând ${d.asociatie}, cu sediul în ${d.adresa}, ` +
    `este la zi cu plata cotelor de întreținere și nu înregistrează restanțe la data emiterii prezentei adeverințe.`,
  PROPRIETATE: (d) =>
    `Se adeverește că ${d.proprietar} deține drept de proprietate/folosință asupra apartamentului nr. ${d.apartament} ` +
    `din ${d.bloc}, în cadrul ${d.asociatie}, cu sediul în ${d.adresa}.`,
  FOND_RULMENT: (d) =>
    `Se adeverește că ${d.proprietar}, proprietar al apartamentului nr. ${d.apartament} din ${d.bloc}, ` +
    `aparținând ${d.asociatie}, a achitat fondul de rulment aferent unității locative la data emiterii prezentei adeverințe.`,
  GENERALA: (d) =>
    `Se adeverește că ${d.proprietar} este înregistrat în evidențele ${d.asociatie} ` +
    `ca proprietar/locatar al apartamentului nr. ${d.apartament} din ${d.bloc}, ${d.adresa}.`,
};

export default async function PDFAdeverintaPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const adeverinta = await prisma.adeverinta.findUnique({
    where: { id: params.id },
    include: {
      proprietate: {
        include: {
          utilizator: { select: { numeComplet: true } },
          apartament: {
            include: {
              bloc: { include: { asociatie: true } },
            },
          },
        },
      },
    },
  });

  if (!adeverinta || !["APROBATA", "EMISA"].includes(adeverinta.stare)) notFound();

  const p = adeverinta.proprietate;
  const asociatie = p.apartament.bloc.asociatie;
  const dataEmitere = adeverinta.dataEmitere ?? new Date();
  const dataExpirare = adeverinta.dataExpirare;

  const datePentruContinut = {
    proprietar: p.utilizator.numeComplet,
    apartament: p.apartament.numar,
    bloc: p.apartament.bloc.denumire,
    asociatie: asociatie.denumire,
    adresa: asociatie.adresa,
  };

  const continut = (TIP_CONTINUT[adeverinta.tip] ?? TIP_CONTINUT.GENERALA)(datePentruContinut);
  const titlu = TIP_TITLU[adeverinta.tip] ?? "ADEVERINȚĂ";

  const nrAdeverinta = `${asociatie.codFiscal ?? "UAT"}-${dataEmitere.getFullYear()}-${String(adeverinta.id).slice(-6).toUpperCase()}`;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Butoane acțiune */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <a href="/adeverinte" className="btn-secondary">← Înapoi</a>
        <PrintButton />
      </div>

      {/* Document */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 print:shadow-none print:border-none print:rounded-none">
        {/* Antet instituțional */}
        <div className="text-center border-b-2 border-slate-800 pb-6 mb-6">
          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
            {asociatie.denumire}
          </p>
          <p className="text-xs text-slate-500 mt-1">{asociatie.adresa}</p>
          {asociatie.codFiscal && (
            <p className="text-xs text-slate-500">CIF: {asociatie.codFiscal}</p>
          )}
        </div>

        {/* Titlu */}
        <h1 className="text-xl font-bold text-slate-900 text-center mb-2 tracking-wide">
          {titlu}
        </h1>
        <p className="text-center text-sm text-slate-500 mb-8">
          Nr. {nrAdeverinta}
        </p>

        {/* Conținut */}
        <div className="text-base text-slate-800 leading-relaxed text-justify mb-10 indent-8">
          {continut}
        </div>

        {/* Valabilitate */}
        {dataExpirare && (
          <div className="bg-slate-50 rounded-xl px-4 py-3 mb-8 text-sm text-slate-600">
            Prezenta adeverință este valabilă până la data de{" "}
            <strong>{new Date(dataExpirare).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}</strong>.
          </div>
        )}

        {/* Semnături */}
        <div className="grid grid-cols-2 gap-12 mt-12">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700 mb-12">Administrator,</p>
            <div className="border-t border-slate-400 pt-2">
              <p className="text-xs text-slate-500">Semnătură și ștampilă</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700 mb-12">Președinte C.A.,</p>
            <div className="border-t border-slate-400 pt-2">
              <p className="text-xs text-slate-500">Semnătură</p>
            </div>
          </div>
        </div>

        {/* Data emiterii */}
        <div className="text-right mt-8 text-sm text-slate-500">
          Emisă la: {new Date(dataEmitere).toLocaleDateString("ro-RO", {
            day: "numeric", month: "long", year: "numeric"
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 mt-8 pt-4 text-center">
          <p className="text-xs text-slate-400">
            Document generat electronic prin Platforma Digitală Civic-Instituțională — UAT Sector 1 București
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            ID document: {adeverinta.id}
          </p>
        </div>
      </div>
    </div>
  );
}
