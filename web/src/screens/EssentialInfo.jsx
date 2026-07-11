import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useHousehold } from '../state/HouseholdContext'
import { authorizingPhysician, visitDigest, carePlanDocument } from '../mockData'
import { isNurse } from '../utils/roles'
import OnDutyHeader from '../components/OnDutyHeader'
import InfoPanel from '../components/InfoPanel'
import CarePlanLink from '../components/CarePlanLink'
import { PillIcon, PhoneIcon, ShieldIcon, CalendarIcon, ChevronRightIcon, CheckIcon, XIcon } from '../components/icons'

const SIGNED_DATE_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function telHref(phone) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

// First name for the bio toggle label — skips a leading title like "Dr." so
// "Dr. Sam Okafor" reads as "About Dr. Okafor", not "About Dr."
function firstName(fullName) {
  const parts = fullName.split(' ')
  return /^(dr|mr|mrs|ms)\.?$/i.test(parts[0]) ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0]
}

// "12 Mar 2026" — spelled out manually rather than toLocaleDateString, whose
// default locale ordering (e.g. "Mar 12, 2026" in en-US) doesn't match the
// day-month-year format a signed legal document is shown in.
function formatSignedDate(iso) {
  const d = new Date(iso)
  return `${d.getDate()} ${SIGNED_DATE_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function formatLastGiven(iso) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Swaps the last space for a non-breaking one so the final two words of a
// paragraph never split across lines (a "widow"), for browsers that don't
// yet honor text-wrap: pretty.
function noWidow(text) {
  const idx = text.lastIndexOf(' ')
  return idx === -1 ? text : `${text.slice(0, idx)} ${text.slice(idx + 1)}`
}

// Loosely matches a logged medication-given entry to a care-plan medication
// by first word (e.g. seed logs record "Morphine", the care plan lists
// "Morphine (oral solution)") and returns the most recent timestamp, or null
// if this medication has never been logged as given.
function lastGivenFor(medName, logs) {
  const key = medName.split(' ')[0].toLowerCase()
  const matches = logs.filter((l) => l.medicationGiven?.name?.toLowerCase().includes(key))
  if (!matches.length) return null
  return matches.reduce((latest, l) => (new Date(l.timestamp) > new Date(latest.timestamp) ? l : latest)).timestamp
}

// A section is always visible in full — only detail *within* an item can be
// tucked behind an expand toggle (see ExpandToggle below). `id` is kept for
// anchor scrolling from "How we know this" links elsewhere in the app.
function Section({ id, title, children }) {
  return (
    <section id={id} className="mt-4 rounded-[8px] bg-white p-4 shadow-card">
      <h2 className="text-lg font-bold text-ink">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}

// Small expand affordance for a single item inside an always-visible
// section — same chevron-rotate interaction as MeetEllie's DayPanel, just
// scoped to one row instead of a whole panel.
function ExpandToggle({ open, onToggle, label }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={label}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-mist active:scale-90"
    >
      <ChevronRightIcon width={15} height={15} strokeWidth={2.5} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
    </button>
  )
}

// One preference/routine row: the summary line always shows; a toggle
// reveals a fuller list of steps (plus an optional "Watch for" callout)
// underneath.
function DetailItem({ summary, detail }) {
  const [open, setOpen] = useState(false)
  const expanded = open && detail
  return (
    <li>
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1 text-base font-semibold text-ink">{summary}</span>
        {detail && (
          <ExpandToggle open={open} onToggle={() => setOpen((o) => !o)} label={open ? 'Hide detail' : 'Show detail'} />
        )}
      </div>
      {expanded && (
        <div className="mt-1.5 space-y-1.5">
          <ul className="space-y-1 rounded-none border-l-2 border-sage-300 pl-5 text-[13px] leading-snug text-ink">
            {detail.steps.map((step, i) => (
              <li key={i} className="[text-wrap:pretty]">
                {noWidow(step)}
              </li>
            ))}
          </ul>
          {detail.watchFor && (
            <p className="rounded-[8px] border border-watch-fg/50 px-2.5 py-2 text-[13px] leading-snug text-ink/80 [text-wrap:pretty]">
              <span className="font-bold text-ink">Watch for:</span> {noWidow(detail.watchFor)}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

// One medication card: name, dose, and schedule always show. The toggle
// reveals administration directions, who authorizes dosing changes, and
// the PRN/Scheduled badge.
function MedicationItem({ med, lastGiven }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="py-3 first:pt-0">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay-50 text-clay-500">
          <PillIcon width={17} height={17} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold text-ink">{med.name}</span>
          <span className="block text-sm font-semibold text-muted">
            {med.dose} · {med.schedule}
          </span>
          {lastGiven && (
            <span className="block text-xs font-semibold text-ink/50">Last given {formatLastGiven(lastGiven)}</span>
          )}
        </span>
        <ExpandToggle open={open} onToggle={() => setOpen((o) => !o)} label={open ? 'Hide details' : 'Show details'} />
      </div>
      {open && (
        <InfoPanel nested className="space-y-2 p-3">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              med.type === 'prn' ? 'bg-clay-50 text-clay-600' : 'bg-white text-mist'
            }`}
          >
            {med.type === 'prn' ? 'PRN' : 'Scheduled'}
          </span>
          {med.directions && <p className="text-[13px] font-medium leading-snug [text-wrap:pretty]">{med.directions}</p>}
          <p className="text-[13px] font-semibold">Dosing changes are authorized by {authorizingPhysician}.</p>
        </InfoPanel>
      )}
    </div>
  )
}

