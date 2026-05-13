import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { sendEmail, inviteHtml, baseUrl } from "@/lib/email";
import { randomUUID } from "crypto";

interface Params { params: { userId: string } }

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role !== UserRole.UAT_OPERATOR && role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, email: true, fullName: true, isActive: true },
  });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Delete any existing tokens for this user
  await prisma.verificationToken.deleteMany({ where: { identifier: user.email } });

  const token = randomUUID();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.verificationToken.create({
    data: { identifier: user.email, token, expires },
  });

  const inviteUrl = `${baseUrl}/seteaza-parola/${token}`;
  const emailSent = await sendEmail({
    to: user.email,
    subject: "Activare cont — Portal Sector 1",
    html: inviteHtml(user.fullName, inviteUrl),
  });

  return NextResponse.json({ success: true, inviteUrl, emailSent });
}
