// src/app/(dashboard)/uat/map/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import MapClient from "./MapClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Territorial Map | UAT" };

export default async function MapPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) redirect("/dashboard");

  const associations = await prisma.association.findMany({
    select: {
      id: true, name: true, address: true, neighborhood: true, status: true,
      fiscalCode: true, latitude: true, longitude: true,
      _count: { select: { issues: { where: { status: "OPEN" } }, consultations: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const stats = {
    total: associations.length,
    active: associations.filter(a => a.status === "ACTIVE").length,
    pending: associations.filter(a => ["PENDING","UNDER_REVIEW","NEEDS_COMPLETION"].includes(a.status)).length,
    geocoded: associations.filter(a => a.latitude && a.longitude).length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
            <Link href="/uat" className="hover:text-slate-600">UAT Panel</Link>
            <span>›</span>
            <span className="text-slate-700">Map</span>
          </div>
          <h1 className="page-title">Territorial Map — Sector 1</h1>
          <p className="page-subtitle">{stats.geocoded} of {stats.total} associations located on map</p>
        </div>
        <div className="flex gap-2">
          <div className="card px-4 py-2 text-center">
            <p className="text-xl font-bold text-emerald-700">{stats.active}</p>
            <p className="text-xs text-slate-400">active</p>
          </div>
          <div className="card px-4 py-2 text-center">
            <p className="text-xl font-bold text-amber-700">{stats.pending}</p>
            <p className="text-xs text-slate-400">in process</p>
          </div>
        </div>
      </div>

      <MapClient associations={associations.map(a => ({
        id: a.id, name: a.name, address: a.address,
        neighborhood: a.neighborhood ?? "",
        status: a.status, latitude: a.latitude, longitude: a.longitude,
        openIssues: a._count.issues, activeConsultations: a._count.consultations,
      }))} />
    </div>
  );
}
