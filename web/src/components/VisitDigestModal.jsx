import { visitDigest } from '../mockData'
import { canSeeMeds } from '../utils/roles'
import { CheckIcon, XIcon, BellIcon, TrendUpIcon, TrendDownIcon, MoonIcon } from './icons'

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

// Role-gated "Since your last visit" summary. Nurses/family see the full
// digest (escalations + medication patterns); volunteers see only the
// behavioral/comfort summary.
export default function VisitDigestModal({ open, onClose, role, onReview }) {
  if (!open) return null
  const seeMeds = canSeeMeds(role)
  const working = visitDigest.working.filter((w) => seeMeds || !w.sensitive)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[14px] bg-household p-5 shadow-card sm:rounded-[14px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink">Since your last visit</h2>
            <p className="text-[12px] font-semibold text-muted">{visitDigest.lastVisit}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 text-muted">
            <XIcon width={22} height={22} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-4">
          {seeMeds && (
            <div className="rounded-[7px] bg-attention-bg p-4">
              <div className="mb-1.5 flex items-center gap-2 text-attention-fg">
                <BellIcon width={17} height={17} strokeWidth={2} />
                <p className="text-[15px] font-bold">Needs you · {visitDigest.needsYou.count}</p>
              </div>
              <p className="text-[13px] font-medium leading-snug text-ink/80">{visitDigest.needsYou.text}</p>
              <button
                type="button"
                onClick={onReview}
                className="mt-3 w-full rounded-[5px] border border-attention-fg/30 bg-white/70 py-2.5 text-[14px] font-bold text-ink active:scale-[0.99]"
              >
                {visitDigest.needsYou.cta}
              </button>
            </div>
          )}

          {seeMeds && (
            <div className="rounded-[7px] bg-watch-bg p-4">
              <div className="mb-1.5 flex items-center gap-2 text-watch-fg">
                <TrendUpIcon width={17} height={17} strokeWidth={2} />
                <p className="text-[15px] font-bold">Bedside noticed a pattern</p>
              </div>
              <p className="text-[13px] font-medium leading-snug text-ink/80">{visitDigest.pattern.text}</p>
            </div>
          )}

          <section>
            <h3 className="mb-2 text-[15px] font-bold text-ink">What’s changed</h3>
            <div className="space-y-3 rounded-[7px] bg-white p-4 shadow-card">
              {visitDigest.changed.map((c) => {
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
            <div className="space-y-2.5 rounded-[7px] bg-white p-4 shadow-card">
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
      </div>
    </div>
  )
}
