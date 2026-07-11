import { useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { useHousehold } from '../state/HouseholdContext'
import { canSeeMeds } from '../utils/roles'
import OnDutyHeader from '../components/OnDutyHeader'
import { ArrowLeftIcon, InfoIcon, SendIcon, CheckIcon, LockIcon } from '../components/icons'

// Documented, non-destructive clinical actions available to nurses and family.
// Each logs an entry to the timeline; none mutate the care plan directly.
const KINDS = {
  schedule: {
    title: 'Request schedule change',
    subtitle: 'Goes to the household owner',
    info: 'This sends a documented request. The current schedule stays in effect until it’s approved.',
    placeholder: 'Which shift, and what change are you requesting?',
    button: 'Send request',
    logPrefix: 'Requested a schedule change',
    done: 'Request sent',
    urgency: 'green',
  },
  'care-plan': {
    title: 'Update care plan',
    subtitle: 'Shared with the care team',
    info: 'Care-plan updates are documented and visible to the whole care team.',
    placeholder: 'What should change in the care plan, and why?',
    button: 'Save update',
    logPrefix: 'Proposed a care-plan update',
    done: 'Update logged',
    urgency: 'green',
  },
  note: {
    title: 'Add clinical note',
    subtitle: 'Added to the timeline',
    info: 'Adds a clinical note to the record for the whole care team.',
    placeholder: 'Write your clinical note…',
    button: 'Add note',
    logPrefix: null, // note text stands on its own
    done: 'Note added',
    urgency: 'green',
  },
}

function StaffOnly({ householdId }) {
  return (
    <>
      <OnDutyHeader />
      <main className="bg-white flex-1 px-5 pt-6">
        <div className="rounded-[8px] bg-white p-6 text-center shadow-card">
          <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-sage-100 text-mist">
            <LockIcon width={20} height={20} strokeWidth={2} />
          </span>
          <p className="text-lg font-bold text-ink">Not available</p>
          <p className="mt-1 text-sm font-medium leading-snug text-muted">
            Clinical tools are available to nurses and family only.
          </p>
          <Link
            to={`/household/${householdId}`}
            className="mt-4 inline-block rounded-full bg-mist px-5 py-2.5 text-sm font-bold text-white"
          >
            Back to timeline
          </Link>
        </div>
      </main>
    </>
  )
}

export default function ClinicalRequest() {
  const { householdId, kind } = useParams()
  const { activeProfile, addLog } = useHousehold()
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)

  const config = KINDS[kind]
  if (!config) return <Navigate to={`/household/${householdId}/settings`} replace />
  if (!canSeeMeds(activeProfile?.role)) return <StaffOnly householdId={householdId} />

  const submit = () => {
    if (!text.trim()) return
    addLog({
      author: activeProfile?.name ?? 'You',
      type: 'shift-note',
      summary: config.logPrefix ? `${config.logPrefix}: ${text.trim()}` : text.trim(),
      urgency: config.urgency,
    })
    setDone(true)
  }

  if (done) {
    return (
      <>
        <OnDutyHeader />
        <main className="bg-white flex-1 px-5 pt-6">
          <div className="rounded-[8px] bg-white p-6 text-center shadow-card">
            <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-routine-bg text-routine-fg">
              <CheckIcon width={22} height={22} strokeWidth={2.5} />
            </span>
            <p className="text-lg font-bold text-ink">{config.done}</p>
            <p className="mt-1 text-sm font-medium leading-snug text-muted">
              Logged to the timeline for the care team. This is a documented record — it doesn’t change the care
              plan on its own.
            </p>
            <Link
              to={`/household/${householdId}`}
              className="mt-4 inline-block rounded-full bg-mist px-5 py-2.5 text-sm font-bold text-white"
            >
              Done
            </Link>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <OnDutyHeader />
      <main className="bg-white flex-1 px-5 pb-8 pt-6">
        <Link
          to={`/household/${householdId}/settings`}
          aria-label="Back"
          className="mb-2 -ml-1 flex h-9 w-9 items-center justify-center text-muted active:scale-[0.94]"
        >
          <ArrowLeftIcon width={22} height={22} strokeWidth={2} />
        </Link>

        <h1 className="text-2xl font-bold text-ink">{config.title}</h1>
        <p className="mb-4 text-[13px] font-semibold text-muted">{config.subtitle}</p>

        <div className="mb-5 flex items-start gap-2.5 rounded-[8px] bg-[#e8f0fb] p-4">
          <InfoIcon width={17} height={17} strokeWidth={2} className="mt-0.5 shrink-0 text-[#2b64c4]" />
          <p className="text-[13px] font-medium leading-snug text-[#2b64c4]">{config.info}</p>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder={config.placeholder}
          className="mb-5 w-full resize-none rounded-[8px] border border-sage-200 bg-white p-3 text-[14px] font-medium text-ink placeholder:text-ink/40 focus:border-mist focus:outline-none"
        />

        <button
          type="button"
          onClick={submit}
          disabled={!text.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-mist py-3.5 text-lg font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
        >
          <SendIcon width={18} height={18} strokeWidth={2} />
          {config.button}
        </button>
      </main>
    </>
  )
}
