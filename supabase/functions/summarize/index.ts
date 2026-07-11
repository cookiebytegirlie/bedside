// Calls the DigitalOcean Agent Platform (serverless inference is 403-gated
// on our tier). The A1 system prompt is configured on the agent in the DO
// console, so we send only the transcript as the user message. Response
// content is a JSON string per the spec §10 shape.

import {
  envelope,
  guardMethod,
  isString,
  jsonResponse,
} from "../_shared/http.ts";

const SAFE_FALLBACK = {
  summary: "Could not process note - please re-record",
  urgency: "yellow",
  urgency_reason: "AI response could not be parsed",
  medications: [],
  mood: null,
  interventions: [],
  flag_for_next: null,
  confidence: "low",
} as const;

// Modelled on dictation #3 (see shared/dictations.md) so MOCK_MODE exercises
// the red-flag path end-to-end.
const MOCK_RESPONSE = {
  summary:
    "Priya returned around 8:15pm and observed Bee's breathing had changed - more labored and gurgling than earlier. Anna administered 0.25 mL of morphine oral solution at 8:20pm. Bee settled slightly but breathing remains irregular, and Priya asked that the on-call nurse be contacted.",
  urgency: "red",
  urgency_reason:
    "Breathing became noticeably more labored and gurgling during the shift and the volunteer explicitly asked to call the nurse.",
  medications: [{ name: "morphine oral solution", time: "20:20" }],
  mood: "settled but not comfortable",
  interventions: [
    { what: "lowered music and dimmed the light", worked: "yes" },
    { what: "morphine 0.25 mL administered by family", worked: "unclear" },
  ],
  flag_for_next:
    "Breathing remains irregular; watch closely and re-contact the on-call nurse if it worsens.",
  confidence: "high",
} as const;

function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1].trim() : trimmed;
}

function isStringOrNull(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}

function isValidShape(o: unknown): boolean {
  if (typeof o !== "object" || o === null) return false;
  const x = o as Record<string, unknown>;

  if (!isString(x.summary)) return false;
  if (x.urgency !== "green" && x.urgency !== "yellow" && x.urgency !== "red") {
    return false;
  }
  if (!isString(x.urgency_reason)) return false;

  if (!Array.isArray(x.medications)) return false;
  for (const m of x.medications) {
    if (typeof m !== "object" || m === null) return false;
    const mm = m as Record<string, unknown>;
    if (!isString(mm.name) || !isString(mm.time)) return false;
  }

  if (!isStringOrNull(x.mood)) return false;

  if (!Array.isArray(x.interventions)) return false;
  for (const i of x.interventions) {
    if (typeof i !== "object" || i === null) return false;
    const ii = i as Record<string, unknown>;
    if (!isString(ii.what)) return false;
    if (ii.worked !== "yes" && ii.worked !== "no" && ii.worked !== "unclear") {
      return false;
    }
  }

  if (!isStringOrNull(x.flag_for_next)) return false;

  if (
    x.confidence !== "high" && x.confidence !== "medium" &&
    x.confidence !== "low"
  ) return false;

  return true;
}

Deno.serve(async (req) => {
  const guard = guardMethod(req);
  if (guard) return guard;

  let body: { transcript?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      envelope({
        ...SAFE_FALLBACK,
        urgency_reason: "Request body was not valid JSON",
      }),
      400,
    );
  }

  const transcript = body?.transcript;
  if (!isString(transcript) || transcript.trim().length === 0) {
    return jsonResponse(
      envelope({
        ...SAFE_FALLBACK,
        urgency_reason: "No transcript provided",
      }),
      400,
    );
  }

  if (Deno.env.get("MOCK_MODE") === "true") {
    return jsonResponse(envelope({ ...MOCK_RESPONSE }));
  }

  const endpoint = Deno.env.get("SUMMARIZER_ENDPOINT");
  const apiKey = Deno.env.get("SUMMARIZER_KEY");
  if (!endpoint || !apiKey) {
    return jsonResponse(
      envelope({
        ...SAFE_FALLBACK,
        urgency_reason: "Summarizer agent not configured",
      }),
    );
  }

  const url = `${endpoint.replace(/\/$/, "")}/api/v1/chat/completions`;

  let content: string | null = null;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: transcript }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.error("summarize: agent HTTP", resp.status, detail.slice(0, 500));
      return jsonResponse(envelope({ ...SAFE_FALLBACK }));
    }
    const json = await resp.json();
    content = json?.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error("summarize: agent call failed", err);
    return jsonResponse(envelope({ ...SAFE_FALLBACK }));
  }

  if (!content) {
    console.error("summarize: empty content from agent");
    return jsonResponse(envelope({ ...SAFE_FALLBACK }));
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(content));
  } catch (err) {
    console.error("summarize: JSON.parse failed", err, "raw:", content);
    return jsonResponse(envelope({ ...SAFE_FALLBACK }));
  }

  if (!isValidShape(parsed)) {
    console.error("summarize: shape validation failed", parsed);
    return jsonResponse(envelope({ ...SAFE_FALLBACK }));
  }

  return jsonResponse(envelope(parsed as Record<string, unknown>));
});
