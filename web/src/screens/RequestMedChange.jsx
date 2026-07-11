import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useHousehold } from '../state/HouseholdContext'
import { authorizingPhysician, medRequestSupportingRecord, medFrequencyOptions } from '../mockData'
import { isNurse } from '../utils/roles'
import OnDutyHeader from '../components/OnDutyHeader'
import { ArrowLeftIcon, InfoIcon, SparklesIcon, SendIcon, PaperclipIcon, ClockIcon, LockIcon, PillIcon } from '../components/icons'

function NurseOnly({ householdId }) {
  return (
    <>
      <OnDutyHeader />
      <main className="bg-household flex-1 px-5 pt-6">
        <div className="rounded-[7px] bg-white p-6 text-center shadow-card">
          <span className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-sage-100 text-mist">
            <LockIcon width={20} height={20} strokeWidth={2} />
          </span>
          <p className="text-lg font-bold text-ink">Nurses only</p>
          <p className="mt-1 text-sm font-medium leading-snug text-muted">
            Medication-change requests are made by the nurse, who has the authority to consult the physician.
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

export default function RequestMedChange() {
  const { householdId } = useParams()
  const { carePlan, household, activeProfile, addLog } = useHousehold()

  const meds = carePlan.medications
  const defaultMed = meds.find((m) => /lorazepam/i.test(m.name)) || meds[0]
  const [medName, setMedName] = useState(defaultMed.name)
  const [proposed, setProposed] = useState('Every 6 hrs')
  const [rationale, setRationale] = useState('')
  const [sent, setSent] = useState(null) // null | { time }

  if (!isNurse(activeProfile?.role)) return <NurseOnly householdId={householdId} />

  const med = meds.find((m) => m.name === medName) || defaultMed

  const send = () => {
    if (!rationale.trim()) return
    const time = new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    // Documented request only — logged for the record, but the care plan /
    // medication schedule is deliberately NOT mutated. It changes only when
    // the physician authorizes it.
    addLog({
      author: activeProfile?.name ?? 'Nurse',
      type: 'shift-note',
      summary: `Requested ${med.name} titration to ${proposed}. Rationale: ${rationale.trim()}`,
      urgency: 'yellow',
    })
    setSent({ time })
  }

  if (sent) {
    return (
      <>
        <OnDutyHeader />
        <main className="bg-household flex-1 px-5 pb-8 pt-6">
          <h1 className="text-2xl font-bold text-ink">{household.preferredName}’s record</h1>
          <p className="mb-4 text-[13px] font-semibold text-muted">Pending physician review</p>

          <div className="rounded-[7px] bg-watch-bg p-4">
            <div className="mb-1 flex items-center gap-2 text-watch-fg">
              <ClockIcon width={16} height={16} strokeWidth={2} />
              <p className="text-[13px] font-bold">Awaiting {authorizingPhysician}</p>
            </div>
            <p className="text-[13px] font-medium leading-snug text-ink/80">
              {med.name} titration requested · sent {sent.time}. Current schedule stays in effect.
            </p>
          </div>

          <h2 className="mb-2 mt-6 text-xl font-bold text-ink">Logged automatically</h2>
          <div className="space-y-3">
            <div className="rounded-[7px] border-l-4 border-mist bg-white p-4 shadow-card">
              <p className="text-[12px] font-semibold text-muted">{sent.time} · {activeProfile?.name} · Nurse</p>
              <p className="mt-1 text-[14px] font-medium leading-snug text-ink">
                Requested {med.name} titration to {proposed}. Rationale: {rationale.trim()}
              </p>
              <span className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-mist">
                <PaperclipIcon width={13} height={13} strokeWidth={2} />
                Supporting record attached · {medRequestSupportingRecord.length} items
              </span>
            </div>

            <div className="rounded-[7px] border-l-4 border-attention-fg bg-white p-4 shadow-card">
              <p className="text-[12px] font-semibold text-muted">2:04am · Lauren T. · Volunteer</p>
              <p className="mt-1 text-[14px] font-medium leading-snug text-ink">
                Labored breathing and pain. Family gave comfort meds; they didn’t help.
              </p>
              <span className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-attention-fg">
                <InfoIcon width={13} height={13} strokeWidth={2} />
                Nurse notified automatically
              </span>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-[7px] bg-sage-50 p-4">
            <LockIcon width={15} height={15} strokeWidth={2} className="mt-0.5 shrink-0 text-mist" />
            <p className="text-[12px] font-medium leading-snug text-ink/60">
              Under standing comfort-care orders, titration within an approved range may be delegated to the RN.
              Bedside models the conservative path — every change is physician-authorized and documented.
            </p>
          </div>

          <Link
            to={`/household/${householdId}`}
            className="mt-5 block rounded-full bg-mist py-3.5 text-center text-lg font-bold text-white active:scale-[0.98]"
          >
            Done
          </Link>
        </main>
      </>
    )
  }

  return (
    <>
      <OnDutyHeader />
      <main className="bg-household flex-1 px-5 pb-8 pt-6">
        <Link
          to={`/household/${householdId}/settings`}
          aria-label="Back"
          className="mb-2 -ml-1 flex h-9 w-9 items-center justify-center text-muted active:scale-[0.94]"
        >
          <ArrowLeftIcon width={22} height={22} strokeWidth={2} />
        </Link>

        <h1 className="text-2xl font-bold text-ink">Request medication change</h1>
        <p className="mb-4 text-[13px] font-semibold text-muted">Goes to {authorizingPhysician} for authorization</p>

        <div className="mb-5 flex items-start gap-2.5 rounded-[7px] bg-[#e8f0fb] p-4">
          <InfoIcon width={17} height={17} strokeWidth={2} className="mt-0.5 shrink-0 text-[#2b64c4]" />
          <p className="text-[13px] font-medium leading-snug text-[#2b64c4]">
            You can’t change dosing or frequency directly. This sends a documented request to the physician.
          </p>
        </div>

        <label className="mb-1.5 block text-sm font-semibold text-muted">Medication</label>
        <div className="mb-5 flex items-center gap-3 rounded-[7px] bg-white p-4 shadow-card">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay-50 text-clay-500">
            <PillIcon width={17} height={17} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <select
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              className="w-full bg-transparent text-base font-bold text-ink focus:outline-none"
            >
              {meds.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
            <p className="text-[13px] font-semibold text-muted">{med.dose} · {med.schedule}</p>
          </div>
        </div>

        <label className="mb-1.5 block text-sm font-semibold text-muted">Requesting</label>
        <div className="mb-5 flex items-center gap-2">
          <div className="flex-1 rounded-[7px] bg-white p-3 text-center shadow-card">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Current</p>
            <p className="mt-0.5 text-[14px] font-bold leading-tight text-ink">{med.schedule}</p>
          </div>
          <span className="shrink-0 text-mist">→</span>
          <div className="flex-1 rounded-[7px] bg-routine-bg p-3 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wide text-routine-fg">Proposed</p>
            <select
              value={proposed}
              onChange={(e) => setProposed(e.target.value)}
              className="mt-0.5 w-full bg-transparent text-center text-[14px] font-bold text-ink focus:outline-none"
            >
              {medFrequencyOptions.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-5 rounded-[7px] bg-sage-50 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-muted">
            <SparklesIcon width={15} height={15} strokeWidth={2} />
            <p className="text-[12px] font-bold">Bedside attached the supporting record</p>
          </div>
          <ul className="space-y-1">
            {medRequestSupportingRecord.map((r) => (
              <li key={r} className="flex gap-1.5 text-[13px] font-medium text-ink/70">
                <span className="text-mist">·</span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        <label className="mb-1.5 block text-sm font-semibold text-muted">
          Required — your clinical rationale
        </label>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={4}
          placeholder="Breakthrough dosing frequency increasing; requesting titration. Monitor for oversedation."
          className="mb-5 w-full resize-none rounded-[7px] border border-sage-200 bg-white p-3 text-[14px] font-medium text-ink placeholder:text-ink/40 focus:border-mist focus:outline-none"
        />

        <button
          type="button"
          onClick={send}
          disabled={!rationale.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-mist py-3.5 text-lg font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
        >
          <SendIcon width={18} height={18} strokeWidth={2} />
          Send request to {authorizingPhysician}
        </button>
        <p className="mt-3 text-center text-[12px] font-medium leading-snug text-ink/45">
          The plan doesn’t change until {authorizingPhysician} authorizes it. Everyone keeps logging against the current schedule.
        </p>
      </main>
    </>
  )
}
