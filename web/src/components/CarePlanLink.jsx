import { Link } from 'react-router-dom'
import { FileTextIcon, ChevronRightIcon } from './icons'

// Same "Mon D, YYYY · h:mm AM" shape used by formatLastGiven in
// EssentialInfo.jsx, extended with year since this is a document version
// rather than a same-day event.
function formatLastUpdated(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Tappable card linking to the in-app Care Plan viewer (CarePlanDoc), which
// embeds the full multi-page PDF — it stays inside the app rather than
// opening a new tab. Shared between EssentialInfo and MeetEllie so the two
// entry points can't drift.
export default function CarePlanLink({ to, fileName, lastUpdated }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-card border border-line bg-white p-4 active:scale-[0.98]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] bg-track text-ink">
        <FileTextIcon width={18} height={18} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold tracking-tight text-ink">Full care plan · {fileName}</span>
        <span className="block text-[13px] font-medium text-muted">Last updated {formatLastUpdated(lastUpdated)}</span>
      </span>
      <ChevronRightIcon width={17} height={17} strokeWidth={2.5} className="shrink-0 text-faint" />
    </Link>
  )
}
