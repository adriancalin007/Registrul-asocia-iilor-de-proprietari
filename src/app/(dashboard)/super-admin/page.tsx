// src/app/(dashboard)/super-admin/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserRole, CivicType } from "@prisma/client";
import Link from "next/link";
import { Suspense } from "react";
import AddOperatorForm from "./AddOperatorForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Super Admin Panel" };

const ROLE_BADGE: Record<string, string> = {
  MANAGER:         "bg-blue-50 text-blue-700",
  BOARD_PRESIDENT: "bg-purple-50 text-purple-700",
  AUDITOR:         "bg-amber-50 text-amber-700",
};
const ROLE_LABEL: Record<string, string> = {
  MANAGER: "Administrator", BOARD_PRESIDENT: "Președinte CA", AUDITOR: "Cenzor",
};

export default async function SuperAdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== UserRole.SUPER_ADMIN) redirect("/dashboard");

  // 30-day activity chart data
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  const [operators, superAdmins, uats, associations, civicUsers, scoliData, auditLogs, mandates] = await Promise.all([
    prisma.uATOperator.findMany({
      include: { user: { select: { id: true, fullName: true, email: true, isActive: true, createdAt: true } }, uat: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.superAdmin.findMany({
      include: { user: { select: { id: true, fullName: true, email: true, isActive: true, createdAt: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.uAT.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.association.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, address: true, neighborhood: true },
      orderBy: { name: "asc" },
    }),
    // Civic users
    prisma.user.findMany({
      where: { civicType: { not: CivicType.NEIDENTIFICAT } },
      select: { id: true, fullName: true, email: true, civicType: true, createdAt: true, domiciliuSector: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    // Schools
    prisma.scoala.findMany({
      include: { _count: { select: { clase: true } } },
      orderBy: { name: "asc" },
    }),
    // Audit log last 30 days
    prisma.auditLog.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    // All active mandates for management roles, grouped for display
    prisma.mandate.findMany({
      where: { isActive: true, role: { in: [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.AUDITOR] } },
      include: {
        user:        { select: { id: true, fullName: true, email: true, isActive: true } },
        association: { select: { id: true, name: true, neighborhood: true } },
      },
      orderBy: [{ user: { fullName: "asc" } }, { startDate: "desc" }],
    }),
  ]);

  // 30-day chart buckets
  const chartData: { date: string; count: number }[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    return { date: d.toISOString().slice(0, 10), count: 0 };
  });
  for (const log of auditLogs) {
    const dateKey = log.createdAt.toISOString().slice(0, 10);
    const bucket = chartData.find((b) => b.date === dateKey);
    if (bucket) bucket.count++;
  }
  const maxCount = Math.max(1, ...chartData.map((b) => b.count));

  const cetateniCount = civicUsers.filter((u) => u.civicType === CivicType.CETATEAN_S1).length;
  const proprietariCount = civicUsers.filter((u) => u.civicType === CivicType.PROPRIETAR).length;

  // Group mandates by user
  const byUser = new Map<string, {
    user: typeof mandates[0]["user"];
    mandates: typeof mandates;
  }>();
  for (const m of mandates) {
    const key = m.user.id;
    if (!byUser.has(key)) byUser.set(key, { user: m.user, mandates: [] });
    byUser.get(key)!.mandates.push(m);
  }
  const managers = Array.from(byUser.values());

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
          <Link href="/uat" className="hover:text-slate-600">Panou UAT</Link>
          <span>›</span>
          <span className="text-slate-700">Super Admin</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Super Admin</h1>
        <p className="text-sm text-slate-500 mt-0.5">Gestionare conturi, mandate și operatori platformă.</p>
        <div className="flex gap-3 mt-3">
          <Link href="/super-admin/roles" className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-lg transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Editor roluri navigare
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Asociații active", value: associations.length },
          { label: "Manageri", value: managers.length },
          { label: "Cetățeni S1 verificați", value: cetateniCount },
          { label: "Proprietari (domiciliu alt sector)", value: proprietariCount },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
            <p className="text-2xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Activitate 30 zile ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="mb-4">
          <h2 className="font-semibold text-slate-900">Activitate (ultimele 30 zile)</h2>
          <p className="text-xs text-slate-400 mt-0.5">{auditLogs.length} acțiuni înregistrate</p>
        </div>
        <div className="flex items-end gap-0.5 h-20">
          {chartData.map((b) => (
            <div
              key={b.date}
              title={`${b.date}: ${b.count} acțiuni`}
              className="flex-1 bg-uat-500 rounded-t-sm min-h-[2px] transition-all hover:bg-uat-600"
              style={{ height: `${Math.max(2, (b.count / maxCount) * 80)}px` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1 text-xs text-slate-300">
          <span>{chartData[0]?.date.slice(5)}</span>
          <span>{chartData[29]?.date.slice(5)}</span>
        </div>
      </div>

      {/* ── Utilizatori civici ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900">Utilizatori verificați ROeID</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {cetateniCount} cetățeni S1 · {proprietariCount} proprietari
            </p>
          </div>
        </div>
        <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
          {civicUsers.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">Niciun utilizator verificat.</div>
          ) : civicUsers.map((u) => (
            <div key={u.id} className="px-6 py-3 flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${u.civicType === "CETATEAN_S1" ? "bg-uat-500" : "bg-amber-400"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{u.fullName}</p>
                <p className="text-xs text-slate-400">{u.email}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                u.civicType === "CETATEAN_S1"
                  ? "bg-uat-50 text-uat-700 border border-uat-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                {u.civicType === "CETATEAN_S1" ? "Cetățean S1" : `Proprietar S${u.domiciliuSector ?? "?"}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Școli ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Școli Sector 1</h2>
          <span className="text-xs text-slate-400">{scoliData.length} active</span>
        </div>
        <div className="divide-y divide-slate-50">
          {scoliData.map((s) => (
            <div key={s.id} className="px-6 py-3 flex items-center gap-4">
              <span className="text-xl">🎓</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{s.name}</p>
                <p className="text-xs text-slate-400 truncate">{s.address}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-slate-700">{s._count.clase}</p>
                <p className="text-xs text-slate-400">clase</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Manageri & Mandate ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900">Manageri & Mandate</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {managers.length} utilizatori · {mandates.length} mandate active pe {associations.length} asociații
            </p>
          </div>
        </div>

        {managers.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400 text-sm">
            Niciun manager înregistrat. Adaugă primul cont mai jos.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {managers.map(({ user, mandates: userMandates }) => (
              <div key={user.id} className="px-6 py-4 flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-700 font-semibold text-sm">
                    {user.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-900 text-sm">{user.fullName}</p>
                    {!user.isActive && (
                      <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Dezactivat</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{user.email}</p>
                  {/* Mandate list */}
                  <div className="flex flex-wrap gap-1.5">
                    {userMandates.map(m => (
                      <span key={m.id}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium ${ROLE_BADGE[m.role] ?? "bg-slate-100 text-slate-600"}`}>
                        <span className="font-normal opacity-70">{ROLE_LABEL[m.role] ?? m.role}</span>
                        <span>·</span>
                        <span>{m.association.name}</span>
                        {m.association.neighborhood && (
                          <span className="opacity-60">({m.association.neighborhood})</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right space-y-1">
                  <span className="block text-xs text-slate-400">
                    {userMandates.length} asociați{userMandates.length === 1 ? "e" : "i"}
                  </span>
                  <Link
                    href={`/super-admin?prefillEmail=${encodeURIComponent(user.email)}&role=MANAGER`}
                    className="inline-flex items-center gap-1 text-xs text-uat-600 hover:text-uat-800 font-medium"
                  >
                    + asociație
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add account form ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Adaugă cont sau mandat</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Conturile noi se creează fără parolă — utilizatorul și-o setează prin &quot;Am uitat parola&quot;.
            Dacă email-ul există deja, i se adaugă noul rol.
          </p>
        </div>
        <div className="px-6 py-5">
          <Suspense fallback={null}>
            <AddOperatorForm uats={uats} associations={associations} currentUserId={session.user.id} />
          </Suspense>
        </div>
      </div>

      {/* ── UAT Operators ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Operatori UAT</h2>
          <span className="text-xs text-slate-400">{operators.length} total</span>
        </div>
        <div className="divide-y divide-slate-100">
          {operators.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">Niciun operator.</div>
          ) : operators.map(op => (
            <div key={op.id} className="px-6 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-uat-100 flex items-center justify-center flex-shrink-0">
                <span className="text-uat-700 font-semibold text-sm">
                  {op.user.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm">{op.user.fullName}</p>
                <p className="text-xs text-slate-400">{op.user.email}</p>
                {op.jobTitle && <p className="text-xs text-slate-300 mt-0.5">{op.jobTitle}</p>}
              </div>
              <div className="text-right flex-shrink-0 space-y-1">
                <p className="text-xs text-slate-400">{op.uat.name}</p>
                <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${
                  op.user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                }`}>
                  {op.user.isActive ? "Activ" : "Dezactivat"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Super Admins ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Super Admins</h2>
          <span className="text-xs text-slate-400">{superAdmins.length} total</span>
        </div>
        <div className="divide-y divide-slate-100">
          {superAdmins.map(sa => (
            <div key={sa.id} className="px-6 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-700 font-semibold text-sm">
                  {sa.user.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-slate-900 text-sm">{sa.user.fullName}</p>
                  {sa.user.id === session.user.id && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">tu</span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{sa.user.email}</p>
              </div>
              <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${
                sa.user.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
              }`}>
                {sa.user.isActive ? "Activ" : "Dezactivat"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/uat/associations", label: "Toate asociațiile", icon: "🏢" },
          { href: "/uat/import", label: "Import Excel", icon: "📥" },
          { href: "/uat/reports", label: "Rapoarte UAT", icon: "📊" },
          { href: "/uat/audit", label: "Jurnal audit", icon: "📋" },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-3 hover:shadow-md transition-all text-sm font-medium text-slate-700">
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
