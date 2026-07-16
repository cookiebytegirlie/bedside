// Persistence for shift-note log entries, via Supabase's PostgREST API
// (no @supabase/supabase-js dependency needed).
//
// Table: log_entry (Michelle's schema — see spec section 10, with `ai_response`
// in place of the spec's `ai_summary`). Actual columns, confirmed against the
// live table: id, household_id, shift_id, timestamp, type, raw_text,
// ai_response (jsonb), urgency_tag, logged_by. There is no top-level
// `transcript`/`summary`/`urgency` column — those live inside `ai_response`.
//
// Everything here is best-effort: if the backend isn't configured or a call
// fails, it degrades quietly (returns { ok:false } / []) so the in-memory
// timeline keeps working during a demo.

import { isBackendConfigured } from './api'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Write-path guard: `logged_by` must be an active roster identity. Historical
// junk (short-form names like "Marcus F.", directory-only contacts, retired
// aliases) was cleaned out of the DB and this rule prevents new junk from
// getting in. Guest volunteers use free-form names but conventionally include
// "(volunteer)".
const ACTIVE_ROSTER = new Set(['Daniel Voss', 'Priya Anand', 'Priya', 'Marcus'])
function isValidAuthor(name) {
  if (typeof name !== 'string' || !name.trim()) return false
  if (ACTIVE_ROSTER.has(name)) return true
  return /\(volunteer\)/i.test(name)
}

function restHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    ...extra,
  }
}

// Persists one entry. `response` is the full AI response object. `urgency` is
// the caregiver's own flag, which is authoritative — the AI's read inside
// `response` is only a suggestion — so it drives `urgency_tag` when provided.
export async function saveLogEntry({ transcript, response, author, urgency }) {
  if (!isBackendConfigured()) return { ok: false, reason: 'not-configured' }
  if (!isValidAuthor(author)) {
    console.warn('[saveLogEntry] rejecting: author not in active roster', { author })
    return { ok: false, reason: 'invalid-author' }
  }
  const row = {
    type: 'note',
    raw_text: transcript,
    ai_response: response,
    urgency_tag: urgency ?? response?.urgency ?? 'green',
    timestamp: new Date().toISOString(),
    logged_by: author,
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/log_entry`, {
      method: 'POST',
      headers: restHeaders({ Prefer: 'return=representation' }),
      body: JSON.stringify(row),
    })
    if (!res.ok) throw new Error(`insert HTTP ${res.status}: ${await res.text()}`)
    const rows = await res.json()
    return { ok: true, row: Array.isArray(rows) ? rows[0] : rows }
  } catch (err) {
    console.warn('[saveLogEntry] failed (kept locally):', err?.message || err)
    return { ok: false, reason: err?.message || 'error' }
  }
}

// Loads recent entries. No server-side ORDER BY (column names may vary); we
// sort client-side by the response timestamp.
export async function fetchLogEntries() {
  if (!isBackendConfigured()) return []
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/log_entry?select=*&limit=100`, {
      headers: restHeaders(),
    })
    if (!res.ok) throw new Error(`select HTTP ${res.status}`)
    const rows = await res.json()
    return Array.isArray(rows) ? rows : []
  } catch (err) {
    console.warn('[fetchLogEntries] failed:', err?.message || err)
    return []
  }
}
