import {
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  BellIcon,
  PillIcon,
  FlagIcon,
  InfoIcon,
} from './icons'
import AiSourceDisclosure from './AiSourceDisclosure'
import InfoPanel from './InfoPanel'

// Visual spec for each urgency — icon + label so it's never color-alone.
const URGENCY = {
  green: { label: 'Routine', bg: 'bg-routine-bg', fg: 'text-routine-fg', Icon: CheckIcon },
  yellow: { label: 'Keep an eye on', bg: 'bg-watch-bg', fg: 'text-watch-fg', Icon: AlertTriangleIcon },
  red: { label: 'Needs attention', bg: 'bg-attention-bg', fg: 'text-attention-fg', Icon: BellIcon },
}

function UrgencyBadge({ urgency }) {
  const u = URGENCY[urgency] || URGENCY.green
  const { Icon } = u
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${u.bg} ${u.fg}`}>
      <Icon width={15} height={15} strokeWidth={2.5} />
      {u.label}
    </span>
  )
}

function WorkedMark({ worked }) {
  if (worked === 'yes')
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-routine-bg text-routine-fg">
        <CheckIcon width={12} height={12} strokeWidth={3} />
      </span>
    )
  if (worked === 'no')
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-attention-bg text-attention-fg">
        <XIcon width={12} height={12} strokeWidth={3} />
      </span>
    )
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-watch-bg text-[11px] font-bold text-watch-fg">
      ?
    </span>
  )
}

function Field({ label, children }) {
  return (
    <div className="border-t border-sage-100 pt-3">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
      {children}
    </div>
  )
}

// Renders every field of the AI response. `seeMeds` gates the extracted
// medications list to nurses/family, consistent with the rest of the app
// (the raw transcript still shows the person their own words).
export default function AiResultCard({ transcript, result, seeMeds = true }) {
  if (!result) return null
  const lowConfidence = result.confidence === 'low'

  return (
    <div className={`rounded-[8px] bg-white p-4 shadow-card ${lowConfidence ? 'ring-2 ring-watch-fg/50' : ''}`}>
      {/* Low-confidence: frame the whole card as unconfirmed rather than fact */}
      {lowConfidence && (
        <div className="mb-3 flex items-start gap-2 rounded-[8px] bg-watch-bg p-3">
          <AlertTriangleIcon width={16} height={16} strokeWidth={2} className="mt-0.5 shrink-0 text-watch-fg" />
          <p className="text-[13px] font-semibold leading-snug text-watch-fg">
            AI unsure — please confirm before saving. Read your own words below and correct anything that’s off.
          </p>
        </div>
      )}

      {/* Raw transcript at the top */}
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">What you said</p>
      <InfoPanel as="p" id="ai-transcript-quote" className="mt-1 p-3 text-[13px] font-medium italic leading-snug">
        “{transcript}”
      </InfoPanel>

      {/* Summary + urgency */}
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Summary</p>
          <p className="mt-0.5 text-[15px] font-bold leading-snug text-ink">{result.summary}</p>
        </div>
        <span className="shrink-0">
          <UrgencyBadge urgency={result.urgency} />
        </span>
      </div>
      {result.urgency_reason && (
        <p className="mt-1.5 text-[13px] font-medium leading-snug text-ink/60">{result.urgency_reason}</p>
      )}

      <AiSourceDisclosure
        reasoning={result.reasoning}
        source="Your shift note (see “What you said” above)"
        sourceHref="#ai-transcript-quote"
        confidence={result.confidence}
      />

      <div className="mt-4 space-y-3">
        {result.mood && (
          <Field label="Mood">
            <p className="text-[14px] font-medium capitalize text-ink">{result.mood}</p>
          </Field>
        )}

        {seeMeds && result.medications.length > 0 && (
          <Field label="Medications">
            <ul className="space-y-1.5">
              {result.medications.map((m, i) => (
                <li key={i} className="flex items-center gap-2 text-[14px] font-medium text-ink">
                  <PillIcon width={15} height={15} strokeWidth={2} className="shrink-0 text-clay-500" />
                  <span className="font-bold">{m.name}</span>
                  {m.time && <span className="text-muted">· {m.time}</span>}
                </li>
              ))}
            </ul>
          </Field>
        )}

        {result.interventions.length > 0 && (
          <Field label="Interventions">
            <ul className="space-y-1.5">
              {result.interventions.map((it, i) => (
                <li key={i} className="flex items-center gap-2 text-[14px] font-medium text-ink">
                  <WorkedMark worked={it.worked} />
                  {it.what}
                </li>
              ))}
            </ul>
          </Field>
        )}

        {result.flag_for_next && (
          <Field label="Flag for next shift">
            <div className="flex items-start gap-2 text-ink">
              <FlagIcon width={15} height={15} strokeWidth={2} className="mt-0.5 shrink-0 text-clay-500" />
              <p className="text-[14px] font-medium leading-snug">{result.flag_for_next}</p>
            </div>
          </Field>
        )}
      </div>

      {result._fallback && (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-ink/35">
          <InfoIcon width={12} height={12} strokeWidth={2} />
          Offline demo summary (live AI not connected)
        </p>
      )}
    </div>
  )
}
