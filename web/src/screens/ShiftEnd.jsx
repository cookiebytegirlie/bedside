import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useHousehold } from '../state/HouseholdContext'
import OnDutyHeader from '../components/OnDutyHeader'
import { MicIcon, PlusIcon, CheckIcon, AlertTriangleIcon, ArrowLeftIcon } from '../components/icons'

// Quick, comfort-oriented states for the end-of-shift snapshot. Distinct from
// the Log screen's activity list — this is "how did you leave her", not a
// detailed status entry.
const STATUS_OPTIONS = ['Sleeping', 'Restless', 'Comfortable', 'Eating']

// Per-intervention outcome. `past` feeds the auto-generated handoff sentence
// ("tried soft music (didn't help)").
const OUTCOMES = [
  { key: 'helped', label: 'Helped', activeBg: 'bg-routine-bg', past: 'helped' },
  { key: 'didnt', label: "Didn't", activeBg: 'bg-attention-bg', past: "didn't help" },
  { key: 'notsure', label: 'Not sure', activeBg: 'bg-watch-bg', past: 'unsure' },
]

// Optional browser dictation for the free-text handoff — same approach the Log
// screen uses, kept local so this screen stays self-contained. Appends each
// finalized phrase rather than replacing, so it plays nicely with typing.
function useDictation(onAppend) {
  const recognitionRef = useRef(null)
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1]
      if (last.isFinal) onAppend(last[0].transcript.trim())
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    return () => recognition.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = () => {
    const rec = recognitionRef.current
    if (!rec) return
    if (listening) {
      rec.stop()
      setListening(false)
    } else {
      rec.start()
      setListening(true)
    }
  }

  return { listening, supported, toggle }
}

