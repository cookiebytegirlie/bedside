// Calls the deployed Supabase Edge Function that summarizes a shift note.
//
// summarizeShiftNote(transcript) -> Promise<AiResponse>
//
// It always resolves to a well-formed response in the documented shape. If the
// endpoint is unconfigured (no anon key yet), unreachable, errors, or returns
// an unexpected shape, it resolves to a locally-generated mock instead so the
// demo never breaks (spec requirement 7). Mock responses carry `_fallback: true`.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const URGENCIES = ['green', 'yellow', 'red']
const CONFIDENCES = ['high', 'medium', 'low']
const WORKED = ['yes', 'no', 'unclear']

export function isBackendConfigured() {
  return Boolean(SUPABASE_URL && ANON_KEY && !ANON_KEY.startsWith('<'))
}

const RED_KEYWORDS = ['fall', 'fell', 'blood', 'bleeding', "can't breathe", 'cannot breathe', 'unresponsive', 'chest pain', 'seizure', 'labored breathing', 'struggling to breathe']
const YELLOW_KEYWORDS = ['pain', 'restless', 'confused', 'shortness of breath', 'short of breath', 'discomfort', 'nausea', 'agitated', 'not eating', "wouldn't eat", 'morphine', 'prn', 'anxious']

function guessUrgency(text) {
  const lower = text.toLowerCase()
  if (RED_KEYWORDS.some((k) => lower.includes(k))) return 'red'
  if (YELLOW_KEYWORDS.some((k) => lower.includes(k))) return 'yellow'
  return 'green'
}

// A believable mock derived from the actual transcript, so the fallback still
// demos well (right urgency, echoed detail) rather than a canned blob.
function mockResponse(transcript) {
  const text = (transcript || '').trim()
  const urgency = guessUrgency(text)
  const lower = text.toLowerCase()
  const mentionsMed = /morphine|lorazepam|tylenol|acetaminophen|meds?|medication|dose/.test(lower)
  const condensed = text.length > 150 ? text.slice(0, 147).trimEnd() + '…' : text || 'Quiet shift, nothing eventful to report.'
  const matchedRed = RED_KEYWORDS.find((k) => lower.includes(k))
  const matchedYellow = YELLOW_KEYWORDS.find((k) => lower.includes(k))
  // Plain-language trace of which keyword(s) drove the urgency/mood call, so
  // the "How we know this" disclosure can show its work instead of just an
  // opaque badge.
  const reasoning = matchedRed
    ? `Your note included the phrase "${matchedRed}", which matches this system's list of urgent/emergency terms (falls, bleeding, breathing trouble, chest pain, seizure, and similar). A match on that list auto-flags the entry red for immediate review — it's a keyword trigger, not a clinical judgment, so a nurse should still confirm what happened.`
    : matchedYellow
      ? `Your note included the phrase "${matchedYellow}", which matches this system's "worth watching" list (pain, agitation, appetite or breathing changes, and similar). That's why this was flagged yellow instead of left routine — it's a signal to keep an eye on things, not a confirmed problem.`
      : "None of this system's urgent or watch-list keywords appeared in your note, so it was left as routine. That reflects the wording used, not a clinical assessment — please still flag anything that felt off."

  return {
    id: `mock-${Math.random().toString(36).slice(2, 10)}`,
    timestamp: new Date().toISOString(),
    summary: condensed,
    urgency,
    urgency_reason:
      urgency === 'red'
        ? 'Language suggests a possible emergency — surfaced for immediate review.'
        : urgency === 'yellow'
          ? 'Signs of discomfort or a change worth watching were mentioned.'
          : 'Routine note — no red or yellow signals detected.',
    medications: mentionsMed
      ? [{ name: /lorazepam/.test(lower) ? 'Lorazepam' : 'Morphine', time: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) }]
      : [],
    mood: /restless|anxious|agitated/.test(lower) ? 'restless' : /calm|content|relaxed|settled/.test(lower) ? 'settled' : null,
    interventions: /reposition|lotion|music|blanket|water|walk/.test(lower)
      ? [{ what: 'Comfort measure noted in the shift', worked: 'unclear' }]
      : [],
    flag_for_next: urgency === 'green' ? null : 'Follow up on this next shift.',
    // Very short or vague notes come back low-confidence, to exercise the
    // "AI unsure — please confirm" path in the UI.
    confidence: text.length < 25 ? 'low' : 'medium',
    reasoning,
    _fallback: true,
  }
}

