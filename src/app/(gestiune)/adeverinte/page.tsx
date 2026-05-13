// src/app/(dashboard)/adeverinte/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { UserRole, CertificateStatus, CertificateType } from "@prisma/client";
import Link from "next/link";
import ApproveCertificate from "./ApproveCertificate";
import { getServerTranslator } from "@/lib/get-locale";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Adeverințe" };

const STATUS_BADGE: Record<CertificateStatus, string> = {
  REQUESTED: "badge-asteptare",
  APPROVED:  "badge-info",
  REJECTED:  "badge-eroare",
  ISSUED:    "badge-activ",
  EXPIRED:   "badge-inactiv",
};

const TYPE_ICON: Record<CertificateType, React.ReactNode> = {
  PAYMENTS_UP_TO_DATE: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  ),
  OWNERSHIP: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
    </svg>
  ),
  RESERVE_FUND: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
    </svg>
  ),
  GENERAL: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
};

export default async function CertificatesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as UserRole;
  const userId = session.user.id;
  const { t } = getServerTranslator();

  const TYPE_LABELS: Record<CertificateType, string> = {
    PAYMENTS_UP_TO_DATE: t("certificates.typePaymentsUpToDate"),
    OWNERSHIP:           t("certificates.typeOwnership"),
    RESERVE_FUND:        t("certificates.typeReserveFund"),
    GENERAL:             t("certificates.typeGeneral"),
  };

  const STATUS_LABELS: Record<CertificateStatus, string> = {
    REQUESTED: t("certificates.statusRequested"),
    APPROVED:  t("certificates.statusApproved"),
    REJECTED:  t("certificates.statusRejected"),
    ISSUED:    t("certificates.statusIssued"),
    EXPIRED:   t("certificates.statusExpired"),
  };

  /* ── OWNER ────────────────────────────────────────────────── */
  if (role === UserRole.OWNER) {
    const ownership = await prisma.ownership.findFirst({
      where: { userId, isActive: true },
      include: { unit: { include: { building: { include: { association: true } } } } },
    });

    const certificates = ownership
      ? await prisma.certificate.findMany({
          where: { ownershipId: ownership.id },
          orderBy: { requestedAt: "desc" },
        })
      : [];

    return (
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">{t("certificates.title")}</h1>
            {ownership && (
              <p className="page-subtitle">
                Apartament {ownership.unit.number} · {ownership.unit.building.association.name}
              </p>
            )}
          </div>
          {ownership && (
            <Link href="/adeverinte/nou" className="btn-primary gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t("certificates.requestNew")}
            </Link>
          )}
        </div>

        <div className="card">
          {certificates.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
              </div>
              <p className="empty-state-title">{t("certificates.noCertificates")}</p>
              {ownership && (
                <Link href="/adeverinte/nou" className="btn-primary mt-1">
                  {t("certificates.requestFirst")}
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {certificates.map((c) => (
                <div key={c.id} className="list-row">
                  <div className="icon-badge-uat flex-shrink-0">
                    {TYPE_ICON[c.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm">{TYPE_LABELS[c.type]}</p>
                      <span className={STATUS_BADGE[c.status]}>{STATUS_LABELS[c.status]}</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Solicitată: {new Date(c.requestedAt).toLocaleDateString("ro-RO")}
                      {c.issuedAt && ` · Emisă: ${new Date(c.issuedAt).toLocaleDateString("ro-RO")}`}
                    </p>
                    {c.notes && <p className="text-xs text-slate-500 mt-0.5">{c.notes}</p>}
                  </div>
                  <div className="flex-shrink-0">
                    {c.status === CertificateStatus.ISSUED && c.pdfUrl && (
                      <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary gap-1.5 text-xs py-1.5 px-3">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        {t("certificates.downloadPdf")}
                      </a>
                    )}
                    {c.status === CertificateStatus.ISSUED && !c.pdfUrl && (
                      <Link href={`/adeverinte/${c.id}/pdf`} className="btn-primary gap-1.5 text-xs py-1.5 px-3">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                        </svg>
                        {t("certificates.generatePdf")}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── MANAGER / BOARD_PRESIDENT ────────────────────────────── */
  const cookieStore = cookies();
  let associationId = cookieStore.get("asociatie_activa")?.value;

  if (!associationId) {
    const mandate = await prisma.mandate.findFirst({ where: { userId, isActive: true } });
    associationId = mandate?.associationId;
  }

  if (!associationId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-slate-400">{t("certificates.noAccess")}</p>
      </div>
    );
  }

  const certificates = await prisma.certificate.findMany({
    where: { associationId },
    orderBy: { requestedAt: "desc" },
    include: {
      ownership: {
        include: {
          user: { select: { fullName: true, email: true } },
          unit: { select: { number: true } },
        },
      },
    },
  });

  const pending = certificates.filter(c => c.status === CertificateStatus.REQUESTED);
  const rest    = certificates.filter(c => c.status !== CertificateStatus.REQUESTED);

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("certificates.allTitle")}</h1>
          <p className="page-subtitle">{certificates.length} adeverințe înregistrate</p>
        </div>
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm font-semibold text-slate-700">
              {t("certificates.pendingTitle").replace("{count}", String(pending.length))}
            </span>
          </div>
          {pending.map((c) => (
            <div key={c.id} className="card-accent-yellow">
              <div className="card-body space-y-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="icon-badge-uat mt-0.5 flex-shrink-0">
                      {TYPE_ICON[c.type]}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{TYPE_LABELS[c.type]}</p>
                      <p className="text-sm text-slate-600 mt-0.5">
                        {c.ownership.user.fullName}
                        <span className="text-slate-400 mx-1.5">·</span>
                        Apt. {c.ownership.unit.number}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {c.ownership.user.email} · {new Date(c.requestedAt).toLocaleDateString("ro-RO")}
                      </p>
                    </div>
                  </div>
                  <span className="badge-asteptare flex-shrink-0">{t("certificates.pendingBadge")}</span>
                </div>
                <ApproveCertificate
                  certificateId={c.id}
                  type={c.type}
                  ownerName={c.ownership.user.fullName}
                  unitNumber={c.ownership.unit.number}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All certificates table */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-slate-900">{t("certificates.allCertificates")}</h2>
          <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
            {certificates.length} total
          </span>
        </div>
        {certificates.length === 0 ? (
          <div className="card-body text-center py-10 text-slate-400 text-sm">
            {t("certificates.noCertificates")}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {certificates.map((c) => (
              <div key={c.id} className="list-row">
                <div className="icon-badge-uat flex-shrink-0">
                  {TYPE_ICON[c.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-medium text-slate-900 text-sm">
                      {TYPE_LABELS[c.type]}
                      <span className="text-slate-400 font-normal mx-1.5">—</span>
                      Apt. {c.ownership.unit.number}
                    </p>
                    <span className={STATUS_BADGE[c.status]}>{STATUS_LABELS[c.status]}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {c.ownership.user.fullName} · {new Date(c.requestedAt).toLocaleDateString("ro-RO")}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {c.status === CertificateStatus.ISSUED && c.pdfUrl && (
                    <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer"
                      className="btn-secondary gap-1.5 text-xs py-1.5 px-3">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      PDF
                    </a>
                  )}
                  {c.status === CertificateStatus.ISSUED && !c.pdfUrl && (
                    <Link href={`/adeverinte/${c.id}/pdf`}
                      className="btn-secondary text-xs py-1.5 px-3">
                      {t("certificates.generatePdf")}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
