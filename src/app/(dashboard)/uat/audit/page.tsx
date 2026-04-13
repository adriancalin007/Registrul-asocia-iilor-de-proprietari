// src/app/(dashboard)/uat/audit/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Audit Log | UAT" };

export default async function AuditPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) redirect("/dashboard");

  const logs = await prisma.uATAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { fullName: true, email: true } } },
  });

  const ACTION_ICONS: Record<string, string> = {
    LOGIN: "🔑", LOGOUT: "🚪", CREATE: "➕", UPDATE: "✏️",
    DELETE: "🗑️", APPROVE: "✅", REJECT: "❌", VIEW: "👁️",
    CONTEXT_SWITCH: "🔄", EXPORT: "📤", GENERATE_DOCUMENT: "📄",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link href="/uat" className="hover:text-slate-600">UAT Panel</Link>
            <span>›</span>
            <span className="text-slate-700">Audit Log</span>
          </div>
          <h1 className="page-title">UAT Audit Log</h1>
          <p className="page-subtitle">Last 100 institutional operator actions</p>
        </div>
      </div>

      <div className="card">
        <div className="divide-y divide-slate-50">
          {logs.length === 0 ? (
            <div className="card-body text-center py-12 text-slate-400 text-sm">No actions logged yet.</div>
          ) : logs.map(log => (
            <div key={log.id} className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50/50">
              <span className="text-xl flex-shrink-0">{ACTION_ICONS[log.action] ?? "📋"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">
                  {log.action} · {log.resource}
                  {log.resourceId && <span className="text-slate-400 font-mono text-xs ml-2">{log.resourceId.slice(0,8)}...</span>}
                </p>
                <p className="text-xs text-slate-400">{log.user.fullName} — {log.user.email}</p>
              </div>
              <p className="text-xs text-slate-300 flex-shrink-0 text-right">
                {new Date(log.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
