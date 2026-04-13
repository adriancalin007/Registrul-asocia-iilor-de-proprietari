// src/app/(dashboard)/uat/reports/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reports | UAT" };

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) redirect("/dashboard");

  const [
    total, active, pending, underReview, needsCompletion, rejected,
    owners, verifiedSuppliers,
    totalConsultations, activeConsultations, closedConsultations,
    totalCertificates, issuedCertificates,
    totalIssues, openIssues, resolvedIssues,
    totalRfqs, perNeighborhood,
  ] = await Promise.all([
    prisma.association.count(),
    prisma.association.count({ where: { status: "ACTIVE" } }),
    prisma.association.count({ where: { status: "PENDING" } }),
    prisma.association.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.association.count({ where: { status: "NEEDS_COMPLETION" } }),
    prisma.association.count({ where: { status: "REJECTED" } }),
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
  ]);

  const adoptionRate = total > 0 ? Math.round((active / total) * 100) : 0;
  const inProcess = pending + underReview + needsCompletion;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link href="/uat" className="hover:text-slate-600">UAT Panel</Link>
            <span>›</span>
            <span className="text-slate-700">Reports</span>
          </div>
          <h1 className="page-title">UAT Aggregate Reports</h1>
          <p className="page-subtitle">Situation as of {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
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
          <div className="card-header"><h2 className="font-semibold text-slate-900">Associations per neighborhood</h2></div>
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
    </div>
  );
}
