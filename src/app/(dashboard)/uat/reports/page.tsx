// src/app/(dashboard)/uat/reports/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import type { Metadata } from "next";

const SCORE_CONFIG = {
  CONFORME:    { label: "Conformă",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  AVERTISMENT: { label: "Avertisment", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  SOMATIE:     { label: "Somație",     cls: "bg-orange-50 text-orange-700 border-orange-200" },
  SANCTIUNE:   { label: "Sancțiune",   cls: "bg-red-50 text-red-700 border-red-200" },
};

export const metadata: Metadata = { title: "Reports | UAT" };

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) redirect("/dashboard");

  const [
    total, active, pending, underReview, needsCompletion, rejected,
    suspended, inactive, officialRegistry, dissolved,
    owners, verifiedSuppliers,
    totalConsultations, activeConsultations, closedConsultations,
    totalCertificates, issuedCertificates,
    totalIssues, openIssues, resolvedIssues,
    totalRfqs, perNeighborhood,
    scoreBreakdown, assocWithOpenIssues, assocWithoutFinancials, topScored,
  ] = await Promise.all([
    prisma.association.count(),
    prisma.association.count({ where: { status: "ACTIVE" } }),
    prisma.association.count({ where: { status: "PENDING" } }),
    prisma.association.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.association.count({ where: { status: "NEEDS_COMPLETION" } }),
    prisma.association.count({ where: { status: "REJECTED" } }),
    prisma.association.count({ where: { status: "SUSPENDED" } }),
    prisma.association.count({ where: { status: "INACTIVE" } }),
    prisma.association.count({ where: { status: "OFFICIAL_REGISTRY" } }),
    prisma.association.count({ where: { status: "DISSOLVED" } }),
    prisma.ownership.count({ where: { isActive: true } }),
    prisma.supplier.count({ where: { status: "VERIFIED" } }),
    prisma.consultation.count(),
    prisma.consultation.count({ where: { status: "ACTIVE" } }),
    prisma.consultation.count({ where: { status: "CLOSED" } }),
    prisma.certificate.count(),
    prisma.certificate.count({ where: { status: "ISSUED" } }),
    prisma.issue.count(),
    prisma.issue.count({ where: { status: "OPEN" } }),
    prisma.issue.count({ where: { status: { in: ["RESOLVED","CLOSED"] } } }),
    prisma.rFQ.count(),
    prisma.association.groupBy({ by: ["neighborhood"], _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 8 }),
    // Score breakdown by classification for active associations (latest public score per assoc)
    prisma.associationScore.groupBy({
      by: ["classification"],
      where: { isPublic: true, association: { status: "ACTIVE" } },
      _count: { id: true },
    }),
    // Active associations with open issues (top 10 by count)
    prisma.association.findMany({
      where: { status: "ACTIVE", issues: { some: { status: { in: ["OPEN", "IN_PROGRESS"] } } } },
      select: {
        id: true, name: true, neighborhood: true,
        _count: { select: { issues: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } } } },
      },
      orderBy: { issues: { _count: "desc" } },
      take: 10,
    }),
    // Active associations that have NOT submitted any financial report in the current year
    prisma.association.findMany({
      where: {
        status: "ACTIVE",
        situatiiFinanciare: { none: { year: new Date().getFullYear() } },
      },
      select: { id: true, name: true, neighborhood: true },
      orderBy: [{ neighborhood: "asc" }, { name: "asc" }],
      take: 50,
    }),
    // Top scored active associations
    prisma.associationScore.findMany({
      where: { isPublic: true, association: { status: "ACTIVE" } },
      distinct: ["associationId"],
      orderBy: [{ totalPoints: "desc" }, { calculatedAt: "desc" }],
      take: 10,
      select: {
        associationId: true,
        totalPoints: true,
        maxPossible: true,
        classification: true,
        association: { select: { id: true, name: true, neighborhood: true } },
      },
    }),
  ]);

  const adoptionRate = total > 0 ? Math.round((active / total) * 100) : 0;
  const inProcess = pending + underReview + needsCompletion;
  const inactiveTotal = inactive + officialRegistry + suspended + dissolved;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link href="/uat" className="hover:text-slate-600">Panou UAT</Link>
            <span>›</span>
            <span className="text-slate-700">Rapoarte</span>
          </div>
          <h1 className="page-title">Rapoarte UAT</h1>
          <p className="page-subtitle">Situație la {new Date().toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <Link href="/uat/reports/verifications" className="btn-secondary text-sm">
          Raport verificări operatori →
        </Link>
      </div>

      {/* Adoption rate */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-uat-600 to-uat-800 px-6 py-5">
          <p className="text-uat-200 text-sm font-medium mb-1">Platform digital adoption rate</p>
          <div className="flex items-end gap-4">
            <p className="text-5xl font-bold text-white">{adoptionRate}%</p>
            <div className="pb-1">
              <p className="text-uat-200 text-sm">{active} active of {total} total</p>
              {inProcess > 0 && <p className="text-amber-300 text-sm">{inProcess} in validation process</p>}
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="w-full bg-slate-100 rounded-full h-3 mb-4">
            <div className="bg-uat-600 h-3 rounded-full" style={{ width: `${adoptionRate}%` }} />
          </div>
          <div className="grid grid-cols-5 gap-3 text-center text-sm">
            {[
              { label: "Active", val: active, color: "text-emerald-700" },
              { label: "Pending", val: pending, color: "text-amber-700" },
              { label: "Under Review", val: underReview, color: "text-blue-700" },
              { label: "Completion", val: needsCompletion, color: "text-orange-700" },
              { label: "Rejected", val: rejected, color: "text-slate-500" },
            ].map(s => (
              <div key={s.label}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-4 gap-3 text-center text-sm">
            {[
              { label: "Registru oficial", val: officialRegistry, color: "text-slate-500" },
              { label: "Inactive", val: inactive, color: "text-slate-400" },
              { label: "Suspendate", val: suspended, color: "text-orange-500" },
              { label: "Dizolvate", val: dissolved, color: "text-slate-400" },
            ].map(s => (
              <div key={s.label}>
                <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card card-body space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-uat-500" />Platform users</h3>
          {[
            { label: "Registered owners", val: owners, href: "/uat/owners" },
            { label: "Verified suppliers", val: verifiedSuppliers, href: "/uat/suppliers" },
          ].map(r => (
            <div key={r.label} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-600">{r.label}</span>
              <Link href={r.href} className="text-lg font-bold text-uat-700 hover:text-uat-900">{r.val}</Link>
            </div>
          ))}
        </div>

        <div className="card card-body space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" />Digital consultations</h3>
          {[{ label: "Total", val: totalConsultations }, { label: "Active now", val: activeConsultations }, { label: "Closed", val: closedConsultations }].map(r => (
            <div key={r.label} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-600">{r.label}</span>
              <span className="text-lg font-bold text-emerald-700">{r.val}</span>
            </div>
          ))}
        </div>

        <div className="card card-body space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500" />Issues & Maintenance</h3>
          {[{ label: "Total reports", val: totalIssues }, { label: "Open now", val: openIssues, urgent: openIssues > 0 }, { label: "Resolved", val: resolvedIssues }].map(r => (
            <div key={r.label} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-600">{r.label}</span>
              <span className={`text-lg font-bold ${(r as {urgent?: boolean}).urgent ? "text-red-600" : "text-slate-700"}`}>{r.val}</span>
            </div>
          ))}
        </div>

        <div className="card card-body space-y-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500" />Certificates & RFQ</h3>
          {[{ label: "Total certificates", val: totalCertificates }, { label: "Issued", val: issuedCertificates }, { label: "RFQ requests", val: totalRfqs }].map(r => (
            <div key={r.label} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-600">{r.label}</span>
              <span className="text-lg font-bold text-purple-700">{r.val}</span>
            </div>
          ))}
        </div>
      </div>

      {perNeighborhood.filter(n => n.neighborhood).length > 0 && (
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-slate-900">Asociații pe cartier</h2></div>
          <div className="card-body space-y-3">
            {perNeighborhood.filter(n => n.neighborhood).map(n => {
              const pct = total > 0 ? Math.round((n._count.id / total) * 100) : 0;
              return (
                <div key={n.neighborhood}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium">{n.neighborhood}</span>
                    <span className="text-slate-400">{n._count.id} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-uat-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Score breakdown */}
      {scoreBreakdown.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">Clasificare asociații (scor UAT)</h2>
            <p className="text-xs text-slate-400 mt-0.5">Ultimul scor public per asociație activă</p>
          </div>
          <div className="card-body grid grid-cols-2 md:grid-cols-4 gap-4">
            {(["CONFORME","AVERTISMENT","SOMATIE","SANCTIUNE"] as const).map(cls => {
              const count = scoreBreakdown.find(s => s.classification === cls)?._count.id ?? 0;
              return (
                <Link key={cls} href={`/uat/associations?status=ACTIVE`}
                  className={`rounded-2xl border px-4 py-4 text-center hover:opacity-80 transition-opacity ${SCORE_CONFIG[cls].cls}`}>
                  <p className="text-3xl font-bold">{count}</p>
                  <p className="text-xs font-semibold mt-1">{SCORE_CONFIG[cls].label}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Top scored */}
      {topScored.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">Top asociații după scor</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {topScored.map((s, idx) => {
              const pct = Math.round((s.totalPoints / s.maxPossible) * 100);
              const cfg = SCORE_CONFIG[s.classification as keyof typeof SCORE_CONFIG];
              return (
                <div key={s.associationId} className="flex items-center gap-4 px-6 py-3">
                  <span className="text-sm font-bold text-slate-300 w-5 text-right flex-shrink-0">#{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <Link href={`/uat/associations/${s.associationId}`}
                      className="text-sm font-medium text-slate-800 hover:text-uat-700 truncate block">
                      {s.association.name}
                    </Link>
                    {s.association.neighborhood && (
                      <span className="text-xs text-slate-400">{s.association.neighborhood}</span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${cfg?.cls ?? ""}`}>
                    {cfg?.label ?? s.classification}
                  </span>
                  <span className="text-sm font-bold text-slate-700 w-12 text-right flex-shrink-0">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Associations with open issues */}
      {assocWithOpenIssues.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Asociații cu avarii deschise
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {assocWithOpenIssues.map(a => (
              <div key={a.id} className="flex items-center justify-between px-6 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/uat/associations/${a.id}`}
                    className="text-sm font-medium text-slate-800 hover:text-uat-700 truncate block">
                    {a.name}
                  </Link>
                  {a.neighborhood && <span className="text-xs text-slate-400">{a.neighborhood}</span>}
                </div>
                <span className="flex-shrink-0 text-sm font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full ml-4">
                  {a._count.issues} deschise
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Associations without financial reports */}
      {assocWithoutFinancials.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Asociații fără situații financiare în {new Date().getFullYear()}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{assocWithoutFinancials.length} asociații active nu au transmis niciun document financiar</p>
          </div>
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {assocWithoutFinancials.map(a => (
              <div key={a.id} className="flex items-center justify-between px-6 py-2.5">
                <div className="min-w-0 flex-1">
                  <Link href={`/uat/associations/${a.id}`}
                    className="text-sm text-slate-700 hover:text-uat-700 truncate block">
                    {a.name}
                  </Link>
                  {a.neighborhood && <span className="text-xs text-slate-400">{a.neighborhood}</span>}
                </div>
                <Link href={`/uat/associations/${a.id}`}
                  className="flex-shrink-0 text-xs text-uat-600 hover:underline ml-4">
                  Vezi dosarul →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
