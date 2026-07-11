import { useHousehold } from '../state/HouseholdContext'
import { formatCountdown } from '../utils/time'
import { profilePhotos } from '../assets'

export default function TopBar({ title, subtitle }) {
  const { household, status, location, activeProfile, switchProfile, secondsUntilTimeout } = useHousehold()
  return (
    <header className="sticky top-0 z-10 border-b border-sage-100 bg-white/80 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-3 lg:max-w-2xl">
        <img
          src={profilePhotos.ellie}
          alt=""
          className="h-11 w-11 shrink-0 rounded-full object-cover lg:hidden"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold leading-tight text-ink lg:text-xl">
            {title || household.preferredName}
          </p>
          <p className="truncate text-sm font-semibold text-muted">
            {subtitle || `${status} in ${location}`}
          </p>
        </div>
        {activeProfile && (
          <button
            type="button"
            onClick={switchProfile}
            className="shrink-0 rounded-full bg-white px-3.5 py-2 text-left shadow-card active:scale-[0.97] lg:hidden"
          >
            <span className="block text-sm font-bold leading-tight text-ink">{activeProfile.name}</span>
            <span className="block text-xs font-semibold leading-tight text-muted">
              {formatCountdown(secondsUntilTimeout)} · Switch
            </span>
          </button>
        )}
      </div>
    </header>
  )
}
