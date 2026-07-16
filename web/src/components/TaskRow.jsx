import { CheckIcon, ClockIcon, FlagIcon } from './icons'
import { formatHour, parseTimeToHours } from '../utils/time'

// "08:00" -> "8:00 AM". Falls back to the raw string if it isn't HH:MM.
function formatTaskTime(time) {
  if (!time || !/^\d{1,2}:\d{2}$/.test(time)) return time
  return formatHour(parseTimeToHours(time))
}

// A single daily-task checklist row, shared by the Log page and the Timeline.
// Mirrors the meds-row markup in LogShift: an empty hairline circle when open,
// a CheckIcon once done (with the title struck through). `note` is a muted
// subtitle; `time` a small clock label. The flag reads green when raised — and
// is tappable when `onToggleFlag` is passed, static otherwise.
export default function TaskRow({ task, onToggle, onToggleFlag, className = '' }) {
  const { title, note, time, flagged, done } = task
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? `Mark “${title}” not done` : `Mark “${title}” done`}
        className="mt-0.5 shrink-0 active:scale-90"
      >
        {done ? (
          <CheckIcon width={20} height={20} strokeWidth={2.5} className="text-ink" />
        ) : (
          <span className="block h-5 w-5 rounded-full border-[1.5px] border-line" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`text-[15px] font-semibold tracking-tight ${done ? 'text-faint line-through' : 'text-ink'}`}>
          {title}
        </p>
        {note && (
          <p className={`mt-0.5 text-[13px] font-medium leading-snug ${done ? 'text-faint' : 'text-muted'}`}>{note}</p>
        )}
        {time && (
          <p className="mt-1 flex items-center gap-1 text-[12px] font-medium text-faint">
            <ClockIcon width={12} height={12} strokeWidth={2} />
            {formatTaskTime(time)}
          </p>
        )}
      </div>

      {onToggleFlag ? (
        <button
          type="button"
          onClick={onToggleFlag}
          aria-pressed={flagged}
          aria-label={flagged ? `Unflag “${title}”` : `Flag “${title}”`}
          className="mt-0.5 shrink-0 active:scale-90"
        >
          <FlagIcon
            width={18}
            height={18}
            strokeWidth={2}
            className={flagged ? 'text-routine-fg [fill:currentColor]' : 'text-faint'}
          />
        </button>
      ) : (
        flagged && (
          <FlagIcon width={18} height={18} strokeWidth={2} className="mt-0.5 shrink-0 text-routine-fg [fill:currentColor]" />
        )
      )}
    </div>
  )
}
