import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, BookIcon, AlertTriangleIcon, InfoIcon } from './icons'
import InfoPanel from './InfoPanel'

// Attaches to every AI-generated message across the app (care-plan Q&A,
// "ask about Ellie", shift-note summaries) so an answer is never presented
// as fact without a way to check where it came from. Collapsed by default —
// tap to see the reasoning + source; same chevron-rotate pattern as
// MeetEllie's DayPanel and EssentialInfo's per-item expand toggles.
//
// Props:
//   reasoning   short plain-language explanation of how the answer was derived
//   source      human-readable citation (care-plan section, notes category, etc.)
//   sourceHref  optional link to jump to that source on-screen; "#foo" scrolls
//               within the current page, anything else navigates via router
//   confidence  'high' | 'medium' | 'low' | null — 'low' reuses the same
//               ring + warning treatment as AiResultCard, everywhere
export default function AiSourceDisclosure({ reasoning, source, sourceHref, confidence }) {
  const [open, setOpen] = useState(false)
  const lowConfidence = confidence === 'low'

  // No source and nothing to reason about — this is the "I don't know"
  // path. Say so plainly rather than offering an empty disclosure that
  // implies there's evidence to inspect.
  if (!source && !reasoning) {
    return (
      <div className="mt-1.5 flex items-start gap-1.5 rounded-card bg-watch-tint px-2.5 py-1.5 text-[11px] font-semibold text-watch-fg">
        <InfoIcon width={12} height={12} strokeWidth={2} className="mt-[1px] shrink-0" />
        Not sourced from the care plan or notes — please verify independently.
      </div>
    )
  }

  return (
    <div
      className={`mt-1.5 overflow-hidden rounded-card border ${
        lowConfidence ? 'border-watch-solid/40 ring-1 ring-watch-solid/30' : 'border-line'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 text-left text-ink"
      >
        <BookIcon width={12} height={12} strokeWidth={2} className="shrink-0" />
        <span className="min-w-0 flex-1 text-[11px] font-bold">How we know this</span>
        {lowConfidence && (
          <AlertTriangleIcon width={12} height={12} strokeWidth={2} className="shrink-0 text-watch-fg" />
        )}
        <ChevronRightIcon
          width={12}
          height={12}
          strokeWidth={2.5}
          className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {open && (
        <InfoPanel nested className="space-y-2 px-2.5 py-2">
          {lowConfidence && (
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-watch-fg">
              <AlertTriangleIcon width={12} height={12} strokeWidth={2} className="shrink-0" />
              AI unsure — please confirm
            </p>
          )}
          {reasoning && <p className="text-[12px] font-medium leading-snug [text-wrap:pretty]">{reasoning}</p>}
          {source ? (
            sourceHref ? (
              sourceHref.startsWith('#') ? (
                <a href={sourceHref} className="inline-flex items-center gap-1 text-[11px] font-bold text-ink underline underline-offset-2">
                  {source}
                </a>
              ) : (
                <Link to={sourceHref} className="inline-flex items-center gap-1 text-[11px] font-bold text-ink underline underline-offset-2">
                  {source}
                </Link>
              )
            ) : (
              <p className="text-[11px] font-bold text-ink">{source}</p>
            )
          ) : (
            <p className="text-[11px] font-semibold text-watch-fg">
              Not sourced from the care plan or notes — please verify independently.
            </p>
          )}
        </InfoPanel>
      )}
    </div>
  )
}
