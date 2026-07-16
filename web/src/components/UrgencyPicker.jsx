// iOS-style segmented control for the entry's urgency flag. The track and
// inactive segments are pure monochrome; the selected segment is the one place
// color appears — it fills with the vivid status color it sets (sage for
// Routine, amber for Keep an eye on, red for Needs attention). A leading white
// dot keeps color from being the only signal for the active state.
const OPTIONS = [
  { value: 'green', label: 'Routine', active: 'bg-routine-solid text-white' },
  { value: 'yellow', label: 'Keep an eye on', active: 'bg-watch-solid text-white' },
  { value: 'red', label: 'Needs attention', active: 'bg-attention-solid text-white' },
]

export default function UrgencyPicker({ value, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 rounded-full bg-track p-1 ${className}`}>
      {OPTIONS.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2 text-center text-[13px] font-semibold leading-tight tracking-tight transition-colors active:scale-[0.98] ${
              active ? opt.active : 'text-muted'
            }`}
          >
            {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/90" />}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
