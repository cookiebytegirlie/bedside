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
    { name: 'Priya Anand', role: 'Primary Hospice Nurse', phone: '(555) 044-5566', availability: 'On-call 24/7' },
    { name: 'Grace Lin', role: 'Volunteer Coordinator', phone: '(555) 033-7788', availability: 'Weekdays 9am–5pm' },
    { name: 'Dr. Sam Okafor', role: 'Hospice Physician', phone: '(555) 099-1122', availability: 'Via nurse line' },
  ],
  family: [
    { name: 'Daniel Voss', role: 'Son · Primary caregiver', phone: '(555) 011-2233' },
    { name: 'Marisol Voss', role: 'Daughter-in-law', phone: '(555) 011-9988' },
  ],
}

export const carePlan = {
  updatedAt: '2026-07-06T14:00:00-07:00',
  codeStatus: 'DNR (Do Not Resuscitate) — on file with hospice.',
  allergies: ['Penicillin', 'Latex'],
  medications: [
    { name: 'Morphine (oral solution)', dose: '5mg', schedule: 'Every 4 hours as needed for pain' },
    { name: 'Lorazepam', dose: '0.5mg', schedule: 'Twice daily, morning and evening' },
    { name: 'Senna-S', dose: '2 tablets', schedule: 'Nightly' },
  ],
  preferences: [
    'Prefers to be called "Ellie", not "Eleanor"',
    'Enjoys soft classical music in the afternoon',
    'Does not want overhead lights on after 7pm — lamp only',
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
    'Repositioning every 2 hours to prevent pressure sores',
    'Oral care after each meal',
    'Family prefers a text update after every shift, even if uneventful',
  ],
  emergencyContacts: [
    { name: 'Daniel Voss (son)', phone: '(555) 011-2233' },
    { name: 'Hospice Nurse Line', phone: '(555) 044-5566' },
  ],
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
