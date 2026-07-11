// Reads the 15 most recent log_entry rows, formats them chronologically for
// the DO Agent Platform trends agent, and returns the agent's structured JSON.
// The system prompt is configured on the agent server-side, so we send only
// the formatted entries as the user message.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  envelope,
  guardMethod,
  jsonResponse,
} from "../_shared/http.ts";

const SAFE_FALLBACK = {
  trends: [] as unknown[],
  patterns: [] as unknown[],
  flags: [] as unknown[],
};

const MOCK_RESPONSE = {
  trends: [
    "Evening restlessness has settled earlier in the past three shifts after music was started before 5:30pm.",
    "Morphine oral solution appearing in more evening shifts (2 of the last 4).",
  ],
  patterns: [
    "Breathing changes concentrated in late-evening shifts (2 of the last 4 red flags between 20:00 and 22:00).",
  ],
  flags: [
    "Third consecutive evening with a breathing change - recommend nurse review of the current PRN plan.",
  ],
};

type LogRow = {
  timestamp: string;
  logged_by: string | null;
  raw_text: string | null;
  urgency_tag: string | null;
  ai_response: Record<string, unknown> | null;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatStamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatEntry(r: LogRow): string {
  const stamp = formatStamp(r.timestamp);
  const who = r.logged_by ?? "unknown";
  const urgency = r.urgency_tag ?? "unknown";
  const lines: string[] = [`[${stamp}] ${who} - urgency: ${urgency}`];

  const ai = r.ai_response;
  if (ai) {
    if (typeof ai.summary === "string") lines.push(`Summary: ${ai.summary}`);

    if (Array.isArray(ai.medications) && ai.medications.length > 0) {
      const medStr = ai.medications.map((m) => {
        const mm = (m ?? {}) as Record<string, unknown>;
        const name = typeof mm.name === "string" ? mm.name : "unknown";
        const time = typeof mm.time === "string" ? mm.time : "time unknown";
        return `${name} at ${time}`;
      }).join("; ");
      lines.push(`Medications: ${medStr}`);
    } else {
      lines.push("Medications: none");
    }

    if (Array.isArray(ai.interventions) && ai.interventions.length > 0) {
      lines.push("Interventions:");
      for (const i of ai.interventions) {
        const ii = (i ?? {}) as Record<string, unknown>;
        const what = typeof ii.what === "string" ? ii.what : "unspecified";
        const worked = typeof ii.worked === "string" ? ii.worked : "unclear";
        lines.push(`  - ${what} (worked: ${worked})`);
      }
    } else {
      lines.push("Interventions: none");
    }
  } else if (r.raw_text) {
    lines.push(`Raw note (unprocessed): ${r.raw_text}`);
  }

  return lines.join("\n");
}

function formatEntries(rows: LogRow[]): string {
  // Query returned newest-first; reverse so the agent sees oldest -> newest.
  return [...rows].reverse().map(formatEntry).join("\n\n---\n\n");
}

// Extracts JSON from a model response that may include markdown fences or
// prose around the object. Strategy: strip fences, then narrow to the first
// "{" through the last "}". Falls back to the input if no braces found.
function extractJson(raw: string): string {
  const stripped = raw.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const first = stripped.indexOf("{");
  const last = stripped.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) return stripped;
  return stripped.slice(first, last + 1);
}

Deno.serve(async (req) => {
  const guard = guardMethod(req);
  if (guard) return guard;

  if (Deno.env.get("MOCK_MODE") === "true") {
    return jsonResponse(envelope({ ...MOCK_RESPONSE }));
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) {
    console.error("get-trends: Supabase runtime env not available");
    return jsonResponse(envelope({ ...SAFE_FALLBACK }));
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from("log_entry")
    .select("timestamp, logged_by, raw_text, urgency_tag, ai_response")
    .order("timestamp", { ascending: false })
    .limit(15);

  if (error) {
    console.error("get-trends: DB query failed", error);
    return jsonResponse(envelope({ ...SAFE_FALLBACK }));
  }

  const rows = (data ?? []) as LogRow[];
  if (rows.length === 0) {
    return jsonResponse(envelope({ ...SAFE_FALLBACK }));
  }

  const formatted = formatEntries(rows);

  const endpoint = Deno.env.get("TRENDS_ENDPOINT");
  const apiKey = Deno.env.get("TRENDS_KEY");
  if (!endpoint || !apiKey) {
    console.error("get-trends: trends agent not configured");
    return jsonResponse(envelope({ ...SAFE_FALLBACK }));
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
        messages: [{ role: "user", content: formatted }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.error(
        "get-trends: agent HTTP",
        resp.status,
        detail.slice(0, 500),
      );
      return jsonResponse(envelope({ ...SAFE_FALLBACK }));
    }
    const json = await resp.json();
    content = json?.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error("get-trends: agent call failed", err);
    return jsonResponse(envelope({ ...SAFE_FALLBACK }));
  }

  if (!content) {
    console.error("get-trends: empty content from agent");
    return jsonResponse(envelope({ ...SAFE_FALLBACK }));
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(content));
  } catch (err) {
    console.error("get-trends: JSON.parse failed", err, "raw:", content);
    return jsonResponse(envelope({ ...SAFE_FALLBACK }));
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    console.error("get-trends: parsed non-object", parsed);
    return jsonResponse(envelope({ ...SAFE_FALLBACK }));
  }

  return jsonResponse(envelope(parsed as Record<string, unknown>));
});
