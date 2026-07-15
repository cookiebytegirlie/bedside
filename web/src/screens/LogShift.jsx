import { useEffect, useRef, useState } from 'react'
import { useHousehold } from '../state/HouseholdContext'
import { summarizeShiftNote } from '../lib/api'
import { saveLogEntry } from '../lib/db'
import { canSeeMeds } from '../utils/roles'
import OnDutyHeader from '../components/OnDutyHeader'
import UrgencyPicker from '../components/UrgencyPicker'
import AiResultCard from '../components/AiResultCard'
import EscalationFlow from '../components/EscalationFlow'
import { MicIcon, PillIcon, RefreshIcon, CheckIcon, SparklesIcon, AlertTriangleIcon, PhoneIcon } from '../components/icons'

const ACTIVITY_OPTIONS = ['Sleeping', 'Relaxing', 'Eating', 'Activity']
const LOCATION_OPTIONS = ['Living Room', 'Bedroom', 'Garden', 'Kitchen']

// Keep a write-in status short so the Timeline's "Currently: {status} in
// {location}" line stays on one row.
const CUSTOM_STATUS_MAX = 40

// Plain-language name for each urgency flag, matching UrgencyPicker's labels.
const URGENCY_LABEL = { green: 'Routine', yellow: 'Keep an eye on', red: 'Needs attention' }

// Quiet warm-gray caps label that heads each grouped section, iOS-style.
function GroupLabel({ children }) {
  return <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-faint">{children}</p>
}

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

// Single-select as an iOS inset grouped list: white rows, hairline separators
// inset from the label, a trailing check on the selected row, which also
// takes the soft gray fill. The final "Other…" row is a write-in: selecting it
// reveals an inline text field (same styling as the meds "Note" input) whose
// value becomes the status. Because a custom value matches no preset, the row
// tracks "custom or explicitly opened" state locally rather than value === opt.
function ActivityList({ options, value, onPick }) {
  // A non-empty status that isn't one of the presets is a write-in value.
  const isCustom = Boolean(value) && !options.includes(value)
  const [otherOpen, setOtherOpen] = useState(isCustom)
  const [customText, setCustomText] = useState(isCustom ? value : '')
  const inputRef = useRef(null)
  const otherActive = otherOpen || isCustom

  const pickPreset = (opt) => {
    // Picking a preset clears the write-in and collapses its input.
    setOtherOpen(false)
    setCustomText('')
    onPick(opt)
  }

  const openOther = () => {
    setOtherOpen(true)
    if (isCustom) setCustomText(value)
    // Focus only on an explicit tap (never on a mount that's pre-revealed
    // because the current status is already custom).
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const changeCustom = (raw) => {
    const text = raw.slice(0, CUSTOM_STATUS_MAX)
    setCustomText(text)
    // Commit the write-in as the live status, the same way a preset tap does.
    // Skip empty so a mid-edit clear doesn't blank out the status chip.
    if (text.trim()) onPick(text)
  }

  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      {options.map((opt, i) => {
        // A preset reads selected only when it matches and the write-in isn't
        // the active choice.
        const active = value === opt && !otherActive
        return (
          <button
            key={opt}
            type="button"
            onClick={() => pickPreset(opt)}
            className={`relative flex min-h-[48px] w-full items-center justify-between px-4 py-3 text-left transition-colors active:bg-track ${
              active ? 'bg-track' : 'bg-white'
            }`}
          >
            {i > 0 && <span className="absolute left-4 right-0 top-0 h-px bg-line" />}
            <span className={`text-[15px] tracking-tight ${active ? 'font-semibold text-ink' : 'font-medium text-ink'}`}>
              {opt}
            </span>
            {active && <CheckIcon width={18} height={18} strokeWidth={2.5} className="shrink-0 text-ink" />}
          </button>
        )
      })}

      {/* Write-in "Other…" row */}
      <button
        type="button"
        onClick={openOther}
        className={`relative flex min-h-[48px] w-full items-center justify-between px-4 py-3 text-left transition-colors active:bg-track ${
          otherActive ? 'bg-track' : 'bg-white'
        }`}
      >
        <span className="absolute left-4 right-0 top-0 h-px bg-line" />
        <span className={`text-[15px] tracking-tight ${otherActive ? 'font-semibold text-ink' : 'font-medium text-ink'}`}>
          Other…
        </span>
        {otherActive && <CheckIcon width={18} height={18} strokeWidth={2.5} className="shrink-0 text-ink" />}
      </button>

      {/* Inline write-in field — mirrors the meds "Note" input styling. */}
      {otherActive && (
        <div className="relative flex items-center gap-2.5 bg-track px-4 py-3">
          <span className="absolute left-4 right-0 top-0 h-px bg-line" />
          <input
            ref={inputRef}
            value={customText}
            onChange={(e) => changeCustom(e.target.value)}
            maxLength={CUSTOM_STATUS_MAX}
            placeholder="Type a custom status…"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-ink placeholder:text-faint focus:outline-none"
          />
        </div>
      )}
    </div>
  )
}

