// src/app/(dashboard)/scoli/[id]/clasa/[classId]/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const ZILE = ["", "Luni", "Marți", "Miercuri", "Joi", "Vineri"];

export default async function ClasaPage({
  params,
}: {
  params: { id: string; classId: string };
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const clasa = await prisma.clasa.findUnique({
    where: { id: params.classId },
    include: {
      scoala: { select: { id: true, name: true } },
      orar: { orderBy: [{ ziSaptamana: "asc" }, { ora: "asc" }] },
    },
  });

  if (!clasa || clasa.scoalaId !== params.id) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center text-red-500 text-sm">
        Clasa negăsită.
      </div>
    );
  }

  // Build timetable grid
  const orarByZiSiOra: Record<string, typeof clasa.orar[0]> = {};
  for (const row of clasa.orar) {
    orarByZiSiOra[`${row.ziSaptamana}-${row.ora}`] = row;
  }

  const oreMax = Math.max(0, ...clasa.orar.map((o) => o.ora));
  const ore = Array.from({ length: oreMax }, (_, i) => i + 1);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href={`/scoli/${params.id}`}
        className="text-xs text-uat-600 hover:underline flex items-center gap-1"
      >
        ← Înapoi la {clasa.scoala.name}
      </Link>

      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-purple-600 uppercase tracking-widest mb-1">
          {clasa.scoala.name}
        </p>
        <h1 className="text-2xl font-bold text-slate-900">
          Clasa {clasa.an}{clasa.litera}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Diriginte: {clasa.diriginte} · {clasa.nrElevi} elevi
        </p>
      </div>

      {/* Timetable */}
      {ore.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Orar săptămânal</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 uppercase">
                <th className="px-4 py-3 text-left font-medium w-16">Ora</th>
                {[1, 2, 3, 4, 5].map((zi) => (
                  <th key={zi} className="px-3 py-3 text-center font-medium">
                    {ZILE[zi]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ore.map((ora) => (
                <tr key={ora} className="border-t border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-400 font-medium text-xs">
                    Ora {ora}
                  </td>
                  {[1, 2, 3, 4, 5].map((zi) => {
                    const cell = orarByZiSiOra[`${zi}-${ora}`];
                    return (
                      <td key={zi} className="px-3 py-2 text-center">
                        {cell ? (
                          <div className="bg-purple-50 rounded-lg px-2 py-1.5">
                            <p className="font-medium text-purple-900 text-xs leading-tight">
                              {cell.materie}
                            </p>
                            {cell.profesor && (
                              <p className="text-purple-400 text-xs mt-0.5">
                                {cell.profesor}
                              </p>
                            )}
                            {cell.sala && (
                              <p className="text-purple-400 text-xs">S.{cell.sala}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-200 text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-sm">
          Orarul nu a fost încă adăugat.
        </div>
      )}

      {/* Materii summary */}
      {clasa.orar.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Materii</h2>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set(clasa.orar.map((o) => o.materie))).sort().map((m) => (
              <span
                key={m}
                className="text-xs bg-slate-50 border border-slate-100 text-slate-700 px-3 py-1 rounded-full"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
