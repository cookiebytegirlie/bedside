const STYLES = {
  green: { bg: 'bg-routine-bg', text: 'text-routine-fg', label: 'Routine' },
  yellow: { bg: 'bg-watch-bg', text: 'text-watch-fg', label: 'Keep an eye on' },
  red: { bg: 'bg-attention-bg', text: 'text-attention-fg', label: 'Needs attention' },
}

export default function UrgencyBadge({ urgency, className = '' }) {
  const s = STYLES[urgency] || STYLES.green
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${s.bg} ${s.text} ${className}`}>
      {s.label}
    </span>
  )
}
