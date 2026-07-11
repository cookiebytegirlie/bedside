import { useState } from 'react'
import {
  ACCESS_TIER_LABELS,
  DAYS,
  volunteers as initialVolunteers,
  shifts as initialShifts,
  familyMembers as initialFamilyMembers,
  activityLog as initialActivityLog,
  backupPool as initialBackupPool,
  guestFillIns as initialGuestFillIns,
} from '../../data/accessScheduleData'
import { formatHour, parseTimeToHours } from '../../utils/time'
import { PlusIcon, XIcon, UsersIcon, CalendarIcon, ActivityIcon, ChevronRightIcon } from '../icons'
import CoordinatorCard from './CoordinatorCard'

const DAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
const PERMISSION_LABELS = { owner: 'Owner', can_edit: 'Can edit', view_only: 'View only' }
const STATUS_STYLE = {
  active: 'bg-routine-bg text-routine-fg',
  pending: 'bg-watch-bg text-watch-fg',
  paused: 'bg-sage-100 text-muted',
}

// Real next-occurrence Date for a "Mon" + "15:00"-style shift — used only
// to give the guest fill-in's accessExpiresAt something concrete to show.
function nextOccurrence(dayOfWeek, timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  const now = new Date()
  const result = new Date(now)
  const diff = (DAY_INDEX[dayOfWeek] - now.getDay() + 7) % 7
  result.setDate(now.getDate() + diff)
  result.setHours(h, m, 0, 0)
  if (result < now) result.setDate(result.getDate() + 7)
  return result
}

