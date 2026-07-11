// Stand-ins for the DigitalOcean Gradient AI calls described in the spec.
// Same input/output shape as the real agent so swapping in the live
// endpoint later is a drop-in change: replace the body of each function
// with a fetch() to the Gradient AI Edge Function route.

const RED_KEYWORDS = ['fall', 'fell', 'blood', 'bleeding', 'can\'t breathe', 'cannot breathe', 'unresponsive', 'chest pain', 'seizure']
const YELLOW_KEYWORDS = ['pain', 'restless', 'confused', 'shortness of breath', 'short of breath', 'discomfort', 'nausea', 'agitated', 'not eating', 'wouldn\'t eat']

function guessUrgency(text) {
  const lower = text.toLowerCase()
  if (RED_KEYWORDS.some((k) => lower.includes(k))) return 'red'
  if (YELLOW_KEYWORDS.some((k) => lower.includes(k))) return 'yellow'
  return 'green'
}

function condense(text) {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= 160) return trimmed
  return trimmed.slice(0, 157).trimEnd() + '…'
}

export function summarizeShiftNote(rawTranscript) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        summary: condense(rawTranscript),
        urgency: guessUrgency(rawTranscript),
      })
    }, 1200)
  })
}

const QA_RULES = [
  { keywords: ['allerg'], respond: (plan) => `Known allergies: ${plan.allergies.join(', ')}.` },
  { keywords: ['med', 'medication', 'dose', 'dosage', 'pill'], respond: (plan) => plan.medications
      .map((m) => `${m.name} — ${m.dose}, ${m.schedule}`)
      .join('\n') },
  { keywords: ['light', 'lamp', 'evening', 'night'], respond: () => 'No overhead lights after 7pm — lamp only, per her preference.' },
  { keywords: ['music'], respond: () => 'She enjoys soft classical music in the afternoon.' },
  { keywords: ['dnr', 'resuscitat', 'code status'], respond: () => 'A Do Not Resuscitate (DNR) order is on file with hospice.' },
  { keywords: ['contact', 'phone', 'call', 'emergency'], respond: (plan) => plan.emergencyContacts
      .map((c) => `${c.name}: ${c.phone}`)
      .join('\n') },
  { keywords: ['reposition', 'turn', 'pressure'], respond: () => 'Reposition every 2 hours to prevent pressure sores.' },
  { keywords: ['name', 'call her'], respond: () => 'She prefers to be called "Ellie", not "Eleanor".' },
]

// Personal/bio Q&A for the "Meet Ellie" page — answers in her family's
// voice, tagged with the part of her story they came from. Same swap-in
// shape as the other agents: returns { answer, source }.
const ELLIE_QA = [
  { keywords: ['ice cream', 'cold food', 'dessert', 'sweet', 'frozen'], answer: "She's gone off cold foods like ice cream lately. Applesauce is a favorite, and she loves lukewarm chamomile tea with a little honey.", source: 'food and drink' },
  { keywords: ['eat', 'food', 'meal', 'hungry', 'drink', 'tea', 'water', 'thirsty'], answer: 'Small portions she can manage: applesauce, oatmeal, lukewarm chamomile tea with honey. Offer water in small sips often — she forgets on her own.', source: 'food and drink' },
  { keywords: ['music', 'sing', 'song', 'radio'], answer: 'Soft classical in the afternoon, big-band in the evening. Starting the music before dusk helps head off her evening anxiety.', source: 'routines' },
  { keywords: ['garden', 'flower', 'bird', 'feeder', 'outside', 'plant'], answer: "Her garden is her pride. Narrate the birds at the feeder — she can't see them well anymore, but she loves hearing about them.", source: 'her story' },
  { keywords: ['anxious', 'anxiety', 'upset', 'sundown', 'evening', 'dark', 'restless', 'agitated', 'scared'], answer: 'She gets anxious as the light fades — usually before 5:30pm. Dim the lamps and start the music before it happens, not after.', source: 'her day' },
  { keywords: ['sleep', 'nap', 'doze', 'tired', 'rest', 'blanket', 'cold'], answer: 'Afternoons are often dozing. Evenings settle with lavender hand lotion, a warm blanket, and quiet music — she runs cold.', source: 'her day' },
  { keywords: ['name', 'call her'], answer: 'She prefers "Ellie," not "Eleanor."', source: 'preferences' },
  { keywords: ['hear', 'deaf', 'ear', 'left', 'right', 'side'], answer: "She's hard of hearing on the right — sit on her left and she'll follow you more easily.", source: 'her story' },
  { keywords: ['lotion', 'massage', 'comfort', 'touch', 'lavender'], answer: 'Lavender hand lotion, massaged slowly, is her most reliable comfort in the evening.', source: 'routines' },
  { keywords: ['teach', 'student', 'school', 'work', 'job', 'career'], answer: 'She taught third grade for thirty-one years. Ask about her students and she lights right up.', source: 'her story' },
  { keywords: ['pain', 'hurt', 'med', 'medication', 'dose'], answer: 'Medication is handled by the nurse and family. If she seems in pain, note the time and call the nurse line.', source: 'care' },
]

export function askAboutEllie(question) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lower = question.toLowerCase()
      const rule = ELLIE_QA.find((r) => r.keywords.some((k) => lower.includes(k)))
      resolve(
        rule
          ? { answer: rule.answer, source: rule.source }
          : { answer: "I don't have that in Ellie's notes yet — try asking about her food, music, garden, evenings, or what comforts her.", source: null }
      )
    }, 800)
  })
}

export function askCarePlan(question, plan) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lower = question.toLowerCase()
      const rule = QA_RULES.find((r) => r.keywords.some((k) => lower.includes(k)))
      if (rule) {
        resolve(rule.respond(plan))
      } else {
        resolve(
          "I couldn't find that in the care plan. Try asking about medications, allergies, routines, preferences, or emergency contacts."
        )
      }
    }, 900)
  })
}
