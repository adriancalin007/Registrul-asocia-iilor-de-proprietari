// src/app/depunere-acte/[token]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import DepunereClient from "./DepunereClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Depunere documente | Sector 1" };

interface Props { params: { token: string } }

export default async function DepunerePage({ params }: Props) {
  const submission = await prisma.docSubmission.findUnique({
    where:  { completionToken: params.token },
    select: {
      id:            true,
      status:        true,
      submitterName: true,
      submitterRole: true,
      tokenExpiresAt: true,
      notes:         true,
      association: { select: { id: true, name: true, address: true, rawAddress: true } },
      files: {
        select: { id: true, docType: true, fileUrl: true, fileSize: true, uploadedAt: true },
        orderBy: { uploadedAt: "asc" },
      },
    },
  });

  if (!submission) notFound();

  return (
    <DepunereClient
      token={params.token}
      initial={{
        ...submission,
        tokenExpiresAt: submission.tokenExpiresAt.toISOString(),
        files: submission.files.map(f => ({
          ...f,
          uploadedAt: f.uploadedAt.toISOString(),
        })),
      }}
    />
  );
}
