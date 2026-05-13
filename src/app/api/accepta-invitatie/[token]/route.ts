// src/app/api/accepta-invitatie/[token]/route.ts
// POST — validate invite token, set user password, mark email as verified.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const Schema = z.object({ password: z.string().min(8) });

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Parolă prea scurtă (minim 8 caractere)" }, { status: 400 });

  const record = await prisma.verificationToken.findUnique({
    where: { token: params.token },
  });

  if (!record) return NextResponse.json({ error: "Link invalid" }, { status: 404 });
  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token: params.token } });
    return NextResponse.json({ error: "Link expirat. Contactați administratorul pentru un nou link." }, { status: 410 });
  }

  const user = await prisma.user.findUnique({ where: { email: record.identifier } });
  if (!user) return NextResponse.json({ error: "Cont negăsit" }, { status: 404 });

  const hash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hash, emailVerified: true, isActive: true },
  });

  await prisma.verificationToken.delete({ where: { token: params.token } });

  return NextResponse.json({ success: true });
}
