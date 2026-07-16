// Status is never signalled by color alone — every badge pairs its tint with
// a written label and a solid dot.
const STYLES = {
  green: { bg: 'bg-routine-tint', text: 'text-routine-fg', dot: 'bg-routine-dot', label: 'Routine' },
  yellow: { bg: 'bg-watch-tint', text: 'text-watch-fg', dot: 'bg-watch-dot', label: 'Keep an eye on' },
  red: { bg: 'bg-attention-tint', text: 'text-attention-fg', dot: 'bg-attention-dot', label: 'Needs attention' },
}

export default function UrgencyBadge({ urgency, className = '' }) {
  const s = STYLES[urgency] || STYLES.green
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-tight ${s.bg} ${s.text} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}
