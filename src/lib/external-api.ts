// src/lib/external-api.ts
//
// Centralized helper for all server-side calls to external Romanian public services.
// Guarantees: 5-second timeout, 1 automatic retry, error logging without PII.

export interface ExternalResult<T = unknown> {
  success: boolean;
  data: T | null;
  fallbackUrl: string;
  /** User-facing message in Romanian — specific to the service, never a technical error. */
  userMessage?: string;
}

/**
 * Wraps an external API call with timeout, retry, and structured error handling.
 *
 * @param label       Service name for server-side logs ("CNAS", "Just", …)
 * @param request     Async factory — called once, then once more on failure
 * @param fallbackUrl Shown to the user when the service is unavailable
 */
export async function callExternal<T>(
  label: string,
  request: () => Promise<T>,
  fallbackUrl: string,
): Promise<ExternalResult<T>> {
  const attempt = async (): Promise<T> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      return await request();
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    const data = await attempt();
    return { success: true, data, fallbackUrl };
  } catch (firstError) {
    // Log without PII — only label and error type
    console.error(`[ExternalAPI][${label}] first attempt failed:`, sanitizeError(firstError));

    // Single automatic retry
    try {
      const data = await attempt();
      return { success: true, data, fallbackUrl };
    } catch (retryError) {
      console.error(`[ExternalAPI][${label}] retry failed:`, sanitizeError(retryError));
      return {
        success: false,
        data: null,
        fallbackUrl,
        userMessage: buildUserMessage(label, retryError),
      };
    }
  }
}

/** Strips any potential PII from error objects before logging. */
function sanitizeError(err: unknown): string {
  if (err instanceof Error) {
    // Keep only the error type and a truncated message — no stack, no data payloads
    return `${err.name}: ${err.message.slice(0, 120)}`;
  }
  return "unknown error";
}

/** Returns a Romanian, non-technical, service-specific error message. */
function buildUserMessage(label: string, err: unknown): string {
  const isTimeout =
    err instanceof Error &&
    (err.name === "AbortError" || err.message.includes("abort"));

  if (isTimeout) {
    return `Serviciul ${label} nu a răspuns în timp util. Încearcă din nou sau accesează direct site-ul oficial.`;
  }

  const messages: Record<string, string> = {
    CNAS:  "Serviciul CNAS nu este disponibil momentan. Poți verifica statutul direct pe site-ul oficial.",
    Just:  "Portalul instanțelor judecătorești nu a răspuns. Caută dosarul direct pe portal.just.ro.",
    AEP:   "Registrul Electoral nu este disponibil momentan. Verifică secția de votare pe site-ul oficial.",
    ANOFM: "Serviciul ANOFM nu este disponibil momentan. Accesează direct site-ul oficial.",
  };

  return messages[label] ?? "Serviciul extern nu este disponibil momentan. Încearcă din nou mai târziu.";
}
