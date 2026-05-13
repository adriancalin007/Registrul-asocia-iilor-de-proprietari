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
    countSuspended, countInactive,
    countOwners, countPendingSuppliers,
    countOpenSesizari,
    recentAssociations,
    recentSesizari,
  ] = await Promise.all([
    prisma.association.count({ where: { status: "ACTIVE" } }),
    prisma.association.count({ where: { status: "PENDING" } }),
    prisma.association.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.association.count({ where: { status: "NEEDS_COMPLETION" } }),
    prisma.association.count({ where: { status: "REJECTED" } }),
    prisma.association.count({ where: { status: "SUSPENDED" } }),
    prisma.association.count({ where: { status: "INACTIVE" } }),
    prisma.ownership.count({ where: { isActive: true } }),
    prisma.supplier.count({ where: { status: "PENDING" } }),
    prisma.sesizare.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.association.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, address: true, status: true, createdAt: true },
    }),
    prisma.sesizare.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true, title: true, category: true, routing: true, status: true, createdAt: true,
        association: { select: { name: true } },
        submitter:   { select: { fullName: true } },
      },
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

        <Link href="/uat/sesizari" className="card-hover stat-card group">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500 rounded-l-xl" />
          <div className="pl-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <p className="stat-card-value text-purple-700">{countOpenSesizari}</p>
            <p className="stat-card-label">Sesizări active</p>
          </div>
        </Link>
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
          { href: "/uat/import", title: "Import from Excel", desc: "Bulk-create associations, buildings, units and owners from a spreadsheet", icon: "📥", color: "bg-teal-600",
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
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {[
              { label: t("status.active"),          count: countActive,           dot: "bg-emerald-500", href: "/uat/associations?status=ACTIVE" },
              { label: t("status.pending"),          count: countPending,          dot: "bg-amber-500",   href: "/uat/associations?status=PENDING" },
              { label: t("status.underReview"),      count: countUnderReview,      dot: "bg-blue-500",    href: "/uat/associations?status=UNDER_REVIEW" },
              { label: t("status.needsCompletion"),  count: countNeedsCompletion,  dot: "bg-orange-500",  href: "/uat/associations?status=NEEDS_COMPLETION" },
              { label: t("status.rejected"),         count: countRejected,         dot: "bg-slate-400",   href: "/uat/associations?status=REJECTED" },
              { label: t("status.suspended"),        count: countSuspended,        dot: "bg-red-500",     href: "/uat/associations?status=SUSPENDED" },
              { label: t("status.inactive"),         count: countInactive,         dot: "bg-slate-300",   href: "/uat/associations?status=INACTIVE" },
              { label: "Furnizori noi",              count: countPendingSuppliers, dot: "bg-amber-400",   href: "/uat/associations" },
            ].map(s => (
              <Link key={s.label} href={s.href}
                className={`flex flex-col items-center text-center p-3 rounded-xl transition-colors hover:bg-slate-100 ${s.count > 0 ? "bg-slate-50" : ""}`}>
                <div className={`w-2 h-2 rounded-full ${s.dot} mb-2`} />
                <p className={`text-2xl font-bold ${s.count > 0 ? "text-slate-900" : "text-slate-300"}`}>{s.count}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-tight">{s.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Sesizări recente */}
      {recentSesizari.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Sesizări active</h2>
            <Link href="/uat/sesizari" className="text-sm text-uat-600 hover:text-uat-700 font-medium">Vezi toate</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {recentSesizari.map(s => (
              <Link key={s.id} href="/uat/sesizari"
                className="flex items-center gap-4 px-6 py-3 hover:bg-slate-50/80 transition-colors group">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.routing === "POLICE" ? "bg-purple-400" : "bg-blue-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate group-hover:text-uat-700 transition-colors">{s.title}</p>
                  <p className="text-xs text-slate-400 truncate">{s.association.name} · {s.category}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === "OPEN" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"}`}>
                    {s.status === "OPEN" ? "Deschisă" : "În curs"}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.routing === "POLICE" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"}`}>
                    {s.routing === "POLICE" ? "Poliție" : "Adm. S1"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

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