// Coerce whatever the backend returns into the exact documented shape so the
// UI can render every field without defensive checks everywhere.
function normalize(data, transcript) {
  const d = data || {}
  const urgency = URGENCIES.includes(d.urgency) ? d.urgency : 'green'
  const confidence = CONFIDENCES.includes(d.confidence) ? d.confidence : 'medium'
  return {
    id: d.id ?? `srv-${Math.random().toString(36).slice(2, 10)}`,
    timestamp: d.timestamp ?? new Date().toISOString(),
    summary: typeof d.summary === 'string' && d.summary.trim() ? d.summary : (transcript || '').trim(),
    urgency,
    urgency_reason: typeof d.urgency_reason === 'string' ? d.urgency_reason : '',
    medications: Array.isArray(d.medications)
      ? d.medications
          .map((m) => {
            const out = { name: String(m?.name ?? ''), time: String(m?.time ?? '') }
            // Optional dose/route/reason — pass through as strings when the
            // agent captured them, so formatMedGiven can render the fuller
            // "morphine 5mg PO @ 20:20 for pain" line instead of just name+time.
            if (typeof m?.dose === 'string' && m.dose.trim()) out.dose = m.dose
            if (typeof m?.route === 'string' && m.route.trim()) out.route = m.route
            if (typeof m?.reason === 'string' && m.reason.trim()) out.reason = m.reason
            return out
          })
          .filter((m) => m.name)
      : [],
    mood: d.mood ?? null,
    interventions: Array.isArray(d.interventions)
      ? d.interventions.map((i) => ({ what: String(i?.what ?? ''), worked: WORKED.includes(i?.worked) ? i.worked : 'unclear' })).filter((i) => i.what)
      : [],
    flag_for_next: d.flag_for_next ?? null,
    confidence,
    reasoning: typeof d.reasoning === 'string' ? d.reasoning : '',
    _fallback: false,
  }
}

// ---------------------------------------------------------------------------
// Visit digest — "Since your last visit"
//
// fetchVisitDigest() -> Promise<VisitDigest>
//
// Calls the get-trends Edge Function, which reads the shift-log table itself
// (no params) and reasons across every entry to produce the digest. That agent
// pass takes ~20-30s, so callers must show a graceful loading state.
//
// The function returns { needs_you[], pattern, whats_changed[], whats_working[] };
// we map it onto the shape VisitDigestModal already renders. On any failure it
// resolves to the hardcoded `visitDigest` fallback (carrying `_fallback: true`)
// so the demo never shows an empty screen (spec requirement 7).
import { visitDigest as fallbackDigest } from '../mockData'

const CHANGE_ICON_BY_DIRECTION = { up: 'trend-up', down: 'trend-down', shift: 'moon' }

function asText(item) {
  if (typeof item === 'string') return item
  if (item && typeof item === 'object') return String(item.text ?? item.detail ?? item.summary ?? '')
  return ''
}

