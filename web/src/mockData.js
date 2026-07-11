export const DEMO_HOUSEHOLD_ID = 'a1e4f9c2-demo-household'

export const household = {
  id: DEMO_HOUSEHOLD_ID,
  patientName: 'Eleanor Voss',
  preferredName: 'Ellie',
  age: 84,
  location: 'Front bedroom, west side',
  photoInitials: 'EV',
  primaryCaregiver: 'Daniel Voss (son)',
  lastMeal: 'Oatmeal, half bowl, 3 hours ago',
  nextDoseNote: 'Lorazepam due in 2 hours',
}

// Known, recurring people get a PIN so logs are attributed correctly.
// One-off/ad-hoc volunteers use the general slot's one-time code instead
// (see generalVolunteerSlot below). This is a lightweight "who's speaking"
// layer for attribution, not real security: PINs and codes live in plain
// client state, same as the rest of this mockup.
//
// `schedule` restricts a profile's PIN to a recurring daily window — Marcus
// always covers the same afternoon shift, so his standing profile only
// works then. Profiles with no `schedule` (family, nurse, patient) are
// unrestricted. Primary caregivers can edit this from the Volunteer Access
// screen.
//
// "Volunteer / Aide" is one merged role tier — a lay volunteer and a home
// health aide are the same category of non-medical supporting staff here,
// so they share one permission set (task + skin-integrity logging, no
// medication access) rather than two overlapping role systems.
//
// `cardLabel` overrides the default role text shown on the sign-in picker,
// used for Ellie so her card reads as an invitation, not a role listing.
export const profiles = [
  { id: 'daniel', name: 'Daniel Voss', role: 'Family', initials: 'DV', pin: '0000' },
  { id: 'priya', name: 'Priya', role: 'Nurse', initials: 'P', pin: '0000' },
  {
    id: 'marcus',
    name: 'Marcus',
    role: 'Volunteer / Aide',
    initials: 'M',
    pin: '0000',
    schedule: { startHour: 15, endHour: 20 }, // 3:00 PM - 8:00 PM daily
  },
  {
    id: 'ellie',
    name: 'Ellie',
    role: 'Patient',
    cardLabel: "How's Ellie doing?",
    initials: 'E',
    pin: '0000',
  },
]

// The overnight slot any hospice volunteer can cover with a shared code
// issued by the coordinator, rather than a personal profile. The code only
// works inside this window — it's not a permanent credential.
export const generalVolunteerSlot = { startHour: 20, endHour: 10 } // 8:00 PM - 10:00 AM
export const defaultGeneralCode = '000000'

export const contacts = {
  hospiceTeam: [
    {
      name: 'Priya Anand',
      role: 'Primary Hospice Nurse',
      phone: '(555) 044-5566',
      availability: 'On-call 24/7',
      bio: 'Priya manages Ellie\'s day-to-day clinical care — medication administration, wound and skin checks, and any symptom changes. She\'s the first call for anything that feels off between visits. For non-urgent questions, a text gets a faster reply than a call; for anything urgent (pain, breathing, a fall), call the line directly, day or night.',
    },
    {
      name: 'Grace Lin',
      role: 'Volunteer Coordinator',
      phone: '(555) 033-7788',
      availability: 'Weekdays 9am–5pm',
      bio: 'Grace schedules and trains the volunteers and aides covering Ellie\'s shifts, and is who to contact about coverage gaps, swaps, or adding someone new to the rotation. She isn\'t clinical staff — route medication or symptom questions to Priya instead. Best reached by text or email during business hours.',
    },
    {
      name: 'Dr. Sam Okafor',
      role: 'Hospice Physician',
      phone: '(555) 099-1122',
      availability: 'Via nurse line',
      bio: 'Dr. Okafor oversees Ellie\'s medication orders and authorizes any dosing changes, and was the physician who signed her code status. He isn\'t reached directly for day-to-day questions — Priya relays clinical updates to him and carries back any order changes, which keeps one clear record of what changed and why.',
    },
  ],
  family: [
    {
      name: 'Daniel Voss',
      role: 'Son · Primary caregiver',
      phone: '(555) 011-2233',
      bio: 'Daniel is Ellie\'s primary point of contact for family decisions and care-plan changes. He\'s usually reachable by text during the day and by call in the evening — texting first is fine for anything that isn\'t urgent.',
    },
    { name: 'Marisol Voss', role: 'Daughter-in-law', phone: '(555) 011-9988' },
  ],
}

