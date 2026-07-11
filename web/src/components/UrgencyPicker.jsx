const OPTIONS = [
  { value: 'green', label: 'Routine', active: 'bg-routine-fg text-white' },
  { value: 'yellow', label: 'Keep an eye on', active: 'bg-watch-fg text-white' },
  { value: 'red', label: 'Needs attention', active: 'bg-attention-fg text-white' },
]

export default function UrgencyPicker({ value, onChange, className = '' }) {
  return (
    <div className={`flex gap-2 ${className}`}>
      {OPTIONS.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-full px-2 py-2.5 text-center text-sm font-bold leading-tight transition-colors active:scale-[0.98] ${
              active ? opt.active : 'bg-white text-muted shadow-card'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
