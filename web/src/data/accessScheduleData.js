// Mock data for the Volunteer Access & Schedule feature. Kept separate from
// the core mockData.js since it introduces plural volunteers and family
// members that don't map onto the single-household demo model (one Daniel,
// one Marcus) used by the rest of the app — this feature is its own
// self-contained mock dataset, no real backend.

export const ACCESS_TIER_LABELS = {
  schedule_only: 'Schedule only',
  care_notes: 'Care notes access',
  full_coordinator: 'Full coordinator access',
}

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const volunteers = [
  { id: 'v1', name: 'Marcus Feld', avatarInitials: 'MF', specialty: 'Companionship', accessTier: 'care_notes', status: 'active' },
  { id: 'v2', name: 'Renee Ortiz', avatarInitials: 'RO', specialty: 'Meal prep', accessTier: 'schedule_only', status: 'active' },
  { id: 'v3', name: 'James Whitfield', avatarInitials: 'JW', specialty: 'Companionship', accessTier: 'full_coordinator', status: 'pending' },
]

export const shifts = [
  { id: 's1', volunteerId: 'v1', dayOfWeek: 'Mon', startTime: '15:00', endTime: '20:00', recurring: true },
  { id: 's2', volunteerId: 'v1', dayOfWeek: 'Wed', startTime: '15:00', endTime: '20:00', recurring: true },
  { id: 's3', volunteerId: 'v2', dayOfWeek: 'Tue', startTime: '11:00', endTime: '13:00', recurring: true },
  { id: 's4', volunteerId: 'v2', dayOfWeek: 'Fri', startTime: '11:00', endTime: '13:00', recurring: true },
  { id: 's5', volunteerId: 'v1', dayOfWeek: 'Sat', startTime: '15:00', endTime: '20:00', recurring: true },
  { id: 's6', volunteerId: null, dayOfWeek: 'Thu', startTime: '14:00', endTime: '18:00', recurring: false },
  { id: 's7', volunteerId: null, dayOfWeek: 'Sun', startTime: '15:00', endTime: '20:00', recurring: false },
]

// Family members only — the nurse (Priya) is intentionally NOT here. She's
// clinical staff, not family, so she neither appears in this list nor sees it
// on her own access view.
export const familyMembers = [
  { id: 'f1', name: 'Daniel Voss', permission: 'owner' },
  { id: 'f3', name: 'Marisol Voss', permission: 'can_edit' },
  { id: 'f4', name: 'Aunt Carol', permission: 'view_only' },
]

export const activityLog = [
  {
    id: 'a1',
    timestamp: '2026-07-09T14:20:00-07:00',
    description: 'Renee Ortiz added to the roster — Meal prep, Schedule only access',
    actorId: 'f1',
  },
  {
    id: 'a2',
    timestamp: '2026-07-08T09:05:00-07:00',
    description: "Marcus Feld's access changed to Care notes access",
    actorId: 'f1',
  },
  {
    id: 'a3',
    timestamp: '2026-07-05T18:40:00-07:00',
    description: 'James Whitfield invited — Companionship, Full coordinator access',
    actorId: 'f1',
  },
]

// Saved, reusable one-off people — adding one to a gap should be near-zero
// friction (no invite flow, no email).
export const backupPool = [
  {
    id: 'b1',
    name: 'Tom Chen',
    phone: '(555) 222-1010',
    notes: 'Neighbor, has been briefed on the care routine before',
    lastUsedAt: '2026-06-20T00:00:00-07:00',
  },
  {
    id: 'b2',
    name: 'Grace Lin',
    phone: '(555) 033-7788',
    notes: 'Volunteer coordinator, can cover in a pinch',
    lastUsedAt: null,
  },
]

// A guest fill-in is shift-scoped and time-boxed — it does NOT carry the
// slot's regular volunteer's accessTier, even if that volunteer has
// care_notes or full_coordinator. Access is meant to expire with the shift;
// this pass only models that (accessExpiresAt + an `isExpired` read), it
// doesn't enforce it anywhere.
export const guestFillIns = []
