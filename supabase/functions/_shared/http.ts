export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

export const JSON_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  "Content-Type": "application/json",
};

// Handles CORS preflight and method restriction in one call. Returns a
// Response to short-circuit with, or null if the request should proceed.
export function guardMethod(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }
  return null;
}

export function envelope<T extends Record<string, unknown>>(
  payload: T,
): { id: string; timestamp: string } & T {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...payload,
  };
}

export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });
}

export function isString(v: unknown): v is string {
  return typeof v === "string";
}
