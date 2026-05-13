import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

interface Params { params: { token: string } }

const Schema = z.object({
  password: z.string().min(8, "Parola trebuie să aibă cel puțin 8 caractere"),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const record = await prisma.verificationToken.findUnique({
    where: { token: params.token },
  });

  if (!record || record.expires < new Date()) {
    return NextResponse.json({ error: "Link invalid sau expirat" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: record.identifier },
    select: { fullName: true, email: true },
  });

  return NextResponse.json({ valid: true, email: user?.email, name: user?.fullName });
}

export async function POST(req: NextRequest, { params }: Params) {
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token: params.token },
  });

  if (!record || record.expires < new Date()) {
    return NextResponse.json({ error: "Link invalid sau expirat" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { email: record.identifier },
    data: { passwordHash, mustChangePassword: false, emailVerified: true },
  });

  await prisma.verificationToken.delete({ where: { token: params.token } });

  return NextResponse.json({ success: true });
}
