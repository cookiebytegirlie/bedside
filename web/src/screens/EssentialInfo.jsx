import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useHousehold } from '../state/HouseholdContext'
import { authorizingPhysician, carePlanDocument } from '../mockData'
import { isNurse } from '../utils/roles'
import OnDutyHeader from '../components/OnDutyHeader'
import InfoPanel from '../components/InfoPanel'
import CarePlanLink from '../components/CarePlanLink'
import { PillIcon, PhoneIcon, ShieldIcon, CalendarIcon, ChevronRightIcon } from '../components/icons'

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
    <section id={id} className="mt-4 rounded-card border border-line bg-white p-4">
      <h2 className="text-[17px] font-semibold tracking-tight text-ink">{title}</h2>
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
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink active:scale-90"
    >
      <ChevronRightIcon width={15} height={15} strokeWidth={2.5} className={`transition-transform ${open ? 'rotate-90' : ''}`} />
    </button>
  )
}

// One preference/routine row: the summary line always shows; a toggle
// reveals a fuller list of steps (plus an optional "Watch for" callout)
// underneath. `preference` surfaces the same tag used on the timeline, for the
// preferences that aren't tied to a time of day (e.g. what she's called).
function DetailItem({ summary, detail, preference }) {
  const [open, setOpen] = useState(false)
  const expanded = open && detail
  return (
    <li>
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1">
          {preference && (
            <span className="mb-1.5 block">
              <PreferenceTag />
            </span>
          )}
          <span className="text-base font-semibold text-ink">{summary}</span>
        </span>
        {detail && (
          <ExpandToggle open={open} onToggle={() => setOpen((o) => !o)} label={open ? 'Hide detail' : 'Show detail'} />
        )}
      </div>
      {expanded && (
        <div className="mt-2 space-y-3">
          <ul className="list-disc space-y-2.5 pl-[17px] text-[14px] leading-relaxed text-ink/90 marker:text-faint">
            {detail.steps.map((step, i) => (
              <li key={i} className="pl-1 [text-wrap:pretty]">
                {noWidow(step)}
              </li>
            ))}
          </ul>
          {detail.watchFor && (
            <p className="rounded-card border border-watch-solid/50 px-3 py-2.5 text-[14px] leading-relaxed text-ink/90 [text-wrap:pretty]">
              <span className="font-bold text-ink">Watch for:</span> {noWidow(detail.watchFor)}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

// Marks an item that reflects one of Ellie's stated preferences (as opposed to
// a clinical task). Now that Preferences and Routines are one section, this is
// how a preference stays visible in place instead of living in its own list.
function PreferenceTag() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-routine-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-routine-fg">
      <span className="h-1.5 w-1.5 rounded-full bg-routine-dot" />
      Preference
    </span>
  )
}

// One stop on the daily-routine timeline. Time + title always show; a chevron
// reveals the fuller steps (and an optional "Watch for" callout) underneath.
// The connector line is drawn from this node's center down past the row gap to
// the next node's center, so it stays continuous no matter how tall the row —
// the next node's white fill masks the overlap. Suppressed on the last item.
function RoutineItem({ item, last }) {
  const [open, setOpen] = useState(false)
  const hasDetail = Boolean(item.detail && (item.detail.steps?.length || item.detail.watchFor))
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last && <span className="absolute left-[11px] top-3.5 -bottom-3.5 z-0 w-px bg-line" />}
      <span
        className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-white ${
          item.preference ? 'border-routine-dot/50' : 'border-line'
        }`}
      >
        <span className={`rounded-full ${item.preference ? 'h-2.5 w-2.5 bg-routine-solid' : 'h-2 w-2 bg-ink/60'}`} />
      </span>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => hasDetail && setOpen((o) => !o)}
          aria-expanded={hasDetail ? open : undefined}
          className={`flex w-full items-start gap-2 text-left ${hasDetail ? '' : 'cursor-default'}`}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-semibold uppercase tracking-wide text-muted">{item.time}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[15px] font-semibold tracking-tight text-ink">{item.title}</span>
              {item.preference && <PreferenceTag />}
            </span>
          </span>
          {hasDetail && (
            <ChevronRightIcon
              width={15}
              height={15}
              strokeWidth={2.5}
              className={`mt-4 shrink-0 text-faint transition-transform ${open ? 'rotate-90' : ''}`}
            />
          )}
        </button>
        {open && hasDetail && (
          <div className="mt-2 space-y-3">
            {item.detail.steps?.length > 0 && (
              <ul className="list-disc space-y-2.5 pl-[17px] text-[14px] leading-relaxed text-ink/90 marker:text-faint">
                {item.detail.steps.map((step, i) => (
                  <li key={i} className="pl-1 [text-wrap:pretty]">
                    {noWidow(step)}
                  </li>
                ))}
              </ul>
            )}
            {item.detail.watchFor && (
              <p className="rounded-card border border-watch-solid/50 px-3 py-2.5 text-[14px] leading-relaxed text-ink/90 [text-wrap:pretty]">
                <span className="font-bold text-ink">Watch for:</span> {noWidow(item.detail.watchFor)}
              </p>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

// The full daily routine as a grouped vertical timeline: Morning / Afternoon /
// Evening, each a labeled cluster of time-stamped stops. A reference outline of
// a good day, not a checklist — nothing here is tappable except to read more.
function RoutineTimeline({ groups }) {
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.period}>
          <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">{group.period}</p>
          <ul>
            {group.items.map((item, i) => (
              <RoutineItem key={item.title} item={item} last={i === group.items.length - 1} />
            ))}
          </ul>
        </div>
      ))}
    </div>
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
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-track text-icon">
          <PillIcon width={17} height={17} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold tracking-tight text-ink">{med.name}</span>
          <span className="block text-[13px] font-medium text-muted">
            {med.dose} · {med.schedule}
          </span>
          {lastGiven && (
            <span className="block text-xs font-medium text-faint">Last given {formatLastGiven(lastGiven)}</span>
          )}
        </span>
        <ExpandToggle open={open} onToggle={() => setOpen((o) => !o)} label={open ? 'Hide details' : 'Show details'} />
      </div>
      {open && (
        <InfoPanel nested className="space-y-2 p-3">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              med.type === 'prn' ? 'bg-track text-ink' : 'bg-track text-muted'
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

// Contact info stacks top-to-bottom so each line owns its own weight tier —
// name (primary), role · availability (muted secondary), then the phone number
// as the tappable value — instead of the name and phone competing as two bold
// ink lines with the role wedged between them.
function ContactRow({ name, role, phone, availability }) {
  return (
    <a href={telHref(phone)} className="flex items-start gap-3 px-4 py-3.5 active:scale-[0.98]">
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-ink">
        <PhoneIcon width={17} height={17} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold tracking-tight text-ink">{name}</span>
        <span className="mt-0.5 block text-[13px] font-medium leading-snug text-muted">
          {role}
          {availability ? ` · ${availability}` : ''}
        </span>
        <span className="mt-1.5 block text-[14px] font-semibold tracking-tight text-ink">{phone}</span>
      </span>
    </a>
  )
}

// The bio lives in its own zone under a hairline divider, so it reads as a
// distinct block from the contact header rather than flowing straight out of it.
function ContactCard({ contact }) {
  const [open, setOpen] = useState(false)
  return (
    <InfoPanel className="overflow-hidden">
      <ContactRow {...contact} />
      {contact.bio && (
        <div className="border-t border-line">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
          >
            <span className="text-[12px] font-bold text-ink">{open ? 'Hide bio' : `About ${firstName(contact.name)}`}</span>
            <ChevronRightIcon
              width={13}
              height={13}
              strokeWidth={2.5}
              className={`ml-auto shrink-0 text-ink transition-transform ${open ? 'rotate-90' : ''}`}
            />
          </button>
          {open && (
            <p className="px-4 pb-3.5 text-[13.5px] font-medium leading-relaxed text-ink/90 [text-wrap:pretty]">
              {contact.bio}
            </p>
          )}
        </div>
      )}
    </InfoPanel>
  )
}

export default function EssentialInfo() {
  const { householdId } = useParams()
  const location = useLocation()
  const { carePlan, contacts, activeProfile, logs, household } = useHousehold()
  const isClinicalRole = /nurse|family/i.test(activeProfile?.role || '')
  // The one preference with no place on the daily timeline — her preferred
  // name — is pinned to the top of the merged Routines & preferences section.
  const namingPref = carePlan.preferences?.find((p) => /ellie/i.test(p.summary))

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
      <main className="flex-1 bg-white px-4 py-6">
        <div className="mb-5">
          <h1 className="text-[30px] font-bold leading-tight tracking-tighter text-ink">Essential info</h1>
          <p className="mt-1 text-[14px] font-medium text-muted">Everything at a glance — updated regularly.</p>
        </div>

        <div className="mb-4">
          <CarePlanLink
            to={`/household/${householdId}/care-plan-doc`}
            fileName={carePlanDocument.fileName}
            lastUpdated={carePlanDocument.lastUpdated}
          />
        </div>

        <InfoPanel className="flex items-start gap-2.5 p-4">
          <ShieldIcon width={16} height={16} strokeWidth={2} className="mt-0.5 shrink-0 text-ink" />
          <p className="text-[13px] font-medium leading-snug">
            Viewing as <strong className="font-semibold">{activeProfile?.role}</strong> —{' '}
            {isClinicalRole
              ? 'full clinical detail is shown.'
              : "showing task-level info only. Dosing detail, preferences, and code status are limited to nurses and family, per HIPAA's minimum-necessary standard."}
          </p>
        </InfoPanel>

        {isClinicalRole && (
          <div id="code-status" className="mt-4 rounded-card border border-line bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Code status</p>
            <p className="mt-1 text-[15px] font-medium text-ink">{carePlan.codeStatus}</p>
            <p className="mt-2 text-[13px] font-medium text-muted">
              Signed {formatSignedDate(carePlan.codeStatusSignedAt)} · Authorized by {authorizingPhysician}
            </p>
          </div>
        )}

        <Section id="allergies" title="Allergies">
          <div className="flex flex-wrap gap-2">
            {carePlan.allergies.map((a) => (
              <span
                key={a}
                className="inline-flex items-center gap-1.5 rounded-full bg-attention-tint px-3.5 py-1.5 text-[14px] font-semibold text-attention-fg"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-attention-dot" />
                {a}
              </span>
            ))}
          </div>
        </Section>

        {/* Medications are limited to nurses and family — volunteers/aides
            (and other non-clinical roles) don't see this section at all. */}
        {isClinicalRole && (
          <Section id="medications" title="Medications">
            <div className="divide-y divide-line">
              {carePlan.medications.map((med) => (
                <MedicationItem key={med.name} med={med} lastGiven={lastGivenFor(med.name, logs)} />
              ))}
            </div>

            <InfoPanel as="p" className="p-3 text-[13px] font-medium leading-snug">
              Dosing changes are authorized by {authorizingPhysician}.{' '}
              {isNurse(activeProfile?.role) ? (
                <Link to={`/household/${householdId}/settings/request-med`} className="font-bold text-ink">
                  Request a change
                </Link>
              ) : (
                'You can request a change.'
              )}
            </InfoPanel>
          </Section>
        )}

        <Section id="routines" title="Routines & preferences">
          <p className="-mt-1 text-[13px] font-medium leading-snug text-muted">
            A rough outline of {household.preferredName}'s day — a reference, not a checklist. Times are approximate; her
            personal preferences are marked.
          </p>

          {/* Preferences that aren't tied to a time of day (e.g. what she's
              called) live here, at the top, rather than in the timeline. The
              `preferences` id keeps the "How we know this" deep-links working
              now that the standalone Preferences section is gone. */}
          {namingPref && (
            <div id="preferences" className="mt-3 rounded-card border border-routine-dot/40 bg-routine-tint/40 p-3.5">
              <ul>
                <DetailItem summary={namingPref.summary} detail={namingPref.detail} preference />
              </ul>
            </div>
          )}

          <div className="mt-4">
            <RoutineTimeline groups={carePlan.dailyRoutine} />
          </div>
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
            className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
          >
            <CalendarIcon width={13} height={13} strokeWidth={2} />
            Manage volunteer access
          </Link>
        )}
        <Link
          to={`/household/${householdId}/privacy`}
          className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-muted hover:text-ink"
        >
          <ShieldIcon width={13} height={13} strokeWidth={2} />
          Privacy &amp; security practices
        </Link>
      </main>
    </>
  )
}