export const carePlan = {
  updatedAt: '2026-07-06T14:00:00-07:00',
  codeStatus: 'DNR (Do Not Resuscitate) — on file with hospice.',
  codeStatusSignedAt: '2026-03-12T00:00:00-07:00',
  allergies: ['Penicillin', 'Latex'],
  medications: [
    {
      name: 'Morphine (oral solution)',
      dose: '5mg',
      schedule: 'Every 4 hours as needed for pain',
      type: 'prn',
      directions: 'Give under the tongue or between cheek and gum — do not have her swallow it whole. Wait at least 4 hours between doses, and log the time given so the next caregiver can track spacing.',
    },
    {
      name: 'Lorazepam',
      dose: '0.5mg',
      schedule: 'Twice daily, morning and evening',
      type: 'scheduled',
      directions: 'Give with a small amount of food if she seems unsettled on an empty stomach. Don\'t combine with any other sedating medication without checking with the nurse first.',
    },
    {
      name: 'Senna-S',
      dose: '2 tablets',
      schedule: 'Nightly',
      type: 'scheduled',
      directions: 'Give at bedtime with a full glass of water, and encourage fluids through the day — it works better when she\'s not dehydrated.',
    },
  ],
  preferences: [
    {
      summary: 'Prefers to be called "Ellie", not "Eleanor"',
      detail: {
        steps: [
          'She may not respond to "Eleanor" at all, even from someone who knows her well — it\'s simply not a name she answers to anymore.',
          'If a visitor uses it, a gentle correction ("she goes by Ellie") is welcome and won\'t offend anyone.',
        ],
      },
    },
    {
      summary: 'Enjoys soft classical music in the afternoon',
      detail: {
        steps: [
          'It\'s one of the few things that reliably keeps her settled during her quieter, dozing stretch of the day.',
          'A phone or small speaker at low volume near her armchair works well.',
        ],
        watchFor: 'Switching to anything louder or more upbeat — it can unsettle her instead.',
      },
    },
    {
      summary: 'Does not want overhead lights on after 7pm — lamp only',
      detail: {
        steps: [
          'Overhead light strains her eyes.',
          'Get the lamp going before the room starts to feel dim, rather than waiting until she\'s already asked for it.',
        ],
        watchFor: 'Overhead light switched on in the evening — it can trigger her anxious "turn" around dusk.',
      },
    },
  ],
  // Non-medical comfort measures a caregiver can try during a shift, surfaced
  // on the shift-end handoff screen as "what you tried" — drawn from Ellie's
  // preferences/routines but phrased as quick, tappable actions.
  comfortMeasures: [
    'Soft classical music',
    'Dimmed lights / lamp only',
    'Hand lotion & massage',
    'Repositioned for comfort',
  ],
  routines: [
    {
      summary: 'Repositioning every 2 hours to prevent pressure sores',
      detail: {
        steps: [
          'Turn her fully onto her side, supporting her back and knees with pillows.',
          'Check her heels, hips, and tailbone for redness.',
          'Log the time on her chart.',
        ],
        watchFor: 'A red area that doesn\'t fade within about 30 minutes of the pressure being relieved — flag it to the nurse before her next visit. Caught early, it\'s far easier to treat than a developed pressure sore.',
      },
    },
    {
      summary: 'Oral care after each meal',
      detail: {
        steps: [
          'Use a soft-bristle brush or moistened swab.',
          'Check for dryness, sores, or bleeding gums while you\'re in there.',
        ],
        watchFor: 'White patches on the tongue or inside the cheeks — could be thrush. Mention it to the nurse rather than treating it yourself.',
      },
    },
    {
      summary: 'Family prefers a text update after every shift, even if uneventful',
      detail: {
        steps: [
          'A short text to Daniel — mood, intake, anything notable — keeps the family reassured without needing a phone call.',
          '"Quiet shift, ate half her lunch, no concerns" is exactly the kind of message they want, even on an ordinary day.',
        ],
      },
    },
  ],
  emergencyContacts: [
    { name: 'Daniel Voss (son)', phone: '(555) 011-2233' },
    { name: 'Hospice Nurse Line', phone: '(555) 044-5566' },
  ],
}

