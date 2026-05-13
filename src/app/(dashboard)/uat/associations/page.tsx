// src/app/(dashboard)/uat/associations/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import type { Metadata } from "next";
import { getServerTranslator } from "@/lib/get-locale";

export const metadata: Metadata = { title: "Asociații | UAT" };

interface Props { searchParams: { status?: string; q?: string } }

export default async function AssociationsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) redirect("/dashboard");

  const { t } = getServerTranslator();
  const filterStatus = searchParams.status;
  const search = searchParams.q?.trim() ?? "";

  // Status config INSIDE function so t() is available
  const STATUS_CONFIG: Record<string, { label: string; dot: string; badgeClass: string; btnLabel: string; btnClass: string }> = {
    ACTIVE:           { label: t("status.active"),           dot: "bg-emerald-500", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",   btnLabel: t("associations.btnViewFile"),         btnClass: "btn-secondary text-sm" },
    PENDING:          { label: t("status.pending"),          dot: "bg-amber-500",   badgeClass: "bg-amber-50 text-amber-700 border-amber-200",         btnLabel: t("associations.btnReviewValidation"), btnClass: "bg-amber-500 hover:bg-amber-600 text-white btn text-sm shadow-sm" },
    UNDER_REVIEW:     { label: t("status.underReview"),     dot: "bg-blue-500",    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",            btnLabel: t("associations.btnContinueReview"),   btnClass: "bg-blue-500 hover:bg-blue-600 text-white btn text-sm" },
    NEEDS_COMPLETION: { label: t("status.needsCompletion"), dot: "bg-orange-500",  badgeClass: "bg-orange-50 text-orange-700 border-orange-200",      btnLabel: t("associations.btnReviewNewDocs"),    btnClass: "bg-orange-500 hover:bg-orange-600 text-white btn text-sm" },
    REJECTED:         { label: t("status.rejected"),         dot: "bg-slate-400",   badgeClass: "bg-slate-100 text-slate-500 border-slate-200",        btnLabel: t("associations.btnViewFile"),         btnClass: "btn-secondary text-sm" },
    SUSPENDED:        { label: t("status.suspended"),        dot: "bg-red-500",     badgeClass: "bg-red-50 text-red-700 border-red-200",               btnLabel: t("associations.btnViewFile"),         btnClass: "btn-secondary text-sm" },
    INACTIVE:         { label: t("status.inactive"),         dot: "bg-slate-300",   badgeClass: "bg-slate-100 text-slate-500 border-slate-200",        btnLabel: t("associations.btnViewFile"),         btnClass: "btn-secondary text-sm" },
  };

  const FILTERS = [
    { label: t("associations.filterAll"),          value: undefined,           icon: "🏢" },
    { label: t("status.active"),                   value: "ACTIVE",            icon: "✅" },
    { label: t("status.pending"),                  value: "PENDING",           icon: "⏳" },
    { label: t("status.underReview"),              value: "UNDER_REVIEW",      icon: "🔍" },
    { label: t("status.needsCompletion"),          value: "NEEDS_COMPLETION",  icon: "📝" },
    { label: t("status.rejected"),                 value: "REJECTED",          icon: "🚫" },
    { label: t("status.suspended"),                value: "SUSPENDED",         icon: "🔴" },
    { label: t("status.inactive"),                 value: "INACTIVE",          icon: "⚫" },
  ];

  const searchWhere = search
    ? {
        OR: [
          { name:       { contains: search, mode: "insensitive" as const } },
          { address:    { contains: search, mode: "insensitive" as const } },
          { rawAddress: { contains: search, mode: "insensitive" as const } },
          { fiscalCode: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [associations, statusCounts] = await Promise.all([
    prisma.association.findMany({
      where: {
        AND: [
          filterStatus ? { status: filterStatus as never } : {},
          searchWhere,
        ],
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        _count: {
          select: {
            buildings: true,
            mandates: { where: { isActive: true } },
            issues: { where: { status: "OPEN" } },
          },
        },
      },
    }),
    prisma.association.groupBy({ by: ["status"], _count: { id: true } }),
  ]);

  const countPerStatus: Record<string, number> = {};
  let total = 0;
  statusCounts.forEach(s => { countPerStatus[s.status] = s._count.id; total += s._count.id; });
  const countActionNeeded = (countPerStatus["PENDING"] ?? 0) + (countPerStatus["UNDER_REVIEW"] ?? 0) + (countPerStatus["NEEDS_COMPLETION"] ?? 0);
  const countProblematic = (countPerStatus["SUSPENDED"] ?? 0) + (countPerStatus["INACTIVE"] ?? 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link href="/uat" className="hover:text-slate-600">Panou UAT</Link>
            <span>›</span>
            <span className="text-slate-700">{t("nav.associations")}</span>
          </div>
          <h1 className="page-title">{t("associations.title")}</h1>
          <p className="page-subtitle">{total} {t("associations.registeredIn")}</p>
        </div>
        <div className="flex items-center gap-3">
          {countActionNeeded > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-lg text-sm font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              {t("associations.needAction", { count: countActionNeeded })}
            </div>
          )}
          {countProblematic > 0 && (
            <a href="/uat/associations?status=SUSPENDED"
              className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {countProblematic} suspendate / inactive
            </a>
          )}
          <div className="card px-4 py-2 text-center">
            <p className="text-xl font-bold text-slate-900">{total}</p>
            <p className="text-xs text-slate-400">total</p>
          </div>
          {/* Buton înregistrare manuală de operator */}
          <Link href="/uat/associations/new"
            className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Adaugă asociație
          </Link>
        </div>
      </div>

      {/* Search */}
      <form method="GET" action="/uat/associations" className="flex gap-2 max-w-lg">
        {filterStatus && <input type="hidden" name="status" value={filterStatus} />}
        <input
          name="q"
          defaultValue={search}
          className="input flex-1"
          placeholder="Caută după nume, adresă, CIF..."
          autoComplete="off"
        />
        <button type="submit" className="btn-primary px-5">Caută</button>
        {search && (
          <a href={filterStatus ? `/uat/associations?status=${filterStatus}` : "/uat/associations"}
            className="btn-secondary px-4">✕</a>
        )}
      </form>
      {search && (
        <p className="text-sm text-slate-500 -mt-2">
          {associations.length} rezultate pentru „{search}"
        </p>
      )}

      {/* Filters */}
      <div className="nav-tabs w-fit flex-wrap">
        {FILTERS.map(f => {
          const count = f.value ? (countPerStatus[f.value] ?? 0) : total;
          const isActive = filterStatus === f.value || (!filterStatus && !f.value);
          return (
            <Link key={f.label}
              href={
                f.value
                  ? `/uat/associations?status=${f.value}${search ? `&q=${encodeURIComponent(search)}` : ""}`
                  : `/uat/associations${search ? `?q=${encodeURIComponent(search)}` : ""}`
              }
              className={isActive ? "nav-tab-active" : "nav-tab"}>
              <span>{f.icon}</span>
              <span>{f.label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-uat-100 text-uat-700" : "bg-slate-200/80 text-slate-500"}`}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {associations.length === 0 ? (
          <div className="card card-body text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21" />
              </svg>
            </div>
            <p className="text-slate-500 font-medium">{t("associations.noAssociations")}</p>
          </div>
        ) : associations.map(a => {
          const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG["INACTIVE"];
          const needsAction = ["PENDING","UNDER_REVIEW","NEEDS_COMPLETION"].includes(a.status);
          return (
            <div key={a.id} className={`card flex items-center gap-4 px-5 py-4 transition-all hover:shadow-md ${needsAction ? "border-amber-200/60 bg-amber-50/20" : ""}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} flex-shrink-0 ${needsAction ? "animate-pulse" : ""}`} />
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                a.status === "ACTIVE" ? "bg-emerald-50" : needsAction ? "bg-amber-50" : "bg-slate-100"
              }`}>
                <svg className={`w-5 h-5 ${a.status === "ACTIVE" ? "text-emerald-600" : needsAction ? "text-amber-600" : "text-slate-400"}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-0.5 flex-wrap">
                  <p className="font-semibold text-slate-900 truncate">{a.name}</p>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium flex-shrink-0 ${cfg.badgeClass}`}>{cfg.label}</span>
                  {a._count.issues > 0 && (
                    <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full flex-shrink-0">
                      ⚠ {a._count.issues} {t("associations.issues", { count: a._count.issues }).replace("⚠ ", "")}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 truncate">{a.address}</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-slate-400">🏗 {a._count.buildings} bloc(uri)</span>
                  <span className="text-xs text-slate-400">👤 {a._count.mandates} mandate</span>
                  {a.fiscalCode && <span className="text-xs text-slate-400">CIF {a.fiscalCode}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-slate-300">{new Date(a.createdAt).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })}</span>
                <Link href={`/uat/associations/${a.id}`} className={cfg.btnClass}>{cfg.btnLabel}</Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