function shiftTimeLabel(shift) {
  return `${formatHour(parseTimeToHours(shift.startTime))} – ${formatHour(parseTimeToHours(shift.endTime))}`
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto bg-white p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          <button type="button" onClick={onClose} className="text-muted" aria-label="Close">
            <XIcon width={20} height={20} strokeWidth={2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function VolunteerCard({ volunteer, readOnly, onChangeTier, onRemove, onCancelInvite }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage-100 text-base font-bold text-mist">
            {volunteer.avatarInitials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-ink">{volunteer.name}</p>
            <p className="truncate text-sm font-semibold text-muted">{volunteer.specialty}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLE[volunteer.status]}`}>
          {volunteer.status}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        {volunteer.status === 'pending' ? (
          <>
            <span className="text-sm font-semibold text-muted">Invite sent — awaiting response</span>
            {!readOnly && (
              <button type="button" onClick={() => onCancelInvite(volunteer.id)} className="shrink-0 text-sm font-bold text-attention-fg">
                Cancel invite
              </button>
            )}
          </>
        ) : readOnly ? (
          <span className="text-sm font-semibold text-ink">{ACCESS_TIER_LABELS[volunteer.accessTier]}</span>
        ) : (
          <select
            value={volunteer.accessTier}
            onChange={(e) => onChangeTier(volunteer.id, e.target.value)}
            className="rounded-xl border border-sage-200 bg-white px-2.5 py-2 text-sm font-semibold text-ink focus:border-mist focus:outline-none"
          >
            {Object.entries(ACCESS_TIER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        )}
        {!readOnly && volunteer.status !== 'pending' && (
          <button type="button" onClick={() => onRemove(volunteer.id)} className="shrink-0 text-sm font-bold text-attention-fg">
            Remove
          </button>
        )}
      </div>
    </div>
  )
}

function InviteVolunteerModal({ onClose, onInvite }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [tier, setTier] = useState('schedule_only')
  const [sending, setSending] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || sending) return
    setSending(true)
    // TODO: wire to a real invite/email flow once a backend exists. For
    // now this just adds a "pending" volunteer to local state.
    await new Promise((r) => setTimeout(r, 700))
    onInvite({ name: name.trim(), email: email.trim(), specialty: specialty.trim() || 'General support', accessTier: tier })
  }

  return (
    <Modal title="Invite a volunteer" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="w-full rounded-xl border border-sage-200 px-3.5 py-2.5 text-base font-medium text-ink placeholder:text-ink/30 focus:border-mist focus:outline-none"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email address"
          className="w-full rounded-xl border border-sage-200 px-3.5 py-2.5 text-base font-medium text-ink placeholder:text-ink/30 focus:border-mist focus:outline-none"
        />
        <input
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          placeholder="Specialty (e.g. Companionship, Meal prep)"
          className="w-full rounded-xl border border-sage-200 px-3.5 py-2.5 text-base font-medium text-ink placeholder:text-ink/30 focus:border-mist focus:outline-none"
        />
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted">Initial access</span>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="w-full rounded-xl border border-sage-200 bg-white px-3.5 py-2.5 text-base font-medium text-ink focus:border-mist focus:outline-none"
          >
            {Object.entries(ACCESS_TIER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={!name.trim() || !email.trim() || sending}
          className="w-full rounded-full bg-mist py-3 text-base font-bold text-white disabled:opacity-40"
        >
          {sending ? 'Sending invite…' : 'Send invite'}
        </button>
      </form>
    </Modal>
  )
}

function ScheduleGrid({ shifts, volunteers, guestFillIns, readOnly, onFillGap }) {
  const volunteerById = (id) => volunteers.find((v) => v.id === id)
  const guestForShift = (shiftId) => guestFillIns.find((g) => g.shiftId === shiftId)

  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <div className="flex gap-2" style={{ minWidth: '700px' }}>
        {DAYS.map((day) => {
          const dayShifts = shifts.filter((s) => s.dayOfWeek === day)
          return (
            <div key={day} className="w-24 shrink-0">
              <p className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-muted">{day}</p>
              <div className="space-y-2">
                {dayShifts.length === 0 && (
                  <div className="rounded-xl border border-dashed border-sage-200 p-2 text-center text-xs text-ink/30">—</div>
                )}
                {dayShifts.map((shift) => {
                  const vol = volunteerById(shift.volunteerId)
                  const guest = guestForShift(shift.id)

                  if (vol) {
                    return (
                      <div key={shift.id} className="rounded-xl bg-white p-2 shadow-card">
                        <p className="truncate text-xs font-bold text-ink">{vol.name.split(' ')[0]}</p>
                        <p className="text-[10px] font-semibold text-muted">{shiftTimeLabel(shift)}</p>
                      </div>
                    )
                  }

                  if (guest) {
                    const expired = new Date(guest.accessExpiresAt) < new Date()
                    return (
                      <div
                        key={shift.id}
                        className={`rounded-xl border-2 border-dashed p-2 ${expired ? 'border-sage-200 opacity-50' : 'border-clay-300 bg-clay-50'}`}
                      >
                        <p className="truncate text-xs font-bold text-ink">{guest.name.split(' ')[0]}</p>
                        <p className="text-[10px] font-bold text-clay-600">Guest{expired ? ' · expired' : ''}</p>
                        <p className="text-[10px] font-semibold text-muted">{shiftTimeLabel(shift)}</p>
                      </div>
                    )
                  }

                  return (
                    <div key={shift.id} className="rounded-xl border border-dashed border-sage-300 p-2 text-center">
                      <p className="text-[10px] font-semibold text-muted">{shiftTimeLabel(shift)}</p>
                      {!readOnly ? (
                        <button type="button" onClick={() => onFillGap(shift)} className="mt-1 text-[10px] font-bold text-mist underline">
                          Fill this gap
                        </button>
                      ) : (
                        <p className="mt-1 text-[10px] font-semibold text-ink/30">Open</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FillGapModal({ shift, backupPool, onClose, onAssignFromPool, onAssignNew }) {
  const [mode, setMode] = useState('pool')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const submitNew = (e) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    onAssignNew({ name: name.trim(), phone: phone.trim() })
  }

  return (
    <Modal title={`Fill ${shift.dayOfWeek} ${shiftTimeLabel(shift)}`} onClose={onClose}>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('pool')}
          className={`flex-1 rounded-full py-2 text-sm font-bold ${mode === 'pool' ? 'bg-mist text-white' : 'bg-sage-50 text-ink'}`}
        >
          From backup pool
        </button>
        <button
          type="button"
          onClick={() => setMode('new')}
          className={`flex-1 rounded-full py-2 text-sm font-bold ${mode === 'new' ? 'bg-mist text-white' : 'bg-sage-50 text-ink'}`}
        >
          Someone new
        </button>
      </div>

      {mode === 'pool' ? (
        <div className="space-y-2">
          {backupPool.length === 0 && <p className="text-sm text-muted">No backup volunteers saved yet.</p>}
          {backupPool.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => onAssignFromPool(person)}
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-sage-200 px-3.5 py-3 text-left"
            >
              <span>
                <span className="block text-sm font-bold text-ink">{person.name}</span>
                <span className="block text-xs font-semibold text-muted">
                  {person.lastUsedAt ? `Last covered ${new Date(person.lastUsedAt).toLocaleDateString()}` : 'Not used yet'}
                </span>
              </span>
              <ChevronRightIcon width={16} height={16} strokeWidth={2} className="shrink-0 text-mist" />
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={submitNew} className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            className="w-full rounded-xl border border-sage-200 px-3.5 py-2.5 text-base font-medium text-ink placeholder:text-ink/30 focus:border-mist focus:outline-none"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            className="w-full rounded-xl border border-sage-200 px-3.5 py-2.5 text-base font-medium text-ink placeholder:text-ink/30 focus:border-mist focus:outline-none"
          />
          <button
            type="submit"
            disabled={!name.trim() || !phone.trim()}
            className="w-full rounded-full bg-mist py-3 text-base font-bold text-white disabled:opacity-40"
          >
            Assign to this shift
          </button>
        </form>
      )}
    </Modal>
  )
}

function FamilyMembersList({ familyMembers, isOwner, onChangePermission }) {
  return (
    <div className="space-y-2">
      {familyMembers.map((m) => (
        <div key={m.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white p-3.5 shadow-card">
          <p className="text-sm font-bold text-ink">{m.name}</p>
          {isOwner && m.permission !== 'owner' ? (
            <select
              value={m.permission}
              onChange={(e) => onChangePermission(m.id, e.target.value)}
              className="rounded-xl border border-sage-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-ink focus:border-mist focus:outline-none"
            >
              <option value="can_edit">Can edit</option>
              <option value="view_only">View only</option>
            </select>
          ) : (
            <span className="text-sm font-semibold text-muted">{PERMISSION_LABELS[m.permission]}</span>
          )}
        </div>
      ))}
    </div>
  )
}

function ActivityLogSection({ entries, familyMembers }) {
  const actorName = (id) => familyMembers.find((f) => f.id === id)?.name || 'Someone'
  return (
    <ul className="space-y-2.5 bg-white p-4 shadow-card">
      {entries.slice(0, 6).map((entry) => (
        <li key={entry.id} className="text-sm">
          <span className="font-semibold text-ink">{entry.description}</span>
          <span className="block text-xs font-semibold text-muted">
            {actorName(entry.actorId)} ·{' '}
            {new Date(entry.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </span>
        </li>
      ))}
    </ul>
  )
}

function BackupPoolSection({ pool, readOnly, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    onAdd({ name: name.trim(), phone: phone.trim(), notes: notes.trim() })
    setName('')
    setPhone('')
    setNotes('')
    setAdding(false)
  }

  return (
    <div className="space-y-2">
      {pool.map((person) => (
        <div key={person.id} className="flex items-start justify-between gap-2 rounded-2xl bg-white p-3.5 shadow-card">
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">{person.name}</p>
            <p className="text-xs font-semibold text-muted">{person.phone}</p>
            {person.notes && <p className="mt-0.5 text-xs text-ink/60">{person.notes}</p>}
          </div>
          {!readOnly && (
            <button type="button" onClick={() => onRemove(person.id)} className="shrink-0 text-xs font-bold text-attention-fg">
              Remove
            </button>
          )}
        </div>
      ))}

      {!readOnly &&
        (adding ? (
          <form onSubmit={submit} className="space-y-2 bg-white p-3.5 shadow-card">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name"
              className="w-full rounded-xl border border-sage-200 px-3 py-2 text-sm font-medium text-ink placeholder:text-ink/30 focus:border-mist focus:outline-none"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              className="w-full rounded-xl border border-sage-200 px-3 py-2 text-sm font-medium text-ink placeholder:text-ink/30 focus:border-mist focus:outline-none"
            />
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              className="w-full rounded-xl border border-sage-200 px-3 py-2 text-sm font-medium text-ink placeholder:text-ink/30 focus:border-mist focus:outline-none"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setAdding(false)} className="flex-1 rounded-full border border-sage-200 py-2 text-sm font-bold text-muted">
                Cancel
              </button>
              <button type="submit" disabled={!name.trim() || !phone.trim()} className="flex-1 rounded-full bg-mist py-2 text-sm font-bold text-white disabled:opacity-40">
                Save
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-1.5 border border-dashed border-sage-300 py-3 text-sm font-bold text-mist"
          >
            <PlusIcon width={16} height={16} strokeWidth={2} />
            Add to backup pool
          </button>
        ))}
    </div>
  )
}

export default function FamilyAccessPanel({
  viewer,
  isOwner = false,
  readOnly = false,
  canEditSchedule = true,
  showFamilyMembers = true,
  canManageBackupPool = true,
  coordinator = null,
}) {
  const [volunteers, setVolunteers] = useState(initialVolunteers)
  const [shifts] = useState(initialShifts)
  const [familyMembers, setFamilyMembers] = useState(initialFamilyMembers)
  const [activityLog, setActivityLog] = useState(initialActivityLog)
  const [backupPool, setBackupPool] = useState(initialBackupPool)
  const [guestFillIns, setGuestFillIns] = useState(initialGuestFillIns)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [fillGapShift, setFillGapShift] = useState(null)

  const logActivity = (description) => {
    setActivityLog((prev) => [
      { id: `a-${Date.now()}`, timestamp: new Date().toISOString(), description, actorId: viewer?.id ?? 'unknown' },
      ...prev,
    ])
  }

  const handleChangeTier = (id, tier) => {
    const vol = volunteers.find((v) => v.id === id)
    setVolunteers((prev) => prev.map((v) => (v.id === id ? { ...v, accessTier: tier } : v)))
    logActivity(`${vol.name}'s access changed to ${ACCESS_TIER_LABELS[tier]}`)
  }

  const handleRemove = (id) => {
    const vol = volunteers.find((v) => v.id === id)
    setVolunteers((prev) => prev.filter((v) => v.id !== id))
    logActivity(`${vol.name} removed from the roster`)
  }

  const handleCancelInvite = (id) => {
    const vol = volunteers.find((v) => v.id === id)
    setVolunteers((prev) => prev.filter((v) => v.id !== id))
    logActivity(`Invite to ${vol.name} canceled`)
  }

  const handleInvite = ({ name, email, specialty, accessTier }) => {
    const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    setVolunteers((prev) => [...prev, { id: `v-${Date.now()}`, name, avatarInitials: initials, specialty, accessTier, status: 'pending' }])
    logActivity(`${name} invited — ${specialty}, ${ACCESS_TIER_LABELS[accessTier]}`)
    setInviteOpen(false)
  }

  const handleChangePermission = (id, permission) => {
    const member = familyMembers.find((f) => f.id === id)
    setFamilyMembers((prev) => prev.map((f) => (f.id === id ? { ...f, permission } : f)))
    logActivity(`${member.name}'s permission changed to ${PERMISSION_LABELS[permission]}`)
  }

  const assignGuest = (shift, { name, phone, sourcedFrom }) => {
    const expiresAt = nextOccurrence(shift.dayOfWeek, shift.endTime)
    setGuestFillIns((prev) => [
      ...prev,
      { id: `g-${Date.now()}`, name, phone, shiftId: shift.id, accessExpiresAt: expiresAt.toISOString(), sourcedFrom, addedBy: viewer?.id ?? 'unknown' },
    ])
    logActivity(`${name.split(' ')[0]} covering ${shift.dayOfWeek} ${shiftTimeLabel(shift)} (one-off)`)
    setFillGapShift(null)
  }

  const handleAssignFromPool = (person) => {
    assignGuest(fillGapShift, { name: person.name, phone: person.phone, sourcedFrom: 'backup_pool' })
    setBackupPool((prev) => prev.map((p) => (p.id === person.id ? { ...p, lastUsedAt: new Date().toISOString() } : p)))
  }

  const handleAssignNew = ({ name, phone }) => {
    assignGuest(fillGapShift, { name, phone, sourcedFrom: 'new' })
  }

  const handleAddBackupPerson = (person) => {
    setBackupPool((prev) => [...prev, { id: `b-${Date.now()}`, ...person, lastUsedAt: null }])
  }

  const handleRemoveBackupPerson = (id) => {
    setBackupPool((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <div className="space-y-6">
      {readOnly && (
        <div className="bg-sage-50 p-3.5 text-sm font-medium text-ink/70 shadow-card">
          You have view-only access — ask {familyMembers.find((f) => f.permission === 'owner')?.name} to make changes.
        </div>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-xl font-bold text-ink">
            <UsersIcon width={18} height={18} strokeWidth={2} />
            Volunteers
          </h2>
          {!readOnly && (
            <button type="button" onClick={() => setInviteOpen(true)} className="flex items-center gap-1 text-sm font-bold text-mist">
              <PlusIcon width={16} height={16} strokeWidth={2.5} />
              Invite
            </button>
          )}
        </div>
        <div className="space-y-2.5">
          {volunteers.map((v) => (
            <VolunteerCard
              key={v.id}
              volunteer={v}
              readOnly={readOnly}
              onChangeTier={handleChangeTier}
              onRemove={handleRemove}
              onCancelInvite={handleCancelInvite}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-xl font-bold text-ink">
          <CalendarIcon width={17} height={17} strokeWidth={2} />
          Weekly schedule
        </h2>
        <ScheduleGrid
          shifts={shifts}
          volunteers={volunteers}
          guestFillIns={guestFillIns}
          readOnly={readOnly || !canEditSchedule}
          onFillGap={setFillGapShift}
        />
        {!readOnly && !canEditSchedule && (
          <p className="mt-1.5 text-xs font-semibold text-muted">
            You can view the schedule, but only the household owner can edit it.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-bold text-ink">Backup volunteers</h2>
        <BackupPoolSection
          pool={backupPool}
          readOnly={readOnly || !canManageBackupPool}
          onAdd={handleAddBackupPerson}
          onRemove={handleRemoveBackupPerson}
        />
      </section>

      {coordinator && <CoordinatorCard coordinator={coordinator} />}

      {showFamilyMembers && (
        <section>
          <h2 className="mb-2 text-xl font-bold text-ink">Family members</h2>
          <FamilyMembersList familyMembers={familyMembers} isOwner={isOwner} onChangePermission={handleChangePermission} />
        </section>
      )}

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-xl font-bold text-ink">
          <ActivityIcon width={17} height={17} strokeWidth={2} />
          Activity log
        </h2>
        <ActivityLogSection entries={activityLog} familyMembers={familyMembers} />
      </section>

      {inviteOpen && <InviteVolunteerModal onClose={() => setInviteOpen(false)} onInvite={handleInvite} />}
      {fillGapShift && (
        <FillGapModal
          shift={fillGapShift}
          backupPool={backupPool}
          onClose={() => setFillGapShift(null)}
          onAssignFromPool={handleAssignFromPool}
          onAssignNew={handleAssignNew}
        />
      )}
    </div>
  )
}
