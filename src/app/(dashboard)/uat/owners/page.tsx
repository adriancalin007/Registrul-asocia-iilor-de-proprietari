// src/app/(dashboard)/uat/owners/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Owners | UAT" };

export default async function OwnersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) redirect("/dashboard");

  const ownerships = await prisma.ownership.findMany({
    where: { isActive: true },
    include: {
      user: { select: { fullName: true, email: true, createdAt: true } },
      unit: { include: { building: { include: { association: { select: { id: true, name: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const uniqueAssociations = new Set(ownerships.map(o => o.unit.building.associationId)).size;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link href="/uat" className="hover:text-slate-600">UAT Panel</Link>
            <span>›</span>
            <span className="text-slate-700">Owners</span>
          </div>
          <h1 className="page-title">Registered owners</h1>
          <p className="page-subtitle">{ownerships.length} owners across {uniqueAssociations} associations</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card"><p className="stat-card-value text-uat-700">{ownerships.length}</p><p className="stat-card-label">Total owners</p></div>
        <div className="stat-card"><p className="stat-card-value text-emerald-700">{uniqueAssociations}</p><p className="stat-card-label">Associations with owners</p></div>
        <div className="stat-card"><p className="stat-card-value text-slate-700">{uniqueAssociations > 0 ? Math.round(ownerships.length / uniqueAssociations) : 0}</p><p className="stat-card-label">Avg per association</p></div>
      </div>

      <div className="card">
        <div className="card-header"><p className="text-sm text-slate-500">{ownerships.length} records</p></div>
        <div className="divide-y divide-slate-50">
          {ownerships.length === 0 ? (
            <div className="card-body text-center py-12 text-slate-400 text-sm">No owners registered yet.</div>
          ) : ownerships.map(o => (
            <div key={o.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-slate-50/80">
              <div className="w-9 h-9 rounded-full bg-uat-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-uat-700">
                  {o.user.fullName.split(" ").map(n => n[0]).slice(0,2).join("")}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">{o.user.fullName}</p>
                <p className="text-xs text-slate-400">{o.user.email}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-medium text-slate-700">Unit {o.unit.number}</p>
                <Link href={`/uat/associations/${o.unit.building.associationId}`} className="text-xs text-uat-600 hover:underline truncate max-w-40 block">
                  {o.unit.building.association.name}
                </Link>
              </div>
              <p className="text-xs text-slate-300 flex-shrink-0">{new Date(o.createdAt).toLocaleDateString("en-GB")}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
