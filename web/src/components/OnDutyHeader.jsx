import { useNavigate, useParams } from 'react-router-dom'
import { useHousehold } from '../state/HouseholdContext'
import { canSeeMeds } from '../utils/roles'
import { formatCountdown, isWithinWindow, minutesUntil, formatMinutesLeft } from '../utils/time'
import { householdLogo } from '../assets'
import { BellIcon, PowerIcon } from './icons'

// White header row shared by the redesigned screens (Timeline, Log New
// Entry) — distinct from the plain TopBar still used by the rest of the
// app. Shows whoever is currently on-duty (a scheduled Volunteer/Aide
// whose shift window is open right now) plus session controls.
export default function OnDutyHeader() {
  const { activeProfile, secondsUntilTimeout, unreadNotificationCount } = useHousehold()
  const navigate = useNavigate()
  const { householdId } = useParams()
  // The bell + its unread badge are for the nurse/family audience only,
  // matching the notification center's own role gate.
  const showInbox = canSeeMeds(activeProfile?.role)
  const hasOpenShiftWindow =
    activeProfile?.schedule && isWithinWindow(activeProfile.schedule.startHour, activeProfile.schedule.endHour)
  const shiftMinutesLeft = hasOpenShiftWindow ? minutesUntil(activeProfile.schedule.endHour) : null

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white px-4 pb-4 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
      <div className="relative mx-auto flex max-w-md items-start justify-between gap-3">
        <img
          src={householdLogo}
          alt="Bedside"
          className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-[7px] object-cover"
        />
        <div className="min-w-0">
          {activeProfile && (
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-ink" />
              On duty{shiftMinutesLeft != null ? ` · ${formatMinutesLeft(shiftMinutesLeft)}` : ''}
            </p>
          )}
          <p className="truncate text-[22px] font-semibold tracking-tight text-ink">{activeProfile?.name}</p>
          <p className="truncate text-[13px] font-medium text-muted">{activeProfile?.role}</p>
        </div>
        {activeProfile && (
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-medium text-faint">{formatCountdown(secondsUntilTimeout)} until auto logout</p>
            <div className="mt-2 flex items-center justify-end gap-3 text-ink">
              <button
                type="button"
                aria-label={
                  showInbox && unreadNotificationCount > 0
                    ? `Notifications, ${unreadNotificationCount} unread`
                    : 'Notifications'
                }
                onClick={() => navigate(`/household/${householdId}/inbox`)}
                className="relative"
              >
                <BellIcon width={22} height={22} strokeWidth={1.8} />
                {showInbox && unreadNotificationCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-attention-fg px-1 text-[9px] font-bold leading-none text-white">
                    {unreadNotificationCount}
                  </span>
                )}
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
