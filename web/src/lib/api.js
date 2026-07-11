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
      ? d.medications.map((m) => ({ name: String(m?.name ?? ''), time: String(m?.time ?? '') })).filter((m) => m.name)
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
function workingStatus(outcome, count) {
  const o = String(outcome || '').toLowerCase()
  if (/mixed|sometimes|inconsistent|varied|partial/.test(o)) return 'mixed'
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
      const count = typeof w?.worked_count === 'number' ? w.worked_count : undefined
      const label = outcome ? `${intervention} — ${outcome}` : intervention
      return { status: workingStatus(outcome, count), label }
    })
    .filter((w) => w.label)

  // If the agent returned nothing usable, fall back rather than show blanks.
  if (!needsList.length && !patternText && !changed.length && !working.length) {
    return { ...fallbackDigest, _fallback: true }
  }

  return {
    lastVisit: fallbackDigest.lastVisit,
    needsYou: needsList.length
      ? { clinicalOnly: true, count: needsList.length, text: needsList.join(' '), cta: fallbackDigest.needsYou.cta }
      : fallbackDigest.needsYou,
    pattern: patternText ? { sensitive: true, text: patternText } : fallbackDigest.pattern,
    changed: changed.length ? changed : fallbackDigest.changed,
    working: working.length ? working : fallbackDigest.working,
    _fallback: false,
  }
}

export async function fetchVisitDigest() {
  if (!isBackendConfigured()) {
    // No key yet — keep a brief "reasoning" beat so the loading state is
    // visible, then hand back the hardcoded digest.
    await new Promise((r) => setTimeout(r, 1400))
    return { ...fallbackDigest, _fallback: true }
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-trends`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({}),
    })
    if (!res.ok) throw new Error(`get-trends returned HTTP ${res.status}`)
    return normalizeDigest(await res.json())
  } catch (err) {
    console.warn('[fetchVisitDigest] falling back to hardcoded digest:', err?.message || err)
    return { ...fallbackDigest, _fallback: true }
  }
}

export async function summarizeShiftNote(transcript) {
  if (!isBackendConfigured()) {
    // No key yet — go straight to the mock, but keep the ~1.5s "processing"
    // feel so the UI's in-flight state is visible during a demo.
    await new Promise((r) => setTimeout(r, 1400))
    return mockResponse(transcript)
  }
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
    return normalize(data, transcript)
  } catch (err) {
    console.warn('[summarizeShiftNote] falling back to mock:', err?.message || err)
    return mockResponse(transcript)
  }
}
