// Shared treatment for secondary/expanded/quoted content with legible body
// text. Two shapes:
//   - default: freestanding soft-gray panel with 14px card corners (page
//     banners, quote boxes, standalone notes) — a neutral fill, never colored.
//   - nested: no fill, border, or corner radius of its own; inherits the
//     parent's background so it reads as "detail of the thing above"
//     rather than a second box.
// Body text color is intentionally not overridable per-instance: text-ink
// at full opacity is baked in here because text-ink/60–70 on this
// background reads as low-contrast gray. Use text-ink/80 at most on
// individual lines inside if de-emphasis is needed.
export default function InfoPanel({ as: Tag = 'div', nested = false, className = '', children, ...rest }) {
  return (
    <Tag
      className={`${nested ? 'text-ink' : 'bg-track text-ink rounded-card'} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}
