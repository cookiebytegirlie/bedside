// Calls the DigitalOcean Agent Platform Care-Plan Q&A agent with the
// `?agent=true` query parameter. That param is MANDATORY: without it the
// agent silently ignores its knowledge base and answers like a plain
// chatbot (spec §6). The A2 system prompt is configured on the agent in
// the DO console. We send only the question as the user message.

import {
  envelope,
  guardMethod,
  isString,
  jsonResponse,
} from "../_shared/http.ts";

const SAFE_FALLBACK = {
  answer:
    "The care plan assistant is unavailable right now. If it is urgent, call the hospice on-call nurse.",
  sources: [] as string[],
};

const MOCK_RESPONSE = {
  answer:
    "Bee calms most reliably to quiet Nat King Cole music, a warm washcloth on her forehead, and her granddaughter's yellow crocheted blanket. When she is restless, try dim light, music, and a hand on her shoulder before anything else.",
  sources: ["careplan.md#comfort-measures"],
};

// DO's Agent Platform response for this deployment (glm-5.2 backing model,
// KB attached) does not surface retrieval metadata in the response body -
// verified live: only `id/object/created/model/choices/usage` are present,
// with `choices[0].message.reasoning_content` showing the KB text the model
// consulted but no structured citations. Sources stays empty for now; the
// answer itself is grounded (traceable back to careplan.md phrasing), and
// UI treatment for the empty-sources case is a follow-up.
function extractSources(_json: unknown): string[] {
  return [];
}

Deno.serve(async (req) => {
  const guard = guardMethod(req);
  if (guard) return guard;

  let body: { question?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      envelope({
        ...SAFE_FALLBACK,
        answer: "Request body was not valid JSON.",
      }),
      400,
    );
  }

  const question = body?.question;
  if (!isString(question) || question.trim().length === 0) {
    return jsonResponse(
      envelope({
        ...SAFE_FALLBACK,
        answer: "Please ask a question.",
      }),
      400,
    );
  }

  if (Deno.env.get("MOCK_MODE") === "true") {
    return jsonResponse(envelope({ ...MOCK_RESPONSE }));
  }

  const endpoint = Deno.env.get("CAREPLAN_ENDPOINT");
  const apiKey = Deno.env.get("CAREPLAN_KEY");
  if (!endpoint || !apiKey) {
    return jsonResponse(envelope({ ...SAFE_FALLBACK }));
  }

  const url =
    `${endpoint.replace(/\/$/, "")}/api/v1/chat/completions?agent=true`;

  let json: unknown = null;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: question }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      console.error(
        "ask-careplan: agent HTTP",
        resp.status,
        detail.slice(0, 500),
      );
      return jsonResponse(envelope({ ...SAFE_FALLBACK }));
    }
    json = await resp.json();
  } catch (err) {
    console.error("ask-careplan: agent call failed", err);
    return jsonResponse(envelope({ ...SAFE_FALLBACK }));
  }

  const content = (json as Record<string, unknown> | null)
    ?.choices as Array<Record<string, unknown>> | undefined;
  const messageContent =
    (content?.[0]?.message as Record<string, unknown> | undefined)?.content;

  if (!isString(messageContent) || messageContent.trim().length === 0) {
    console.error("ask-careplan: empty content from agent");
    return jsonResponse(envelope({ ...SAFE_FALLBACK }));
  }

  return jsonResponse(
    envelope({
      answer: messageContent.trim(),
      sources: extractSources(json),
    }),
  );
});
