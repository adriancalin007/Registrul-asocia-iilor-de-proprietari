// src/app/(dashboard)/uat/associations/[id]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import AssociationReview from "./AssociationReview";
import MandateManager from "./MandateManager";
import LeadershipEditor from "./LeadershipEditor";
import DocManager from "./DocManager";
import BuildingEditor from "./BuildingEditor";
import PendingDocuments from "./PendingDocuments";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dosar Asociație | UAT" };

interface Props { params: { id: string } }

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  ACTIVE:           { label: "Activ",             badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING:          { label: "În așteptare",       badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  UNDER_REVIEW:     { label: "În verificare",      badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  NEEDS_COMPLETION: { label: "Necesită completare", badgeClass: "bg-orange-50 text-orange-700 border-orange-200" },
  REJECTED:         { label: "Respins",            badgeClass: "bg-slate-100 text-slate-500 border-slate-200" },
  INACTIVE:         { label: "Inactiv",            badgeClass: "bg-slate-100 text-slate-500 border-slate-200" },
  SUSPENDED:         { label: "Suspendat",          badgeClass: "bg-red-50 text-red-700 border-red-200" },
  OFFICIAL_REGISTRY: { label: "Registru oficial",   badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  DISSOLVED:         { label: "Dizolvată",           badgeClass: "bg-slate-100 text-slate-500 border-slate-200" },
};

function nameOf(entity: Record<string, string> | undefined): string {
  if (!entity) return "—";
  if (entity.entityType === "company") return entity.companyName ?? "—";
  return [entity.firstName, entity.lastName].filter(Boolean).join(" ") || "—";
}

export default async function AssociationFilePage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) redirect("/dashboard");

  const association = await prisma.association.findUnique({
    where: { id: params.id },
    include: {
      buildings: {
        include: { units: { orderBy: [{ floor: "asc" }, { number: "asc" }] } },
        orderBy: { name: "asc" },
      },
      mandates: {
        where: { isActive: true },
        include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
      },
      completionRounds: { orderBy: { roundNumber: "asc" } },
      _count: { select: { issues: true, consultations: true, documents: true, certificates: true } },
    },
  });

  if (!association) notFound();

  const pendingDocs = await prisma.document.findMany({
    where: { associationId: params.id, status: "DRAFT" },
    select: { id: true, title: true, category: true, folder: true, fileUrl: true, documentDate: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const docs = association.registrationDocs as Record<string, unknown> ?? {};
  const president = docs.president as Record<string, string> | undefined;
  const administrator = docs.administrator as Record<string, string> | undefined;
  const cenzor = docs.cenzor as Record<string, string> | undefined;
  const structure = docs.structure as Record<string, number> | undefined;
  const requiredDocs = docs.requiredDocuments as Record<string, string> | undefined;
  const committee = docs.executiveCommittee as Array<Record<string, string>> | undefined;
  const gdprConsent = docs.gdprConsent as Record<string, string> | undefined;
  const registrationNumber = docs.registrationNumber as string | undefined;

  const cfg = STATUS_CONFIG[association.status] ?? STATUS_CONFIG.INACTIVE;
  const canReview = ["PENDING","UNDER_REVIEW","NEEDS_COMPLETION"].includes(association.status);
  const isActive = association.status === "ACTIVE";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/uat" className="hover:text-slate-600">Panou UAT</Link>
        <span>›</span>
        <Link href="/uat/associations" className="hover:text-slate-600">Asociații</Link>
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
          {association.fiscalCode && <p className="text-sm text-slate-400 mt-0.5">CIF: {association.fiscalCode}</p>}
          {registrationNumber && <p className="text-xs text-slate-400 mt-0.5 font-mono">Nr. înreg.: {registrationNumber}</p>}
        </div>
        <Link
          href={`/uat/associations/${association.id}/scoring`}
          className="btn-secondary text-sm flex-shrink-0"
        >
          Evaluare conformitate →
        </Link>
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
      {isActive && association.validatedAt && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 text-sm text-emerald-800 flex items-center gap-2">
          <span>✓</span>
          <span>Validată la {new Date(association.validatedAt).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
      )}

      {/* Rejected */}
      {association.status === "REJECTED" && association.rejectionReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-800">
          <p className="font-medium">Respinsă permanent</p>
          <p className="mt-1">{association.rejectionReason}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Scări", v: association.buildings.length },
          { label: "Avarii", v: association._count.issues },
          { label: "Consultări", v: association._count.consultations },
          { label: "Adeverințe", v: association._count.certificates },
        ].map(s => (
          <div key={s.label} className="card card-body text-center py-3">
            <p className="text-2xl font-bold text-uat-700">{s.v}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Leadership summary (read-only for non-active, editable always) */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-slate-900">Conducere înregistrată</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs mb-1">Președinte CA</p>
              <p className="font-medium text-slate-900">{nameOf(president)}</p>
              {president?.email && <p className="text-xs text-slate-400 mt-0.5">{president.email}</p>}
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Administrator</p>
              <p className="font-medium text-slate-900">{nameOf(administrator)}</p>
              {administrator?.entityType === "company" && administrator.cui && (
                <p className="text-xs text-slate-400 mt-0.5">CUI {administrator.cui}</p>
              )}
              {administrator?.entityType === "individual" && administrator.email && (
                <p className="text-xs text-slate-400 mt-0.5">{administrator.email}</p>
              )}
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Cenzor</p>
              <p className="font-medium text-slate-900">{nameOf(cenzor)}</p>
              {cenzor?.entityType === "company" && cenzor.cui && (
                <p className="text-xs text-slate-400 mt-0.5">CUI {cenzor.cui}</p>
              )}
            </div>
          </div>
          {structure && (
            <p className="text-xs text-slate-400 mt-3">{structure.unitCount} apartamente · {structure.staircaseCount} scară(ri)</p>
          )}
        </div>
      </div>

      {/* Leadership editor — available for all statuses so UAT can fill gaps before approval */}
      <LeadershipEditor
        associationId={association.id}
        initialPresident={(president as unknown) as Parameters<typeof LeadershipEditor>[0]["initialPresident"]}
        initialAdministrator={(administrator as unknown) as Parameters<typeof LeadershipEditor>[0]["initialAdministrator"]}
        initialCenzor={(cenzor as unknown) as Parameters<typeof LeadershipEditor>[0]["initialCenzor"]}
        initialCommittee={((committee ?? []) as unknown) as Parameters<typeof LeadershipEditor>[0]["initialCommittee"]}
      />

      {/* Pending documents — uploaded by manager, awaiting operator approval */}
      <PendingDocuments
        associationId={association.id}
        initialDocs={pendingDocs.map(d => ({
          ...d,
          documentDate: d.documentDate?.toISOString() ?? null,
          createdAt:    d.createdAt.toISOString(),
        }))}
      />

      {/* Document manager */}
      <DocManager
        associationId={association.id}
        initialDocs={requiredDocs ?? {}}
      />

      {/* Executive committee read-only view */}
      {committee && committee.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Comitet executiv (CEX)</h2>
            <span className="text-sm text-slate-400">{committee.length} membri</span>
          </div>
          <div className="divide-y divide-slate-100">
            {committee.map((m, i) => (
              <div key={i} className="px-6 py-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900">{m.firstName} {m.lastName}</p>
                    {m.role && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{m.role}</span>}
                  </div>
                  <div className="flex gap-4 text-xs text-slate-400">
                    {m.email && <span>✉ {m.email}</span>}
                    {m.phone && <span>📞 {m.phone}</span>}
                  </div>
                </div>
                {m.idUrl && (
                  <a href={m.idUrl} target="_blank" rel="noopener noreferrer"
                    className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0">CI →</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform accounts — derived from leadership */}
      <MandateManager
        associationId={association.id}
        initialMandates={association.mandates.map(m => ({
          id: m.id,
          role: m.role,
          startDate: m.startDate.toISOString(),
          user: m.user,
        }))}
        president={president ? {
          displayName: [president.firstName, president.lastName].filter(Boolean).join(" "),
          isCompany: false,
        } : null}
        administrator={administrator ? {
          displayName: administrator.entityType === "company"
            ? (administrator.companyName ?? "—")
            : [administrator.firstName, administrator.lastName].filter(Boolean).join(" "),
          isCompany: administrator.entityType === "company",
        } : null}
      />

      {/* Buildings / staircases editor */}
      <BuildingEditor
        associationId={association.id}
        initialBuildings={association.buildings.map(b => ({
          id: b.id,
          name: b.name,
          address: b.address,
          builtYear: b.builtYear ?? null,
          units: b.units.map(u => ({
            id: u.id,
            number: u.number,
            floor: u.floor,
            rooms: u.rooms,
            area: u.area,
          })),
        }))}
      />

      {/* GDPR */}
      {gdprConsent && (
        <div className="card border-slate-100">
          <div className="card-body text-xs text-slate-400 flex items-center gap-2">
            <span>🔒</span>
            <span>Consimțământ GDPR înregistrat: {new Date(gdprConsent.timestamp).toLocaleString("ro-RO")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