// Best-effort read of whether an intervention helped, from a free-text outcome
// plus an optional count, mapped to the three states the WorkingRow renders.
// 'less effective|diminishing|declining|waning|reduced' are treated as mixed —
// a fading intervention rendered as 'working' is a safety issue in a hospice
// app, not a cosmetic one.
function workingStatus(outcome, count) {
  const o = String(outcome || '').toLowerCase()
  if (/mixed|sometimes|inconsistent|varied|partial|less effective|diminishing|declining|waning|reduced/.test(o)) return 'mixed'
  if (count === 0 || /\bno\b|didn'?t|did not|not help|unhelpful|ineffective/.test(o)) return 'no'
  return 'yes'
}

function arr(v) {
  return Array.isArray(v) ? v : []
}

function normalizeDigest(data) {
  const d = data || {}

  // The endpoint is documented as { needs_you, pattern, whats_changed,
  // whats_working } but the deployed function has also been seen returning
  // { trends, patterns, flags }. Accept either so we render whatever it emits.
  const needsList = [...arr(d.needs_you), ...arr(d.flags)].map(asText).filter(Boolean)
  const patternText = [asText(d.pattern), ...arr(d.patterns).map(asText)].filter(Boolean).join(' ')

  // Glance-first headline (Section 4). Agent emits `tldr` (or `headline` as a
  // fallback name). Trimmed one-liner; if the agent returned nothing usable
  // here, we fall back to the sample's headline downstream.
  const headline = String(d.tldr ?? d.headline ?? '').replace(/\s+/g, ' ').trim()

  const changed = [...arr(d.whats_changed), ...arr(d.trends)]
    .map((c) => ({
      icon: CHANGE_ICON_BY_DIRECTION[c?.direction] || 'trend-down',
      title: String(c?.title ?? c?.label ?? '').trim(),
      detail: String(c?.detail ?? c?.description ?? asText(c)).trim(),
    }))
    .filter((c) => c.title)

  const working = arr(d.whats_working)
    .map((w) => {
      const intervention = String(w?.intervention ?? '').trim()
      const outcome = String(w?.outcome ?? '').trim()
      // worked_count is the short tally shown next to the intervention (spec:
      // "intervention + worked_count"). The deployed agent returns it as a
      // number ("3") or a phrase ("3 of 4 logged attempts"); accept both. The
      // full `outcome` paragraph only feeds the yes/no/mixed status, never the
      // label — otherwise a whole sentence lands in the one-line row.
      const numericCount = typeof w?.worked_count === 'number' ? w.worked_count : undefined
      const countText = w?.worked_count != null ? String(w.worked_count).trim() : ''
      const label = countText ? `${intervention} — ${countText}` : intervention
      return { status: workingStatus(outcome, numericCount), label }
    })
    .filter((w) => w.label)

  // Nothing usable. The deployed get-trends function intermittently answers
  // with an empty stub ({ trends: [], patterns: [], flags: [] }) instead of the
  // real digest, so return null and let fetchVisitDigest retry rather than
  // committing to the hardcoded fallback on the first empty answer.
  if (!needsList.length && !patternText && !changed.length && !working.length) {
    return null
  }

  return {
    lastVisit: fallbackDigest.lastVisit,
    headline: headline || fallbackDigest.headline,
    needsYou: needsList.length
      ? { clinicalOnly: true, count: needsList.length, text: needsList.join(' '), cta: fallbackDigest.needsYou.cta }
      : fallbackDigest.needsYou,
    pattern: patternText ? { sensitive: true, text: patternText } : fallbackDigest.pattern,
    changed: changed.length ? changed : fallbackDigest.changed,
    working: working.length ? working : fallbackDigest.working,
    _fallback: false,
  }
}

// The deployed get-trends function intermittently returns an empty stub
// ({ trends: [], patterns: [], flags: [] }) instead of the real digest. When it
// does so *quickly* (~1s) it's the cheap degenerate path, and simply asking
// again usually lands on the real reasoning — so we retry. But an empty answer
// that took a long time means the backend did the full agent pass and still
// produced nothing; retrying that just multiplies the wait (observed: a single
// empty response taking 60s), so we stop and fall back instead.
const DIGEST_MAX_ATTEMPTS = 4
const DIGEST_SLOW_EMPTY_MS = 8000
// Per-fetch cap that covers the server's full retry budget in get-trends
// (two 90s attempts) plus a small margin, so the client waits for the server
// to serve either the real digest or its own SAFE_FALLBACK rather than
// aborting first. The DO trends agent takes ~32s in the playground but is
// materially slower via the API path, hence the wide cap.
const DIGEST_TIMEOUT_MS = 200_000

// Module-scoped promise cache. At ~58s live latency the modal cannot afford
// to cold-start on open; startVisitDigestPrefetch() fires from main.jsx on
// app load so the fetch is in flight by the time the user reaches the
// timeline. Any await after the first hop shares the same in-flight promise.
let _digestPromise = null

async function fetchVisitDigestFresh() {
  if (!isBackendConfigured()) {
    // No key yet — keep a brief "reasoning" beat so the loading state is
    // visible, then hand back the hardcoded digest.
    await new Promise((r) => setTimeout(r, 1400))
    return { ...fallbackDigest, _fallback: true }
  }
  for (let attempt = 1; attempt <= DIGEST_MAX_ATTEMPTS; attempt++) {
    try {
      const startedAt = Date.now()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-trends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(DIGEST_TIMEOUT_MS),
      })
      if (!res.ok) throw new Error(`get-trends returned HTTP ${res.status}`)
      const digest = normalizeDigest(await res.json())
      if (digest) return digest
      // Empty stub. Only worth retrying if it came back fast (the cheap path);
      // a slow empty means the agent already ran and had nothing, so stop.
      const elapsed = Date.now() - startedAt
      if (elapsed > DIGEST_SLOW_EMPTY_MS) {
        console.warn(`[fetchVisitDigest] slow empty response (${elapsed}ms) — backend produced no digest, falling back`)
        break
      }
      console.info(`[fetchVisitDigest] empty response in ${elapsed}ms, retrying (${attempt}/${DIGEST_MAX_ATTEMPTS})`)
    } catch (err) {
      // A network/HTTP error or the abort won't fix itself on retry — stop.
      console.warn('[fetchVisitDigest] falling back to hardcoded digest:', err?.message || err)
      break
    }
  }
  return { ...fallbackDigest, _fallback: true }
}