// Room selection as horizontal filter chips — the selected chip is a crisp
// black pill; the rest are white with a hairline outline.
function RoomChips({ options, value, onPick }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value === opt
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onPick(opt)}
            className={`min-h-[40px] rounded-full border px-4 py-2 text-[14px] font-medium tracking-tight transition-colors active:scale-[0.98] ${
              active ? 'border-transparent bg-ink text-white' : 'border-line bg-white text-ink'
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function StatusSection({ sessionId, urgency }) {
  const { household, status, location, setPatientStatus } = useHousehold()
  return (
    <section className="mt-7">
      <GroupLabel>Status</GroupLabel>
      <div className="space-y-5">
        <div>
          <p className="mb-2 px-1 text-[13px] font-medium text-muted">{household.preferredName} is currently…</p>
          <ActivityList
            options={ACTIVITY_OPTIONS}
            value={status}
            onPick={(next) => setPatientStatus(next, location, sessionId, urgency)}
          />
        </div>
        <div>
          <p className="mb-2 px-1 text-[13px] font-medium text-muted">In the</p>
          <RoomChips
            options={LOCATION_OPTIONS}
            value={location}
            onPick={(next) => setPatientStatus(status, next, sessionId, urgency)}
          />
        </div>
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
    <section className="mt-7">
      <GroupLabel>Medication administered</GroupLabel>
      <div className="overflow-hidden rounded-card border border-line bg-white">
        {carePlan.medications.map((med, i) => {
          const isGiven = Boolean(given[med.name])
          return (
            <button
              key={med.name}
              type="button"
              onClick={() => handleTap(med)}
              className={`relative flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-track ${
                isGiven ? 'bg-track' : 'bg-white'
              }`}
            >
              {i > 0 && <span className="absolute left-16 right-0 top-0 h-px bg-line" />}
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-track text-icon">
                <PillIcon width={18} height={18} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium tracking-tight text-ink">{med.name}</span>
                <span className="block text-[13px] font-medium text-muted">{med.dose} · {med.schedule}</span>
              </span>
              {isGiven ? (
                <CheckIcon width={19} height={19} strokeWidth={2.5} className="shrink-0 text-ink" />
              ) : (
                <span className="h-5 w-5 shrink-0 rounded-full border-[1.5px] border-line" />
              )}
            </button>
          )
        })}

        {activeMed && (
          <div className="relative flex items-center gap-2.5 bg-track px-4 py-3">
            <span className="absolute left-4 right-0 top-0 h-px bg-line" />
            <span className="shrink-0 text-[13px] font-semibold text-ink">Note</span>
            <input
              autoFocus
              value={note}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder={`Why was ${activeMed} given?`}
              className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-ink placeholder:text-faint focus:outline-none"
            />
          </div>
        )}
      </div>
    </section>
  )
}

function NotesSection({ sessionId, flag, setFlag }) {
  const { addLog, activeProfile, contacts } = useHousehold()
  const seeMeds = canSeeMeds(activeProfile?.role)
  const isVolunteerAide = /volunteer|aide/i.test(activeProfile?.role || '')
  const [transcript, setTranscript] = useState('')
  const [stage, setStage] = useState('idle') // idle | processing | result | saved
  const [result, setResult] = useState(null)
  const [recDismissed, setRecDismissed] = useState(false) // AI recommendation declined/handled
  const { listening, supported, toggle } = useSpeechRecognition(setTranscript)

  const process = async () => {
    if (!transcript.trim()) return
    setStage('processing')
    const res = await summarizeShiftNote(transcript)
    setResult(res)
    setRecDismissed(false)
    setStage('result')
  }

  const reset = () => {
    setTranscript('')
    setResult(null)
    setRecDismissed(false)
    setStage('idle')
  }

  const save = async () => {
    // Persist to Supabase (best-effort) and reflect on the in-memory timeline.
    // The urgency saved is the caregiver's own flag — the AI's read is only a
    // suggestion they can accept (which updates the flag) or ignore.
    await saveLogEntry({ transcript, response: result, author: activeProfile?.name, urgency: flag })
    // Saving a "Needs attention" entry is what actually pages the on-call
    // nurse — so the page carries the real note, not a placeholder. Stamp the
    // escalation onto the entry so the Timeline can show the "nurse notified
    // automatically" line, and render the paging confirmation below (see the
    // 'saved' stage) instead of firing it back when the flag was picked.
    // Escalation follows the flag the caregiver KEPT — never the AI's read.
    const escalating = flag === 'red'
    // Advisory-only safety net: the AI never escalates or pages on its own.
    // But when it inferred "red" and the caregiver saved the entry LOWER, we
    // record the disagreement on the entry so the nurse and primary caregiver
    // get a passive heads-up (Timeline badge + visit digest) — awareness, not
    // an alarm, and distinct from a real, human-kept red escalation.
    const aiFlaggedForReview = result.urgency === 'red' && flag !== 'red'
    addLog({
      author: activeProfile?.name ?? 'You',
      type: isVolunteerAide ? 'skin-integrity' : 'shift-note',
      summary: result.summary,
      urgency: flag,
      rawTranscript: transcript,
      aiResponse: result,
      sessionId,
      medicationGiven:
        seeMeds && result.medications[0]
          ? { name: result.medications[0].name, time: result.medications[0].time, dose: '', route: '', reason: '' }
          : undefined,
      ...(escalating
        ? { escalatedAt: new Date().toISOString(), escalatedTo: contacts.hospiceTeam[0].name }
        : {}),
      ...(aiFlaggedForReview
        ? {
            aiUrgency: 'red',
            keptUrgency: flag,
            aiUrgencyReason: result.urgency_reason || result.reasoning || '',
          }
        : {}),
    })
    setStage('saved')
    // Red entries hold on the escalation confirmation; everything else flashes
    // "Saved" briefly and resets for the next entry.
    if (!escalating) setTimeout(reset, 1500)
  }

  return (
    <section className="mt-7">
      <GroupLabel>Notes</GroupLabel>

      {stage === 'idle' && (
        <div className="rounded-card border border-line bg-white p-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggle}
              disabled={!supported}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-colors disabled:opacity-40 ${
                listening ? 'animate-pulse bg-attention-solid' : 'bg-ink'
              }`}
            >
              <MicIcon width={20} height={20} strokeWidth={2} />
            </button>
            <p className="text-[14px] font-medium leading-snug text-ink">
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
            className="mt-4 w-full resize-none rounded-btn border border-line bg-white p-3 text-[15px] font-medium leading-snug text-ink placeholder:text-faint focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink/20"
          />
          <p className="mt-3 text-center text-[12px] leading-snug text-faint">
            Voice notes are processed by your browser's speech service. This demo uses synthetic data only — a real
            deployment would use on-device or BAA-covered transcription.
          </p>
          <button
            type="button"
            onClick={process}
            disabled={!transcript.trim()}
            className="mt-4 w-full rounded-btn bg-ink py-3.5 text-[16px] font-semibold text-white transition-opacity active:scale-[0.99] disabled:opacity-40"
          >
            Summarize with AI
          </button>
        </div>
      )}

      {stage === 'processing' && (
        <div className="flex items-center gap-3 rounded-card border border-line bg-white p-5">
          <RefreshIcon width={22} height={22} strokeWidth={2} className="shrink-0 animate-spin text-ink" />
          <p className="text-[15px] font-medium text-ink">Summarizing with Bedside AI…</p>
        </div>
      )}

      {stage === 'result' && result && (
        <div className="space-y-3">
          <AiResultCard transcript={transcript} result={result} seeMeds={seeMeds} />

          {/* The caregiver's flag is authoritative. When the AI reads the note
              differently, offer its call as a recommendation with reasoning —
              they decide whether to adopt it or keep their own flag. */}
          {result.urgency !== flag && !recDismissed && (
            <div className="rounded-card border border-ink/30 bg-white p-4">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-track text-ink">
                  <SparklesIcon width={15} height={15} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold tracking-tight text-ink">
                    Bedside AI suggests “{URGENCY_LABEL[result.urgency]}”
                  </p>
                  {(result.urgency_reason || result.reasoning) && (
                    <p className="mt-1 text-[13px] font-medium leading-snug text-ink/70">
                      {result.urgency_reason || result.reasoning}
                    </p>
                  )}
                  <p className="mt-1.5 text-[12px] font-medium leading-snug text-muted">
                    You flagged this “{URGENCY_LABEL[flag]},” and that’s what gets saved. Accept only if you agree.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setFlag(result.urgency)}
                  className="flex-1 rounded-full bg-ink py-2.5 text-[13px] font-semibold text-white active:scale-[0.98]"
                >
                  Use “{URGENCY_LABEL[result.urgency]}”
                </button>
                <button
                  type="button"
                  onClick={() => setRecDismissed(true)}
                  className="flex-1 rounded-full border border-line py-2.5 text-[13px] font-semibold text-muted active:scale-[0.98]"
                >
                  Keep “{URGENCY_LABEL[flag]}”
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="flex-1 rounded-btn border border-line py-3 text-[15px] font-semibold text-muted active:scale-[0.99]"
            >
              Start over
            </button>
            <button
              type="button"
              onClick={save}
              className="flex-1 rounded-btn bg-ink py-3 text-[15px] font-semibold text-white active:scale-[0.99]"
            >
              {result.confidence === 'low' ? 'Confirm & save' : 'Save to timeline'}
            </button>
          </div>
        </div>
      )}

      {stage === 'saved' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-card bg-track p-4 text-ink">
            <CheckIcon width={18} height={18} strokeWidth={3} className="shrink-0" />
            <p className="text-[15px] font-semibold">Saved to the timeline</p>
          </div>
          {/* Only now — on save — does the simulated page fire, carrying the
              entry's real summary rather than a placeholder. */}
          {flag === 'red' && result && (
            <EscalationFlow
              trigger={{
                quote: result.summary,
                reasonLine:
                  'You saved this as “Needs attention,” so the on-call nurse is being paged with your note.',
              }}
            />
          )}
        </div>
      )}
    </section>
  )
}

