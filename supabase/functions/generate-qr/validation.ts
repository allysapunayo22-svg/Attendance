import { jsonResponse } from "../_shared/cors.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateGenerateQrPayload(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonResponse({ error: "A valid QR request is required." }, 400);
  }

  const input = body as Record<string, unknown>;
  const eventId = typeof input.eventId === "string" ? input.eventId.trim() : "";
  const ttlSeconds = input.ttlSeconds === undefined ? 30 : Number(input.ttlSeconds);

  if (!uuidPattern.test(eventId)) {
    return jsonResponse({ error: "A valid event identifier is required." }, 400);
  }

  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 10 || ttlSeconds > 300) {
    return jsonResponse({ error: "QR lifetime must be an integer from 10 to 300 seconds." }, 400);
  }

  return { eventId, ttlSeconds };
}
