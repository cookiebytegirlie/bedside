import { NavLink, useParams } from 'react-router-dom'
import { useHousehold } from '../state/HouseholdContext'
import { formatCountdown } from '../utils/time'
import { profilePhotos } from '../assets'
import { ClockIcon, ClipboardIcon, ChatIcon, IdCardIcon, SettingsIcon, ShieldIcon, CalendarIcon } from './icons'

const TABS = [
  { to: '', label: 'Timeline', icon: ClockIcon, end: true },
  { to: 'log', label: 'Log this shift', icon: ClipboardIcon },
  { to: 'ask', label: 'Ask about care plan', icon: ChatIcon },
  { to: 'info', label: 'Essential info', icon: IdCardIcon },
  { to: 'settings', label: 'Settings', icon: SettingsIcon },
]

export default function Sidebar() {
  const { householdId } = useParams()
  const { household, status, location, activeProfile, switchProfile, secondsUntilTimeout } = useHousehold()
  const base = `/household/${householdId}`

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-72 lg:flex-col lg:border-r lg:border-sage-100 lg:bg-white/70 lg:px-5 lg:py-6">
      <div className="flex items-center gap-3">
        <img src={profilePhotos.ellie} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-ink">{household.preferredName}</p>
          <p className="truncate text-sm font-semibold text-muted">{status} in {location}</p>
        </div>
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-mist">Demo · Synthetic data only</p>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={label}
            to={`${base}${to ? `/${to}` : ''}`}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-3.5 py-3 text-base font-bold transition-colors ${
                isActive ? 'bg-mist text-white' : 'text-ink/70 hover:bg-sage-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon width={19} height={19} strokeWidth={isActive ? 2.2 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {activeProfile?.role === 'Family' && (
        <NavLink
          to={`${base}/access`}
          className={({ isActive }) =>
            `mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              isActive ? 'bg-sage-100 text-mist' : 'text-muted hover:bg-sage-100 hover:text-mist'
            }`
          }
        >
          <CalendarIcon width={15} height={15} strokeWidth={2} />
          Volunteer access
        </NavLink>
      )}

      <NavLink
        to={`${base}/privacy`}
        className={({ isActive }) =>
          `mb-2 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
            isActive ? 'bg-sage-100 text-mist' : 'text-muted hover:bg-sage-100 hover:text-mist'
          }`
        }
      >
        <ShieldIcon width={15} height={15} strokeWidth={2} />
        Privacy &amp; security
      </NavLink>

      {activeProfile && (
        <button
          type="button"
          onClick={switchProfile}
          className="flex items-center gap-3 rounded-2xl bg-sage-50 px-3.5 py-3 text-left transition-colors hover:bg-sage-100"
        >
          {profilePhotos[activeProfile.id] ? (
            <img src={profilePhotos[activeProfile.id]} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-200 text-xs font-bold text-mist">
              {activeProfile.initials}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-ink">{activeProfile.name}</span>
            <span className="block text-xs font-semibold text-muted">{formatCountdown(secondsUntilTimeout)} · Switch profile</span>
          </span>
        </button>
      )}
    </aside>
  )
}