function ContactRow({ name, role, phone, availability }) {
  return (
    <a href={telHref(phone)} className="flex items-center gap-3 px-4 py-3.5 active:scale-[0.98]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-mist">
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

// ContactRow and the bio toggle share one rounded sage container so the bio
// reads as nested detail of the contact, not a separate card below it.
function ContactCard({ contact }) {
  const [open, setOpen] = useState(false)
  return (
    <InfoPanel className="overflow-hidden">
      <ContactRow {...contact} />
      {contact.bio && (
        <InfoPanel nested>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex w-full items-center gap-2 px-4 py-2 text-left"
          >
            <span className="text-[12px] font-bold text-mist">{open ? 'Hide bio' : `About ${firstName(contact.name)}`}</span>
            <ChevronRightIcon
              width={13}
              height={13}
              strokeWidth={2.5}
              className={`ml-auto shrink-0 text-mist transition-transform ${open ? 'rotate-90' : ''}`}
            />
          </button>
          {open && <p className="px-4 pb-3 text-[13px] font-medium leading-snug [text-wrap:pretty]">{contact.bio}</p>}
        </InfoPanel>
      )}
    </InfoPanel>
  )
}

export default function EssentialInfo() {
  const { householdId } = useParams()
  const location = useLocation()
  const { carePlan, contacts, activeProfile, logs } = useHousehold()
  const isClinicalRole = /nurse|family/i.test(activeProfile?.role || '')

  // "How we know this" links elsewhere in the app route here with a
  // `#section-id` hash. React Router navigates via history.pushState, which
  // (unlike a real anchor click) doesn't trigger the browser's native
  // scroll-to-fragment — so it's handled explicitly on arrival.
  useEffect(() => {
    if (!location.hash) return
    const target = document.getElementById(location.hash.slice(1))
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash])

  return (
    <>
      <OnDutyHeader />
      <main className="flex-1 px-5 py-5">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-ink">Essential information</h1>
          <p className="mt-1 text-sm font-semibold text-muted">Everything at a glance — updated regularly</p>
        </div>

        <div className="mb-4">
          <CarePlanLink
            to={`/household/${householdId}/care-plan-doc`}
            fileName={carePlanDocument.fileName}
            lastUpdated={carePlanDocument.lastUpdated}
          />
        </div>

        <InfoPanel className="flex items-start gap-2.5 p-4 shadow-card">
          <ShieldIcon width={16} height={16} strokeWidth={2} className="mt-0.5 shrink-0 text-mist" />
          <p className="text-sm font-medium leading-snug">
            Viewing as <strong className="font-bold">{activeProfile?.role}</strong> —{' '}
            {isClinicalRole
              ? 'full clinical detail is shown.'
              : "showing task-level info only. Dosing detail, preferences, and code status are limited to nurses and family, per HIPAA's minimum-necessary standard."}
          </p>
        </InfoPanel>

        {isClinicalRole && (
          <div id="code-status" className="mt-4 rounded-4xl bg-clay-50 p-5 shadow-card">
            <p className="text-xs font-bold uppercase tracking-wide text-clay-600">Code status</p>
            <p className="mt-1 text-base font-medium text-ink">{carePlan.codeStatus}</p>
            <p className="mt-2 text-sm font-semibold text-clay-600">
              Signed {formatSignedDate(carePlan.codeStatusSignedAt)} · Authorized by {authorizingPhysician}
            </p>
          </div>
        )}

        <Section id="allergies" title="Allergies">
          <div className="flex flex-wrap gap-2">
            {carePlan.allergies.map((a) => (
              <span key={a} className="rounded-full bg-attention-bg px-4 py-1.5 text-sm font-bold text-attention-fg">
                {a}
              </span>
            ))}
          </div>
        </Section>

        {/* Medications are limited to nurses and family — volunteers/aides
            (and other non-clinical roles) don't see this section at all. */}
        {isClinicalRole && (
          <Section id="medications" title="Medications">
            <div className="divide-y divide-sage-100">
              {carePlan.medications.map((med) => (
                <MedicationItem key={med.name} med={med} lastGiven={lastGivenFor(med.name, logs)} />
              ))}
            </div>

            <InfoPanel as="p" className="p-3 text-[13px] font-medium leading-snug">
              Dosing changes are authorized by {authorizingPhysician}.{' '}
              {isNurse(activeProfile?.role) ? (
                <Link to={`/household/${householdId}/settings/request-med`} className="font-bold text-mist">
                  Request a change
                </Link>
              ) : (
                'You can request a change.'
              )}
            </InfoPanel>
          </Section>
        )}

        {isClinicalRole && (
          <Section id="preferences" title="Preferences">
            <ul className="space-y-2">
              {carePlan.preferences.map((p) => (
                <DetailItem key={p.summary} summary={p.summary} detail={p.detail} />
              ))}
            </ul>
          </Section>
        )}

        {isClinicalRole && (
          <Section id="care-plan" title="Care plan">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">What settles her</p>
              <ul className="space-y-2">
                {carePlan.comfortMeasures.map((m) => (
                  <li key={m} className="flex gap-2 text-base font-medium text-ink/80">
                    <span className="text-mist">•</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-sage-100 pt-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">What's working</p>
              <div className="space-y-2">
                {visitDigest.working.map((w) => (
                  <div key={w.label} className="flex items-center gap-2.5">
                    {w.status === 'yes' && (
                      <CheckIcon width={16} height={16} strokeWidth={2.5} className="shrink-0 text-routine-fg" />
                    )}
                    {w.status === 'no' && (
                      <XIcon width={16} height={16} strokeWidth={2.5} className="shrink-0 text-attention-fg" />
                    )}
                    {w.status === 'mixed' && (
                      <span className="h-3 w-3 shrink-0 rounded-full border-2 border-watch-fg" />
                    )}
                    <span className="text-[14px] font-medium text-ink">{w.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>
        )}

        <Section id="routines" title="Routines">
          <ul className="space-y-2">
            {carePlan.routines.map((r) => (
              <DetailItem key={r.summary} summary={r.summary} detail={r.detail} />
            ))}
          </ul>
        </Section>

        <Section id="hospice-team" title="Hospice team">
          <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-2.5 lg:space-y-0">
            {contacts.hospiceTeam.map((c) => (
              <ContactCard key={c.name} contact={c} />
            ))}
          </div>
        </Section>

        <Section id="family" title="Family">
          <div className="space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-2.5 lg:space-y-0">
            {contacts.family.map((c) => (
              <ContactCard key={c.name} contact={c} />
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
