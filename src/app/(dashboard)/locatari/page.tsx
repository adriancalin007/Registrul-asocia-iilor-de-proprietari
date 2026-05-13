// src/app/(dashboard)/locatari/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import ProprietariClient from "./ProprietariClient";

export default async function LocatariPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as UserRole;
  const allowed = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];
  if (!allowed.includes(role)) redirect("/dashboard");

  const cookieStore = cookies();
  let activeAssociationId = cookieStore.get("asociatie_activa")?.value ?? null;

  if (!activeAssociationId) {
    const mandate = await prisma.mandate.findFirst({
      where: { userId: session.user.id, isActive: true },
      select: { associationId: true },
    });
    activeAssociationId = mandate?.associationId ?? null;
  }

  return <ProprietariClient key={activeAssociationId ?? "none"} />;
}