// The full, multi-page Care Plan document. `fileName` is the canonical
// document name shown in the UI (it originates as a PDF); `url` points at a
// self-contained, script-free HTML rendering of it that the in-app viewer
// (CarePlanDoc) embeds in a sandboxed iframe — a browser's native PDF plugin
// is blocked by that sandbox, whereas static HTML renders under it. A real
// downloadable PDF of the same content also lives at /docs/ellie-care-plan.pdf.
export const carePlanDocument = {
  url: '/docs/ellie-care-plan.html',
  fileName: 'Ellie-V-Care-Plan.pdf',
  lastUpdated: '2026-07-10T16:32:00-07:00',
}

// A personal bio of Ellie, written by Daniel (her son, primary caregiver),
// for the "Meet Ellie" page. This is the human context a clinical care plan
// doesn't hold — who she is, her rhythms, and what actually comforts her.
export const ellieProfile = {
  author: 'Daniel',
  authorRelation: 'her son',
  intro: [
    'Mom taught third grade for thirty-one years. She’s warm, a little stubborn, and still proud of her garden. Ask about her students and she’ll light right up.',
    'She prefers “Ellie.” Sit on her left — she’s hard of hearing on the right. If she mixes up times or people, just go along with her gently.',
    'Thank you for sitting with her. It means more than you know. — Daniel',
  ],
  // "Any hour, please don't" — the small things that reliably upset her.
  avoid: [
    { title: 'Overhead light', detail: 'hurts her eyes' },
    { title: 'Left arm', detail: 'it’s tender, go slow' },
    { title: 'Mint or peppermint scents', detail: '' },
    { title: 'Leaving without saying goodbye', detail: '' },
  ],
  // Her day, part by part. Each period expands into five fields on the page;
  // `turn` flags the pre-sundown anxiety window, which stays a standalone,
  // always-visible warning (never tucked inside a collapsed panel).
  day: [
    {
      icon: 'sun',
      part: 'Morning',
      label: 'her best hours',
      mood: 'Chatty and alert — her best stretch of the day. She often asks about her students.',
      activities: 'Reading the paper aloud together, looking through photo albums, a short walk if she’s steady on her feet.',
      places: 'The sunroom by the window, or the garden bench when it’s warm enough.',
      food: 'Applesauce or oatmeal, with lukewarm chamomile tea and a little honey. Offer small sips of water often — she forgets on her own.',
      problems: 'She may insist she’s already eaten. Don’t argue — offer a few bites anyway and try again a little later.',
    },
    {
      icon: 'cloud',
      part: 'Afternoon',
      label: 'often dozing',
      mood: 'Quieter and often dozing. Content to listen more than talk.',
      activities: 'Narrate the birds at the feeder — she can’t see them well anymore but loves hearing about them. Soft classical music is a favorite.',
      places: 'Her armchair by the feeder window, with the quilt within reach.',
      food: 'Not very hungry now — offer tea and a little fruit rather than a full meal.',
      problems: 'If she wakes confused about the time, go along with her gently and reorient with a calm, ordinary remark about the day.',
    },
    {
      icon: 'turn',
      part: 'Before 5:30pm',
      label: 'the turn',
      turn: true,
      detail: 'She gets anxious as the light fades. Dim the lamps and start the music before it happens — not after she’s already upset.',
    },
    {
      icon: 'moon',
      part: 'Evening',
      label: 'settling her',
      mood: 'Restless early on, then settles. She craves comfort and reassurance.',
      activities: 'A slow lavender hand-lotion massage — her most reliable comfort. Big-band music, and keep the lighting low and warm.',
      places: 'Settled in bed or her armchair under a warm blanket; she runs cold.',
      food: 'Something warm and easy — chamomile tea or warm milk. Nothing cold in the evening.',
      problems: 'If she becomes agitated, lower your voice, dim the lights further, and put on familiar music. Sudden bright light makes it worse.',
    },
  ],
  footerNote: 'Medication is handled by the nurse and family. If Ellie seems in pain, note the time and call.',
  askSuggestions: ['Can she have ice cream?', 'What helps in the evening?', 'What did she do for work?'],
}

