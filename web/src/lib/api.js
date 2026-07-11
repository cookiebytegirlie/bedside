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
    _fallback: false,
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
