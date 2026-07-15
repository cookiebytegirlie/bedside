import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useHousehold } from '../state/HouseholdContext'
import { canSeeMeds, isNurse } from '../utils/roles'
import OnDutyHeader from '../components/OnDutyHeader'
import { BellIcon, AlertTriangleIcon, PhoneIcon, CheckIcon, ChevronRightIcon, ArrowLeftIcon } from '../components/icons'

const KEPT_WORD = { green: 'Routine', yellow: 'Keep an eye on', red: 'Needs attention' }

// Per-kind presentation. Escalations carry the red attention accent (a real,
// human-confirmed page); disagreements carry the amber watch accent (passive
// awareness — no page was sent).
const KIND = {
  escalation: {
    title: 'Needs you',
    Icon: BellIcon,
    iconWrap: 'bg-attention-tint text-attention-fg',
    accentText: 'text-attention-fg',
  },
  disagreement: {
    title: 'Flagged for review',
    Icon: AlertTriangleIcon,
    iconWrap: 'bg-watch-tint text-watch-fg',
    accentText: 'text-watch-fg',
  },
}

const STATUS_PILL = {
  acknowledged: { label: 'Acknowledged', className: 'bg-track text-muted' },
  resolved: { label: 'Resolved', className: 'bg-routine-tint text-routine-fg' },
}

function telHref(phone) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

function formatShort(iso) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function formatFull(iso) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function aiReasonOf(log) {
  return log.aiUrgencyReason || log.aiResponse?.urgency_reason || ''
}

function Row({ item, onOpen, nurse }) {
  const k = KIND[item.kind]
  const isNew = item.status === 'new'
  const pill = STATUS_PILL[item.status]
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className="relative flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-track"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${k.iconWrap}`}>
        <k.Icon width={18} height={18} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {isNew && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-attention-fg" />}
          <span className={`truncate text-[15px] tracking-tight ${isNew ? 'font-semibold text-ink' : 'font-medium text-muted'}`}>
            {k.title}
          </span>
          <span className="ml-auto shrink-0 text-[11px] font-medium text-faint">{formatShort(item.timestamp)}</span>
        </span>
        <span className="mt-0.5 block truncate text-[13px] font-medium text-muted">{item.log.summary}</span>
        {item.kind === 'escalation' && (
          <span className="mt-0.5 block truncate text-[11px] font-medium text-faint">
            Owned by {nurse.name} · on-call nurse
          </span>
        )}
        {pill && (
          <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${pill.className}`}>
            {pill.label}
          </span>
        )}
      </span>
      <ChevronRightIcon width={16} height={16} strokeWidth={2.5} className="shrink-0 text-faint" />
    </button>
  )
}

function DetailField({ label, children }) {
  return (
    <div className="border-t border-line pt-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">{label}</p>
      {children}
    </div>
  )
}