// "Since your last visit" — an AI-style digest surfaced as a popup on the
// homepage. Items flagged `sensitive` (specific medications) or `clinicalOnly`
// (escalations that need a clinical response) are stripped for volunteers, who
// see only the behavioral/comfort summary.
export const visitDigest = {
  lastVisit: 'Tuesday · 2 days ago',
  needsYou: {
    clinicalOnly: true,
    count: 1,
    text: 'Bedside escalated at 2:04am — labored breathing, unrelieved pain. Lauren sounded frightened. You were paged. No follow-up logged yet.',
    cta: 'Review and respond',
  },
  pattern: {
    sensitive: true,
    text: 'PRN morphine 4× in 24 hrs — up from 1–2. Restlessness in three of the last four handoffs, mostly late afternoon. Cross-referenced with the aide’s skin-integrity note (left heel) from the same period.',
  },
  changed: [
    { icon: 'trend-down', title: 'Intake is dropping', detail: 'Declined food in 4 of 6 shifts. Fluids only, most days.' },
    { icon: 'moon', title: 'Sundowning is starting earlier', detail: 'Agitation now reported from ~4pm, not 5:30.' },
  ],
  working: [
    { status: 'yes', label: 'Lavender lotion — 5 of 5 shifts' },
    { status: 'mixed', label: 'Soft music — mixed' },
    { status: 'no', sensitive: true, label: 'Comfort meds — helped in 2 of 5' },
  ],
}

// The physician a nurse's medication-change request routes to.
export const authorizingPhysician = 'Dr. Okafor'

// What Bedside auto-attaches to a medication-change request as evidence.
export const medRequestSupportingRecord = [
  'PRN morphine 4× in 24 hrs',
  'Restlessness across 3 handoffs',
  'Escalation at 2:04am — labored breathing',
]

// Frequency options a nurse can propose in a titration request.
export const medFrequencyOptions = ['Every 4 hrs', 'Every 6 hrs', 'Every 8 hrs', 'Every 12 hrs', 'Twice daily', 'Once daily']

export const initialLogs = [
  {
    id: 'log-1',
    timestamp: '2026-07-09T09:15:00-07:00',
    author: 'Marcus (volunteer)',
    type: 'shift-note',
    summary: 'Ellie was alert and chatted for a bit. Ate about half her oatmeal. No pain complaints this morning.',
    urgency: 'green',
  },
  {
    id: 'log-3',
    timestamp: '2026-07-08T21:40:00-07:00',
    author: 'Priya (nurse)',
    type: 'shift-note',
    summary: 'Some restlessness before bed and mild shortness of breath. Repositioned and gave PRN morphine dose; settled within 20 minutes. Keep an eye on breathing overnight.',
    urgency: 'yellow',
    medicationGiven: {
      name: 'Morphine',
      dose: '5mg',
      route: 'PO',
      time: '20:50',
      reason: 'dyspnea/agitation',
    },
  },
  {
    id: 'log-4',
    timestamp: '2026-07-08T18:05:00-07:00',
    author: 'Daniel (family)',
    type: 'status',
    summary: 'Status set to Resting.',
    urgency: 'green',
  },
]