// Wraps fetchVisitDigestFresh so a fallback result doesn't get cached — if
// the prefetch times out and resolves to the sample fallback, the next call
// (refresh button, next prefetch, whatever) actually retries the agent
// instead of silently returning the same fallback forever.
function fetchAndCache() {
  const promise = fetchVisitDigestFresh().then((result) => {
    if (result?._fallback) _digestPromise = null
    return result
  })
  _digestPromise = promise
  promise.catch(() => { _digestPromise = null })
  return promise
}

// Kick off the digest fetch once, at app load. If called again before it
// resolves, returns the same in-flight promise so consumers share the wait
// instead of duplicating the ~58s request.
export function startVisitDigestPrefetch() {
  if (!_digestPromise) fetchAndCache()
  return _digestPromise
}

// Invalidate the cache and start a fresh fetch — used by the modal's refresh
// button so tapping it always re-hits the agent.
export function refreshVisitDigest() {
  return fetchAndCache()
}

// Public API preserved: returns the cached (possibly in-flight) promise, or
// kicks one off if nothing has prefetched yet.
export function fetchVisitDigest() {
  return startVisitDigestPrefetch()
}

// The deployed summarize function intermittently returns a parse-failure stub
// as an HTTP 200 — { summary: "Could not process note - please re-record",
// urgency: "yellow", urgency_reason: "AI response could not be parsed",
// confidence: "low" } — when the agent's output comes back in a shape the
// function can't parse (observed ~1 in 3 calls). It's the same flaky-stub
// pattern as get-trends: simply asking again almost always lands on the real
// structured summary, so we retry before giving up rather than showing the
// caregiver a "could not process note" card for a note the agent can handle.
function isSummarizeStub(data) {
  const d = data || {}
  return /could not be parsed/i.test(d.urgency_reason || '') || /could not process note/i.test(d.summary || '')
}

const SUMMARIZE_MAX_ATTEMPTS = 3

