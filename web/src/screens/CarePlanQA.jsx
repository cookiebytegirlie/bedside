import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useHousehold } from '../state/HouseholdContext'
import { guessUrgency, redFlagReason } from '../ai/mockAgent'
import { askCarePlan } from '../lib/api'
import OnDutyHeader from '../components/OnDutyHeader'
import AiSourceDisclosure from '../components/AiSourceDisclosure'
import EscalationFlow from '../components/EscalationFlow'
import { ChatIcon } from '../components/icons'

const SUGGESTIONS = [
  'What medications is she on?',
  'Any allergies?',
  'What are her evening preferences?',
  'Who do I call in an emergency?',
]

export default function CarePlanQA() {
  const { householdId } = useParams()
  const { carePlan, contacts, addLog, activeProfile } = useHousehold()
  const [question, setQuestion] = useState('')
  const [thread, setThread] = useState([])
  const [asking, setAsking] = useState(false)

  // A red-flagged question lands on the Timeline exactly like a Log-screen
  // escalation does, so the household has one record of every "needs
  // attention" moment regardless of which screen surfaced it.
  const logChatFlag = (text) => {
    const now = new Date().toISOString()
    addLog({
      author: activeProfile?.name ?? 'You',
      type: 'chat-flag',
      summary: text,
      urgency: 'red',
      rawTranscript: text,
      escalatedAt: now,
      escalatedTo: contacts.hospiceTeam[0].name,
    })
  }

  const submit = async (q) => {
    const text = (q ?? question).trim()
    if (!text || asking) return
    setThread((prev) => [...prev, { role: 'user', text }])
    setQuestion('')

    // Urgent wording escalates in place of the normal answer — the "needs
    // attention" flow is the response, not a canned care-plan lookup.
    if (guessUrgency(text) === 'red') {
      setThread((prev) => [...prev, { role: 'escalation', quote: text, reasonLine: redFlagReason(text) }])
      return
    }

    setAsking(true)
    const res = await askCarePlan(text, carePlan)
    setThread((prev) => [
      ...prev,
      {
        role: 'agent',
        text: res.answer,
        source: res.source,
        reasoning: res.reasoning,
        confidence: res.confidence,
        sourceHref: res.sectionId ? `/household/${householdId}/info#${res.sectionId}` : undefined,
      },
    ])
    setAsking(false)
  }

  return (
    <>
      <OnDutyHeader />
      <main className="flex flex-1 flex-col px-5 py-5">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-ink">Ask about the care plan</h1>
          <p className="mt-1 text-sm font-semibold text-muted">Answers pulled from the household's care-plan doc</p>
        </div>

        {thread.length === 0 && (
          <div className="mb-5 rounded-4xl bg-white p-5 shadow-card">
            <div className="mb-2 flex items-center gap-2 text-mist">
              <ChatIcon width={19} height={19} strokeWidth={2} />
              <p className="text-base font-bold">Try asking:</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="rounded-full border border-sage-200 px-3.5 py-2 text-sm font-semibold text-mist"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 space-y-3">
          {thread.map((msg, i) =>
            msg.role === 'escalation' ? (
              <EscalationFlow
                key={i}
                trigger={{ quote: msg.quote, reasonLine: msg.reasonLine }}
                onNotified={() => logChatFlag(msg.quote)}
              />
            ) : (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'w-full'}`}>
                  <div
                    className={`whitespace-pre-line rounded-4xl px-5 py-3 text-base font-medium shadow-card ${
                      msg.role === 'user' ? 'bg-mist text-white' : 'bg-white text-ink'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.role === 'agent' && (
                    <AiSourceDisclosure
                      reasoning={msg.reasoning}
                      source={msg.source}
                      sourceHref={msg.sourceHref}
                      confidence={msg.confidence}
                    />
                  )}
                </div>
              </div>
            )
          )}
          {asking && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-4xl bg-white px-5 py-3 text-base font-medium text-muted shadow-card">
                Checking the care plan…
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="sticky bottom-2 mt-4 flex items-center gap-2 rounded-full bg-white p-2 shadow-card"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question…"
            className="min-w-0 flex-1 rounded-full bg-transparent px-4 py-2.5 text-base font-medium text-ink placeholder:text-ink/30 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!question.trim() || asking}
            className="shrink-0 rounded-full bg-mist px-5 py-2.5 text-base font-bold text-white disabled:opacity-40"
          >
            Ask
          </button>
        </form>
      </main>
    </>
  )
}
