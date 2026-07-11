import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useHousehold } from '../state/HouseholdContext'
import { profilePhotos } from '../assets'
import OnDutyHeader from '../components/OnDutyHeader'
import UrgencyBadge from '../components/UrgencyBadge'
import VisitDigestModal from '../components/VisitDigestModal'
import InfoPanel from '../components/InfoPanel'
import { canSeeMeds, isNurse } from '../utils/roles'
import { fetchLogEntries } from '../lib/db'
import { visitDigest } from '../mockData'
import { PillIcon, UserIcon, BookIcon, ChevronRightIcon, SparklesIcon, CheckIcon, XIcon, PhoneIcon } from '../components/icons'

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
    medicationGiven: med ? { name: med.name, time: med.time } : undefined,
  }
}

const URGENCY_RANK = { green: 1, yellow: 2, red: 3 }

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

// Log authors are freeform strings like "Marcus (volunteer)" — match them
// back to a real profile (for photo + a clean role label) by first name.
function matchProfile(profiles, author) {
  const baseName = author.replace(/\s*\([^)]*\)\s*$/, '').trim()
  return profiles.find((p) => p.name === baseName || p.name.startsWith(baseName))
}

function formatMedGiven(m) {
  return `“${m.name} ${m.dose} ${m.route} @ ${m.time} for ${m.reason}”`
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
        className="flex items-center gap-1 text-[12px] font-semibold text-mist active:scale-[0.98]"
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
        <p className="mt-1.5 border-l-2 border-sage-300 pl-3 text-[13px] font-medium italic leading-snug text-ink/80">
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
  const { logs, status, location, household, profiles, activeProfile } = useHousehold()
  const seeMeds = canSeeMeds(activeProfile?.role)

  // Hydrate the timeline from Supabase (if configured), merged with the seed /
  // in-memory logs. Dedupe by id and sort newest-first before grouping.
  const [remoteLogs, setRemoteLogs] = useState([])
  useEffect(() => {
    let cancelled = false
    fetchLogEntries().then((rows) => {
      if (!cancelled) setRemoteLogs(rows.map(mapRemoteRow))
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

  // Not tracked historically per entry — this reflects the household's
  // current status, shown as a lightweight reminder chip on every card
  // rather than a real point-in-time snapshot.
  const patientStatusNote = `${status} in ${location}`

  return (
    <>
      <OnDutyHeader />

      <main className="bg-household flex-1 px-5 pb-5 pt-6">
        <button
          type="button"
          onClick={() => setDigestOpen(true)}
          className="mx-auto flex w-full max-w-md items-center gap-2.5 rounded-[8px] bg-white p-3 shadow-card transition-transform active:scale-[0.99] lg:max-w-2xl"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-100 text-mist">
            <SparklesIcon width={17} height={17} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-sm font-bold text-ink">Since your last visit</span>
            <span className="block text-xs font-semibold text-muted">{visitDigest.lastVisit} · tap to review</span>
          </span>
          <ChevronRightIcon width={16} height={16} strokeWidth={2.5} className="shrink-0 text-mist" />
        </button>

        <div className="relative mx-auto mt-16 max-w-md lg:max-w-2xl">
          <div className="rounded-[8px] bg-white p-4 pb-4 pt-8 shadow-card">
            <div className="pl-28">
              <p className="text-[19px] font-bold leading-tight text-ink">{household.preferredName}'s current status</p>
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
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-mist shadow-card">
                <BookIcon width={15} height={15} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1 text-[12px] font-medium leading-snug">
                Get to know {household.preferredName} — her habits, routines, and personal story.{' '}
                <span className="font-bold text-mist">Learn more</span>
              </span>
              <ChevronRightIcon width={15} height={15} strokeWidth={2.5} className="shrink-0 text-mist" />
            </InfoPanel>
          </div>
          <div className="absolute -top-8 left-0">
            <img src={profilePhotos.ellie} alt="" className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-card" />
            <span className="absolute right-1 top-1 h-4 w-4 rounded-full border-2 border-white bg-routine-fg" />
          </div>
        </div>

        <h1 className="mb-5 mt-6 text-center text-[26px] font-bold text-ink">Timeline</h1>

        {buckets.map((bucket) => (
          <div key={bucket.label} className="mb-4 rounded-[8px] bg-white p-4 shadow-card last:mb-0">
            <h2 className="text-xl font-bold leading-tight text-ink">{bucket.label}</h2>
            <p className="mb-3 text-[11px] font-bold text-muted">{formatFullDate(bucket.groups[0].timestamp)}</p>

            {bucket.groups.map((group, i) => {
              const matched = matchProfile(profiles, group.author)
              const photo = matched && profilePhotos[matched.id]
              const medItem = group.items.find((l) => l.medicationGiven)
              const triedItems = group.items.flatMap((l) => (Array.isArray(l.tried) ? l.tried : []))
              const escalatedItem = group.items.find((l) => l.escalatedAt)
              const rawItem = group.items.find((l) => l.rawTranscript)

              // Colored left rail: red for a flagged group, green once a
              // group has fully settled — i.e. every entry is routine and an
              // earlier group the same day (later in this newest-first list)
              // was red.
              const allGreen = group.items.every((l) => (l.urgency ?? 'green') === 'green')
              const priorRedSameDay = bucket.groups.slice(i + 1).some((g) => g.urgency === 'red')
              const settled = allGreen && priorRedSameDay
              const railClass =
                group.urgency === 'red'
                  ? 'border-l-2 border-attention-fg pl-3'
                  : settled
                    ? 'border-l-2 border-routine-fg pl-3'
                    : ''

              return (
                <div
                  key={group.sessionId}
                  className={`${i > 0 ? 'mt-4 border-t border-sage-100 pt-4' : ''} ${railClass}`.trim()}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-ink/20" />
                    <span className="text-[13px] font-semibold text-muted">{formatTime(group.timestamp)}</span>
                    <UrgencyBadge urgency={group.urgency} />
                  </div>

                  <div className="mt-2 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      {photo ? (
                        <img src={photo} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage-100 text-mist">
                          <UserIcon width={20} height={20} strokeWidth={1.8} />
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[19px] font-bold leading-tight text-ink">
                          {matched?.name || group.author}
                        </p>
                        <p className="truncate text-xs font-semibold leading-tight text-muted">{matched?.role || ''}</p>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-[8px] bg-[#e2f4eb] px-2.5 py-1.5 text-ink">
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

                  {rawItem && (
                    <OwnWordsToggle authorFirst={firstNameOf(group.author)} text={rawItem.rawTranscript} />
                  )}

                  {seeMeds && medItem && (
                    <div className="mt-2.5 flex items-start gap-2.5 rounded-[8px] border border-mist bg-white p-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-clay-50 text-clay-500">
                        <PillIcon width={15} height={15} strokeWidth={2} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold leading-tight text-ink">Medication Administered</p>
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
        onReview={() => {
          setDigestOpen(false)
          if (isNurse(activeProfile?.role)) navigate(`/household/${householdId}/settings/request-med`)
        }}
      />
    </>
  )
}
