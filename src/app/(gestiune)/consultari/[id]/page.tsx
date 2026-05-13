// src/app/(dashboard)/consultari/[id]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { UserRole, ConsultationStatus } from "@prisma/client";
import Link from "next/link";
import ExpressView from "./ExpressView";
import { getServerTranslator } from "@/lib/get-locale";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Consultation Details" };

interface Props { params: { id: string } }

export default async function ConsultationDetailPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as UserRole;
  const userId = session.user.id;
  const { t } = getServerTranslator();

  const consultation = await prisma.consultation.findUnique({
    where: { id: params.id },
    include: { responses: true },
  });

  if (!consultation) notFound();

  const options = consultation.options as string[];
  const isActive = consultation.status === ConsultationStatus.ACTIVE && new Date(consultation.expiresAt) > new Date();

  let ownershipId: string | null = null;
  let hasResponded = false;
  let existingResponse: number | null = null;

  if (role === UserRole.OWNER) {
    const ownership = await prisma.ownership.findFirst({
      where: { userId, isActive: true },
    });
    ownershipId = ownership?.id ?? null;

    if (ownershipId) {
      const response = await prisma.consultationResponse.findUnique({
        where: { consultationId_ownershipId: { consultationId: consultation.id, ownershipId } },
      });
      hasResponded = !!response;
      existingResponse = response?.optionIndex ?? null;
    }
  }

  // Aggregate results
  const distribution = options.map((opt, idx) => ({
    option: opt,
    count: consultation.responses.filter(r => r.optionIndex === idx).length,
  }));
  const totalResponses = consultation.responses.length;

  const canClose = ([UserRole.BOARD_PRESIDENT, UserRole.MANAGER] as UserRole[]).includes(role) && consultation.status === ConsultationStatus.ACTIVE;

  const STATUS_COLORS: Record<ConsultationStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
    ACTIVE: "bg-green-100 text-green-800 border-green-200",
    CLOSED: "bg-blue-100 text-blue-800 border-blue-200",
    CANCELLED: "bg-red-100 text-red-800 border-red-200",
  };

  const STATUS_LABELS: Record<ConsultationStatus, string> = {
    DRAFT: t("consultations.statusDraft"),
    ACTIVE: t("consultations.statusActive"),
    CLOSED: t("consultations.statusClosed"),
    CANCELLED: t("consultations.statusCancelled"),
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <Link href="/consultari" className="hover:text-slate-700">{t("consultations.breadcrumb")}</Link>
          <span>›</span>
          <span className="truncate">{consultation.title}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">{consultation.title}</h1>
          <span className={`text-sm px-3 py-1 rounded-full border font-medium flex-shrink-0 ${STATUS_COLORS[consultation.status]}`}>
            {STATUS_LABELS[consultation.status]}
          </span>
        </div>
        <div className="flex gap-4 mt-2 text-sm text-slate-400">
          <span>📅 {new Date(consultation.startsAt).toLocaleDateString()} — {new Date(consultation.expiresAt).toLocaleDateString()}</span>
          <span>💬 {t("consultations.responses").replace("{count}", String(totalResponses))}</span>
        </div>
      </div>

      {consultation.description && (
        <div className="card card-body">
          <p className="text-slate-700 leading-relaxed">{consultation.description}</p>
        </div>
      )}

      {/* Express view — owner voting */}
      {role === UserRole.OWNER && isActive && ownershipId && (
        <ExpressView
          consultationId={consultation.id}
          ownershipId={ownershipId}
          options={options}
          hasResponded={hasResponded}
          existingResponse={existingResponse}
        />
      )}

      {role === UserRole.OWNER && hasResponded && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-green-500 text-xl">✓</span>
          <div>
            <p className="font-medium text-green-800">{t("consultations.alreadyVoted")}</p>
            <p className="text-sm text-green-600">
              {t("consultations.yourChoice")}: <strong>{existingResponse !== null ? options[existingResponse] : ""}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Aggregated results */}
      {(role !== UserRole.OWNER || !isActive || consultation.status === ConsultationStatus.CLOSED) && totalResponses > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">{t("consultations.distributionTitle")}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{t("consultations.distributionSubtitle")}</p>
          </div>
          <div className="card-body space-y-3">
            {distribution.map(({ option, count }) => {
              const percent = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
              return (
                <div key={option}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{option}</span>
                    <span className="text-slate-500">{count} ({percent}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5">
                    <div className="bg-uat-600 h-2.5 rounded-full transition-all" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
              {t("consultations.totalResponses").replace("{count}", String(totalResponses))}
            </p>
          </div>
        </div>
      )}

      {/* Admin actions */}
      {canClose && (
        <div className="card border-slate-200">
          <div className="card-body">
            <p className="text-sm text-slate-500 mb-3">{t("consultations.closeInfo")}</p>
            <a href={`/api/consultari/${consultation.id}/raport`} className="btn-secondary text-sm mr-3">
              {t("consultations.exportReport")}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
