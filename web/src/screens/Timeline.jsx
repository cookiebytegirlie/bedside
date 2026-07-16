import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useHousehold } from '../state/HouseholdContext'
import { profilePhotos } from '../assets'
import OnDutyHeader from '../components/OnDutyHeader'
import UrgencyBadge from '../components/UrgencyBadge'
import VisitDigestModal from '../components/VisitDigestModal'
import InfoPanel from '../components/InfoPanel'
import { canSeeMeds } from '../utils/roles'
import { fetchLogEntries } from '../lib/db'
import { visitDigest } from '../mockData'
import { PillIcon, UserIcon, BookIcon, ChevronRightIcon, SparklesIcon, CheckIcon, XIcon, PhoneIcon, AlertTriangleIcon } from '../components/icons'

// Auto-open the digest only the first time the homepage mounts this session
// (survives in-app remounts; a full reload resets it).
let digestAutoShown = false

// Map a persisted Supabase log_entry row into the in-memory log shape the
// Timeline renders. Real columns: id, timestamp, type, raw_text, ai_response
// (jsonb — summary/urgency/medications live here), urgency_tag, logged_by.
function mapRemoteRow(row) {
  const ai = row.ai_response || {}
  const med = Array.isArray(ai.medications) ? ai.medications[0] : null
  return {
    id: row.id ?? `remote-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: row.timestamp ?? ai.timestamp ?? new Date().toISOString(),
    author: row.logged_by ?? 'Logged via Bedside',
    type: 'shift-note',
    summary: ai.summary ?? row.raw_text ?? '',
    urgency: row.urgency_tag ?? ai.urgency ?? 'green',
    rawTranscript: row.raw_text,
    // Pass through the full med record when the source has it, so complete
    // rows render completely; formatMedGiven omits any field that's missing.
    medicationGiven: med
      ? {
          name: med.name,
          time: med.time,
          ...(med.dose ? { dose: med.dose } : {}),
          ...(med.route ? { route: med.route } : {}),
          ...(med.reason ? { reason: med.reason } : {}),
        }
      : undefined,
    // Surface escalation / disagreement metadata when present so the remote
    // sanitizer can tell a real escalation (has escalatedAt) or disagreement
    // (has aiUrgency) from a legacy row that has neither.
    ...(row.escalatedAt || ai.escalatedAt ? { escalatedAt: row.escalatedAt ?? ai.escalatedAt } : {}),
    ...(ai.aiUrgency ? { aiUrgency: ai.aiUrgency } : {}),
    ...(ai.keptUrgency ? { keptUrgency: ai.keptUrgency } : {}),
  }
}

// ── Remote-log sanitizer (display layer) ────────────────────────────────────
// Applies to REMOTE (Supabase) rows only — the seed / in-memory logs are
// already correct and never pass through here. Validation is principled, not
// id-based, so it keeps guarding even after the junk rows are deleted at the
// source.

// Retired aliases from before the household restructure — any remote row that
// names one is stale. Word-boundary + case-insensitive so it won't trip on
// "been", "Bedside", "Anand", etc.
const RETIRED_NAME_RE = /\b(?:bee|anna)\b/i

// Prose that asserts an escalation already happened. On a calm-tagged row that
// carries neither escalation nor disagreement metadata, the tag and the text
// simply don't agree.
const ESCALATION_ASSERTION_RE = /nurse has been notified|paged|911|unresponsive|severe respiratory distress/i

const DUP_WINDOW_MS = 5 * 60 * 1000

function summarySnippet(text, max = 60) {
  const t = (text || '').replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

// Drop a remote log if it (0) is empty (no summary and no transcript),
// (1) names a retired alias, (2) pairs a calm tag with escalation prose but has
// no escalation/disagreement metadata to justify it, or (3) duplicates an
// earlier row (same author + summary within ~5 min). Each drop is
// console.warn'd with id, author, urgency, a summary snippet, and why.
function sanitizeRemoteLogs(logs) {
  const drop = (row, reason) => {
    console.warn('[Timeline] dropped remote log', {
      id: row.id,
      author: row.author,
      urgency: row.urgency,
      summary: summarySnippet(row.summary),
      reason,
    })
  }

  // Oldest-first so the earliest of any duplicate set is the one kept.
  const byTime = [...logs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  const kept = []

  for (const row of byTime) {
    // 0) Empty — nothing to show (no summary and no transcript).
    if (!row.summary?.trim() && !row.rawTranscript?.trim()) {
      drop(row, 'empty: no summary or transcript')
      continue
    }

    // 1) Retired-name reference — author or narrative text.
    const named = `${row.author ?? ''} ${row.summary ?? ''} ${row.rawTranscript ?? ''}`
    if (RETIRED_NAME_RE.test(named)) {
      drop(row, 'retired-name reference')
      continue
    }

    // 2) Incoherent severity — calm tag over escalation prose, and no
    //    structural evidence (escalatedAt / aiUrgency) that either happened.
    const calmTag = row.urgency === 'green' || row.urgency === 'yellow'
    const assertsEscalation = ESCALATION_ASSERTION_RE.test(`${row.summary ?? ''} ${row.rawTranscript ?? ''}`)
    if (calmTag && assertsEscalation && !row.escalatedAt && !row.aiUrgency) {
      drop(row, 'incoherent severity: calm tag over escalation prose')
      continue
    }

    // 3) Duplicate — same author + summary within the window; keep earliest.
    const isDupe = kept.some(
      (k) =>
        k.author === row.author &&
        k.summary === row.summary &&
        Math.abs(new Date(row.timestamp) - new Date(k.timestamp)) <= DUP_WINDOW_MS
    )
    if (isDupe) {
      drop(row, 'duplicate: same author + summary within 5 min')
      continue
    }

    kept.push(row)
  }

  return kept
}

const URGENCY_RANK = { green: 1, yellow: 2, red: 3 }

// Plain-language name for the urgency a caregiver kept, used in the passive
// "flagged for review" awareness note (AI read red, human logged it lower).
const KEPT_WORD = { green: 'routine', yellow: 'keep an eye on', red: 'needs attention' }

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function formatFullDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

function dayLabel(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a, b) => a.toDateString() === b.toDateString()
  if (sameDay(d, today)) return 'Today'
  if (sameDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
}

// Strip a trailing "(role)" suffix — "Marcus (volunteer)" → "Marcus".
function cleanAuthorName(author) {
  return (author ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim()
}

// Parse any author/name string into a first name and an optional last initial:
//   "Daniel V."   → { first: 'Daniel', initial: 'V' }
//   "Daniel Voss" → { first: 'Daniel', initial: 'V' }
//   "Daniel"      → { first: 'Daniel', initial: '' }
//   "Marcus F."   → { first: 'Marcus', initial: 'F' }
function parseName(str) {
  const parts = cleanAuthorName(str).split(/\s+/).filter(Boolean)
  const last = parts.length > 1 ? parts[parts.length - 1] : ''
  return { first: parts[0] || '', initial: last ? last[0] : '' }
}

// Resolve a log author — in ANY format ("Daniel V.", "Daniel Voss",
// "Daniel (family)") — back to its profile for a photo, full name, and role.
// Match on first name (case-insensitive); only require the last initial to
// agree when BOTH the author and the profile carry one, so "Marcus F." still
// resolves to the "Marcus" profile while a differing initial can disambiguate
// two same-first-name people. Arbitrary guest names ("Lauren") match nothing —
// that's expected; they render cleanly by their given name instead.
function matchProfile(profiles, author) {
  const a = parseName(author)
  if (!a.first) return undefined
  return profiles.find((p) => {
    const pn = parseName(p.name)
    if (a.first.toLowerCase() !== pn.first.toLowerCase()) return false
    if (a.initial && pn.initial) return a.initial.toLowerCase() === pn.initial.toLowerCase()
    return true
  })
}

function formatMedGiven(m) {
  // Only include fields that are present so a partial record never renders the
  // literal "undefined" (e.g. "morphine oral solution @ 20:20" with no
  // dose/route/reason).
  const head = [m.name, m.dose, m.route].filter(Boolean).join(' ')
  const time = m.time ? ` @ ${m.time}` : ''
  const reason = m.reason ? ` for ${m.reason}` : ''
  return `“${head}${time}${reason}”`
}

// Structured comfort-measure outcomes (from ShiftEnd) → past-tense label,
// matching the mockup's "Comfort meds — didn't help" phrasing.
const TRIED_LABEL = { helped: 'helped', didnt: "didn't help", notsure: 'not sure' }

// First name for the "own words" toggle label — strips a trailing role
// parenthetical like "Marcus (volunteer)" first.
function firstNameOf(author) {
  return author.replace(/\s*\([^)]*\)\s*$/, '').trim().split(/\s+/)[0]
}

// Reveals a caregiver's raw dictated quote under a collapsed toggle — same
// chevron-rotate affordance as EssentialInfo's ExpandToggle, scoped to one
// Timeline entry.
function OwnWordsToggle({ authorFirst, text }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1 text-[12px] font-semibold text-ink active:scale-[0.98]"
      >
        <ChevronRightIcon
          width={13}
          height={13}
          strokeWidth={2.5}
          className={`transition-transform ${open ? 'rotate-90' : ''}`}
        />
        {open ? 'Hide' : `See ${authorFirst}'s own words`}
      </button>
      {open && (
        <p className="mt-1.5 border-l-2 border-line pl-3 text-[13px] font-medium italic leading-snug text-ink/80">
          “{text}”
        </p>
      )}
    </div>
  )
}

