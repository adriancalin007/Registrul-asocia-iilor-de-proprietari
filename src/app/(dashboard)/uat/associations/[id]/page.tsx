// src/app/(dashboard)/uat/associations/[id]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import AssociationReview from "./AssociationReview";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Association File | UAT" };

interface Props { params: { id: string } }

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  ACTIVE:           { label: "Active",           badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING:          { label: "Pending",          badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  UNDER_REVIEW:     { label: "Under Review",     badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  NEEDS_COMPLETION: { label: "Needs Completion", badgeClass: "bg-orange-50 text-orange-700 border-orange-200" },
  REJECTED:         { label: "Rejected",         badgeClass: "bg-slate-100 text-slate-500 border-slate-200" },
  INACTIVE:         { label: "Inactive",         badgeClass: "bg-slate-100 text-slate-500 border-slate-200" },
  SUSPENDED:        { label: "Suspended",        badgeClass: "bg-red-50 text-red-700 border-red-200" },
};

export default async function AssociationFilePage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) redirect("/dashboard");

  const association = await prisma.association.findUnique({
    where: { id: params.id },
    include: {
      buildings: { include: { _count: { select: { units: true } } } },
      mandates: {
        where: { isActive: true },
        include: { user: { select: { fullName: true, email: true } } },
      },
      completionRounds: { orderBy: { roundNumber: "asc" } },
      _count: { select: { issues: true, consultations: true, documents: true, certificates: true } },
    },
  });

  if (!association) notFound();

  const docs = association.registrationDocs as Record<string, unknown> ?? {};
  const president = docs.president as Record<string, string> | undefined;
  const structure = docs.structure as Record<string, number> | undefined;
  const requiredDocs = docs.requiredDocuments as Record<string, string> | undefined;
  const committee = docs.executiveCommittee as Array<Record<string, string>> | undefined;
  const gdprConsent = docs.gdprConsent as Record<string, string> | undefined;
  const registrationNumber = docs.registrationNumber as string | undefined;

  const cfg = STATUS_CONFIG[association.status] ?? STATUS_CONFIG.INACTIVE;
  const canReview = ["PENDING","UNDER_REVIEW","NEEDS_COMPLETION"].includes(association.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/uat" className="hover:text-slate-600">UAT Panel</Link>
        <span>›</span>
        <Link href="/uat/associations" className="hover:text-slate-600">Associations</Link>
        <span>›</span>
        <span className="text-slate-900 font-medium truncate">{association.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{association.name}</h1>
            <span className={`text-sm px-3 py-1 rounded-full border font-medium flex-shrink-0 ${cfg.badgeClass}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-slate-500">{association.address}{association.neighborhood ? ` · ${association.neighborhood}` : ""}</p>
          {association.fiscalCode && <p className="text-sm text-slate-400 mt-0.5">VAT: {association.fiscalCode}</p>}
          {registrationNumber && <p className="text-xs text-slate-400 mt-0.5 font-mono">Reg. No.: {registrationNumber}</p>}
        </div>
      </div>

      {/* Review workflow */}
      {canReview && (
        <AssociationReview
          associationId={association.id}
          operatorId={session.user.id}
          currentStatus={association.status}
          completionRounds={association.completionRounds as Parameters<typeof AssociationReview>[0]["completionRounds"]}
        />
      )}

      {/* Validated */}
      {association.status === "ACTIVE" && association.validatedAt && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 text-sm text-emerald-800 flex items-center gap-2">
          <span>✓</span>
          <span>Validated on {new Date(association.validatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
      )}

      {/* Rejected */}
      {association.status === "REJECTED" && association.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-800">
          <p className="font-medium">Permanently rejected</p>
          <p className="mt-1">{association.rejectionReason}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Buildings", v: association.buildings.length },
          { label: "Issues", v: association._count.issues },
          { label: "Consultations", v: association._count.consultations },
          { label: "Certificates", v: association._count.certificates },
        ].map(s => (
          <div key={s.label} className="card card-body text-center py-3">
            <p className="text-2xl font-bold text-uat-700">{s.v}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* President */}
      {president && (
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-slate-900">Board President</h2></div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-slate-400 text-xs mb-0.5">Name</p><p className="font-medium">{president.firstName} {president.lastName}</p></div>
              <div><p className="text-slate-400 text-xs mb-0.5">Email</p><a href={`mailto:${president.email}`} className="text-uat-600 hover:underline">{president.email}</a></div>
              <div><p className="text-slate-400 text-xs mb-0.5">Phone</p><p>{president.phone}</p></div>
              {structure && (
                <div><p className="text-slate-400 text-xs mb-0.5">Building structure</p>
                  <p>{structure.unitCount} units · {structure.staircaseCount} staircase(s)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Required documents */}
      {requiredDocs && (
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-slate-900">Required documents submitted</h2></div>
          <div className="divide-y divide-slate-100">
            {[
              { label: "Articles of Association (Statut)", url: requiredDocs.statute },
              { label: "Court registration proof", url: requiredDocs.courtRegistration },
              { label: "President mandate contract", url: requiredDocs.presidentMandate },
              { label: "President ID copy", url: requiredDocs.presidentId },
            ].map(doc => (
              <div key={doc.label} className="px-6 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-uat-50 flex items-center justify-center text-uat-600 text-sm">📄</div>
                  <p className="text-sm font-medium text-slate-900">{doc.label}</p>
                </div>
                {doc.url ? (
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0">
                    Open →
                  </a>
                ) : (
                  <span className="badge-eroare text-xs">Missing</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Executive committee */}
      {committee && committee.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Executive committee</h2>
            <span className="text-sm text-slate-400">{committee.length} members</span>
          </div>
          <div className="divide-y divide-slate-100">
            {committee.map((m, i) => (
              <div key={i} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900">{m.firstName} {m.lastName}</p>
                    <span className="badge badge-info text-xs">{m.role}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-slate-400">
                    {m.email && <span>✉ {m.email}</span>}
                    {m.phone && <span>📞 {m.phone}</span>}
                  </div>
                </div>
                {m.idUrl && (
                  <a href={m.idUrl} target="_blank" rel="noopener noreferrer"
                    className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0">ID →</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active mandates */}
      {association.mandates.length > 0 && (
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-slate-900">Active platform accounts</h2></div>
          <div className="divide-y divide-slate-100">
            {association.mandates.map(m => (
              <div key={m.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{m.user.fullName}</p>
                  <p className="text-sm text-slate-500">{m.user.email}</p>
                </div>
                <span className="badge badge-info text-xs">{m.role.replace(/_/g," ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buildings */}
      {association.buildings.length > 0 && (
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-slate-900">Registered buildings</h2></div>
          <div className="divide-y divide-slate-100">
            {association.buildings.map(b => (
              <div key={b.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{b.name}</p>
                  <p className="text-sm text-slate-500">{b.address}</p>
                </div>
                <span className="text-sm text-slate-500">{b._count.units} units</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GDPR */}
      {gdprConsent && (
        <div className="card border-slate-100">
          <div className="card-body text-xs text-slate-400 flex items-center gap-2">
            <span>🔒</span>
            <span>GDPR consent recorded: {new Date(gdprConsent.timestamp).toLocaleString("en-GB")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
