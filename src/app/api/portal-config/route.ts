import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const DEFAULT_NAV_HREFS: Record<string, string[]> = {
  OWNER:           ["/dashboard", "/apartament", "/consultari", "/adeverinte", "/avarii", "/sesizari"],
  MANAGER:         ["/dashboard", "/documente", "/consultari", "/adeverinte", "/avarii", "/sesizari", "/documente-oficiale", "/situatii-financiare", "/furnizori", "/facturi", "/lucrari", "/locatari", "/financiare", "/rapoarte"],
  BOARD_PRESIDENT: ["/dashboard", "/documente", "/consultari", "/adeverinte", "/avarii", "/sesizari", "/documente-oficiale", "/situatii-financiare", "/furnizori", "/financiare", "/rapoarte"],
  AUDITOR:         ["/dashboard", "/documente", "/situatii-financiare", "/financiare", "/rapoarte"],
  SUPPLIER:        ["/furnizori"],
};

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== UserRole.SUPER_ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const config = await prisma.portalConfig.findFirst();
  const dbNav = (config?.navConfig ?? {}) as Record<string, string[]>;

  // Merge: DB overrides defaults where present
  const merged: Record<string, string[]> = { ...DEFAULT_NAV_HREFS };
  for (const [role, hrefs] of Object.entries(dbNav)) {
    if (Array.isArray(hrefs)) merged[role] = hrefs;
  }

  return NextResponse.json({ navConfig: merged, defaults: DEFAULT_NAV_HREFS });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== UserRole.SUPER_ADMIN) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body?.navConfig || typeof body.navConfig !== "object") {
    return NextResponse.json({ error: "navConfig required" }, { status: 400 });
  }

  await prisma.portalConfig.upsert({
    where:  { id: "singleton" },
    create: { id: "singleton", navConfig: body.navConfig, updatedBy: session.user.id },
    update: { navConfig: body.navConfig, updatedBy: session.user.id },
  });

  return NextResponse.json({ success: true });
}
