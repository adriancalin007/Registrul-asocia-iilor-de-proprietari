// src/app/api/proprietari/[id]/invite/route.ts
// POST — generate an invite link and (optionally) email it to the owner.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { sendEmail, inviteHtml, baseUrl } from "@/lib/email";

const ALLOWED = [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[];
const EXPIRE_DAYS = 7;

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ALLOWED.includes(session.user.role as UserRole)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ownership = await prisma.ownership.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });
  if (!ownership) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { email, fullName } = ownership.user;
  if (!email || email.includes("noemail+")) {
    return NextResponse.json({ error: "Proprietarul nu are adresă de email înregistrată" }, { status: 400 });
  }

  // Delete old tokens for this user then create a fresh one
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  const token  = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + EXPIRE_DAYS * 24 * 60 * 60 * 1000);
  await prisma.verificationToken.create({ data: { identifier: email, token, expires } });

  const inviteUrl = `${baseUrl}/accepta-invitatie/${token}`;

  const sent = await sendEmail({
    to: email,
    subject: "Invitație la Portal Sector 1",
    html: inviteHtml(fullName, inviteUrl),
  });

  return NextResponse.json({ success: true, emailSent: sent, inviteUrl: sent ? undefined : inviteUrl });
}
