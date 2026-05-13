// src/app/(dashboard)/consultari/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { UserRole, ConsultationStatus } from "@prisma/client";
import Link from "next/link";
import { getServerTranslator } from "@/lib/get-locale";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Consultări" };

const STATUS_ACCENT: Record<ConsultationStatus, string> = {
  DRAFT:     "card",
  ACTIVE:    "card-accent-green",
  CLOSED:    "card-accent-blue",
  CANCELLED: "card",
};

const STATUS_BADGE: Record<ConsultationStatus, string> = {
  DRAFT:     "badge-respins",
  ACTIVE:    "badge-activ",
  CLOSED:    "badge-verificare",
  CANCELLED: "badge-inactiv",
};

export default async function ConsultationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as UserRole;
  const userId = session.user.id;
  const { t } = getServerTranslator();

  const STATUS_LABELS: Record<ConsultationStatus, string> = {
    DRAFT:     t("consultations.statusDraft"),
    ACTIVE:    t("consultations.statusActive"),
    CLOSED:    t("consultations.statusClosed"),
    CANCELLED: t("consultations.statusCancelled"),
  };

  const cookieStore = cookies();
  let associationId = cookieStore.get("asociatie_activa")?.value;

  if (!associationId) {
    if (role === UserRole.OWNER) {
      const ownership = await prisma.ownership.findFirst({
        where: { userId, isActive: true },
        include: { unit: { include: { building: true } } },
      });
      associationId = ownership?.unit.building.associationId;
    } else {
      const mandate = await prisma.mandate.findFirst({ where: { userId, isActive: true } });
      associationId = mandate?.associationId;
    }
  }

  if (!associationId) return (
    <div className="max-w-2xl mx-auto text-center py-20">
      <p className="text-slate-400">{t("consultations.noAccess")}</p>
    </div>
  );

  const consultations = await prisma.consultation.findMany({
    where: { associationId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { responses: true } } },
  });

  let respondedIds: string[] = [];
  if (role === UserRole.OWNER) {
    const ownership = await prisma.ownership.findFirst({ where: { userId, isActive: true } });
    if (ownership) {
      const responses = await prisma.consultationResponse.findMany({
        where: { ownershipId: ownership.id },
        select: { consultationId: true },
      });
      respondedIds = responses.map(r => r.consultationId);
    }
  }

  const canInitiate = ([UserRole.BOARD_PRESIDENT, UserRole.MANAGER] as UserRole[]).includes(role);

  const active = consultations.filter(c => c.status === ConsultationStatus.ACTIVE);
  const rest   = consultations.filter(c => c.status !== ConsultationStatus.ACTIVE);

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("consultations.title")}</h1>
          <p className="page-subtitle">
            {active.length > 0
              ? `${active.length} consultare${active.length !== 1 ? "i" : ""} activă${active.length !== 1 ? "" : ""} în curs`
              : "Nicio consultare activă"}
          </p>
        </div>
        {canInitiate && (
          <Link href="/consultari/nou" className="btn-primary gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t("consultations.newConsultation")}
          </Link>
        )}
      </div>

      {consultations.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>
          <p className="empty-state-title">{t("consultations.noConsultations")}</p>
          {canInitiate && (
            <Link href="/consultari/nou" className="btn-primary mt-1">
              {t("consultations.startFirst")}
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {consultations.map(c => {
            const hasResponded = respondedIds.includes(c.id);
            const isActive = c.status === ConsultationStatus.ACTIVE;
            const expiresAt = new Date(c.expiresAt);
            const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 86400000);

            return (
              <Link key={c.id} href={`/consultari/${c.id}`}
                className={`${STATUS_ACCENT[c.status]} block hover:-translate-y-px hover:shadow-md transition-all duration-150`}>
                <div className="card-body flex items-start gap-4 py-4">

                  {/* Status icon */}
                  <div className={`flex-shrink-0 mt-0.5 ${
                    isActive ? "icon-badge-green" : "icon-badge-gray"
                  }`}>
                    {isActive ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                      </svg>
                    ) : c.status === ConsultationStatus.CLOSED ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-slate-900">{c.title}</p>
                      <span className={STATUS_BADGE[c.status]}>{STATUS_LABELS[c.status]}</span>
                      {role === UserRole.OWNER && isActive && (
                        hasResponded ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            {t("consultations.alreadyVoted")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                            ● {t("consultations.awaitingVote")}
                          </span>
                        )
                      )}
                    </div>
                    {c.description && (
                      <p className="text-sm text-slate-500 line-clamp-1">{c.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                        {t("consultations.responses").replace("{count}", String(c._count.responses))}
                      </span>
                      {isActive && daysLeft > 0 && (
                        <span className={`flex items-center gap-1 ${daysLeft <= 3 ? "text-red-500 font-semibold" : ""}`}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t("consultations.daysLeft").replace("{count}", String(daysLeft))}
                        </span>
                      )}
                      <span>
                        {new Date(c.startsAt).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })}
                        {" — "}
                        {expiresAt.toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>

                  <svg className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
