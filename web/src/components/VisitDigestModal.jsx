import { useEffect, useState } from 'react'
import { visitDigest } from '../mockData'
import { fetchVisitDigest } from '../lib/api'
import { canSeeMeds } from '../utils/roles'
import { CheckIcon, XIcon, BellIcon, TrendUpIcon, TrendDownIcon, MoonIcon, RefreshIcon } from './icons'

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

// Placeholder shimmer shown while the get-trends agent reasons across the
// shift logs (~20-30s). A moving skeleton — not a frozen screen — so the wait
// reads as "computing" rather than "stuck".
function SkeletonBlock({ lines = 2 }) {
  return (
    <div className="space-y-3 rounded-[8px] bg-white p-4 shadow-card">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3.5 w-1/3 animate-pulse rounded bg-ink/10" />
          <div className="h-3 w-full animate-pulse rounded bg-ink/[0.07]" />
        </div>
      ))}
    </div>
  )
}

// Role-gated "Since your last visit" summary. Nurses/family see the full
// digest (escalations + medication patterns); volunteers see only the
// behavioral/comfort summary.
//
// The content is generated live: on open (and on every refresh tap) we call
// the get-trends agent, which reads the actual log table. `visitDigest` from
// mockData is only a fallback if that call fails.
export default function VisitDigestModal({ open, onClose, role, onReview }) {
  const [digest, setDigest] = useState(visitDigest)
  const [loading, setLoading] = useState(false)

  async function loadDigest() {
    setLoading(true)
    try {
      setDigest(await fetchVisitDigest())
    } finally {
      setLoading(false)
    }
  }

  // Re-fetch each time the modal is opened, so the content visibly arrives.
  useEffect(() => {
    if (open) loadDigest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null
  const seeMeds = canSeeMeds(role)
  const working = digest.working.filter((w) => seeMeds || !w.sensitive)
  const attribution = loading
    ? 'Reading the shift logs…'
    : 'Analyzed 15 shift logs from 5 people · just now'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[8px] bg-household p-5 shadow-card sm:rounded-[8px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-ink">Since your last visit</h2>
            <p className="text-[12px] font-semibold text-muted">{digest.lastVisit}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-mist">
              {loading && (
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-watch-fg" aria-hidden />
              )}
              {attribution}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={loadDigest}
              disabled={loading}
              aria-label="Refresh digest"
              className="rounded-full p-1 text-muted active:scale-90 disabled:opacity-60"
            >
              <RefreshIcon width={20} height={20} strokeWidth={2} className={loading ? 'animate-spin' : undefined} />
            </button>
            <button type="button" onClick={onClose} aria-label="Close" className="text-muted">
              <XIcon width={22} height={22} strokeWidth={2} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {seeMeds && <SkeletonBlock lines={1} />}
            <div>
              <div className="mb-2 h-3.5 w-28 animate-pulse rounded bg-ink/10" />
              <SkeletonBlock lines={2} />
            </div>
            <div>
              <div className="mb-2 h-3.5 w-28 animate-pulse rounded bg-ink/10" />
              <SkeletonBlock lines={3} />
            </div>
          </div>
        ) : (
        <div className="space-y-4">
          {seeMeds && (
            <div className="rounded-[8px] border border-attention-fg/30 bg-white p-4">
              <div className="mb-1.5 flex items-center gap-2 text-attention-fg">
                <BellIcon width={17} height={17} strokeWidth={2} />
                <p className="text-[15px] font-bold">Needs you · {digest.needsYou.count}</p>
              </div>
              <p className="text-[13px] font-medium leading-snug text-ink/80">{digest.needsYou.text}</p>
              <button
                type="button"
                onClick={onReview}
                className="mt-3 w-full rounded-[8px] border border-attention-fg/30 bg-attention-bg py-2.5 text-[14px] font-bold text-ink active:scale-[0.99]"
              >
                {digest.needsYou.cta}
              </button>
            </div>
          )}

          {seeMeds && (
            <div className="rounded-[8px] border border-watch-fg/30 bg-white p-4">
              <div className="mb-1.5 flex items-center gap-2 text-watch-fg">
                <TrendUpIcon width={17} height={17} strokeWidth={2} />
                <p className="text-[15px] font-bold">Bedside noticed a pattern</p>
              </div>
              <p className="text-[13px] font-medium leading-snug text-ink/80">{digest.pattern.text}</p>
            </div>
          )}

          <section>
            <h3 className="mb-2 text-[15px] font-bold text-ink">What’s changed</h3>
            <div className="space-y-3 rounded-[8px] bg-white p-4 shadow-card">
              {digest.changed.map((c) => {
                const Icon = CHANGE_ICON[c.icon] || TrendDownIcon
                return (
                  <div key={c.title} className="flex gap-3">
                    <Icon width={17} height={17} strokeWidth={2} className="mt-0.5 shrink-0 text-mist" />
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-ink">{c.title}</p>
                      <p className="text-[13px] font-medium leading-snug text-ink/70">{c.detail}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-[15px] font-bold text-ink">What’s working</h3>
            <div className="space-y-2.5 rounded-[8px] bg-white p-4 shadow-card">
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
