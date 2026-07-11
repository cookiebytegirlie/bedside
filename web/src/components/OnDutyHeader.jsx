import { useNavigate, useParams } from 'react-router-dom'
import { useHousehold } from '../state/HouseholdContext'
import { formatCountdown, isWithinWindow, minutesUntil, formatMinutesLeft } from '../utils/time'
import { BellIcon, PowerIcon } from './icons'

// White header row shared by the redesigned screens (Timeline, Log New
// Entry) — distinct from the plain TopBar still used by the rest of the
// app. Shows whoever is currently on-duty (a scheduled Volunteer/Aide
// whose shift window is open right now) plus session controls.
export default function OnDutyHeader() {
  const { activeProfile, secondsUntilTimeout } = useHousehold()
  const navigate = useNavigate()
  const { householdId } = useParams()
  const hasOpenShiftWindow =
    activeProfile?.schedule && isWithinWindow(activeProfile.schedule.startHour, activeProfile.schedule.endHour)
  const shiftMinutesLeft = hasOpenShiftWindow ? minutesUntil(activeProfile.schedule.endHour) : null

  return (
    <header className="sticky top-0 z-10 border-b border-sage-100 bg-white px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <div className="mx-auto flex max-w-md items-start justify-between gap-3 lg:max-w-2xl">
        <div className="min-w-0">
          {activeProfile && (
            <p className="text-[10px] font-bold text-routine-fg">
              ON DUTY{shiftMinutesLeft != null ? ` | ${formatMinutesLeft(shiftMinutesLeft)}` : ''}
            </p>
          )}
          <p className="truncate text-xl font-bold text-ink">{activeProfile?.name}</p>
          <p className="truncate text-[13px] font-semibold text-muted">{activeProfile?.role}</p>
        </div>
        {activeProfile && (
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold text-muted">{formatCountdown(secondsUntilTimeout)} until auto logout</p>
            <div className="mt-2 flex items-center justify-end gap-3 text-mist">
              <button type="button" aria-label="Notifications">
                <BellIcon width={22} height={22} strokeWidth={1.8} />
              </button>
              <button
                type="button"
                onClick={() => navigate(`/household/${householdId}/end-shift`)}
                aria-label="End shift"
              >
                <PowerIcon width={22} height={22} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