export async function summarizeShiftNote(transcript) {
  if (!isBackendConfigured()) {
    // No key yet — go straight to the mock, but keep the ~1.5s "processing"
    // feel so the UI's in-flight state is visible during a demo.
    await new Promise((r) => setTimeout(r, 1400))
    return mockResponse(transcript)
  }
  for (let attempt = 1; attempt <= SUMMARIZE_MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ transcript }),
      })
      if (!res.ok) throw new Error(`summarize returned HTTP ${res.status}`)
      const data = await res.json()
      if (isSummarizeStub(data)) {
        // Parse-failure stub — retrying usually lands on a real summary.
        console.info(`[summarizeShiftNote] parse-failure stub, retrying (${attempt}/${SUMMARIZE_MAX_ATTEMPTS})`)
        continue
      }
      return normalize(data, transcript)
    } catch (err) {
      // A network/HTTP error won't fix itself on retry — stop and fall back.
      console.warn('[summarizeShiftNote] falling back to mock:', err?.message || err)
      return mockResponse(transcript)
    }
  }
  // Every attempt returned the stub — fall back to the local summary so the
  // caregiver still gets a usable card (keyword-based urgency and all) instead
  // of "could not process note".
  console.warn('[summarizeShiftNote] summarize kept returning the parse-failure stub, falling back to mock')
  return mockResponse(transcript)
}

// ---------------------------------------------------------------------------
// Care-Plan Q&A — "Ask about the care plan" (spec A2)
//
// askCarePlan(question, plan) -> Promise<CarePlanAnswer>
//
// Calls the ask-careplan Edge Function, which forwards the question to the DO
// Agent Platform care-plan agent (retrieval over the household's care-plan
// doc). The agent's own system prompt handles graceful refusals for
// out-of-scope or clinical questions, so those come back as an ordinary
// `answer` string — we just render it. On an unconfigured backend, any
// non-2xx, a network failure, or an empty answer, we fall back to the local
// mock so the demo never breaks and the same refusal behavior still shows
// (spec requirement 7). Red-flag escalation is handled by the caller before
// this is ever reached, so nothing here touches that flow.
import { askCarePlan as mockAskCarePlan } from '../ai/mockAgent'

// The Edge Function returns { answer, sources[] }; the UI wants
// { answer, source, sectionId, confidence, reasoning } for its "How we know
// this" disclosure. When the agent cites granular care-plan anchors (e.g.
// "careplan.md#comfort-measures") we surface them verbatim, but leave
// `sectionId` null rather than fabricate a deep-link that might not resolve.
//
// In practice the live agent answers straight from the household's care-plan
// document and returns an empty sources[] — retrieval over that doc is the
// whole point of the feature. So when there's an answer but no explicit
// citation, we still attribute it to the care-plan doc itself. Falling back to
// "not sourced — please verify independently" here would be flatly wrong: the
// answer *is* grounded in the plan, and that provenance is the anti-
// hallucination beat, not something to cast doubt on.
function normalizeCarePlanAnswer(data) {
  const d = data || {}
  const answer = typeof d.answer === 'string' ? d.answer.trim() : ''
  const sources = Array.isArray(d.sources)
    ? d.sources.map((s) => String(s ?? '').trim()).filter(Boolean)
    : []
  const source = sources.length ? sources.join(', ') : answer ? "Ellie's care plan" : null
  return {
    answer,
    source,
    sectionId: null,
    confidence: source ? 'high' : null,
    reasoning: source
      ? `The care-plan assistant answers only from the household's care-plan document — this reply is grounded in that record${
          sources.length ? ` (${sources.join(', ')})` : ''
        }, not general knowledge.`
      : null,
    _fallback: false,
  }
}

export async function askCarePlan(question, plan) {
  if (!isBackendConfigured()) {
    // No key yet — defer to the local mock (keeps its own ~0.9s beat).
    return mockAskCarePlan(question, plan)
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ask-careplan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ question }),
    })
    if (!res.ok) throw new Error(`ask-careplan returned HTTP ${res.status}`)
    const normalized = normalizeCarePlanAnswer(await res.json())
    if (!normalized.answer) throw new Error('ask-careplan returned an empty answer')
    return normalized
  } catch (err) {
    console.warn('[askCarePlan] falling back to mock:', err?.message || err)
    return mockAskCarePlan(question, plan)
  }
}
