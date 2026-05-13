// src/app/(gestiune)/layout.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import NavItem from "@/components/layout/NavItem";
import TopBar from "@/components/layout/TopBar";
import AssociationSwitcher from "@/components/layout/AssociationSwitcher";
import Link from "next/link";

const NAV_BY_ROLE: Record<string, { href: string; labelKey: string; icon: string }[]> = {
  OWNER: [
    { href: "/consultari", labelKey: "nav.consultations", icon: "chat"        },
    { href: "/adeverinte", labelKey: "nav.certificates",  icon: "certificate" },
    { href: "/avarii",     labelKey: "nav.issues",        icon: "wrench"      },
    { href: "/sesizari",   labelKey: "nav.sesizari",      icon: "chat"        },
  ],
  MANAGER: [
    { href: "/documente",           labelKey: "nav.documents",          icon: "document" },
    { href: "/avarii",              labelKey: "nav.issues",             icon: "wrench"   },
    { href: "/sesizari",            labelKey: "nav.sesizari",           icon: "chat"     },
    { href: "/consultari",          labelKey: "nav.consultations",      icon: "chat"     },
    { href: "/adeverinte",          labelKey: "nav.certificates",       icon: "certificate" },
    { href: "/financiare",          labelKey: "nav.financials",         icon: "money"    },
    { href: "/facturi",             labelKey: "nav.invoices",           icon: "receipt"  },
    { href: "/situatii-financiare", labelKey: "nav.situatiiFinanciare", icon: "money"    },
    { href: "/rapoarte",            labelKey: "nav.reports",            icon: "chart"    },
    { href: "/furnizori",           labelKey: "nav.suppliers",          icon: "shop"     },
    { href: "/lucrari",             labelKey: "nav.works",              icon: "hammer"   },
  ],
  BOARD_PRESIDENT: [
    { href: "/documente",           labelKey: "nav.documents",          icon: "document" },
    { href: "/avarii",              labelKey: "nav.issues",             icon: "wrench"   },
    { href: "/sesizari",            labelKey: "nav.sesizari",           icon: "chat"     },
    { href: "/consultari",          labelKey: "nav.consultations",      icon: "chat"     },
    { href: "/adeverinte",          labelKey: "nav.certificates",       icon: "certificate" },
    { href: "/financiare",          labelKey: "nav.financials",         icon: "money"    },
    { href: "/facturi",             labelKey: "nav.invoices",           icon: "receipt"  },
    { href: "/situatii-financiare", labelKey: "nav.situatiiFinanciare", icon: "money"    },
    { href: "/rapoarte",            labelKey: "nav.reports",            icon: "chart"    },
    { href: "/furnizori",           labelKey: "nav.suppliers",          icon: "shop"     },
    { href: "/lucrari",             labelKey: "nav.works",              icon: "hammer"   },
  ],
  AUDITOR: [
    { href: "/documente",           labelKey: "nav.documents",          icon: "document" },
    { href: "/financiare",          labelKey: "nav.financials",         icon: "money"    },
    { href: "/situatii-financiare", labelKey: "nav.situatiiFinanciare", icon: "money"    },
    { href: "/rapoarte",            labelKey: "nav.reports",            icon: "chart"    },
  ],
  SUPPLIER: [
    { href: "/furnizori", labelKey: "nav.suppliers", icon: "shop" },
  ],
  UAT_OPERATOR: [
    { href: "/documente",           labelKey: "nav.documents",          icon: "document" },
    { href: "/avarii",              labelKey: "nav.issues",             icon: "wrench"   },
    { href: "/consultari",          labelKey: "nav.consultations",      icon: "chat"     },
    { href: "/adeverinte",          labelKey: "nav.certificates",       icon: "certificate" },
    { href: "/financiare",          labelKey: "nav.financials",         icon: "money"    },
    { href: "/facturi",             labelKey: "nav.invoices",           icon: "receipt"  },
    { href: "/situatii-financiare", labelKey: "nav.situatiiFinanciare", icon: "money"    },
    { href: "/rapoarte",            labelKey: "nav.reports",            icon: "chart"    },
    { href: "/furnizori",           labelKey: "nav.suppliers",          icon: "shop"     },
    { href: "/lucrari",             labelKey: "nav.works",              icon: "hammer"   },
  ],
  SUPER_ADMIN: [
    { href: "/documente",           labelKey: "nav.documents",          icon: "document" },
    { href: "/avarii",              labelKey: "nav.issues",             icon: "wrench"   },
    { href: "/sesizari",            labelKey: "nav.sesizari",           icon: "chat"     },
    { href: "/consultari",          labelKey: "nav.consultations",      icon: "chat"     },
    { href: "/adeverinte",          labelKey: "nav.certificates",       icon: "certificate" },
    { href: "/financiare",          labelKey: "nav.financials",         icon: "money"    },
    { href: "/facturi",             labelKey: "nav.invoices",           icon: "receipt"  },
    { href: "/situatii-financiare", labelKey: "nav.situatiiFinanciare", icon: "money"    },
    { href: "/rapoarte",            labelKey: "nav.reports",            icon: "chart"    },
    { href: "/furnizori",           labelKey: "nav.suppliers",          icon: "shop"     },
    { href: "/lucrari",             labelKey: "nav.works",              icon: "hammer"   },
  ],
};

