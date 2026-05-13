import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission, invalidatePermissionCache } from "@/lib/permissions";
import { AccountType, UserStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const CreateOfficialSchema = z.object({
  email:          z.string().email(),
  fullName:       z.string().min(2),
  firstName:      z.string().optional(),
  lastName:       z.string().optional(),
  phone:          z.string().optional(),
  cnp:            z.string().length(13).optional(),
  roleName:       z.string().min(1),
  tempPassword:   z.string().min(8),
  mergeWithUserId: z.string().optional(), // dacă superadminul confirmă merge
  mergeRefused:   z.boolean().optional(),
  mergeJustification: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const guard = await requirePermission("users.create_official");
  if (guard) return guard;

  const session = await auth();
  const actorId = session!.user.id;

  const body = await req.json();
  const parsed = CreateOfficialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { email, fullName, firstName, lastName, phone, cnp, roleName, tempPassword, mergeWithUserId, mergeRefused, mergeJustification } = parsed.data;

  // Verifică dacă rolul există și e OFFICIAL
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role || role.accountType !== AccountType.OFFICIAL) {
    return NextResponse.json({ error: "Rolul specificat nu există sau nu este de tip OFFICIAL" }, { status: 400 });
  }

  // Dacă se face merge cu un cont civil existent
  if (mergeWithUserId) {
    const civilUser = await prisma.user.findUnique({ where: { id: mergeWithUserId } });
    if (!civilUser) return NextResponse.json({ error: "Contul civil nu există" }, { status: 404 });

    // Actualizează contul civil cu datele de funcționar
    await prisma.user.update({
      where: { id: mergeWithUserId },
      data: {
        accountType:      AccountType.OFFICIAL,
        status:           UserStatus.ACTIVE,
        createdByAdminId: actorId,
        ...(phone && { phone }),
      },
    });

    // Asignează rolul de funcționar
    await prisma.userRoleAssignment.upsert({
      where:  { userId_roleId: { userId: mergeWithUserId, roleId: role.id } },
      update: {},
      create: { userId: mergeWithUserId, roleId: role.id, assignedBy: actorId },
    });

    await prisma.adminAuditLog.create({
      data: {
        userId:   mergeWithUserId,
        actorId,
        action:   "ACCOUNT_MERGED",
        metadata: { roleName, note: "Cont civil unificat cu cont funcționar" },
      },
    });

    invalidatePermissionCache(mergeWithUserId);
    return NextResponse.json({ merged: true, userId: mergeWithUserId });
  }

  // Merge refuzat — creare cont separat cu justificare
  if (mergeRefused) {
    if (!mergeJustification || mergeJustification.length < 10) {
      return NextResponse.json({ error: "Justificarea refuzului trebuie să aibă minim 10 caractere" }, { status: 400 });
    }
  }

  // Creare cont nou de funcționar
  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail) {
    return NextResponse.json({ error: "Email deja înregistrat" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const newUser = await prisma.user.create({
    data: {
      email,
      fullName,
      firstName: firstName ?? fullName.split(" ")[0],
      lastName:  lastName  ?? fullName.split(" ").slice(1).join(" "),
      phone,
      cnp,
      passwordHash,
      emailVerified:    true,
      isActive:         true,
      mustChangePassword: true,
      accountType:      AccountType.OFFICIAL,
      status:           UserStatus.ACTIVE,
      createdByAdminId: actorId,
    },
  });

  await prisma.userRoleAssignment.create({
    data: { userId: newUser.id, roleId: role.id, assignedBy: actorId },
  });

  await prisma.adminAuditLog.create({
    data: {
      userId:   newUser.id,
      actorId,
      action:   "ROLE_ASSIGNED",
      metadata: {
        roleName,
        mergeRefused: mergeRefused ?? false,
        mergeJustification: mergeJustification ?? null,
      },
    },
  });

  return NextResponse.json({ created: true, userId: newUser.id });
}

/**
 * GET /api/admin/users/create-official?cnp=1234567890123
 * Detecție conturi civile existente după CNP — apelat la blur pe câmpul CNP.
 */
export async function GET(req: NextRequest) {
  const guard = await requirePermission("users.create_official");
  if (guard) return guard;

  const cnp = new URL(req.url).searchParams.get("cnp");
  if (!cnp || cnp.length !== 13) {
    return NextResponse.json({ found: false, users: [] });
  }

  const existing = await prisma.user.findMany({
    where: { cnp },
    include: {
      rbacRoles:  { include: { role: true } },
      ownerships: { where: { isActive: true }, take: 5,
        include: { unit: { include: { building: { include: { association: { select: { name: true } } } } } } },
      },
    },
  });

  return NextResponse.json({
    found: existing.length > 0,
    users: existing.map(u => ({
      id:          u.id,
      email:       u.email,
      fullName:    u.fullName,
      accountType: u.accountType,
      status:      u.status,
      roles:       u.rbacRoles.map(a => a.role.name),
      ownerships:  u.ownerships.map(o => o.unit.building.association?.name ?? "—"),
    })),
  });
}
