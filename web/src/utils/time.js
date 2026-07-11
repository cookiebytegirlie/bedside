export function formatCountdown(totalSeconds) {
  if (totalSeconds == null) return null
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// "15:30" -> 15.5. Matches the value <input type="time"> gives back.
export function parseTimeToHours(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h + m / 60
}

// 15.5 -> "15:30", for seeding an <input type="time">.
export function hoursToTimeString(hourDecimal) {
  const h = Math.floor(hourDecimal)
  const m = Math.round((hourDecimal - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// 15.5 -> "3:30 PM"
export function formatHour(hourDecimal) {
  const h = Math.floor(hourDecimal) % 24
  const m = Math.round((hourDecimal - Math.floor(hourDecimal)) * 60)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function formatWindow(startHour, endHour) {
  return `${formatHour(startHour)} – ${formatHour(endHour)}`
}

// Handles windows that wrap past midnight (e.g. 20 -> 10 means 8pm-10am).
export function isWithinWindow(startHour, endHour, date = new Date()) {
  const hour = date.getHours() + date.getMinutes() / 60
  if (startHour === endHour) return true
  if (startHour < endHour) return hour >= startHour && hour < endHour
  return hour >= startHour || hour < endHour
}

// Assumes the window is currently open (caller checks isWithinWindow first).
export function minutesUntil(endHour, date = new Date()) {
  const hour = date.getHours() + date.getMinutes() / 60
  let diff = endHour - hour
  if (diff < 0) diff += 24
  return Math.max(0, Math.round(diff * 60))
}

// 32 -> "00:32 mins left"
export function formatMinutesLeft(totalMinutes) {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} mins left`
}
