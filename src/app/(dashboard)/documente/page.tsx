// src/app/(dashboard)/documente/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Rol } from "@prisma/client";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Documente" };

interface Props {
  searchParams: { categorie?: string; stare?: string };
}

export default async function DocumentePage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const rol = session.user.rol as Rol;
  const userId = session.user.id;

  // Determinăm asociatieId din context
  const cookieStore = cookies();
  const asociatieActivaId = cookieStore.get("asociatie_activa")?.value;

  let asociatieId: string | undefined;

  if (rol === Rol.ADMINISTRATOR || rol === Rol.PRESEDINTE_CA || rol === Rol.CENZOR) {
    if (asociatieActivaId) {
      asociatieId = asociatieActivaId;
    } else {
      const mandat = await prisma.mandat.findFirst({
        where: { utilizatorId: userId, activ: true },
      });
      asociatieId = mandat?.asociatieId;
    }
  } else if (rol === Rol.PROPRIETAR) {
    const proprietate = await prisma.proprietate.findFirst({
      where: { utilizatorId: userId, activ: true },
      include: { apartament: { include: { bloc: true } } },
    });
    asociatieId = proprietate?.apartament.bloc.asociatieId;
  }

  if (!asociatieId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-slate-400">Nu aveți acces la nicio asociație.</p>
      </div>
    );
  }

  // Construim filtrul
  const filtru: Record<string, unknown> = { asociatieId };

  // Proprietarii văd doar documente publice
  if (rol === Rol.PROPRIETAR) {
    filtru.accesPublic = true;
    filtru.stare = "PUBLICAT";
  } else {
    if (searchParams.stare) filtru.stare = searchParams.stare;
    if (searchParams.categorie) filtru.categorie = searchParams.categorie;
  }

  const [documente, categorii] = await Promise.all([
    prisma.document.findMany({
      where: filtru as Parameters<typeof prisma.document.findMany>[0]["where"],
      orderBy: { creatLa: "desc" },
    }),
    prisma.document.findMany({
      where: { asociatieId },
      select: { categorie: true },
      distinct: ["categorie"],
    }),
  ]);

  const poateAdauga = rol === Rol.ADMINISTRATOR || rol === Rol.PRESEDINTE_CA;

  const culoriStare: Record<string, string> = {
    DRAFT: "badge-inactiv",
    PUBLICAT: "badge-activ",
    ARHIVAT: "badge-asteptare",
    EXPIRAT: "badge-eroare",
  };

  const etichetaStare: Record<string, string> = {
    DRAFT: "Draft",
    PUBLICAT: "Publicat",
    ARHIVAT: "Arhivat",
    EXPIRAT: "Expirat",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Antet */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Documente</h1>
        {poateAdauga && (
          <Link href="/documente/nou" className="btn-primary">
            + Document nou
          </Link>
        )}
      </div>

      {/* Filtre — doar pentru administratori */}
      {rol !== Rol.PROPRIETAR && (
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/documente"
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !searchParams.stare && !searchParams.categorie
                ? "bg-uat-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Toate
          </Link>
          {["PUBLICAT", "DRAFT", "ARHIVAT"].map((s) => (
            <Link
              key={s}
              href={`/documente?stare=${s}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                searchParams.stare === s
                  ? "bg-uat-600 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {etichetaStare[s]}
            </Link>
          ))}
          {categorii.map((c) => (
            <Link
              key={c.categorie}
              href={`/documente?categorie=${encodeURIComponent(c.categorie)}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                searchParams.categorie === c.categorie
                  ? "bg-slate-700 text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {c.categorie}
            </Link>
          ))}
        </div>
      )}

      {/* Lista documente */}
      <div className="card">
        <div className="card-header">
          <p className="text-sm text-slate-500">{documente.length} document(e)</p>
        </div>
        <div className="divide-y divide-slate-100">
          {documente.length === 0 ? (
            <div className="card-body text-center py-12">
              <svg className="w-12 h-12 text-slate-200 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-slate-400 text-sm">Nu există documente în această categorie</p>
              {poateAdauga && (
                <Link href="/documente/nou" className="btn-primary mt-4 inline-flex">
                  Adaugă primul document
                </Link>
              )}
            </div>
          ) : (
            documente.map((doc) => (
              <div key={doc.id} className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-slate-50">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Iconiță tip document */}
                  <div className="w-10 h-10 rounded-lg bg-uat-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-uat-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-semibold text-slate-900">{doc.titlu}</p>
                      <span className={`badge text-xs ${culoriStare[doc.stare] ?? "badge-info"}`}>
                        {etichetaStare[doc.stare] ?? doc.stare}
                      </span>
                      {doc.accesPublic && (
                        <span className="badge badge-info text-xs">Public</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-full">{doc.categorie}</span>
                      <span>v{doc.versiune}</span>
                      {doc.dataExpirare && (
                        <span className={new Date(doc.dataExpirare) < new Date() ? "text-red-500" : ""}>
                          Expiră: {new Date(doc.dataExpirare).toLocaleDateString("ro-RO")}
                        </span>
                      )}
                      <span>{new Date(doc.creatLa).toLocaleDateString("ro-RO")}</span>
                    </div>
                    {doc.descriere && (
                      <p className="text-sm text-slate-500 mt-1 truncate">{doc.descriere}</p>
                    )}
                  </div>
                </div>

                {/* Acțiuni */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {doc.caleStocata && (
                    <a
                      href={doc.caleStocata}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      Descarcă
                    </a>
                  )}
                  {poateAdauga && (
                    <Link
                      href={`/documente/${doc.id}`}
                      className="btn-ghost text-xs py-1.5 px-3"
                    >
                      Editează
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
