// src/app/(dashboard)/dashboard/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as UserRole;

  if (role === UserRole.UAT_OPERATOR || role === UserRole.SUPER_ADMIN) {
    redirect("/uat");
  }

  // Find active association for this user
  const mandate = await prisma.mandate.findFirst({
    where: { userId: session.user.id, isActive: true },
    include: { association: { select: { id: true, name: true, status: true } } },
  });

  const ownership = await prisma.ownership.findFirst({
    where: { userId: session.user.id, isActive: true },
    include: {
      unit: {
        include: {
          building: {
            include: { association: { select: { id: true, name: true, status: true } } },
          },
        },
      },
    },
  });

  const association = mandate?.association ?? ownership?.unit.building.association;

  if (!association) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">No association linked</h2>
        <p className="text-slate-500 text-sm">Your account has not been linked to an owners association yet. Contact your association administrator.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-xs font-semibold text-uat-600 uppercase tracking-widest mb-1">Welcome back</p>
        <h1 className="text-2xl font-bold text-slate-900">{session.user.name}</h1>
        <p className="text-slate-500 mt-0.5">{association.name}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { href: "/documents", label: "Documents", icon: "📄", desc: "View and upload documents" },
          { href: "/consultations", label: "Consultations", icon: "💬", desc: "Express your point of view" },
          { href: "/certificates", label: "Certificates", icon: "🏅", desc: "Request certificates" },
          { href: "/issues", label: "Issues", icon: "🔧", desc: "Report maintenance issues" },
          { href: "/suppliers", label: "Suppliers", icon: "🏪", desc: "Suppliers & quotations" },
          { href: "/financials", label: "Financial", icon: "💰", desc: "Financial reports" },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="card-hover p-5 flex flex-col gap-2">
            <span className="text-2xl">{item.icon}</span>
            <p className="font-semibold text-slate-900">{item.label}</p>
            <p className="text-xs text-slate-400">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
