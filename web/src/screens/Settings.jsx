import { useParams, Link } from 'react-router-dom'
import { useHousehold } from '../state/HouseholdContext'
import { canSeeMeds, isNurse } from '../utils/roles'
import OnDutyHeader from '../components/OnDutyHeader'
import { CalendarIcon, ChevronRightIcon, PillIcon, FileTextIcon, ClipboardIcon } from '../components/icons'

function SettingRow({ to, icon: Icon, title, subtitle }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card active:scale-[0.98]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-100 text-mist">
        <Icon width={17} height={17} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-ink">{title}</span>
        {subtitle && <span className="block text-sm font-semibold text-muted">{subtitle}</span>}
      </span>
      <ChevronRightIcon width={18} height={18} strokeWidth={2.5} className="shrink-0 text-mist" />
    </Link>
  )
}

export default function Settings() {
  const { householdId } = useParams()
  const { activeProfile } = useHousehold()
  const base = `/household/${householdId}`
  const nurse = isNurse(activeProfile?.role)
  const clinical = canSeeMeds(activeProfile?.role) // nurse or family

  return (
    <>
      <OnDutyHeader />
      <main className="flex-1 px-5 py-5">
        <h1 className="mb-5 text-center text-2xl font-bold text-ink">Settings</h1>

        <SettingRow
          to={`${base}/settings/access`}
          icon={CalendarIcon}
          title="Volunteer access & schedule"
          subtitle="Manage volunteers, shifts, and coverage"
        />

        {/* Clinical tools — nurses and family only. Volunteers see nothing here.
            Medication changes are further restricted to nurses. */}
        {clinical && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Clinical tools</h2>
            <div className="space-y-2.5">
              {nurse && (
                <SettingRow
                  to={`${base}/settings/request-med`}
                  icon={PillIcon}
                  title="Request medication change"
                  subtitle="Sends a documented request to the physician"
                />
              )}
              <SettingRow
                to={`${base}/settings/action/schedule`}
                icon={CalendarIcon}
                title="Request schedule change"
                subtitle="Goes to the household owner"
              />
              <SettingRow
                to={`${base}/settings/action/care-plan`}
                icon={FileTextIcon}
                title="Update care plan"
                subtitle="Shared with the care team"
              />
              <SettingRow
                to={`${base}/settings/action/note`}
                icon={ClipboardIcon}
                title="Add clinical note"
                subtitle="Added to the timeline"
              />
            </div>
          </section>
        )}
      </main>
    </>
  )
}
