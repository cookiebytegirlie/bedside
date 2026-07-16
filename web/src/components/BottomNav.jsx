import { NavLink, useParams } from 'react-router-dom'
import { ClockIcon, ClipboardIcon, ChatIcon, SettingsIcon, IdCardIcon } from './icons'

const TABS = [
  { to: '', label: 'Timeline', icon: ClockIcon, end: true },
  { to: 'log', label: 'Log', icon: ClipboardIcon },
  { to: 'ask', label: 'Ask', icon: ChatIcon },
  { to: 'info', label: 'Info', icon: IdCardIcon },
  { to: 'settings', label: 'Settings', icon: SettingsIcon },
]

export default function BottomNav() {
  const { householdId } = useParams()
  const base = `/household/${householdId}`

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-line bg-white/90 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={label}
            to={`${base}${to ? `/${to}` : ''}`}
            end={end}
            className={({ isActive }) =>
              `flex min-h-[44px] flex-1 flex-col items-center gap-1 py-2 text-[11px] tracking-tight transition-colors ${
                isActive ? 'font-semibold text-ink' : 'font-medium text-faint'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon strokeWidth={isActive ? 2.2 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
