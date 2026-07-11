import { useEffect, useRef, useState } from 'react'
import { useHousehold } from '../state/HouseholdContext'
import { summarizeShiftNote } from '../lib/api'
import { saveLogEntry } from '../lib/db'
import { canSeeMeds } from '../utils/roles'
import OnDutyHeader from '../components/OnDutyHeader'
import UrgencyPicker from '../components/UrgencyPicker'
import AiResultCard from '../components/AiResultCard'
import { MicIcon, PillIcon, RefreshIcon, CheckIcon } from '../components/icons'

const ACTIVITY_OPTIONS = ['Sleeping', 'Relaxing', 'Eating', 'Activity']
const LOCATION_OPTIONS = ['Living Room', 'Bedroom', 'Garden', 'Kitchen']

function useSpeechRecognition(onResult) {
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
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript
      }
      onResult(transcript)
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    return () => recognition.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = () => {
    if (!recognitionRef.current) return
    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      recognitionRef.current.start()
      setListening(true)
    }
  }

  return { listening, supported, toggle }
}

function OptionGrid({ label, options, value, onPick }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-muted">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((opt) => {
          const active = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onPick(opt)}
              className={`rounded-2xl px-3 py-3 text-left text-sm font-bold shadow-card transition-colors active:scale-[0.98] ${
                active ? 'bg-routine-bg text-ink' : 'bg-white text-ink'
              }`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StatusSection({ sessionId, urgency }) {
  const { household, status, location, setPatientStatus } = useHousehold()
  return (
    <section>
      <h2 className="text-xl font-bold text-ink">Status</h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <OptionGrid
          label={`${household.preferredName} is currently…`}
          options={ACTIVITY_OPTIONS}
          value={status}
          onPick={(next) => setPatientStatus(next, location, sessionId, urgency)}
        />
        <OptionGrid
          label="In the"
          options={LOCATION_OPTIONS}
          value={location}
          onPick={(next) => setPatientStatus(status, next, sessionId, urgency)}
        />
      </div>
    </section>
  )
}

function MedsSection({ sessionId, urgency }) {
  const { carePlan, logMedsGiven, updateLog } = useHousehold()
  const [given, setGiven] = useState({}) // medName -> logId
  const [activeMed, setActiveMed] = useState(null)
  const [note, setNote] = useState('')

  const handleTap = (med) => {
    if (!given[med.name]) {
      const log = logMedsGiven(med, '', sessionId, urgency)
      setGiven((g) => ({ ...g, [med.name]: log.id }))
    }
    setActiveMed(med.name)
    setNote('')
  }

  const handleNoteChange = (value) => {
    setNote(value)
    const logId = given[activeMed]
    if (!logId) return
    updateLog(logId, (log) => ({
      medicationGiven: { ...log.medicationGiven, reason: value.trim() || 'as scheduled' },
    }))
  }

  return (
    <section className="mt-6">
      <h2 className="text-xl font-bold text-ink">Medication Administered</h2>
      <div className="mt-3 space-y-2.5">
        {carePlan.medications.map((med) => {
          const isGiven = Boolean(given[med.name])
          return (
            <button
              key={med.name}
              type="button"
              onClick={() => handleTap(med)}
              className={`flex w-full items-center gap-3 rounded-3xl px-4 py-3 text-left shadow-card transition-colors active:scale-[0.98] ${
                isGiven ? 'bg-routine-bg' : 'bg-white'
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay-50 text-clay-500">
                <PillIcon width={18} height={18} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-ink">{med.name}</span>
                <span className="block text-sm font-semibold text-muted">{med.dose} · {med.schedule}</span>
              </span>
            </button>
          )
        })}

        {activeMed && (
          <div className="flex items-center gap-2 rounded-2xl bg-routine-bg px-3 py-2.5">
            <span className="shrink-0 text-sm font-bold text-ink">Add note:</span>
            <input
              autoFocus
              value={note}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder={`Why was ${activeMed} given?`}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink placeholder:text-ink/40 focus:outline-none"
            />
          </div>
        )}
      </div>
    </section>
  )
}

function NotesSection({ sessionId }) {
  const { addLog, activeProfile } = useHousehold()
  const seeMeds = canSeeMeds(activeProfile?.role)
  const isVolunteerAide = /volunteer|aide/i.test(activeProfile?.role || '')
  const [transcript, setTranscript] = useState('')
  const [stage, setStage] = useState('idle') // idle | processing | result | saved
  const [result, setResult] = useState(null)
  const [escalation, setEscalation] = useState(null) // null | 'notifying' | 'notified'
  const { listening, supported, toggle } = useSpeechRecognition(setTranscript)

  const process = async () => {
    if (!transcript.trim()) return
    setStage('processing')
    const res = await summarizeShiftNote(transcript)
    setResult(res)
    setStage('result')
    // Red urgency → auto-escalate to the on-call nurse (two-step animation).
    if (res.urgency === 'red') {
      setEscalation('notifying')
      setTimeout(() => setEscalation('notified'), 1800)
    } else {
      setEscalation(null)
    }
  }

  const reset = () => {
    setTranscript('')
    setResult(null)
    setEscalation(null)
    setStage('idle')
  }

  const save = async () => {
    // Persist to Supabase (best-effort) and reflect on the in-memory timeline.
    await saveLogEntry({ transcript, response: result })
    addLog({
      author: activeProfile?.name ?? 'You',
      type: isVolunteerAide ? 'skin-integrity' : 'shift-note',
      summary: result.summary,
      urgency: result.urgency,
      rawTranscript: transcript,
      aiResponse: result,
      sessionId,
      medicationGiven:
        seeMeds && result.medications[0]
          ? { name: result.medications[0].name, time: result.medications[0].time, dose: '', route: '', reason: '' }
          : undefined,
    })
    setStage('saved')
    setTimeout(reset, 1500)
  }

  return (
    <section className="mt-6">
      <h2 className="text-xl font-bold text-ink">Notes</h2>

      {stage === 'idle' && (
        <div className="mt-3 rounded-[7px] bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggle}
              disabled={!supported}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
                listening ? 'animate-pulse bg-clay-500 text-white' : 'bg-mist text-white'
              }`}
            >
              <MicIcon width={20} height={20} strokeWidth={2} />
            </button>
            <p className="text-sm font-medium leading-snug text-ink">
              {supported
                ? listening
                  ? 'Listening… tap to stop.'
                  : 'Tap the mic and talk through your shift. You can also type below.'
                : 'Voice dictation isn’t supported in this browser — just type your note below.'}
            </p>
          </div>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Example: Ellie was restless before bed and short of breath. Repositioned and gave PRN morphine; settled within twenty minutes."
            rows={4}
            className="mt-4 w-full resize-none rounded-[5px] border border-sage-200 bg-transparent p-3 text-base font-medium text-ink placeholder:text-ink/40 focus:border-mist focus:outline-none"
          />
          <p className="mt-3 text-center text-xs leading-snug text-ink/35">
            Voice notes are processed by your browser's speech service. This demo uses synthetic data only — a real
            deployment would use on-device or BAA-covered transcription.
          </p>
          <button
            type="button"
            onClick={process}
            disabled={!transcript.trim()}
            className="mt-4 w-full rounded-full bg-mist py-3.5 text-lg font-bold text-white transition-opacity disabled:opacity-40"
          >
            Summarize with AI
          </button>
        </div>
      )}

      {stage === 'processing' && (
        <div className="mt-3 flex items-center gap-3 rounded-[7px] bg-white p-5 shadow-card">
          <RefreshIcon width={22} height={22} strokeWidth={2} className="shrink-0 animate-spin text-mist" />
          <p className="text-base font-semibold text-ink">Summarizing with Bedside AI…</p>
        </div>
      )}

      {stage === 'result' && result && (
        <div className="mt-3 space-y-3">
          {result.urgency === 'red' && escalation && (
            <div
              className={`flex items-center gap-2 rounded-[7px] p-3.5 ${
                escalation === 'notified' ? 'bg-routine-bg text-routine-fg' : 'bg-attention-bg text-attention-fg'
              }`}
            >
              {escalation === 'notifying' ? (
                <RefreshIcon width={18} height={18} strokeWidth={2.5} className="shrink-0 animate-spin" />
              ) : (
                <CheckIcon width={18} height={18} strokeWidth={3} className="shrink-0" />
              )}
              <p className="text-[15px] font-bold">
                {escalation === 'notifying' ? 'Notifying on-call nurse…' : 'Nurse notified ✓'}
              </p>
            </div>
          )}

          <AiResultCard transcript={transcript} result={result} seeMeds={seeMeds} />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="flex-1 rounded-full border border-sage-200 py-3 text-base font-bold text-muted"
            >
              Start over
            </button>
            <button
              type="button"
              onClick={save}
              className="flex-1 rounded-full bg-mist py-3 text-base font-bold text-white"
            >
              {result.confidence === 'low' ? 'Confirm & save' : 'Save to timeline'}
            </button>
          </div>
        </div>
      )}

      {stage === 'saved' && (
        <div className="mt-3 flex items-center gap-2 rounded-[7px] bg-routine-bg p-4 text-routine-fg">
          <CheckIcon width={18} height={18} strokeWidth={3} className="shrink-0" />
          <p className="text-[15px] font-bold">Saved to the timeline</p>
        </div>
      )}
    </section>
  )
}

export default function LogShift() {
  // Everything logged during one visit to this screen shares a session id,
  // so the Timeline can group it into a single card instead of one per tap.
  const sessionIdRef = useRef(`session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const [flag, setFlag] = useState('green')
  const { activeProfile } = useHousehold()
  // Volunteers/aides are a merged, non-medical role tier — administering or
  // even checking off medication is out of scope for them, same as it would
  // be for a home health aide in a real hospice household.
  const canGiveMeds = /nurse|family/i.test(activeProfile?.role || '')

  return (
    <>
      <OnDutyHeader />
      <main className="bg-household flex-1 px-5 pb-6 pt-6">
        <h1 className="mb-5 text-center text-2xl font-bold text-ink">Log New Entry</h1>

        <div className="mb-6 rounded-3xl bg-white p-4 shadow-card">
          <p className="mb-2 text-sm font-bold text-ink">Flag this entry</p>
          <UrgencyPicker value={flag} onChange={setFlag} />
        </div>

        <StatusSection sessionId={sessionIdRef.current} urgency={flag} />
        {canGiveMeds && <MedsSection sessionId={sessionIdRef.current} urgency={flag} />}
        <NotesSection sessionId={sessionIdRef.current} />
      </main>
    </>
  )
}
