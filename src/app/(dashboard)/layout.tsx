// src/app/(dashboard)/layout.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import NavItem from "@/components/layout/NavItem";
import TopBar from "@/components/layout/TopBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as UserRole;
  const isUAT = role === UserRole.UAT_OPERATOR || role === UserRole.SUPER_ADMIN;

  const uatNav = [
    { href: "/uat", labelKey: "nav.uatPanel", icon: "institution" },
    { href: "/uat/associations", labelKey: "nav.associations", icon: "users" },
    { href: "/uat/map", labelKey: "nav.map", icon: "map" },
    { href: "/uat/reports", labelKey: "nav.reports", icon: "dashboard" },
    { href: "/uat/audit", labelKey: "nav.auditLog", icon: "document" },
  ];

  const memberNav = [
    { href: "/dashboard", labelKey: "nav.dashboard", icon: "dashboard" },
    { href: "/documents", labelKey: "nav.documents", icon: "document" },
    { href: "/consultations", labelKey: "nav.consultations", icon: "chat" },
    { href: "/certificates", labelKey: "nav.certificates", icon: "certificate" },
    { href: "/issues", labelKey: "nav.issues", icon: "wrench" },
    { href: "/suppliers", labelKey: "nav.suppliers", icon: "shop" },
    { href: "/financials", labelKey: "nav.financials", icon: "money" },
  ];

  const navItems = isUAT ? uatNav : memberNav;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-xl bg-uat-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-tight">Sector 1</p>
            <p className="text-xs text-slate-400 truncate">Asociații Proprietari</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavItem key={item.href} href={item.href} labelKey={item.labelKey} icon={item.icon} />
          ))}
        </nav>

        {/* Role badge */}
        <div className="px-4 py-3 border-t border-slate-100">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {role?.replace(/_/g, " ")}
          </span>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar user={session.user} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
