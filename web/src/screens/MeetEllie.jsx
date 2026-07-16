import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useHousehold } from '../state/HouseholdContext'
import { ellieProfile, carePlanDocument } from '../mockData'
import { profilePhotos } from '../assets'
import { askAboutEllie } from '../ai/mockAgent'
import OnDutyHeader from '../components/OnDutyHeader'
import AiSourceDisclosure from '../components/AiSourceDisclosure'
import CarePlanLink from '../components/CarePlanLink'
import {
  ArrowLeftIcon,
  AlertTriangleIcon,
  SunIcon,
  CloudIcon,
  MoonIcon,
  SparklesIcon,
  PhoneIcon,
  ChevronRightIcon,
} from '../components/icons'

function telHref(phone) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

const DAY_ICON = { sun: SunIcon, cloud: CloudIcon, moon: MoonIcon }

const DAY_FIELDS = [
  { key: 'mood', label: 'Mood' },
  { key: 'activities', label: 'Activities she likes' },
  { key: 'places', label: 'Places she likes to go' },
  { key: 'food', label: 'What she likes to eat & drink' },
  { key: 'problems', label: 'Common problems & how to help' },
]

// Standalone, always-visible warning — never collapsed inside a panel.
function TurnWarning({ seg }) {
  return (
    <div className="rounded-[8px] bg-watch-bg p-4">
      <div className="mb-1 flex items-center gap-2 text-watch-fg">
        <AlertTriangleIcon width={17} height={17} strokeWidth={2} />
        <p className="text-[15px] font-bold">
          {seg.part} <span className="font-semibold">— {seg.label}</span>
        </p>
      </div>
      <p className="text-[13px] font-medium leading-snug text-ink/80">{seg.detail}</p>
    </div>
  )
}

// One collapsible time-of-day panel. Collapsed by default since each holds
// five fields; tap the header to expand.
function DayPanel({ seg }) {
  const [open, setOpen] = useState(false)
  const Icon = DAY_ICON[seg.icon] || SunIcon

  return (
    <div className="overflow-hidden rounded-[8px] bg-white shadow-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-100 text-mist">
          <Icon width={17} height={17} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1 text-[15px] font-bold text-ink">
          {seg.part} <span className="font-semibold text-muted">— {seg.label}</span>
        </span>
        <ChevronRightIcon
          width={17}
          height={17}
          strokeWidth={2.5}
          className={`shrink-0 text-mist transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-sage-100 px-4 pb-4 pt-3">
          {DAY_FIELDS.map((f) => (
            <div key={f.key}>
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{f.label}</p>
              <p className="mt-0.5 text-[13px] font-medium leading-snug text-ink/80">{seg[f.key]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AskAboutEllie({ suggestions }) {
  const { householdId } = useParams()
  const [question, setQuestion] = useState('')
  const [thread, setThread] = useState([])
  const [asking, setAsking] = useState(false)

  const ask = async (q) => {
    const text = (q ?? question).trim()
    if (!text || asking) return
    setThread((t) => [...t, { role: 'user', text }])
    setQuestion('')
    setAsking(true)
    const res = await askAboutEllie(text)
    setThread((t) => [
      ...t,
      {
        role: 'agent',
        text: res.answer,
        source: res.source,
        reasoning: res.reasoning,
        confidence: res.confidence,
        // 'about' = this same Meet Ellie page (plain same-page anchor);
        // 'info' = the Essential Information page (cross-page route).
        sourceHref: res.sectionId
          ? res.page === 'info'
            ? `/household/${householdId}/info#${res.sectionId}`
            : `#${res.sectionId}`
          : undefined,
      },
    ])
    setAsking(false)
  }

  return (
    <div className="rounded-[8px] bg-white p-4 shadow-card">
      {thread.length === 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => ask(s)}
              className="rounded-full border border-sage-200 px-3 py-1.5 text-[12px] font-semibold text-mist active:scale-[0.97]"
            >
              {s}
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-3 space-y-3">
          {thread.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-[8px] bg-mist px-3.5 py-2 text-[13px] font-medium text-white">
                  {m.text}
                </div>
              </div>
            ) : (
              <div key={i} className="max-w-[92%]">
                <p className="text-[13px] font-medium leading-snug text-ink">{m.text}</p>
                <AiSourceDisclosure
                  reasoning={m.reasoning}
                  source={m.source}
                  sourceHref={m.sourceHref}
                  confidence={m.confidence}
                />
              </div>
            )
          )}
          {asking && <p className="text-[13px] font-medium text-muted">Thinking…</p>}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          ask()
        }}
        className="flex items-center gap-2 rounded-[8px] border border-sage-200 p-1.5"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Can she have ice cream?"
          className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-[13px] font-medium text-ink placeholder:text-ink/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!question.trim() || asking}
          className="shrink-0 rounded-full bg-mist px-4 py-1.5 text-[13px] font-bold text-white disabled:opacity-40"
        >
          Ask
        </button>
      </form>
    </div>
  )
}

