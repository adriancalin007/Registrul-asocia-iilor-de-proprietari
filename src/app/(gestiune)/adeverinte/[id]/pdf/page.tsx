// src/app/(dashboard)/adeverinte/[id]/pdf/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import PrintButton from "./PrintButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Certificate PDF" };

interface Props { params: { id: string } }

// Legal document text stays in Romanian (official language)
const TYPE_TITLE: Record<string, string> = {
  PAYMENTS_UP_TO_DATE: "ADEVERINȚĂ DE PLĂȚI LA ZI",
  OWNERSHIP: "ADEVERINȚĂ DE PROPRIETATE",
  RESERVE_FUND: "ADEVERINȚĂ FOND DE RULMENT",
  GENERAL: "ADEVERINȚĂ",
};

const TYPE_CONTENT: Record<string, (data: {
  owner: string;
  unit: string;
  building: string;
  association: string;
  address: string;
}) => string> = {
  PAYMENTS_UP_TO_DATE: (d) =>
    `Se adeverește că ${d.owner}, proprietar/locatar al apartamentului nr. ${d.unit} din ${d.building}, ` +
    `aparținând ${d.association}, cu sediul în ${d.address}, ` +
    `este la zi cu plata cotelor de întreținere și nu înregistrează restanțe la data emiterii prezentei adeverințe.`,
  OWNERSHIP: (d) =>
    `Se adeverește că ${d.owner} deține drept de proprietate/folosință asupra apartamentului nr. ${d.unit} ` +
    `din ${d.building}, în cadrul ${d.association}, cu sediul în ${d.address}.`,
  RESERVE_FUND: (d) =>
    `Se adeverește că ${d.owner}, proprietar al apartamentului nr. ${d.unit} din ${d.building}, ` +
    `aparținând ${d.association}, a achitat fondul de rulment aferent unității locative la data emiterii prezentei adeverințe.`,
  GENERAL: (d) =>
    `Se adeverește că ${d.owner} este înregistrat în evidențele ${d.association} ` +
    `ca proprietar/locatar al apartamentului nr. ${d.unit} din ${d.building}, ${d.address}.`,
};

export default async function CertificatePDFPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const certificate = await prisma.certificate.findUnique({
    where: { id: params.id },
    include: {
      ownership: {
        include: {
          user: { select: { fullName: true } },
          unit: {
            include: {
              building: { include: { association: true } },
            },
          },
        },
      },
    },
  });

  if (!certificate || !["APPROVED", "ISSUED"].includes(certificate.status)) notFound();

  const ownership = certificate.ownership;
  const association = ownership.unit.building.association;
  const issuedAt = certificate.issuedAt ?? new Date();
  const expiresAt = certificate.expiresAt;

  const contentData = {
    owner: ownership.user.fullName,
    unit: ownership.unit.number,
    building: ownership.unit.building.name,
    association: association.name,
    address: association.address,
  };

  const content = (TYPE_CONTENT[certificate.type] ?? TYPE_CONTENT.GENERAL)(contentData);
  const title = TYPE_TITLE[certificate.type] ?? "ADEVERINȚĂ";

  const certNumber = `${association.fiscalCode ?? "UAT"}-${issuedAt.getFullYear()}-${String(certificate.id).slice(-6).toUpperCase()}`;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Action buttons */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <a href="/adeverinte" className="btn-secondary">← Back</a>
        <PrintButton />
      </div>

      {/* Document */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 print:shadow-none print:border-none print:rounded-none">
        {/* Institutional header */}
        <div className="text-center border-b-2 border-slate-800 pb-6 mb-6">
          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
            {association.name}
          </p>
          <p className="text-xs text-slate-500 mt-1">{association.address}</p>
          {association.fiscalCode && (
            <p className="text-xs text-slate-500">CIF: {association.fiscalCode}</p>
          )}
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-slate-900 text-center mb-2 tracking-wide">
          {title}
        </h1>
        <p className="text-center text-sm text-slate-500 mb-8">
          Nr. {certNumber}
        </p>

        {/* Content (legal text in Romanian) */}
        <div className="text-base text-slate-800 leading-relaxed text-justify mb-10 indent-8">
          {content}
        </div>

        {/* Validity */}
        {expiresAt && (
          <div className="bg-slate-50 rounded-xl px-4 py-3 mb-8 text-sm text-slate-600">
            Prezenta adeverință este valabilă până la data de{" "}
            <strong>{new Date(expiresAt).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}</strong>.
          </div>
        )}

        {/* Signatures */}
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

        {/* Issued date */}
        <div className="text-right mt-8 text-sm text-slate-500">
          Emisă la: {new Date(issuedAt).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 mt-8 pt-4 text-center">
          <p className="text-xs text-slate-400">
            Document generat electronic prin Platforma Digitală Civic-Instituțională — UAT Sector 1 București
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            ID document: {certificate.id}
          </p>
        </div>
      </div>
    </div>
  );
}