function telHref(phone) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

// Always-visible safety notice for a "Needs attention" entry, shown the
// instant the red flag is picked. It is passive — it does NOT page anyone;
// the on-call nurse is notified when the entry is saved (see NotesSection.save
// and the passive line rendered beside this). Its whole job is to make clear
// that notifying the nurse is not the same as immediate help, and to put the
// hospice-correct first call one tap away — the on-call nurse line, not 911,
// because most patients here are on a comfort-care/DNR plan that a 911 response
// can override with resuscitation and transport they specifically chose to
// forgo. 911 stays present but secondary, framed as the care plan's own
// emergency guidance rather than a blanket instruction.
//
// Legibility: this is a white card so multi-line body copy sits in high-
// contrast text-ink, never red-on-red. The attention red is used only as an
// accent — the warning icon and a thin border — per the monochrome system.
function EmergencyNotice({ patientName, nurse }) {
  return (
    <div className="rounded-card border border-attention-fg/30 bg-white p-4">
      <div className="flex items-start gap-2.5">
        <AlertTriangleIcon width={18} height={18} strokeWidth={2.2} className="mt-0.5 shrink-0 text-attention-fg" />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink">In an emergency, don’t wait on Bedside</p>
          <p className="mt-1 text-[13px] font-medium leading-snug text-ink/80">
            Notifying the nurse isn’t the same as immediate help, and it isn’t instant. If {patientName} needs urgent
            attention, call now — don’t wait on a saved entry.
          </p>
        </div>
      </div>

      <a
        href={telHref(nurse.phone)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 text-[15px] font-semibold text-white active:scale-[0.98]"
      >
        <PhoneIcon width={18} height={18} strokeWidth={2} />
        Call the on-call nurse line now
      </a>
      <p className="mt-1.5 text-center text-[12px] font-medium text-muted">
        {nurse.name} · {nurse.phone}
      </p>

      <p className="mt-3 border-t border-line pt-3 text-[12px] font-medium leading-snug text-muted">
        <a href="tel:911" className="font-semibold text-ink underline underline-offset-2">
          Call 911
        </a>{' '}
        only per the care plan’s emergency guidance. For a patient on a comfort-care plan, a 911 response can trigger
        resuscitation and transport they chose to forgo — so the nurse line comes first.
      </p>
    </div>
  )
}

export default function LogShift() {
  // Everything logged during one visit to this screen shares a session id,
  // so the Timeline can group it into a single card instead of one per tap.
  const sessionIdRef = useRef(`session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const [flag, setFlag] = useState('green')
  const { activeProfile, contacts, household } = useHousehold()

  // Volunteers/aides are a merged, non-medical role tier — administering or
  // even checking off medication is out of scope for them, same as it would
  // be for a home health aide in a real hospice household.
  const canGiveMeds = /nurse|family/i.test(activeProfile?.role || '')

  return (
    <>
      <OnDutyHeader />
      <main className="flex-1 bg-white px-4 pb-10 pt-6">
        <h1 className="mb-6 text-[30px] font-bold leading-tight tracking-tighter text-ink">Log new entry</h1>

        <section>
          <GroupLabel>Flag this entry</GroupLabel>
          <UrgencyPicker value={flag} onChange={setFlag} />
        </section>

        {/* Picking "Needs attention" only surfaces the emergency notice and a
            passive heads-up — it does NOT page anyone. The on-call nurse is
            notified when the entry is actually saved (NotesSection.save), so
            the page carries the real note instead of a placeholder. */}
        {flag === 'red' && (
          <div className="mt-4 space-y-2">
            <EmergencyNotice patientName={household.preferredName} nurse={contacts.hospiceTeam[0]} />
            <p className="text-center text-[12px] font-medium text-muted">
              The on-call nurse will be notified when you save this entry.
            </p>
          </div>
        )}

        <StatusSection sessionId={sessionIdRef.current} urgency={flag} />
        {canGiveMeds && <MedsSection sessionId={sessionIdRef.current} urgency={flag} />}
        <NotesSection sessionId={sessionIdRef.current} flag={flag} setFlag={setFlag} />
      </main>
    </>
  )
}
