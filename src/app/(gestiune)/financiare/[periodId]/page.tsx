// src/app/(dashboard)/financiare/[periodId]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import PeriodClient from "./PeriodClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Perioadă financiară" };

interface Props { params: { periodId: string } }

export default async function PeriodPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role as UserRole;
  if (!([UserRole.MANAGER, UserRole.BOARD_PRESIDENT, UserRole.SUPER_ADMIN] as UserRole[]).includes(role)) {
    redirect("/dashboard");
  }

  const period = await prisma.expensePeriod.findUnique({
    where: { id: params.periodId },
    include: {
      expenses: { orderBy: { createdAt: "asc" } },
      meterReadings: {
        orderBy: { createdAt: "asc" },
        include: { unit: { select: { number: true } } },
      },
      paymentItems: {
        orderBy: { createdAt: "asc" },
        include: {
          ownership: {
            include: {
              user: { select: { fullName: true, email: true } },
              unit: { select: { number: true, floor: true } },
            },
          },
        },
      },
      association: {
        include: {
          buildings: {
            include: {
              units: {
                orderBy: { number: "asc" },
                select: { id: true, number: true, floor: true, shareRatio: true, residents: true },
              },
            },
          },
        },
      },
    },
  });

  if (!period) redirect("/financiare");

  // Serialize Dates to strings for the client component
  return <PeriodClient period={JSON.parse(JSON.stringify(period))} />;
}
