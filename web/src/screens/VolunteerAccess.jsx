import { useState } from 'react'
import { useHousehold } from '../state/HouseholdContext'
import { hoursToTimeString, parseTimeToHours, formatWindow } from '../utils/time'
import TopBar from '../components/TopBar'
import { CalendarIcon, RefreshIcon } from '../components/icons'

function ScheduleEditor({ title, description, startHour, endHour, onSave }) {
  const [start, setStart] = useState(hoursToTimeString(startHour))
  const [end, setEnd] = useState(hoursToTimeString(endHour))
  const [saved, setSaved] = useState(false)

  const dirty = start !== hoursToTimeString(startHour) || end !== hoursToTimeString(endHour)

  const save = () => {
    onSave({ startHour: parseTimeToHours(start), endHour: parseTimeToHours(end) })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="rounded-4xl bg-white p-5 shadow-card">
      <p className="text-base font-bold text-ink">{title}</p>
      <p className="mt-0.5 text-sm font-medium text-muted">{description}</p>

      <div className="mt-3 flex items-center gap-3">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">Starts</span>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full rounded-2xl border border-sage-200 px-3 py-2.5 text-base font-semibold text-ink focus:border-mist focus:outline-none"
          />
        </label>
        <label className="flex-1">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">Ends</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full rounded-2xl border border-sage-200 px-3 py-2.5 text-base font-semibold text-ink focus:border-mist focus:outline-none"
          />
        </label>
      </div>

      <p className="mt-2 text-sm font-semibold text-muted">Currently {formatWindow(startHour, endHour)}</p>

      <button
        type="button"
        onClick={save}
        disabled={!dirty}
        className="mt-3 w-full rounded-full bg-mist py-3 text-base font-bold text-white disabled:opacity-40"
      >
        {saved ? 'Saved' : 'Save shift window'}
      </button>
    </div>
  )
}

function NotAllowed() {
  return (
    <>
      <TopBar title="Volunteer access" subtitle="Primary caregivers only" />
      <main className="flex-1 px-5 py-5">
        <div className="rounded-4xl bg-clay-50 p-5 text-base font-medium text-ink/70 shadow-card">
          Only primary caregivers can manage volunteer shift access. Ask Daniel to make changes here.
        </div>
      </main>
    </>
  )
}

export default function VolunteerAccess() {
  const { activeProfile, profiles, generalSlot, generalCode, updateProfileSchedule, updateGeneralSlot, regenerateGeneralCode } =
    useHousehold()

  if (activeProfile?.role !== 'Family') return <NotAllowed />

  const scheduledProfiles = profiles.filter((p) => p.schedule)

  return (
    <>
      <TopBar title="Volunteer access" subtitle="Set when volunteers can sign in" />
      <main className="flex-1 px-5 py-5">
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-xl font-bold text-ink">
            <CalendarIcon width={17} height={17} strokeWidth={2} />
            Volunteers / aides
          </h2>
          <div className="space-y-2.5">
            {scheduledProfiles.map((p) => (
              <ScheduleEditor
                key={p.id}
                title={`${p.name}'s shift`}
                description={`Their PIN only works during this window — outside it, sign-in is blocked and any open session ends automatically.`}
                startHour={p.schedule.startHour}
                endHour={p.schedule.endHour}
                onSave={(schedule) => updateProfileSchedule(p.id, schedule)}
              />
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-xl font-bold text-ink">General coverage slot</h2>
          <ScheduleEditor
            title="Coverage window"
            description="Any covering volunteer/aide can sign in during this window with the code below, without a standing profile."
            startHour={generalSlot.startHour}
            endHour={generalSlot.endHour}
            onSave={updateGeneralSlot}
          />

          <div className="mt-2.5 rounded-4xl bg-white p-5 shadow-card">
            <p className="text-base font-bold text-ink">Current one-time code</p>
            <p className="mt-0.5 text-sm font-medium text-muted">Share this with whoever's covering — it won't work outside the window above.</p>
            <p className="mt-3 text-center text-3xl font-bold tracking-[0.3em] text-mist">{generalCode}</p>
            <button
              type="button"
              onClick={regenerateGeneralCode}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-sage-200 py-3 text-base font-bold text-muted"
            >
              <RefreshIcon width={16} height={16} strokeWidth={2} />
              Generate new code
            </button>
          </div>
        </section>
      </main>
    </>
  )
}