const ALLOWED_ROLES = new Set<UserRole>([
  UserRole.OWNER,
  UserRole.MANAGER,
  UserRole.BOARD_PRESIDENT,
  UserRole.AUDITOR,
  UserRole.SUPPLIER,
  UserRole.UAT_OPERATOR,
  UserRole.SUPER_ADMIN,
]);

export default async function GestiuneLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as UserRole;
  if (!ALLOWED_ROLES.has(role)) redirect("/dashboard");

  const canSwitch = role === UserRole.MANAGER || role === UserRole.BOARD_PRESIDENT || role === UserRole.AUDITOR;
  let switcherAssociations: { id: string; name: string; neighborhood: string | null }[] = [];
  let activeAssociationId: string | null = null;

  if (canSwitch) {
    const mandates = await prisma.mandate.findMany({
      where: { userId: session.user.id, isActive: true },
      include: { association: { select: { id: true, name: true, neighborhood: true, status: true } } },
      orderBy: { startDate: "desc" },
    });
    switcherAssociations = mandates
      .filter(m => m.association.status === "ACTIVE")
      .map(m => ({ id: m.association.id, name: m.association.name, neighborhood: m.association.neighborhood }));

    const cookieStore = cookies();
    activeAssociationId = cookieStore.get("asociatie_activa")?.value ?? switcherAssociations[0]?.id ?? null;
  }

  // Alert badges for avarii + sesizări in gestiune zone
  const alertBadges: Record<string, number> = {};
  if (canSwitch && switcherAssociations.length > 0) {
    const allAssocIds = switcherAssociations.map(a => a.id);
    const [avariiCount, sesizariCount] = await Promise.all([
      prisma.issue.count({
        where: { associationId: { in: allAssocIds }, status: { in: ["OPEN", "IN_PROGRESS"] } },
      }),
      prisma.sesizare.count({
        where: { associationId: { in: allAssocIds }, status: { in: ["OPEN", "IN_PROGRESS"] } },
      }),
    ]);
    if (avariiCount > 0)   alertBadges["/avarii"]   = avariiCount;
    if (sesizariCount > 0) alertBadges["/sesizari"] = sesizariCount;
  }

  const navItems = (NAV_BY_ROLE[role] ?? []).map(item => ({ ...item, badge: alertBadges[item.href] }));

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-white border-r border-slate-100/80 print:hidden"
        style={{ boxShadow: "1px 0 0 rgba(0,0,0,0.03)" }}>

        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-100/80 flex-shrink-0">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #059669 0%, #047857 100%)", boxShadow: "0 2px 8px rgba(5,150,105,0.35)" }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-tight tracking-tight">Gestiune</p>
            <p className="text-xs text-slate-400">Financiar & Lucrări</p>
          </div>
        </div>

        {/* Association switcher (managers only) */}
        {canSwitch && switcherAssociations.length > 0 && (
          <div className="px-3 pt-3">
            <AssociationSwitcher
              associations={switcherAssociations}
              activeId={activeAssociationId}
            />
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <NavItem key={item.href} href={item.href} labelKey={item.labelKey} icon={item.icon} badge={item.badge} />
          ))}
        </nav>

        {/* Back to Portal Civic */}
        <div className="px-3 py-3 border-t border-slate-100/80">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Portal Civic</span>
          </Link>
        </div>

        {/* Role indicator */}
        <div className="px-4 py-4 border-t border-slate-100/80 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-xs font-medium text-slate-500 truncate">
              {role?.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="print:hidden">
          <TopBar user={session.user} />
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8 max-w-screen-xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