function OutcomeRow({ value, onPick }) {
  return (
    <div className="mt-2.5 grid grid-cols-3 gap-2">
      {OUTCOMES.map((o) => {
        const active = value === o.key
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onPick(active ? null : o.key)}
            className={`flex items-center justify-center gap-1 rounded-[5px] px-2 py-2 text-[13px] font-semibold transition-colors active:scale-[0.98] ${
              active ? `${o.activeBg} text-ink` : 'border border-sage-200 bg-white text-muted'
            }`}
          >
            {active && o.key === 'helped' && <CheckIcon width={13} height={13} strokeWidth={2.5} />}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export default function ShiftEnd() {
  const navigate = useNavigate()
  const { householdId } = useParams()
  const { household, carePlan, location, status, setPatientStatus, addLog, switchProfile, activeProfile } =
    useHousehold()

  // One session id groups everything logged here into a single Timeline card.
  const sessionIdRef = useRef(`session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)

  const [statusChoice, setStatusChoice] = useState(STATUS_OPTIONS.includes(status) ? status : null)
  const [outcomes, setOutcomes] = useState({}) // measure name -> outcome key
  const [custom, setCustom] = useState([]) // { id, name, outcome }
  const [note, setNote] = useState('')
  const [concerns, setConcerns] = useState('')

  const measures = carePlan.comfortMeasures ?? []
  const dictation = useDictation((phrase) => setNote((n) => (n ? `${n} ${phrase}` : phrase)))

  const addCustom = () =>
    setCustom((c) => [...c, { id: `c-${Date.now()}-${c.length}`, name: '', outcome: null }])

  const finish = () => {
    const sessionId = sessionIdRef.current
    const concerned = concerns.trim().length > 0
    const urgency = concerned ? 'yellow' : 'green'

    // Update the household's current status (this also drops a status entry
    // into the Timeline, same as the Log screen).
    if (statusChoice) setPatientStatus(statusChoice, location, sessionId, urgency)

    const tried = [
      ...measures.map((m) => ({ name: m, outcome: outcomes[m] })),
      ...custom.map((c) => ({ name: c.name.trim(), outcome: c.outcome })),
    ].filter((t) => t.name && t.outcome)
    const pastFor = (k) => OUTCOMES.find((o) => o.key === k)?.past ?? ''
    const triedLine = tried.length
      ? `Tried ${tried.map((t) => `${t.name.toLowerCase()} (${pastFor(t.outcome)})`).join(', ')}.`
      : ''

    const bits = []
    if (note.trim()) bits.push(note.trim())
    if (triedLine) bits.push(triedLine)
    if (concerned) bits.push(`Worth watching: ${concerns.trim()}`)
    const summary =
      bits.join(' ') ||
      `Quiet shift — ${household.preferredName} was ${(statusChoice || status).toLowerCase()}, nothing eventful to hand off.`

    addLog({ author: activeProfile?.name ?? 'You', type: 'shift-note', summary, urgency, sessionId })
    switchProfile()
    navigate(`/household/${householdId}`)
  }

  const preferred = household.preferredName

  return (
    <>
      <OnDutyHeader />
      <main className="bg-household flex-1 px-5 pb-8 pt-6">
        <button
          type="button"
          onClick={() => navigate(`/household/${householdId}`)}
          className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-muted"
        >
          <ArrowLeftIcon width={16} height={16} strokeWidth={2} />
          Back to timeline
        </button>

        <h1 className="text-center text-2xl font-bold text-ink">How was your shift?</h1>
        <p className="mb-6 text-center text-[13px] font-semibold text-muted">Tap what applies. It takes a minute.</p>

        {/* Current status */}
        <section className="mb-6">
          <p className="mb-2 text-sm font-semibold text-muted">{preferred} is currently…</p>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map((opt) => {
              const active = statusChoice === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setStatusChoice(active ? null : opt)}
                  className={`rounded-[7px] px-3 py-3 text-center text-sm font-bold shadow-card transition-colors active:scale-[0.98] ${
                    active ? 'bg-routine-bg text-ink' : 'bg-white text-ink'
                  }`}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </section>

        {/* What you tried — from the care plan */}
        <section className="mb-6">
          <p className="text-sm font-semibold text-muted">What you tried for {preferred}</p>
          <p className="mb-3 text-[11px] font-semibold text-muted/80">From {preferred}'s care plan</p>
          <div className="space-y-2.5">
            {measures.map((m) => (
              <div key={m} className="rounded-[7px] bg-white p-4 shadow-card">
                <p className="text-base font-bold text-ink">{m}</p>
                <OutcomeRow value={outcomes[m]} onPick={(v) => setOutcomes((o) => ({ ...o, [m]: v }))} />
              </div>
            ))}

            {custom.map((c) => (
              <div key={c.id} className="rounded-[7px] bg-white p-4 shadow-card">
                <input
                  autoFocus
                  value={c.name}
                  onChange={(e) =>
                    setCustom((list) => list.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))
                  }
                  placeholder="What else did you try?"
                  className="w-full bg-transparent text-base font-bold text-ink placeholder:font-semibold placeholder:text-ink/30 focus:outline-none"
                />
                <OutcomeRow
                  value={c.outcome}
                  onPick={(v) => setCustom((list) => list.map((x) => (x.id === c.id ? { ...x, outcome: v } : x)))}
                />
              </div>
            ))}

            <button
              type="button"
              onClick={addCustom}
              className="flex items-center gap-1.5 pt-0.5 text-sm font-semibold text-mist active:scale-[0.98]"
            >
              <PlusIcon width={16} height={16} strokeWidth={2.5} />
              Something else
            </button>
          </div>
        </section>

        {/* Handoff note */}
        <section className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <button
              type="button"
              onClick={dictation.toggle}
              disabled={!dictation.supported}
              aria-label={dictation.listening ? 'Stop dictation' : 'Dictate note'}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-colors disabled:opacity-40 ${
                dictation.listening ? 'animate-pulse bg-clay-500' : 'bg-mist'
              }`}
            >
              <MicIcon width={16} height={16} strokeWidth={2} />
            </button>
            <p className="text-base font-bold text-ink">Tell the next person</p>
          </div>
          <div className="rounded-[7px] bg-white p-4 shadow-card">
            <p className="mb-2 text-[13px] font-medium leading-snug text-muted">
              How was she? What did you try? Anything they should know?
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="She was restless around 2, I tried the lavender and it settled her a bit…"
              className="w-full resize-none rounded-[5px] border border-sage-200 bg-transparent p-3 text-[13px] font-medium text-ink placeholder:text-ink/40 focus:border-mist focus:outline-none"
            />
          </div>
        </section>

        {/* Concerns — softly highlighted, drives the entry's urgency flag */}
        <section className="mb-6 rounded-[7px] bg-watch-bg p-4">
          <div className="mb-2 flex items-center gap-2 text-watch-fg">
            <AlertTriangleIcon width={18} height={18} strokeWidth={2} />
            <p className="text-base font-bold">Anything worrying you?</p>
          </div>
          <textarea
            value={concerns}
            onChange={(e) => setConcerns(e.target.value)}
            rows={3}
            placeholder="It's okay to say you're not sure."
            className="w-full resize-none rounded-[5px] border border-watch-fg/30 bg-white p-3 text-[13px] font-medium text-ink placeholder:text-ink/40 focus:border-watch-fg focus:outline-none"
          />
        </section>

        <button
          type="button"
          onClick={finish}
          className="w-full rounded-full bg-mist py-3.5 text-lg font-bold text-white shadow-card transition-transform active:scale-[0.98]"
        >
          Finish shift
        </button>
        <p className="mt-3 text-center text-xs leading-snug text-ink/40">
          Bedside will tidy this into a handoff for the next person. Your own words are always kept.
        </p>
      </main>
    </>
  )
}
