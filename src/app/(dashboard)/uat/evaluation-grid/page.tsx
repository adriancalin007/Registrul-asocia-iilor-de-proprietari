// src/app/(dashboard)/uat/evaluation-grid/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import GridManager from "./GridManager";

export default async function EvaluationGridPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) redirect("/dashboard");

  const grids = await prisma.evaluationGrid.findMany({
    include: {
      criteria: { where: { isActive: true }, orderBy: { displayOrder: "asc" } },
      _count:   { select: { scores: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
          <Link href="/uat" className="hover:text-slate-600">UAT Panel</Link>
          <span>›</span>
          <span className="text-slate-700">Grilă evaluare</span>
        </div>
        <h1 className="page-title">Grilă de evaluare conformitate</h1>
        <p className="page-subtitle">
          Editați criteriile, punctajele și pragurile de clasificare. O singură grilă poate fi activă la un moment dat.
        </p>
      </div>
      <GridManager
    grids={grids.map(g => ({ ...g, createdAt: g.createdAt.toISOString() }))}
    isSuperAdmin={role === UserRole.SUPER_ADMIN}
  />
    </div>
  );
}
