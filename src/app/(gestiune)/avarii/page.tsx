// src/app/(dashboard)/avarii/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { UserRole, IssueStatus } from "@prisma/client";
import Link from "next/link";
import { getServerTranslator } from "@/lib/get-locale";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Avarii & Întreținere" };

const STATUS_BADGE: Record<IssueStatus, string> = {
  OPEN:        "badge-eroare",
  IN_PROGRESS: "badge-asteptare",
  RESOLVED:    "badge-info",
  CLOSED:      "badge-respins",
};

const STATUS_ICON: Record<IssueStatus, React.ReactNode> = {
  OPEN: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  IN_PROGRESS: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26" />
    </svg>
  ),
  RESOLVED: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  CLOSED: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
};

export default async function IssuesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as UserRole;
  const userId = session.user.id;
  const { t } = getServerTranslator();

  const cookieStore = cookies();
  const activeAssociationId = cookieStore.get("asociatie_activa")?.value;

  let associationId: string | undefined = activeAssociationId;
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

  if (!associationId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-slate-400">{t("issues.noAccess")}</p>
      </div>
    );
  }

  const issues = await prisma.issue.findMany({
    where: { associationId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const canAdd = ([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.OWNER] as UserRole[]).includes(role);

  const stats = {
    open:       issues.filter(i => i.status === IssueStatus.OPEN).length,
    inProgress: issues.filter(i => i.status === IssueStatus.IN_PROGRESS).length,
    resolved:   issues.filter(i => i.status === IssueStatus.RESOLVED).length,
  };

  const STATUS_LABELS: Record<IssueStatus, string> = {
    OPEN:        t("issues.statusOpen"),
    IN_PROGRESS: t("issues.statusInProgress"),
    RESOLVED:    t("issues.statusResolved"),
    CLOSED:      t("issues.statusClosed"),
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("issues.title")}</h1>
          <p className="page-subtitle">Monitorizare și rezolvare probleme tehnice</p>
        </div>
        {canAdd && (
          <Link href="/avarii/nou" className="btn-primary gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t("issues.newIssue")}
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card-red">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-card-value">{stats.open}</p>
              <p className="stat-card-label">{t("issues.statusOpen")}</p>
            </div>
            <div className="icon-badge-red opacity-80">
              {STATUS_ICON.OPEN}
            </div>
          </div>
        </div>
        <div className="stat-card-amber">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-card-value">{stats.inProgress}</p>
              <p className="stat-card-label">{t("issues.statusInProgress")}</p>
            </div>
            <div className="icon-badge-amber opacity-80">
              {STATUS_ICON.IN_PROGRESS}
            </div>
          </div>
        </div>
        <div className="stat-card-blue">
          <div className="flex items-start justify-between">
            <div>
              <p className="stat-card-value">{stats.resolved}</p>
              <p className="stat-card-label">{t("issues.statusResolved")}</p>
            </div>
            <div className="icon-badge-blue opacity-80">
              {STATUS_ICON.RESOLVED}
            </div>
          </div>
        </div>
      </div>

      {/* Issue list */}
      <div className="space-y-2">
        {issues.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon bg-emerald-50">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="empty-state-title">{t("issues.noIssues")}</p>
            <p className="empty-state-body">{t("issues.allSystemsNormal")}</p>
            {canAdd && (
              <Link href="/avarii/nou" className="btn-primary mt-2">
                + {t("issues.reportFirst")}
              </Link>
            )}
          </div>
        ) : issues.map(issue => {
          const accentClass =
            issue.status === IssueStatus.OPEN        ? "card-accent-red" :
            issue.status === IssueStatus.IN_PROGRESS ? "card-accent-amber" :
            issue.status === IssueStatus.RESOLVED    ? "card-accent-blue" :
            "card";

          const iconClass =
            issue.status === IssueStatus.OPEN        ? "icon-badge-red" :
            issue.status === IssueStatus.IN_PROGRESS ? "icon-badge-amber" :
            issue.status === IssueStatus.RESOLVED    ? "icon-badge-blue" :
            "icon-badge-gray";

          return (
            <Link key={issue.id} href={`/avarii/${issue.id}`}
              className={`${accentClass} block transition-all duration-200 hover:-translate-y-px hover:shadow-md`}
            >
              <div className="card-body flex items-center gap-4 py-4">
                <div className={iconClass}>
                  {STATUS_ICON[issue.status]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-mono text-xs text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                      {issue.ticketNumber}
                    </span>
                    <span className={STATUS_BADGE[issue.status]}>
                      {STATUS_LABELS[issue.status]}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900 text-sm mt-1">
                    {issue.category}
                    <span className="text-slate-400 font-normal mx-1.5">·</span>
                    <span className="text-slate-600">{issue.location}</span>
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{issue.description}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-slate-400">
                    {new Date(issue.createdAt).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                  <svg className="w-4 h-4 text-slate-300 ml-auto mt-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