// Entries logged in the same visit to the Log screen share a sessionId.
// Group consecutive same-session entries into one card so a quick round of
// taps (status + meds + note) reads as one moment, not three stacked cards.
function groupLogs(logs) {
  const groups = []
  for (const log of logs) {
    const last = groups[groups.length - 1]
    if (log.sessionId && last?.sessionId === log.sessionId) {
      last.items.push(log)
    } else {
      groups.push({ sessionId: log.sessionId ?? log.id, author: log.author, items: [log] })
    }
  }
  return groups.map((group) => {
    const items = [...group.items].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    const timestamp = items[items.length - 1].timestamp
    const urgency = items.reduce(
      (worst, l) => (URGENCY_RANK[l.urgency] > URGENCY_RANK[worst] ? l.urgency : worst),
      'green'
    )
    return { ...group, items, timestamp, urgency }
  })
}

function bucketByDay(groups) {
  const buckets = []
  for (const group of groups) {
    const label = dayLabel(group.timestamp)
    let bucket = buckets.find((b) => b.label === label)
    if (!bucket) {
      bucket = { label, groups: [] }
      buckets.push(bucket)
    }
    bucket.groups.push(group)
  }
  return buckets
}

export default function Timeline() {
  const { householdId } = useParams()
  const navigate = useNavigate()
  const { logs, status, location, household, profiles, activeProfile, notifications, contacts, digestOpenRequest } = useHousehold()
  const seeMeds = canSeeMeds(activeProfile?.role)

  // Hydrate the timeline from Supabase (if configured), merged with the seed /
  // in-memory logs. Dedupe by id and sort newest-first before grouping.
  const [remoteLogs, setRemoteLogs] = useState([])
  useEffect(() => {
    let cancelled = false
    fetchLogEntries().then((rows) => {
      // Sanitize the REMOTE rows only — the seed / in-memory `logs` are already
      // clean and never routed through here.
      if (!cancelled) setRemoteLogs(sanitizeRemoteLogs(rows.map(mapRemoteRow)))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const seenIds = new Set(logs.map((l) => l.id))
  const mergedLogs = [...remoteLogs.filter((r) => !seenIds.has(r.id)), ...logs].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  )
  const groups = groupLogs(mergedLogs)
  const buckets = bucketByDay(groups)

  const [digestOpen, setDigestOpen] = useState(false)

  // Auto-open the digest once per session. Kept in an effect (not the useState
  // initializer) so it stays pure and survives StrictMode's double-invoke.
  useEffect(() => {
    if (!digestAutoShown) {
      digestAutoShown = true
      setDigestOpen(true)
    }
  }, [])

  // Toast → open modal: HouseholdContext bumps digestOpenRequest when the
  // "Your visit digest is ready · View →" toast is tapped. Watching a
  // monotonic counter (not a boolean) lets us re-open on every tap without a
  // caller having to reset a flag.
  const lastOpenReqRef = useRef(digestOpenRequest)
  useEffect(() => {
    if (digestOpenRequest !== lastOpenReqRef.current) {
      lastOpenReqRef.current = digestOpenRequest
      setDigestOpen(true)
    }
  }, [digestOpenRequest])

  // Not tracked historically per entry — this reflects the household's
  // current status, shown as a lightweight reminder chip on every card
  // rather than a real point-in-time snapshot.
  const patientStatusNote = `${status} in ${location}`

  return (
    <>
      <OnDutyHeader />

      <main className="flex-1 bg-white px-4 pb-5 pt-6">
        <button
          type="button"
          onClick={() => setDigestOpen(true)}
          className="mx-auto flex w-full max-w-md items-center gap-2.5 rounded-card border border-line bg-white p-3 transition-transform active:scale-[0.99] lg:max-w-2xl"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-track text-ink">
            <SparklesIcon width={17} height={17} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-[14px] font-semibold tracking-tight text-ink">Since your last visit</span>
            <span className="block text-[12px] font-medium text-muted">{visitDigest.lastVisit} · tap to review</span>
          </span>
          <ChevronRightIcon width={16} height={16} strokeWidth={2.5} className="shrink-0 text-faint" />
        </button>

        <div className="relative mx-auto mt-16 max-w-md lg:max-w-2xl">
          <div className="rounded-card border border-line bg-white p-4 pb-4 pt-8">
            <div className="pl-28">
              <p className="text-[19px] font-semibold tracking-tight leading-tight text-ink">{household.preferredName}'s current status</p>
              <p className="mt-1.5 text-[13px] font-medium leading-tight text-ink">
                <span className="font-bold">Currently:</span> {status} in <span className="font-bold">{location}</span>
                <br />
                <span className="font-bold">Last Meal:</span> {household.lastMeal}
                {seeMeds && (
                  <>
                    <br />
                    <span className="font-bold">Medication:</span> {household.nextDoseNote}
                  </>
                )}
              </p>
            </div>
            <InfoPanel
              as={Link}
              to={`/household/${householdId}/about`}
              className="mt-3 flex items-center gap-2.5 px-3 py-2.5 transition-transform active:scale-[0.99]"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-soft">
                <BookIcon width={15} height={15} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1 text-[12px] font-medium leading-snug text-ink">
                Get to know {household.preferredName} — her habits, routines, and personal story.{' '}
                <span className="font-semibold text-ink underline underline-offset-2">Learn more</span>
              </span>
              <ChevronRightIcon width={15} height={15} strokeWidth={2.5} className="shrink-0 text-ink" />
            </InfoPanel>
          </div>
          <div className="absolute -top-8 left-0">
            <img src={profilePhotos.ellie} alt="" className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-soft" />
            <span className="absolute right-1 top-1 h-4 w-4 rounded-full border-2 border-white bg-ink" />
          </div>
        </div>

        <h1 className="mb-5 mt-7 text-[30px] font-bold leading-tight tracking-tighter text-ink">Timeline</h1>

        {buckets.map((bucket) => (
          <div key={bucket.label} className="mb-4 rounded-card border border-line bg-white p-4 last:mb-0">
            <h2 className="text-[19px] font-semibold tracking-tight leading-tight text-ink">{bucket.label}</h2>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-faint">{formatFullDate(bucket.groups[0].timestamp)}</p>

            {bucket.groups.map((group, i) => {
              const matched = matchProfile(profiles, group.author)
              const photo = matched && profilePhotos[matched.id]
              const medItem = group.items.find((l) => l.medicationGiven)
              const triedItems = group.items.flatMap((l) => (Array.isArray(l.tried) ? l.tried : []))
              const escalatedItem = group.items.find((l) => l.escalatedAt)
              const rawItem = group.items.find((l) => l.rawTranscript)
              // AI read "red" but the caregiver logged it lower — a passive
              // awareness item for the nurse/primary caregiver, never a page.
              const reviewItem = group.items.find(
                (l) => l.aiUrgency === 'red' && l.keptUrgency && l.keptUrgency !== 'red'
              )

              // A red entry's escalation is "resolved" once its notification —
              // keyed by the escalated log's id — has been marked resolved.
              const escalationResolved =
                group.urgency === 'red' &&
                escalatedItem &&
                notifications.some((n) => n.id === escalatedItem.id && n.status === 'resolved')

              // The handling note left when this entry's notification (escalation
              // or disagreement) was acknowledged/resolved — closes the loop by
              // showing not just that it was handled but how.
              const reviewNotif = notifications.find(
                (n) =>
                  (n.id === escalatedItem?.id || n.id === reviewItem?.id) &&
                  (n.status === 'acknowledged' || n.status === 'resolved') &&
                  n.note
              )

              return (
                <div
                  key={group.sessionId}
                  className={i > 0 ? 'mt-4 border-t border-line pt-4' : ''}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-ink/20" />
                    <span className="text-[13px] font-semibold text-muted">{formatTime(group.timestamp)}</span>
                    <UrgencyBadge urgency={group.urgency} className={escalationResolved ? 'line-through' : ''} />
                    {escalationResolved && (
                      <span className="inline-flex items-center rounded-full bg-routine-tint px-2.5 py-1 text-[11px] font-semibold tracking-tight text-routine-fg">
                        Resolved
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {photo ? (
                        <img src={photo} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-track text-ink">
                          <UserIcon width={20} height={20} strokeWidth={1.8} />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[17px] font-semibold tracking-tight leading-tight text-ink">
                          {matched?.name || cleanAuthorName(group.author)}
                        </p>
                        <p className="truncate text-xs font-medium leading-tight text-muted">{matched?.role || ''}</p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-card bg-track px-2.5 py-1.5 text-ink">
                      <UserIcon width={13} height={13} strokeWidth={2} />
                      <span className="text-[10px] font-semibold leading-tight">
                        Patient Status:
                        <br />
                        {patientStatusNote}
                      </span>
                    </span>
                  </div>

                  <div className="mt-2 space-y-1.5">
                    {group.items.map((log) => (
                      <p key={log.id} className="text-[13px] font-medium leading-tight text-ink">
                        {log.type === 'shift-note' || log.type === 'skin-integrity' ? `“${log.summary}”` : log.summary}
                      </p>
                    ))}
                  </div>

                  {triedItems.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {triedItems.map((t, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                          {t.outcome === 'helped' ? (
                            <CheckIcon width={14} height={14} strokeWidth={2.5} className="shrink-0 text-routine-fg" />
                          ) : (
                            <XIcon width={14} height={14} strokeWidth={2.5} className="shrink-0 text-attention-fg" />
                          )}
                          <span>
                            {t.name} — {TRIED_LABEL[t.outcome] ?? t.outcome}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {escalatedItem && (
                    <div className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-attention-fg">
                      <PhoneIcon width={14} height={14} strokeWidth={2} className="shrink-0" />
                      <span>Nurse notified automatically at {formatTime(escalatedItem.escalatedAt)}</span>
                    </div>
                  )}

                  {/* Ownership of a needs-attention flag is always explicit. */}
                  {escalatedItem && (
                    <p className="mt-1 text-[11px] font-medium text-muted">
                      Owned by {contacts.hospiceTeam[0].name} · on-call nurse
                    </p>
                  )}

                  {/* Passive AI-disagreement awareness — amber (watch), not red,
                      and only shown to the nurse and primary caregiver. */}
                  {seeMeds && reviewItem && (
                    <div className="mt-2 flex items-start gap-1.5 rounded-card border border-watch-fg/30 bg-white px-2.5 py-2">
                      <AlertTriangleIcon width={14} height={14} strokeWidth={2} className="mt-0.5 shrink-0 text-watch-fg" />
                      <div className="min-w-0">
                        <p className="text-[12px] font-semibold leading-snug text-watch-fg">Bedside flagged this for review</p>
                        <p className="mt-0.5 text-[11px] font-medium leading-snug text-ink/70">
                          Logged as {KEPT_WORD[reviewItem.keptUrgency] ?? reviewItem.keptUrgency} by the caregiver —
                          shared with the nurse and primary caregiver for awareness.
                        </p>
                        {reviewItem.aiUrgencyReason && (
                          <p className="mt-0.5 text-[11px] font-medium italic leading-snug text-ink/55">
                            Bedside read: “{reviewItem.aiUrgencyReason}”
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* How the escalation / flag was handled — closes the loop. */}
                  {seeMeds && reviewNotif && (
                    <p className="mt-2 text-[11px] font-medium leading-snug text-muted">
                      Reviewed by {reviewNotif.by ?? 'someone'}: {reviewNotif.note}
                    </p>
                  )}

                  {rawItem && (
                    <OwnWordsToggle authorFirst={firstNameOf(group.author)} text={rawItem.rawTranscript} />
                  )}

                  {seeMeds && medItem && (
                    <div className="mt-2.5 flex items-start gap-2.5 rounded-card border border-line bg-white p-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-track text-icon">
                        <PillIcon width={15} height={15} strokeWidth={2} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide leading-tight text-muted">Medication administered</p>
                        <p className="text-[10px] font-medium leading-tight text-ink">{formatMedGiven(medItem.medicationGiven)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </main>

      <VisitDigestModal
        open={digestOpen}
        onClose={() => setDigestOpen(false)}
        role={activeProfile?.role}
        onOpenInbox={() => {
          setDigestOpen(false)
          navigate(`/household/${householdId}/inbox`)
        }}
      />
    </>
  )
}
