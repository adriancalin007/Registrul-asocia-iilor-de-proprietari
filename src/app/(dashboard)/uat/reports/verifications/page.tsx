// src/app/(dashboard)/uat/reports/verifications/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserRole, AuditAction } from "@prisma/client";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Raport verificări asociații | UAT" };

const ACTION_CONFIG: Record<string, { label: string; badge: string }> = {
  APPROVE:                { label: "Validat",                    badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECT:                 { label: "Respins",                    badge: "bg-red-50 text-red-700 border-red-200" },
  "Started review":       { label: "Revizie inițiată",           badge: "bg-blue-50 text-blue-700 border-blue-200" },
  "Requested completion": { label: "Documente suplimentare",     badge: "bg-amber-50 text-amber-700 border-amber-200" },
};

interface Props {
  searchParams: { operator?: string; from?: string; to?: string; page?: string };
}

const PAGE_SIZE = 40;

export default async function VerificationsReportPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) redirect("/dashboard");

  const page      = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const opFilter  = searchParams.operator ?? "";
  const fromDate  = searchParams.from ? new Date(searchParams.from) : undefined;
  const toDate    = searchParams.to
    ? new Date(new Date(searchParams.to).setHours(23, 59, 59, 999))
    : undefined;

  // All operators for the filter dropdown — identified by having an operator or super-admin account
  const operators = await prisma.user.findMany({
    where: {
      OR: [
        { uatOperatorAccount: { isNot: null } },
        { superAdminAccount:  { isNot: null } },
      ],
    },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  const where = {
    resource: "Association",
    action:   { in: [AuditAction.APPROVE, AuditAction.REJECT, AuditAction.UPDATE] as AuditAction[] },
    ...(opFilter ? { userId: opFilter } : {}),
    ...(fromDate || toDate
      ? { createdAt: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } }
      : {}),
  };

  const [total, logs] = await Promise.all([
    prisma.uATAuditLog.count({ where }),
    prisma.uATAuditLog.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * PAGE_SIZE,
      take:  PAGE_SIZE,
    }),
  ]);

  // Collect association IDs to batch-fetch names
  const assocIds = Array.from(new Set(logs.map(l => l.resourceId).filter(Boolean))) as string[];
  const assocMap = new Map(
    (await prisma.association.findMany({
      where:  { id: { in: assocIds } },
      select: { id: true, name: true },
    })).map(a => [a.id, a.name]),
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Summary counts
  const [validated, rejected, started, completion] = await Promise.all([
    prisma.uATAuditLog.count({ where: { resource: "Association", action: AuditAction.APPROVE } }),
    prisma.uATAuditLog.count({ where: { resource: "Association", action: AuditAction.REJECT } }),
    prisma.uATAuditLog.count({ where: { resource: "Association", action: AuditAction.UPDATE,
      metadata: { path: ["action"], equals: "Started review" } } }),
    prisma.uATAuditLog.count({ where: { resource: "Association", action: AuditAction.UPDATE,
      metadata: { path: ["action"], equals: "Requested completion" } } }),
  ]);

  function actionLabel(log: (typeof logs)[number]): { label: string; badge: string } {
    if (log.action === AuditAction.APPROVE) return ACTION_CONFIG.APPROVE;
    if (log.action === AuditAction.REJECT)  return ACTION_CONFIG.REJECT;
    const meta = log.metadata as Record<string, unknown>;
    const act  = meta?.action as string | undefined;
    return ACTION_CONFIG[act ?? ""] ?? { label: act ?? "Actualizare", badge: "bg-slate-100 text-slate-600 border-slate-200" };
  }

  function buildUrl(overrides: Record<string, string | number | undefined>) {
    const params = new URLSearchParams();
    const merged = { operator: opFilter, from: searchParams.from, to: searchParams.to, page: String(page), ...overrides };
    Object.entries(merged).forEach(([k, v]) => { if (v) params.set(k, String(v)); });
    return `/uat/reports/verifications?${params.toString()}`;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
          <Link href="/uat" className="hover:text-slate-600">Panou UAT</Link>
          <span>›</span>
          <Link href="/uat/reports" className="hover:text-slate-600">Rapoarte</Link>
          <span>›</span>
          <span className="text-slate-700">Verificări asociații</span>
        </div>
        <h1 className="page-title">Raport verificări asociații</h1>
        <p className="page-subtitle">
          Toate acțiunile de validare, respingere și revizie efectuate de operatori
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Validate",              val: validated,  color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Respinse",              val: rejected,   color: "text-red-700",     bg: "bg-red-50" },
          { label: "Revizii inițiate",      val: started,    color: "text-blue-700",    bg: "bg-blue-50" },
          { label: "Doc. suplimentare",     val: completion, color: "text-amber-700",   bg: "bg-amber-50" },
        ].map(s => (
          <div key={s.label} className={`card px-5 py-4 ${s.bg}`}>
            <p className={`text-3xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <form method="GET" action="/uat/reports/verifications" className="flex flex-wrap gap-3">
        <select name="operator" defaultValue={opFilter} className="input w-56">
          <option value="">Toți operatorii</option>
          {operators.map(op => (
            <option key={op.id} value={op.id}>{op.fullName}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500 whitespace-nowrap">De la</label>
          <input type="date" name="from" defaultValue={searchParams.from ?? ""} className="input w-40" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500 whitespace-nowrap">Până la</label>
          <input type="date" name="to"   defaultValue={searchParams.to ?? ""}   className="input w-40" />
        </div>
        <input type="hidden" name="page" value="1" />
        <button type="submit" className="btn-primary px-5">Filtrează</button>
        {(opFilter || searchParams.from || searchParams.to) && (
          <a href="/uat/reports/verifications" className="btn-ghost">✕ Resetează</a>
        )}
      </form>

      {/* Results count */}
      <p className="text-sm text-slate-500">
        {total.toLocaleString("ro-RO")} înregistrări
        {page > 1 ? ` · pagina ${page} din ${totalPages}` : ""}
      </p>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Data</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Operator</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Asociație</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Acțiune</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    Nicio înregistrare pentru filtrele selectate.
                  </td>
                </tr>
              ) : logs.map(log => {
                const { label, badge } = actionLabel(log);
                const meta = log.metadata as Record<string, unknown>;
                const assocName = log.resourceId ? (assocMap.get(log.resourceId) ?? `ID: ${log.resourceId.slice(0,8)}…`) : "—";
                const note = (meta?.reason as string | undefined) ?? (meta?.missingItems as string | undefined) ?? "";
                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("ro-RO", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{log.user.fullName}</p>
                      <p className="text-xs text-slate-400">{log.user.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      {log.resourceId ? (
                        <Link href={`/uat/associations/${log.resourceId}`}
                          className="font-medium text-sky-700 hover:underline">
                          {assocName}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${badge}`}>
                        {label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400 max-w-xs truncate">
                      {note || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <Link href={buildUrl({ page: page - 1 })} className="btn-ghost text-sm">
              ← Anterioară
            </Link>
          )}
          <span className="text-sm text-slate-500">
            Pagina {page} din {totalPages}
          </span>
          {page < totalPages && (
            <Link href={buildUrl({ page: page + 1 })} className="btn-ghost text-sm">
              Următoare →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