function Detail({ item, onBack, householdId, nurse, by, isNurseUser, onResolve, onAcknowledge, onMarkSeen }) {
  const navigate = useNavigate()
  const k = KIND[item.kind]
  const { log } = item
  const reason = aiReasonOf(log)
  const isEscalation = item.kind === 'escalation'
  const pill = STATUS_PILL[item.status]
  // Local note-capture state: `formOpen` reveals the note field for the
  // acknowledge (disagreement) / resolve (escalation) step; `note` is its text.
  const [formOpen, setFormOpen] = useState(false)
  const [note, setNote] = useState('')

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-[14px] font-semibold text-muted active:scale-[0.98]"
      >
        <ArrowLeftIcon width={18} height={18} strokeWidth={2} />
        All notifications
      </button>

      <div>
        <div className={`flex items-center gap-2 ${k.accentText}`}>
          <k.Icon width={18} height={18} strokeWidth={2} />
          <p className="text-[13px] font-semibold uppercase tracking-wide">{k.title}</p>
          {pill && (
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${pill.className}`}>
              {pill.label}
            </span>
          )}
        </div>
        <h1 className="mt-1.5 text-[22px] font-bold leading-tight tracking-tight text-ink">{log.summary}</h1>
      </div>

      <div className="rounded-card border border-line bg-white p-4">
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">Logged by</p>
            <p className="mt-0.5 text-[14px] font-medium text-ink">{log.author}</p>
            <p className="text-[12px] font-medium text-muted">{formatFull(log.timestamp)}</p>
          </div>

          <DetailField label="Urgency">
            {isEscalation ? (
              <p className="text-[13px] font-medium leading-snug text-ink">
                Flagged <span className="font-semibold text-attention-fg">Needs attention</span> and confirmed by the
                caregiver — the on-call nurse was paged automatically
                {log.escalatedAt ? ` at ${new Date(log.escalatedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : ''}.
              </p>
            ) : (
              <p className="text-[13px] font-medium leading-snug text-ink">
                Caregiver logged this <span className="font-semibold">{KEPT_WORD[log.keptUrgency] ?? log.keptUrgency}</span>;
                Bedside read it <span className="font-semibold text-watch-fg">Needs attention</span>. Shared for awareness —
                no page was sent.
              </p>
            )}
          </DetailField>

          {log.rawTranscript && (
            <DetailField label="Caregiver's note">
              <p className="text-[13px] font-medium italic leading-snug text-ink/80">“{log.rawTranscript}”</p>
            </DetailField>
          )}

          {reason && (
            <DetailField label="Bedside's read">
              <p className="text-[13px] font-medium leading-snug text-ink/80">{reason}</p>
            </DetailField>
          )}
        </div>
      </div>

      {isEscalation ? (
        <div className="space-y-2">
          {/* Ownership is explicit and never ambiguous — the on-call nurse owns
              clinical closure. Any family "seen" is shown alongside it. */}
          <div>
            <p className="text-[12px] font-medium text-muted">Owned by {nurse.name} · on-call nurse</p>
            {item.familySeenBy && (
              <p className="mt-0.5 text-[12px] font-medium text-muted">
                Seen by family · {item.familySeenBy}
                {item.familySeenAt ? ` · ${formatShort(item.familySeenAt)}` : ''}
              </p>
            )}
          </div>

          {!isNurseUser ? (
            // FAMILY — may record that they saw it (no clinical transition) and
            // call the nurse line. Acknowledging never resolves or changes the
            // clinical status; the nurse owns that.
            <>
              {!item.familySeenBy && (
                <button
                  type="button"
                  onClick={() => {
                    onMarkSeen(item.id, { by })
                    onBack()
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-btn bg-ink py-3 text-[15px] font-semibold text-white active:scale-[0.99]"
                >
                  <CheckIcon width={17} height={17} strokeWidth={2.5} />
                  Acknowledge — seen by family
                </button>
              )}
              <a
                href={telHref(nurse.phone)}
                className="flex w-full items-center justify-center gap-2 rounded-btn border border-line py-3 text-[15px] font-semibold text-ink active:scale-[0.99]"
              >
                <PhoneIcon width={17} height={17} strokeWidth={2} />
                Call the nurse line
              </a>
            </>
          ) : (
          <>
          {/* NURSE — full clinical lifecycle. Control varies by status. */}
          {item.status === 'new' && (
            <button
              type="button"
              onClick={() => {
                onAcknowledge(item.id, { by })
                onBack()
              }}
              className="flex w-full items-center justify-center gap-2 rounded-btn bg-ink py-3 text-[15px] font-semibold text-white active:scale-[0.99]"
            >
              <CheckIcon width={17} height={17} strokeWidth={2.5} />
              Acknowledge
            </button>
          )}

          {item.status === 'acknowledged' &&
            (formOpen ? (
              <div className="space-y-2 rounded-card border border-line bg-white p-3">
                <label className="block text-[13px] font-semibold text-ink">How was this resolved?</label>
                <textarea
                  autoFocus
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. Nurse assessed, repositioned and gave PRN morphine; breathing eased within 20 min."
                  className="w-full resize-none rounded-btn border border-line bg-white p-2.5 text-[14px] font-medium leading-snug text-ink placeholder:text-faint focus:border-ink focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="flex-1 rounded-btn border border-line py-2.5 text-[14px] font-semibold text-muted active:scale-[0.99]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!note.trim()}
                    onClick={() => {
                      onResolve(item.id, { note: note.trim(), by })
                      onBack()
                    }}
                    className="flex-1 rounded-btn bg-ink py-2.5 text-[14px] font-semibold text-white disabled:opacity-40"
                  >
                    Confirm resolved
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-btn bg-track px-4 py-3 text-[13px] font-medium leading-snug text-muted">
                  In progress — acknowledged by {item.by ?? 'someone'}
                  {item.at ? ` · ${formatShort(item.at)}` : ''}
                </div>
                <button
                  type="button"
                  onClick={() => setFormOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-btn bg-ink py-3 text-[15px] font-semibold text-white active:scale-[0.99]"
                >
                  <CheckIcon width={17} height={17} strokeWidth={2.5} />
                  Resolve
                </button>
              </>
            ))}

          {item.status === 'resolved' && (
            <div className="rounded-btn bg-routine-tint px-4 py-3">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-routine-fg">
                <CheckIcon width={15} height={15} strokeWidth={2.5} />
                Resolved by {item.by ?? 'someone'}
                {item.at ? ` · ${formatShort(item.at)}` : ''}
              </p>
              {item.note && <p className="mt-1.5 text-[13px] font-medium leading-snug text-ink/80">“{item.note}”</p>}
            </div>
          )}

          {/* Supporting actions — Review-and-respond greys out once resolved. */}
          {item.status === 'resolved' ? (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="w-full cursor-not-allowed rounded-btn bg-track py-3 text-[15px] font-semibold text-faint"
            >
              Review and respond
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/household/${householdId}/settings/request-med`)}
              className="w-full rounded-btn border border-line py-3 text-[15px] font-semibold text-ink active:scale-[0.99]"
            >
              Review and respond
            </button>
          )}
          <a
            href={telHref(nurse.phone)}
            className="flex w-full items-center justify-center gap-2 rounded-btn border border-line py-3 text-[15px] font-semibold text-ink active:scale-[0.99]"
          >
            <PhoneIcon width={17} height={17} strokeWidth={2} />
            Call the nurse line
          </a>
          </>
          )}
        </div>
      ) : (
        // Disagreement lifecycle — new: acknowledge with an OPTIONAL note.
        // acknowledged: an "In progress" summary plus a Resolve step that
        // captures a REQUIRED note to finish/close it. resolved: terminal.
        <div className="space-y-2">
          {item.status === 'new' &&
            (formOpen ? (
              <div className="space-y-2 rounded-card border border-line bg-white p-3">
                <label className="block text-[13px] font-semibold text-ink">Add a note on how this was handled — optional</label>
                <textarea
                  autoFocus
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. Watched at the next feeding — no further coughing; mentioned to the nurse."
                  className="w-full resize-none rounded-btn border border-line bg-white p-2.5 text-[14px] font-medium leading-snug text-ink placeholder:text-faint focus:border-ink focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="flex-1 rounded-btn border border-line py-2.5 text-[14px] font-semibold text-muted active:scale-[0.99]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAcknowledge(item.id, { note: note.trim() || null, by })
                      onBack()
                    }}
                    className="flex-1 rounded-btn bg-ink py-2.5 text-[14px] font-semibold text-white"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-btn bg-ink py-3 text-[15px] font-semibold text-white active:scale-[0.99]"
              >
                <CheckIcon width={17} height={17} strokeWidth={2.5} />
                Acknowledge
              </button>
            ))}

          {item.status === 'acknowledged' &&
            (formOpen ? (
              <div className="space-y-2 rounded-card border border-line bg-white p-3">
                <label className="block text-[13px] font-semibold text-ink">How was this resolved?</label>
                <textarea
                  autoFocus
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. Followed up with the nurse; watched over two feedings — settled, no aspiration signs."
                  className="w-full resize-none rounded-btn border border-line bg-white p-2.5 text-[14px] font-medium leading-snug text-ink placeholder:text-faint focus:border-ink focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="flex-1 rounded-btn border border-line py-2.5 text-[14px] font-semibold text-muted active:scale-[0.99]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!note.trim()}
                    onClick={() => {
                      onResolve(item.id, { note: note.trim(), by })
                      onBack()
                    }}
                    className="flex-1 rounded-btn bg-ink py-2.5 text-[14px] font-semibold text-white disabled:opacity-40"
                  >
                    Confirm resolved
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-btn bg-track px-4 py-3 text-[13px] leading-snug text-ink">
                  <p className="font-semibold">
                    Acknowledged by {item.by ?? 'someone'}
                    {item.at ? ` · ${formatShort(item.at)}` : ''}
                  </p>
                  {item.note && <p className="mt-1 font-medium text-ink/80">“{item.note}”</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setFormOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-btn bg-ink py-3 text-[15px] font-semibold text-white active:scale-[0.99]"
                >
                  <CheckIcon width={17} height={17} strokeWidth={2.5} />
                  Resolve
                </button>
              </>
            ))}

          {item.status === 'resolved' && (
            <div className="rounded-btn bg-routine-tint px-4 py-3">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-routine-fg">
                <CheckIcon width={15} height={15} strokeWidth={2.5} />
                Resolved by {item.by ?? 'someone'}
                {item.at ? ` · ${formatShort(item.at)}` : ''}
              </p>
              {item.note && <p className="mt-1.5 text-[13px] font-medium leading-snug text-ink/80">“{item.note}”</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Notifications() {
  const { householdId } = useParams()
  const { activeProfile, notifications, contacts, acknowledgeNotification, resolveNotification, markSeenByFamily } =
    useHousehold()
  const seeMeds = canSeeMeds(activeProfile?.role)
  const [selectedId, setSelectedId] = useState(null)
  const selected = notifications.find((n) => n.id === selectedId)

  return (
    <>
      <OnDutyHeader />
      <main className="flex-1 bg-white px-4 pb-10 pt-6">
        {!seeMeds ? (
          <div className="mt-10 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-track text-muted">
              <BellIcon width={22} height={22} strokeWidth={1.8} />
            </span>
            <h1 className="text-[19px] font-semibold tracking-tight text-ink">Notifications</h1>
            <p className="mx-auto mt-1 max-w-xs text-[13px] font-medium leading-snug text-muted">
              Escalations and review flags are shared with the nurse and family. Your role doesn’t have access here.
            </p>
          </div>
        ) : selected ? (
          <Detail
            key={selected.id}
            item={selected}
            onBack={() => setSelectedId(null)}
            householdId={householdId}
            nurse={contacts.hospiceTeam[0]}
            by={activeProfile?.name}
            isNurseUser={isNurse(activeProfile?.role)}
            onResolve={resolveNotification}
            onAcknowledge={acknowledgeNotification}
            onMarkSeen={markSeenByFamily}
          />
        ) : (
          <>
            <h1 className="mb-1 text-[30px] font-bold leading-tight tracking-tighter text-ink">Notifications</h1>
            <p className="mb-6 text-[14px] font-medium text-muted">
              Escalations and entries Bedside flagged for review.
            </p>

            {notifications.length === 0 ? (
              <div className="mt-10 flex flex-col items-center text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-routine-tint text-routine-fg">
                  <CheckIcon width={24} height={24} strokeWidth={2.5} />
                </span>
                <p className="text-[15px] font-semibold text-ink">You’re all caught up</p>
                <p className="mt-1 text-[13px] font-medium text-muted">No escalations or review flags right now.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-card border border-line bg-white [&>button+button]:border-t [&>button+button]:border-line">
                {notifications.map((item) => (
                  <Row key={item.id} item={item} onOpen={setSelectedId} nurse={contacts.hospiceTeam[0]} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}
