// src/app/api/chat/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { messages } = await req.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("Bad request", { status: 400 });
  }

  // Fetch user context for richer answers
  const [enrollment] = await prisma.inrolare.findMany({
    where: { userId: session.user.id, status: "APPROVED" },
    include: { clasa: { include: { scoala: { select: { name: true } } } } },
    take: 1,
  });

  const mandate = await prisma.mandate.findFirst({
    where: { userId: session.user.id, isActive: true },
    include: { association: { select: { name: true, neighborhood: true } } },
  });

  const schoolInfo = enrollment
    ? `Utilizatorul are un copil înscris la ${enrollment.clasa.scoala.name}, clasa ${enrollment.clasa.an}${enrollment.clasa.litera}.`
    : "";
  const assocInfo = mandate
    ? `Utilizatorul face parte din Asociația de Proprietari "${mandate.association.name}"${mandate.association.neighborhood ? `, ${mandate.association.neighborhood}` : ""}.`
    : "";

  const systemPrompt = `Ești un asistent civic inteligent pentru Portalul Civic Sector 1, București.
Ajuți cetățenii cu întrebări despre:
- Servicii ale asociației de proprietari (documente, cheltuieli, avarii, consultări, adeverințe)
- Înscrierea copiilor la școli din Sector 1 și orare
- Servicii publice locale: DGITL, urbanism, asistență socială, acte de identitate
- Proceduri civice și administrative în Sectorul 1

Răspunzi în română, concis și prietenos. Nu oferi sfaturi juridice sau medicale.
Dacă nu știi răspunsul, îndrumă utilizatorul la instituția competentă.

Context utilizator:
${schoolInfo}
${assocInfo}
Tip civic: ${session.user.civicType ?? "NEIDENTIFICAT"}`;

  // Convert messages to Anthropic format
  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m: { role: string; content: string }) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = anthropic.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: systemPrompt,
          messages: anthropicMessages,
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
              )
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        console.error("Chat API error:", err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "Eroare internă" })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
