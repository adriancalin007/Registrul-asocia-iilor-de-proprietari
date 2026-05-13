// src/app/api/furnizori/rating/route.ts
// POST: add/update a rating for a supplier
// GET:  list ratings for a supplier (?supplierId=...)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { z } from "zod";

const ALLOWED = [
  UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN, UserRole.OWNER,
] as UserRole[];

const RatingSchema = z.object({
  supplierId: z.string().min(1),
  score:      z.number().int().min(1).max(5),
  comment:    z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get("supplierId");
  if (!supplierId) return NextResponse.json({ error: "supplierId required" }, { status: 400 });

  const ratings = await prisma.supplierRating.findMany({
    where: { supplierId },
    include: { user: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
  });

  const avg = ratings.length
    ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length
    : null;

  const managerRatings = ratings.filter(r =>
    [UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN].includes(r.raterRole as UserRole)
  );
  const ownerRatings = ratings.filter(r => r.raterRole === UserRole.OWNER);

  return NextResponse.json({
    ratings,
    avg: avg ? Math.round(avg * 10) / 10 : null,
    managerAvg: managerRatings.length
      ? Math.round(managerRatings.reduce((s, r) => s + r.score, 0) / managerRatings.length * 10) / 10
      : null,
    ownerAvg: ownerRatings.length
      ? Math.round(ownerRatings.reduce((s, r) => s + r.score, 0) / ownerRatings.length * 10) / 10
      : null,
    count: ratings.length,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = session.user.role as UserRole;
  if (!ALLOWED.includes(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = RatingSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });

  const { supplierId, score, comment } = parsed.data;

  const rating = await prisma.supplierRating.upsert({
    where: { supplierId_ratedBy: { supplierId, ratedBy: session.user.id } },
    create: { supplierId, ratedBy: session.user.id, raterRole: role, score, comment },
    update: { score, comment, raterRole: role, updatedAt: new Date() },
  });

  return NextResponse.json({ success: true, rating });
}
