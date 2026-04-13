// src/app/(dashboard)/uat/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import { getServerTranslator } from "@/lib/get-locale";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Panou UAT — Sector 1" };

export default async function UATPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) redirect("/dashboard");

  const { t } = getServerTranslator();

  const [
    countActive, countPending, countUnderReview, countNeedsCompletion, countRejected,
    countOwners, countVerifiedSuppliers, countPendingSuppliers,
    countOpenIssues, countActiveConsultations,
    recentAssociations,
  ] = await Promise.all([
    prisma.association.count({ where: { status: "ACTIVE" } }),
    prisma.association.count({ where: { status: "PENDING" } }),
    prisma.association.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.association.count({ where: { status: "NEEDS_COMPLETION" } }),
    prisma.association.count({ where: { status: "REJECTED" } }),
    prisma.ownership.count({ where: { isActive: true } }),
    prisma.supplier.count({ where: { status: "VERIFIED" } }),
    prisma.supplier.count({ where: { status: "PENDING" } }),
    prisma.issue.count({ where: { status: "OPEN" } }),
    prisma.consultation.count({ where: { status: "ACTIVE" } }),
    prisma.association.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, address: true, status: true, createdAt: true },
    }),
  ]);

  const countActionNeeded = countPending + countUnderReview + countNeedsCompletion + countPendingSuppliers;
  const totalAssociations = await prisma.association.count();

  const STATUS_CONFIG: Record<string, { label: string; dotColor: string; badgeClass: string }> = {
    ACTIVE:           { label: t("status.active"),           dotColor: "bg-emerald-500", badgeClass: "badge-activ" },
    PENDING:          { label: t("status.pending"),          dotColor: "bg-amber-500",   badgeClass: "badge-asteptare" },
    UNDER_REVIEW:     { label: t("status.underReview"),      dotColor: "bg-blue-500",    badgeClass: "badge-verificare" },
    NEEDS_COMPLETION: { label: t("status.needsCompletion"),  dotColor: "bg-orange-500",  badgeClass: "badge-completare" },
    REJECTED:         { label: t("status.rejected"),         dotColor: "bg-slate-400",   badgeClass: "badge-respins" },
    INACTIVE:         { label: t("status.inactive"),         dotColor: "bg-slate-300",   badgeClass: "badge-inactiv" },
    SUSPENDED:        { label: t("status.suspended"),        dotColor: "bg-red-500",     badgeClass: "badge-eroare" },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-uat-600 uppercase tracking-widest mb-1">
            {t("uat.platformName")}
          </p>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t("uat.panelTitle")}</h1>
          <p className="text-slate-400 mt-1 text-sm">
            {new Date().toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {countActionNeeded > 0 && (
          <Link href="/uat/associations?status=PENDING"
            className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 text-amber-800
                       px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-colors">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            {t("uat.actionsNeeded", { count: countActionNeeded })}
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/uat/associations?status=ACTIVE" className="card-hover stat-card group">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-xl" />
          <div className="pl-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21" />
              </svg>
            </div>
            <p className="stat-card-value text-emerald-700">{countActive}</p>
            <p className="stat-card-label">{t("uat.activeAssociations")}</p>
          </div>
        </Link>

        <Link href="/uat/associations?status=PENDING" className="card-hover stat-card group">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-xl" />
          <div className="pl-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
            </div>
            <p className="stat-card-value text-amber-700">{countPending + countUnderReview + countNeedsCompletion}</p>
            <p className="stat-card-label">{t("uat.needsAction")}</p>
            <div className="flex gap-2 mt-1">
              {countPending > 0 && <span className="text-xs text-amber-600">{countPending} noi</span>}
              {countNeedsCompletion > 0 && <span className="text-xs text-orange-600">{countNeedsCompletion} completări</span>}
            </div>
          </div>
        </Link>

        <Link href="/uat/owners" className="card-hover stat-card group">
          <div className="absolute top-0 left-0 w-1 h-full bg-uat-500 rounded-l-xl" />
          <div className="pl-3">
            <div className="w-9 h-9 rounded-xl bg-uat-50 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-uat-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <p className="stat-card-value text-uat-700">{countOwners}</p>
            <p className="stat-card-label">{t("uat.registeredOwners")}</p>
          </div>
        </Link>

        <div className="stat-card">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-400 rounded-l-xl" />
          <div className="pl-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63" />
              </svg>
            </div>
            <p className="stat-card-value text-red-600">{countOpenIssues}</p>
            <p className="stat-card-label">{t("uat.openIssues")}</p>
            {countActiveConsultations > 0 && (
              <p className="text-xs text-blue-600 mt-1">{countActiveConsultations} {t("uat.activeConsultations")}</p>
            )}
          </div>
        </div>
      </div>

      {/* Nav cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { href: "/uat/associations", title: t("uat.associationsTitle"), desc: t("uat.associationsSubtitle"), icon: "🏢", color: "bg-uat-600",
            count: `${totalAssociations} total`, urgent: countActionNeeded > 0 ? `${countActionNeeded} ${t("uat.needsAction").toLowerCase()}` : null },
          { href: "/uat/map", title: t("uat.mapTitle"), desc: t("uat.mapSubtitle"), icon: "🗺️", color: "bg-emerald-600",
            count: `${countActive} ${t("uat.activeAssociations").toLowerCase()}`, urgent: null },
          { href: "/uat/reports", title: t("uat.reportsTitle"), desc: t("uat.reportsSubtitle"), icon: "📊", color: "bg-purple-600",
            count: null, urgent: null },
          { href: "/uat/audit", title: t("uat.auditTitle"), desc: t("uat.auditSubtitle"), icon: "📋", color: "bg-slate-600",
            count: null, urgent: null },
        ].map(item => (
          <Link key={item.href} href={item.href} className="card-hover flex items-center gap-5 p-5 group">
            <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center text-white text-xl flex-shrink-0 shadow-sm`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 group-hover:text-uat-700 transition-colors">{item.title}</p>
              <p className="text-sm text-slate-500 mt-0.5">{item.desc}</p>
              {item.count && <p className="text-xs text-slate-400 mt-1">{item.count}</p>}
              {item.urgent && (
                <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />{item.urgent}
                </p>
              )}
            </div>
            <svg className="w-5 h-5 text-slate-200 group-hover:text-slate-400 transition-colors flex-shrink-0"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">{t("uat.statusBreakdown")}</h2>
          <Link href="/uat/associations" className="text-sm text-uat-600 hover:text-uat-700 font-medium">{t("uat.viewAll")}</Link>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: t("status.active"),          count: countActive,          dot: "bg-emerald-500" },
              { label: t("status.pending"),          count: countPending,         dot: "bg-amber-500" },
              { label: t("status.underReview"),      count: countUnderReview,     dot: "bg-blue-500" },
              { label: t("status.needsCompletion"),  count: countNeedsCompletion, dot: "bg-orange-500" },
              { label: t("status.rejected"),         count: countRejected,        dot: "bg-slate-400" },
              { label: "Furnizori",                  count: countPendingSuppliers, dot: "bg-amber-500" },
            ].map(s => (
              <div key={s.label} className={`flex flex-col items-center text-center p-3 rounded-xl ${s.count > 0 ? "bg-slate-50" : ""}`}>
                <div className={`w-2 h-2 rounded-full ${s.dot} mb-2`} />
                <p className="text-2xl font-bold text-slate-900">{s.count}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">{t("uat.recentlyRegistered")}</h2>
          <Link href="/uat/associations" className="text-sm text-uat-600 hover:text-uat-700 font-medium">{t("uat.allAssociations")}</Link>
        </div>
        <div className="divide-y divide-slate-50">
          {recentAssociations.length === 0 ? (
            <div className="card-body text-center text-slate-400 text-sm py-8">Nicio asociație înregistrată.</div>
          ) : recentAssociations.map(a => {
            const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG["INACTIVE"];
            return (
              <Link key={a.id} href={`/uat/associations/${a.id}`}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/80 transition-colors group">
                <div className={`w-2 h-2 rounded-full ${cfg.dotColor} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 group-hover:text-uat-700 transition-colors truncate">{a.name}</p>
                  <p className="text-xs text-slate-400 truncate">{a.address}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={cfg.badgeClass}>{cfg.label}</span>
                  <span className="text-xs text-slate-300">{new Date(a.createdAt).toLocaleDateString("ro-RO", { day: "numeric", month: "short" })}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
