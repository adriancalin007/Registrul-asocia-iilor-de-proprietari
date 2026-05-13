import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const UAT_ROLES: UserRole[] = [UserRole.UAT_OPERATOR, UserRole.SUPER_ADMIN];

const PatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("toggle_active") }),
  z.object({ action: z.literal("set_civic_type"), civicType: z.enum(["CETATEAN_S1", "PROPRIETAR"]) }),
  z.object({ action: z.literal("promote_uat"),         operatorType: z.enum(["GENERAL", "POLICE"]).default("GENERAL") }),
  z.object({ action: z.literal("revoke_uat") }),
  z.object({ action: z.literal("promote_super_admin") }),
  z.object({ action: z.literal("revoke_super_admin") }),
]);

interface Params { params: { userId: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (!UAT_ROLES.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = params;
  if (userId === session.user.id) {
    return NextResponse.json({ error: "Nu puteți modifica propriul cont din această pagină" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { uatOperatorAccount: true, superAdminAccount: true },
  });
  if (!target) return NextResponse.json({ error: "Utilizatorul nu există" }, { status: 404 });

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { action } = parsed.data;

  if (action === "toggle_active") {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !target.isActive },
    });
    return NextResponse.json({ isActive: updated.isActive });
  }

  if (action === "set_civic_type") {
    const { civicType } = parsed.data;
    await prisma.user.update({ where: { id: userId }, data: { civicType } });
    return NextResponse.json({ civicType });
  }

  // Only SUPER_ADMIN can promote/revoke UAT or super admin
  if (["promote_uat", "revoke_uat", "promote_super_admin", "revoke_super_admin"].includes(action)) {
    if (role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: "Numai Super Admin poate modifica roluri de operator" }, { status: 403 });
    }
  }

  if (action === "promote_uat") {
    if (target.uatOperatorAccount) {
      return NextResponse.json({ error: "Utilizatorul are deja cont de operator UAT" }, { status: 400 });
    }

    // Resolve uatId: from session (UAT_OPERATOR) or first UAT in DB (SUPER_ADMIN without own operator account)
    let uatId = session.user.uatId as string | undefined;
    if (!uatId) {
      const uat = await prisma.uAT.findFirst();
      uatId = uat?.id;
    }
    if (!uatId) return NextResponse.json({ error: "Nu există niciun UAT configurat" }, { status: 500 });

    await prisma.uATOperator.create({
      data: { userId, uatId, operatorType: parsed.data.operatorType },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "revoke_uat") {
    if (!target.uatOperatorAccount) {
      return NextResponse.json({ error: "Utilizatorul nu are cont de operator UAT" }, { status: 400 });
    }
    await prisma.uATOperator.delete({ where: { userId } });
    return NextResponse.json({ success: true });
  }

  if (action === "promote_super_admin") {
    if (role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: "Numai Super Admin poate promova Super Admin" }, { status: 403 });
    }
    if (target.superAdminAccount) {
      return NextResponse.json({ error: "Utilizatorul este deja Super Admin" }, { status: 400 });
    }
    await prisma.superAdmin.create({ data: { userId } });
    return NextResponse.json({ success: true });
  }

  if (action === "revoke_super_admin") {
    if (role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json({ error: "Numai Super Admin poate revoca Super Admin" }, { status: 403 });
    }
    if (!target.superAdminAccount) {
      return NextResponse.json({ error: "Utilizatorul nu este Super Admin" }, { status: 400 });
    }
    await prisma.superAdmin.delete({ where: { userId } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });
}