export default function MeetEllie() {
  const { householdId } = useParams()
  const { household, contacts } = useHousehold()
  const name = household.preferredName
  const danielPhone = contacts.family.find((c) => /Daniel/.test(c.name))?.phone
  const nursePhone = contacts.hospiceTeam.find((c) => /nurse/i.test(c.role))?.phone

  return (
    <>
      <OnDutyHeader />
      <main className="bg-white flex-1 px-5 pb-8 pt-6">
        <Link
          to={`/household/${householdId}`}
          aria-label="Back to timeline"
          className="mb-2 -ml-1 flex h-9 w-9 items-center justify-center text-muted active:scale-[0.94]"
        >
          <ArrowLeftIcon width={22} height={22} strokeWidth={2} />
        </Link>

        <div className="mb-4">
          <CarePlanLink
            to={`/household/${householdId}/care-plan-doc`}
            fileName={carePlanDocument.fileName}
            lastUpdated={carePlanDocument.lastUpdated}
          />
        </div>

        {/* Note from Daniel — identity + personal letter, in one card */}
        <div id="ellie-intro" className="rounded-[8px] bg-white p-5 shadow-card">
          <div className="flex flex-col items-center text-center">
            <img
              src={profilePhotos.ellie}
              alt=""
              className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-card"
            />
            <h1 className="mt-3 text-2xl font-bold text-ink">Meet {name}</h1>
            <p className="text-[13px] font-semibold text-muted">
              A note from {ellieProfile.author}, {ellieProfile.authorRelation}
            </p>
          </div>
          <div className="mt-4 space-y-3 border-t border-sage-100 pt-4 text-[15px] font-medium leading-relaxed text-ink">
            {ellieProfile.intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>

        {/* Any hour, please don't */}
        <section className="mt-5">
          <h2 className="mb-2 flex items-center gap-1.5 text-xl font-bold text-ink">
            <AlertTriangleIcon width={19} height={19} strokeWidth={2} className="text-attention-fg" />
            Any hour, please don’t
          </h2>
          <div className="rounded-[8px] bg-white p-5 shadow-card">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              {ellieProfile.avoid.map((a) => (
                <div key={a.title} className="flex gap-2">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-attention-fg" />
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold leading-tight text-ink">{a.title}</p>
                    {a.detail && <p className="mt-0.5 text-[12px] font-medium leading-tight text-ink/60">{a.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Her day — collapsible per period; the "turn" warning stays open */}
        <section id="her-day" className="mt-5">
          <h2 className="text-xl font-bold text-ink">Her day</h2>
          <p className="mb-2 text-[13px] font-semibold text-muted">Tap a time of day to expand</p>
          <div className="space-y-2.5">
            {ellieProfile.day.map((seg) =>
              seg.turn ? <TurnWarning key={seg.part} seg={seg} /> : <DayPanel key={seg.part} seg={seg} />
            )}
          </div>
        </section>

        {/* Ask anything about Ellie */}
        <section className="mt-5">
          <h2 className="mb-2 flex items-center gap-1.5 text-xl font-bold text-ink">
            <SparklesIcon width={19} height={19} strokeWidth={2} className="text-mist" />
            Ask anything about {name}
          </h2>
          <AskAboutEllie suggestions={ellieProfile.askSuggestions} />
        </section>

        {/* Reach out */}
        <div className="mt-5 rounded-[8px] bg-white p-4 shadow-card">
          <p className="text-center text-[12px] font-medium leading-snug text-ink/55">{ellieProfile.footerNote}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {danielPhone && (
              <a
                href={telHref(danielPhone)}
                className="flex items-center justify-center gap-1.5 rounded-full border border-sage-200 bg-white py-3 text-sm font-bold text-ink active:scale-[0.98]"
              >
                <PhoneIcon width={15} height={15} strokeWidth={2} className="text-mist" />
                {ellieProfile.author} · family
              </a>
            )}
            {nursePhone && (
              <a
                href={telHref(nursePhone)}
                className="flex items-center justify-center gap-1.5 rounded-full border border-sage-200 bg-white py-3 text-sm font-bold text-ink active:scale-[0.98]"
              >
                <PhoneIcon width={15} height={15} strokeWidth={2} className="text-mist" />
                Nurse line
              </a>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
