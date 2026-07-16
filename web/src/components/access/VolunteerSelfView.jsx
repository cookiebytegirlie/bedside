import { useState } from 'react'
import { ACCESS_TIER_LABELS, shifts as initialShifts } from '../../data/accessScheduleData'
import { formatHour, parseTimeToHours } from '../../utils/time'
import CoordinatorCard from './CoordinatorCard'

function shiftTimeLabel(shift) {
  return `${formatHour(parseTimeToHours(shift.startTime))} – ${formatHour(parseTimeToHours(shift.endTime))}`
}

function ShiftRow({ shift, requestStatus, onSwap, onCantMake }) {
  return (
    <div className="rounded-card border border-line bg-white p-4">
      <p className="text-base font-bold text-ink">{shift.dayOfWeek}</p>
      <p className="text-sm font-semibold text-muted">{shiftTimeLabel(shift)}{shift.recurring ? ' · Weekly' : ''}</p>

      {requestStatus ? (
        <p className="mt-3 inline-block rounded-full bg-watch-bg px-2.5 py-1 text-xs font-bold text-watch-fg">
          {requestStatus === 'swap' ? 'Swap requested — awaiting approval' : "Marked can't make it — awaiting coverage"}
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onSwap(shift.id)}
            className="flex-1 rounded-full border border-sage-200 py-2 text-sm font-bold text-ink"
          >
            Request swap
          </button>
          <button
            type="button"
            onClick={() => onCantMake(shift.id)}
            className="flex-1 rounded-full border border-sage-200 py-2 text-sm font-bold text-attention-fg"
          >
            Can't make it
          </button>
        </div>
      )}
    </div>
  )
}

export default function VolunteerSelfView({ volunteer, coordinator }) {
  const [myShifts] = useState(initialShifts.filter((s) => s.volunteerId === volunteer.id))
  // Stubbed: tapping either action just marks the shift as pending here.
  // TODO: send this to the family side as a real approve/deny request once
  // there's a backend — nothing is auto-approved.
  const [requests, setRequests] = useState({}) // shiftId -> 'swap' | 'cant_make_it'
  const [remindersOn, setRemindersOn] = useState(true)

  const requestSwap = (shiftId) => setRequests((r) => ({ ...r, [shiftId]: 'swap' }))
  const requestCantMake = (shiftId) => setRequests((r) => ({ ...r, [shiftId]: 'cant_make_it' }))

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-xl font-bold text-ink">My upcoming shifts</h2>
        <div className="space-y-2.5">
          {myShifts.length === 0 && (
            <p className="rounded-card border border-line bg-white p-4 text-sm font-medium text-muted">No shifts scheduled right now.</p>
          )}
          {myShifts.map((shift) => (
            <ShiftRow
              key={shift.id}
              shift={shift}
              requestStatus={requests[shift.id]}
              onSwap={requestSwap}
              onCantMake={requestCantMake}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold text-ink">My access level</h2>
        <div className="flex items-center justify-between rounded-card border border-line bg-white p-4">
          <span className="inline-block rounded-full bg-routine-bg px-3 py-1.5 text-sm font-bold text-routine-fg">
            {ACCESS_TIER_LABELS[volunteer.accessTier]}
          </span>
          <span className="text-xs font-semibold text-muted">Set by your coordinator</span>
        </div>
      </section>

      <CoordinatorCard coordinator={coordinator} />

      <section>
        <h2 className="mb-2 text-xl font-bold text-ink">Notifications</h2>
        <button
          type="button"
          onClick={() => setRemindersOn((v) => !v)}
          className="flex w-full items-center justify-between rounded-card border border-line bg-white p-4"
        >
          <span className="text-base font-bold text-ink">Shift reminders</span>
          <span
            className={`relative h-7 w-12 rounded-full transition-colors ${remindersOn ? 'bg-mist' : 'bg-sage-200'}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-card transition-transform ${
                remindersOn ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </span>
        </button>
      </section>
    </div>
  )
}
