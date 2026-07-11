// Shared treatment for secondary/expanded/quoted content with legible body
// text. Two shapes:
//   - default: freestanding pale-sage panel with its own rounded corners
//     (page banners, quote boxes, standalone notes)
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
      className={`${nested ? 'text-ink' : 'bg-sage-50 text-ink rounded-[8px]'} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  )
}
