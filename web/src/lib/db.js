// Persistence for shift-note log entries, via Supabase's PostgREST API
// (no @supabase/supabase-js dependency needed).
//
// Table: log_entry. The full AI response is stored in the `ai_response` jsonb
// column; `transcript`, `summary`, and `urgency` are stored as top-level
// columns for easy querying / urgency chips.
//
// Everything here is best-effort: if the backend isn't configured or a call
// fails, it degrades quietly (returns { ok:false } / []) so the in-memory
// timeline keeps working during a demo.

import { isBackendConfigured } from './api'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function restHeaders(extra = {}) {
  return {
    'Content-Type': 'application/json',
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    ...extra,
  }
}

// Persists one entry. `response` is the full AI response object.
export async function saveLogEntry({ transcript, response }) {
  if (!isBackendConfigured()) return { ok: false, reason: 'not-configured' }
  const row = {
    transcript,
    summary: response?.summary ?? null,
    urgency: response?.urgency ?? 'green',
    ai_response: response,
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
