// src/app/(dashboard)/avarii/[id]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { UserRole, IssueStatus } from "@prisma/client";
import Link from "next/link";
import UpdateIssueStatus from "./UpdateIssueStatus";
import { getServerTranslator } from "@/lib/get-locale";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Issue Details" };

interface Props { params: { id: string } }

const STATUS_COLORS: Record<IssueStatus, string> = {
  OPEN: "bg-red-100 text-red-800 border-red-200",
  IN_PROGRESS: "bg-amber-100 text-amber-800 border-amber-200",
  RESOLVED: "bg-blue-100 text-blue-800 border-blue-200",
  CLOSED: "bg-slate-100 text-slate-600 border-slate-200",
};

export default async function IssueDetailPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as UserRole;
  const { t } = getServerTranslator();

  const issue = await prisma.issue.findUnique({
    where: { id: params.id },
    include: { statusHistory: { orderBy: { changedAt: "desc" } } },
  });

  if (!issue) notFound();

  const canManage = ([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[]).includes(role);

  const STATUS_LABELS: Record<IssueStatus, string> = {
    OPEN: t("issues.statusOpen"),
    IN_PROGRESS: t("issues.statusInProgress"),
    RESOLVED: t("issues.statusResolved"),
    CLOSED: t("issues.statusClosed"),
  };

  const STATUS_ICONS: Record<IssueStatus, string> = {
    OPEN: "🔴",
    IN_PROGRESS: "🟡",
    RESOLVED: "🔵",
    CLOSED: "⚫",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <Link href="/avarii" className="hover:text-slate-700">{t("issues.title")}</Link>
          <span>›</span>
          <span className="font-mono text-xs">{issue.ticketNumber}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900">{issue.category}</h1>
          <span className={`text-sm px-3 py-1 rounded-full border font-medium flex-shrink-0 ${STATUS_COLORS[issue.status]}`}>
            {STATUS_ICONS[issue.status]} {STATUS_LABELS[issue.status]}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="card">
        <div className="card-body space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400 text-xs mb-0.5">{t("issues.detailLocationLabel")}</p>
              <p className="font-medium text-slate-900">{issue.location}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-0.5">{t("issues.detailRegisteredLabel")}</p>
              <p className="font-medium text-slate-900">
                {new Date(issue.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1">{t("issues.descriptionLabel")}</p>
            <p className="text-slate-800 leading-relaxed">{issue.description}</p>
          </div>
          {issue.completionReport && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-sm text-green-800 font-medium">{t("issues.completionReportLabel")}</p>
              <a href={issue.completionReport} target="_blank" rel="noopener noreferrer"
                className="text-sm text-green-600 hover:underline">{issue.completionReport}</a>
            </div>
          )}
        </div>
      </div>

      {/* Status management */}
      {canManage && issue.status !== IssueStatus.CLOSED && (
        <UpdateIssueStatus issueId={issue.id} currentStatus={issue.status} />
      )}

      {/* Status history */}
      {issue.statusHistory.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-slate-900">{t("issues.historyTitle")}</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {issue.statusHistory.map(h => (
              <div key={h.id} className="px-6 py-3 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-xs">
                  {STATUS_ICONS[h.toStatus]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {STATUS_LABELS[h.fromStatus]} → {STATUS_LABELS[h.toStatus]}
                  </p>
                  {h.notes && <p className="text-sm text-slate-500 mt-0.5">{h.notes}</p>}
                </div>
                <p className="text-xs text-slate-400 flex-shrink-0">
                  {new Date(h.changedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
