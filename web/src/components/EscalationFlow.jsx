import { useEffect, useRef, useState } from 'react'
import { useHousehold } from '../state/HouseholdContext'
import { AlertTriangleIcon, RefreshIcon, PhoneIcon, CheckIcon } from './icons'

// How long the "notifying…" stage animates before it resolves to "notified".
// A simulated page — the same delay-then-write pattern the Log screen used
// before this flow was extracted (no real SMS/paging integration).
const NOTIFY_DELAY_MS = 1800

function telHref(phone) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

function condense(text, max = 120) {
  const trimmed = (text || '').trim().replace(/\s+/g, ' ')
  if (trimmed.length <= max) return trimmed
  return trimmed.slice(0, max - 1).trimEnd() + '…'
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// The two-stage "needs attention" escalation used by both trigger points
// (a red-flagged shift note and a red-flagged care-plan question). Mounts in
// the "firing" stage, auto-advances to "notified" after NOTIFY_DELAY_MS, and
// calls `onNotified` exactly once so the caller can stamp escalation metadata
// onto the log entry it's about to write.
//
// `trigger`: { quote, reasonLine } — the caregiver's own words and the
//   plain-language reason Bedside flagged them.
export default function EscalationFlow({ trigger, onNotified }) {
  const { household, carePlan, contacts } = useHousehold()
  const nurse = contacts.hospiceTeam[0]
  const comfort = carePlan.comfortMeasures?.[0]

  const [stage, setStage] = useState('firing') // firing | notified
  const [notifiedAt, setNotifiedAt] = useState(null)
  const firedRef = useRef(false)
  const onNotifiedRef = useRef(onNotified)
  onNotifiedRef.current = onNotified

  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifiedAt(new Date().toISOString())
      setStage('notified')
    }, NOTIFY_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (stage === 'notified' && !firedRef.current) {
      firedRef.current = true
      onNotifiedRef.current?.()
    }
  }, [stage])

  if (stage === 'firing') {
    return (
      <div className="space-y-2">
        <div className="rounded-card border border-line bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">What you said</p>
          <p className="mt-1 text-[13px] font-medium italic leading-snug text-ink/80">“{trigger.quote}”</p>

          <div className="mt-3 rounded-card bg-attention-bg p-3 text-attention-fg">
            <div className="flex items-start gap-2">
              <AlertTriangleIcon width={16} height={16} strokeWidth={2.5} className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-bold">Bedside flagged this</p>
                <p className="mt-0.5 text-[13px] font-medium leading-snug">{trigger.reasonLine}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2 border-t border-attention-fg/20 pt-2.5">
              <RefreshIcon width={15} height={15} strokeWidth={2.5} className="shrink-0 animate-spin" />
              <p className="text-[13px] font-bold">Notifying the on-call nurse…</p>
            </div>
          </div>
        </div>
        <p className="text-center text-xs font-medium text-muted">You don't have to decide. Bedside already did.</p>
      </div>
    )
  }

  // notified
  return (
    <div className="space-y-2">
      <div className="rounded-card border border-line bg-white p-4">
        <div className="flex items-start gap-2 rounded-card bg-routine-bg p-3 text-routine-fg">
          <CheckIcon width={16} height={16} strokeWidth={3} className="mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[14px] font-bold leading-tight">{nurse.name} has been notified</p>
            <p className="text-[12px] font-semibold">On-call nurse · {formatTime(notifiedAt)}</p>
          </div>
        </div>

        <div className="mt-3 rounded-card border border-line bg-white p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">What was sent</p>
          <p className="mt-1 text-[13px] font-medium leading-snug text-ink">“{condense(trigger.quote)}”</p>
        </div>

        {comfort && (
          <div className="mt-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">While you wait</p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="min-w-0 text-[14px] font-semibold text-ink">{comfort}</p>
              <span className="shrink-0 rounded-full bg-track px-2 py-0.5 text-[10px] font-semibold text-muted">
                From {household.preferredName}'s care plan
              </span>
            </div>
          </div>
        )}

        <a
          href={telHref(nurse.phone)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-[15px] font-semibold text-white active:scale-[0.98]"
        >
          <PhoneIcon width={18} height={18} strokeWidth={2} />
          Call the nurse line now
        </a>
      </div>
      <p className="text-center text-xs font-medium text-muted">If it's an emergency, call 911.</p>
    </div>
  )
}
