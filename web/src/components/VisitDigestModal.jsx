import { useEffect, useState } from 'react'
import { visitDigest as fallbackDigest } from '../mockData'
import { canSeeMeds } from '../utils/roles'
import { useHousehold } from '../state/HouseholdContext'
import { CheckIcon, XIcon, BellIcon, TrendUpIcon, TrendDownIcon, MoonIcon, RefreshIcon, ChevronRightIcon } from './icons'

const CHANGE_ICON = { 'trend-down': TrendDownIcon, 'trend-up': TrendUpIcon, moon: MoonIcon }

function WorkingRow({ status, label }) {
  return (
    <div className="flex items-center gap-2.5">
      {status === 'yes' && <CheckIcon width={16} height={16} strokeWidth={2.5} className="shrink-0 text-routine-fg" />}
      {status === 'no' && <XIcon width={16} height={16} strokeWidth={2.5} className="shrink-0 text-attention-fg" />}
      {status === 'mixed' && <span className="h-3 w-3 shrink-0 rounded-full border-2 border-watch-fg" />}
      <span className="text-[13px] font-medium text-ink">{label}</span>
    </div>
  )
}

// One row of the "What's changed" list. Collapsed: icon + title + [+].
// Expanded: title takes on the soft track fill and the agent's full detail
// appears below, separated by a hairline. Detail is never truncated — we're
// only hiding the vertical space until the user asks for it.
function ChangedChip({ item, isFirst }) {
  const [open, setOpen] = useState(false)
  const Icon = CHANGE_ICON[item.icon] || TrendDownIcon
  return (
    <div className={isFirst ? '' : 'border-t border-line'}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
          open ? 'bg-track' : 'bg-white active:bg-track'
        }`}
      >
        <Icon width={17} height={17} strokeWidth={2} className="shrink-0 text-icon" />
        <p className={`min-w-0 flex-1 text-[14px] tracking-tight text-ink ${open ? 'font-bold' : 'font-semibold'}`}>
          {item.title}
        </p>
        <span aria-hidden className="text-[18px] font-medium leading-none text-faint">
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <div className="border-t border-line bg-white px-4 py-3">
          <p className="text-[13px] font-medium leading-snug text-ink/70">{item.detail}</p>
        </div>
      )}
    </div>
  )
}

// Role-gated "Since your last visit" summary. Nurses/family see the full
// digest (escalations + medication patterns); volunteers see only the
// behavioral/comfort summary.
//
// This is a pure reader of HouseholdContext.digest. The get-trends fetch
// lives in HouseholdContext (fire-once at provider mount) so closing this
// modal never cancels it and reopening never restarts it.
export default function VisitDigestModal({ open, onClose, role, onOpenInbox }) {
  const {
    unreadNotificationCount,
    digest,
    digestPending,
    refreshDigest,
    markDigestSeen,
  } = useHousehold()

  // Anything the user actually looks at counts as "seen":
  //  - Opening the modal (open flips true) marks seen
  //  - A refresh with the modal already open resets seen inside the context,
  //    so we re-mark it when the fresh fetch resolves (pending flips false)
  //    to keep the toast from firing under a modal the user is already in.
  useEffect(() => {
    if (open && !digestPending) markDigestSeen()
  }, [open, digestPending, markDigestSeen])

  if (!open) return null

  // While pending, render the "Drafting your update…" panel (spec §3 copy).
  // Once resolved, `digest` is the real payload from get-trends OR the
  // sample fallback carrying _fallback: true. If for some reason `digest`
  // is still null (shouldn't happen — provider fires on mount) fall back
  // to the sample so the render never crashes.
  const rendered = digest ?? { ...fallbackDigest, _fallback: true }
  const seeMeds = canSeeMeds(role)
  const working = (rendered.working ?? []).filter((w) => seeMeds || !w.sensitive)
  const attribution = digestPending
    ? 'Drafting your update…'
    : rendered._fallback
      ? 'Live analysis unavailable — showing a sample digest'
      : 'Analyzed your recent shift logs · just now'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-card border border-line bg-white p-5 shadow-soft sm:rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-ink">Since your last visit</h2>
            <p className="text-[12px] font-semibold text-muted">{rendered.lastVisit}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-muted">
              {digestPending && (
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ink" aria-hidden />
              )}
              {attribution}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={refreshDigest}
              disabled={digestPending}
              aria-label="Refresh digest"
              className="rounded-full p-1 text-muted active:scale-90 disabled:opacity-60"
            >
              <RefreshIcon width={20} height={20} strokeWidth={2} className={digestPending ? 'animate-spin' : undefined} />
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="text-muted">
              <XIcon width={22} height={22} strokeWidth={2} />
            </button>
          </div>
        </div>

        {digestPending ? (
          // Explicit pending panel with a working close (the wrapper onClick
          // already closes; this dedicated button makes the intent obvious
          // and gives thumb-reach parity with the X in the header).
          <div className="rounded-card border border-line bg-white p-6 text-center">
            <div
              className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-line border-t-ink"
              aria-hidden
            />
            <p className="text-[15px] font-semibold tracking-tight text-ink">Drafting your update…</p>
            <p className="mt-1.5 text-[13px] font-medium leading-snug text-muted">
              Reading your recent shift logs. This takes about a minute.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-btn border border-line py-2.5 text-[14px] font-semibold text-ink active:scale-[0.99]"
            >
              Close — I’ll get a ping
            </button>
            <p className="mt-2 text-[11px] font-medium text-faint">
              Keeps running if you leave. We’ll notify you when it’s ready.
            </p>
          </div>
        ) : (
        <div className="space-y-4">
          {/* Glance-first headline (Section 4). One-sentence tldr from the
              agent, or the sample's if we're on fallback. Display headline
              only — no fill / callout box — to stay in Sydney's monochrome. */}
          {rendered.headline && (
            <p className="text-[18px] font-bold leading-snug tracking-tight text-ink">
              {rendered.headline}
            </p>
          )}

          {/* Actionable items live in the notification center now — the digest
              just shows a glanceable count that links out. Only genuinely-open
              (unacknowledged / unresolved) items are counted. */}
          {seeMeds && unreadNotificationCount > 0 && (
            <button
              type="button"
              onClick={onOpenInbox}
              className="flex w-full items-center gap-2.5 rounded-card border border-attention-fg/30 bg-white p-3.5 text-left active:scale-[0.99]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-attention-tint text-attention-fg">
                <BellIcon width={16} height={16} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold tracking-tight text-ink">
                  {unreadNotificationCount} item{unreadNotificationCount === 1 ? '' : 's'} need your attention
                </span>
                <span className="block text-[12px] font-medium text-muted">Escalations and review flags · open inbox</span>
              </span>
              <ChevronRightIcon width={16} height={16} strokeWidth={2.5} className="shrink-0 text-attention-fg" />
            </button>
          )}

          {seeMeds && rendered.pattern?.text && (
            <div className="rounded-card border border-watch-fg/30 bg-white p-4">
              <div className="mb-1.5 flex items-center gap-2 text-watch-fg">
                <TrendUpIcon width={17} height={17} strokeWidth={2} />
                <p className="text-[15px] font-bold">Bedside noticed a pattern</p>
              </div>
              <p className="text-[13px] font-medium leading-snug text-ink/80">{rendered.pattern.text}</p>
            </div>
          )}

          <section>
            <h3 className="mb-2 text-[15px] font-bold text-ink">What’s changed</h3>
            <div className="overflow-hidden rounded-card border border-line bg-white">
              {(rendered.changed ?? []).map((c, i) => (
                <ChangedChip key={c.title} item={c} isFirst={i === 0} />
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-[15px] font-bold text-ink">What’s working</h3>
            <div className="space-y-2.5 rounded-card border border-line bg-white p-4">
              {working.map((w) => (
                <WorkingRow key={w.label} status={w.status} label={w.label} />
              ))}
            </div>
          </section>

          {!seeMeds && (
            <p className="text-center text-[11px] font-medium leading-snug text-ink/45">
              Medication and clinical detail is shown to nurses and family.
            </p>
          )}
        </div>
        )}
      </div>
    </div>
  )
}
