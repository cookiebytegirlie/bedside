import { useState } from 'react'
import { useHousehold } from '../state/HouseholdContext'
import { askCarePlan } from '../ai/mockAgent'
import TopBar from '../components/TopBar'
import { ChatIcon } from '../components/icons'

const SUGGESTIONS = [
  'What medications is she on?',
  'Any allergies?',
  'What are her evening preferences?',
  'Who do I call in an emergency?',
]

export default function CarePlanQA() {
  const { carePlan } = useHousehold()
  const [question, setQuestion] = useState('')
  const [thread, setThread] = useState([])
  const [asking, setAsking] = useState(false)

  const submit = async (q) => {
    const text = (q ?? question).trim()
    if (!text || asking) return
    setThread((prev) => [...prev, { role: 'user', text }])
    setQuestion('')
    setAsking(true)
    const answer = await askCarePlan(text, carePlan)
    setThread((prev) => [...prev, { role: 'agent', text: answer }])
    setAsking(false)
  }

  return (
    <>
      <TopBar title="Ask about the care plan" subtitle="Answers pulled from the household's care-plan doc" />
      <main className="flex flex-1 flex-col px-5 py-5">
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
          {thread.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] whitespace-pre-line rounded-4xl px-5 py-3 text-base font-medium shadow-card ${
                  msg.role === 'user' ? 'bg-mist text-white' : 'bg-white text-ink'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
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
