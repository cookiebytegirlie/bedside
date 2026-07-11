import { Link, useParams } from 'react-router-dom'
import { useHousehold } from '../state/HouseholdContext'
import TopBar from '../components/TopBar'
import { PillIcon, PhoneIcon, ShieldIcon, CalendarIcon } from '../components/icons'

function telHref(phone) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

function Section({ title, children }) {
  return (
    <section className="mt-6 first:mt-0">
      <h2 className="mb-2 text-xl font-bold text-ink">{title}</h2>
      {children}
    </section>
  )
}

function ContactRow({ name, role, phone, availability }) {
  return (
    <a
      href={telHref(phone)}
      className="flex items-center gap-3 rounded-4xl bg-white px-5 py-4 shadow-card active:scale-[0.98]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-100 text-mist">
        <PhoneIcon width={17} height={17} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-ink">{name}</span>
        <span className="block text-sm font-semibold text-muted">
          {role}
          {availability ? ` · ${availability}` : ''}
        </span>
      </span>
      <span className="shrink-0 text-sm font-bold text-mist">{phone}</span>
    </a>
  )
}

export default function EssentialInfo() {
  const { householdId } = useParams()
  const { carePlan, contacts, activeProfile } = useHousehold()
  const isClinicalRole = /nurse|family/i.test(activeProfile?.role || '')

  return (
    <>
      <TopBar title="Essential information" subtitle="Everything at a glance — updated regularly" />
      <main className="flex-1 px-5 py-5">
        <div className="flex items-start gap-2.5 rounded-4xl bg-sage-50 p-4 shadow-card">
          <ShieldIcon width={16} height={16} strokeWidth={2} className="mt-0.5 shrink-0 text-mist" />
          <p className="text-sm font-medium leading-snug text-ink/70">
            Viewing as <strong className="font-bold text-ink">{activeProfile?.role}</strong> —{' '}
            {isClinicalRole
              ? 'full clinical detail is shown.'
              : "showing task-level info only. Dosing detail, preferences, and code status are limited to nurses and family, per HIPAA's minimum-necessary standard."}
          </p>
        </div>

        {isClinicalRole && (
          <div className="mt-4 rounded-4xl bg-clay-50 p-5 shadow-card">
            <p className="text-xs font-bold uppercase tracking-wide text-clay-600">Code status</p>
            <p className="mt-1 text-base font-medium text-ink">{carePlan.codeStatus}</p>
          </div>
        )}

        <Section title="Allergies">
          <div className="flex flex-wrap gap-2">
            {carePlan.allergies.map((a) => (
              <span
                key={a}
                className="rounded-full bg-attention-bg px-4 py-1.5 text-sm font-bold text-attention-fg"
              >
                {a}
              </span>
            ))}
          </div>
        </Section>

        {/* Medications are limited to nurses and family — volunteers/aides
            (and other non-clinical roles) don't see this section at all. */}
        {isClinicalRole && (
          <Section title="Medications">
            <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-2.5 lg:space-y-0">
              {carePlan.medications.map((med) => (
                <div key={med.name} className="flex items-start gap-3 rounded-4xl bg-white p-4 shadow-card">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay-50 text-clay-500">
                    <PillIcon width={17} height={17} strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold text-ink">{med.name}</span>
                    <span className="block text-sm font-semibold text-muted">{med.dose} · {med.schedule}</span>
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {isClinicalRole && (
          <Section title="Preferences">
            <ul className="space-y-2 rounded-4xl bg-white p-5 shadow-card">
              {carePlan.preferences.map((p) => (
                <li key={p} className="flex gap-2 text-base font-medium text-ink/80">
                  <span className="text-mist">•</span>
                  {p}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Routines">
          <ul className="space-y-2 rounded-4xl bg-white p-5 shadow-card">
            {carePlan.routines.map((r) => (
              <li key={r} className="flex gap-2 text-base font-medium text-ink/80">
                <span className="text-mist">•</span>
                {r}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Hospice team">
          <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-2.5 lg:space-y-0">
            {contacts.hospiceTeam.map((c) => (
              <ContactRow key={c.name} {...c} />
            ))}
          </div>
        </Section>

        <Section title="Family">
          <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-2.5 lg:space-y-0">
            {contacts.family.map((c) => (
              <ContactRow key={c.name} {...c} />
            ))}
          </div>
        </Section>

        <p className="mt-6 text-center text-sm font-semibold text-ink/30">
          Care plan last updated {new Date(carePlan.updatedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        {activeProfile?.role === 'Family' && (
          <Link
            to={`/household/${householdId}/access`}
            className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-muted hover:text-mist"
          >
            <CalendarIcon width={13} height={13} strokeWidth={2} />
            Manage volunteer access
          </Link>
        )}
        <Link
          to={`/household/${householdId}/privacy`}
          className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-muted hover:text-mist"
        >
          <ShieldIcon width={13} height={13} strokeWidth={2} />
          Privacy &amp; security practices
        </Link>
      </main>
    </>
  )
}
