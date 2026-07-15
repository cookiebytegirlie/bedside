import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import {
  household,
  carePlan,
  contacts,
  initialLogs,
  profiles as initialProfiles,
  generalVolunteerSlot,
  defaultGeneralCode,
} from '../mockData'
import { isWithinWindow, formatWindow } from '../utils/time'

const HouseholdContext = createContext(null)

let logCounter = initialLogs.length

// A realistic production default per typical HIPAA-adjacent guidance
// (10-15 minutes of inactivity before automatic logoff).
const SESSION_TIMEOUT_MS = 15 * 60 * 1000
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart']

// How often an active scheduled session (a volunteer with a shift window)
// re-checks whether it's still within that window.
const SCHEDULE_POLL_MS = 30000

function initialsFor(name) {
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

// The notification center aggregates the two actionable kinds of log entry:
// escalations (a human-confirmed red that paged the nurse) and disagreements
// (Bedside read "red" but the caregiver logged it lower). `stateMap` holds the
// per-entry handled state; anything absent is still "new". Newest first.
function buildNotifications(logs, stateMap) {
  const items = []
  for (const l of logs) {
    // Per-entry handled state is an object { status, note, by, at }; absent =
    // still "new". Carry note/by/at onto the item so the inbox detail and the
    // timeline can show how something was handled.
    const st = stateMap[l.id]
    const meta = {
      status: st?.status || 'new',
      note: st?.note ?? null,
      by: st?.by ?? null,
      at: st?.at ?? null,
      // A family "seen" is tracked separately from the clinical status — it
      // records awareness without resolving anything.
      familySeenBy: st?.familySeenBy ?? null,
      familySeenAt: st?.familySeenAt ?? null,
    }
    if (l.escalatedAt) {
      items.push({ id: l.id, kind: 'escalation', log: l, timestamp: l.escalatedAt, ...meta })
    } else if (l.aiUrgency === 'red' && l.keptUrgency && l.keptUrgency !== 'red') {
      items.push({ id: l.id, kind: 'disagreement', log: l, timestamp: l.timestamp, ...meta })
    }
  }
  return items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function HouseholdProvider({ children }) {
  const [logs, setLogs] = useState(initialLogs)
  const [status, setStatus] = useState('Sleeping')
  const [location, setLocation] = useState('Bedroom')
  const [profiles, setProfiles] = useState(initialProfiles)
  const [generalSlot, setGeneralSlot] = useState(generalVolunteerSlot)
  const [generalCode, setGeneralCode] = useState(defaultGeneralCode)
  const [activeProfile, setActiveProfile] = useState(null)
  const [accessLog, setAccessLog] = useState([])
  // Per-entry handled state for the notification center: id -> 'acknowledged'
  // | 'resolved'. Absent = still "new". In-memory, matching the app's mock
  // approach — resets on reload, same as the logs themselves.
  const [notificationState, setNotificationState] = useState({})
  const [secondsUntilTimeout, setSecondsUntilTimeout] = useState(null)
  const expiresAtRef = useRef(null)

  const logAccess = useCallback((actor, action, detail) => {
    // Updater must stay pure (no shared-counter side effects) — StrictMode
    // double-invokes it in dev, and a mutable counter here produced
    // colliding ids. Id generation happens inline, from values scoped to
    // this single call, so double-invocation just recomputes the same id.
    setAccessLog((prev) => {
      // Dev-mode StrictMode double-invokes effects, and fast re-renders can
      // re-fire a view log — collapse an immediate exact repeat rather than
      // showing the same access twice.
      const last = prev[0]
      if (last && last.actor === actor && last.action === action && last.detail === detail) {
        return prev
      }
      return [
        {
          id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          actor,
          action,
          detail,
        },
        ...prev,
      ].slice(0, 50)
    })
  }, [])

  const loginWithPin = useCallback((profileId, pin) => {
    const profile = profiles.find((p) => p.id === profileId)
    if (!profile || profile.pin !== pin) return { ok: false, reason: 'invalid-pin' }
    if (profile.schedule && !isWithinWindow(profile.schedule.startHour, profile.schedule.endHour)) {
      return { ok: false, reason: 'window-closed', schedule: profile.schedule }
    }
    setActiveProfile(profile)
    logAccess(profile.name, 'Signed in', `PIN verified · ${profile.role}`)
    return { ok: true }
  }, [profiles, logAccess])

  // Caller has already run the WebAuthn ceremony (see utils/webauthn.js) —
  // this just applies the same schedule gate PIN sign-in gets, then signs in.
  const loginWithBiometric = useCallback((profileId) => {
    const profile = profiles.find((p) => p.id === profileId)
    if (!profile) return { ok: false, reason: 'invalid-pin' }
    if (profile.schedule && !isWithinWindow(profile.schedule.startHour, profile.schedule.endHour)) {
      return { ok: false, reason: 'window-closed', schedule: profile.schedule }
    }
    setActiveProfile(profile)
    logAccess(profile.name, 'Signed in', `Biometric verified · ${profile.role}`)
    return { ok: true }
  }, [profiles, logAccess])

  // General/ad-hoc volunteer coverage: no standing profile, just a name plus
  // whatever code the coordinator issued for tonight's slot. The window
  // active at sign-in is captured onto the session so an edit to the slot
  // later doesn't retroactively change someone already signed in.
  const loginWithCode = useCallback((name, code) => {
    if (!isWithinWindow(generalSlot.startHour, generalSlot.endHour)) {
      return { ok: false, reason: 'window-closed', schedule: generalSlot }
    }
    if (code !== generalCode) {
      return { ok: false, reason: 'invalid-code' }
    }
    const profile = {
      id: `guest-${Date.now()}`,
      name: name.trim(),
      role: 'Volunteer',
      initials: initialsFor(name),
      pin: null,
      schedule: generalSlot,
    }
    setActiveProfile(profile)
    logAccess(profile.name, 'Signed in', 'One-time code · general volunteer slot')
    return { ok: true }
  }, [generalSlot, generalCode, logAccess])

  const updateProfileSchedule = useCallback((profileId, schedule) => {
    setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, schedule } : p)))
  }, [])

  const updateGeneralSlot = useCallback((schedule) => {
    setGeneralSlot(schedule)
  }, [])

  const regenerateGeneralCode = useCallback(() => {
    setGeneralCode(randomCode())
  }, [])

  const switchProfile = useCallback(() => {
    setActiveProfile((current) => {
      if (current) logAccess(current.name, 'Signed out', 'Switched profile')
      return null
    })
  }, [logAccess])

  const logView = useCallback((label) => {
    setActiveProfile((current) => {
      if (current) logAccess(current.name, 'Viewed', label)
      return current
    })
  }, [logAccess])

  // Inactivity auto-logoff: any tap/keypress/touch resets the clock while a
  // profile is active. This is what a HIPAA audit calls "automatic logoff."
  useEffect(() => {
    if (!activeProfile) {
      setSecondsUntilTimeout(null)
      return
    }

    expiresAtRef.current = Date.now() + SESSION_TIMEOUT_MS
    const resetTimer = () => {
      expiresAtRef.current = Date.now() + SESSION_TIMEOUT_MS
    }
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer))

    const interval = setInterval(() => {
      const remainingMs = expiresAtRef.current - Date.now()
      if (remainingMs <= 0) {
        setActiveProfile((current) => {
          if (current) logAccess(current.name, 'Auto-logged out', 'Inactivity timeout')
          return null
        })
      } else {
        setSecondsUntilTimeout(Math.ceil(remainingMs / 1000))
      }
    }, 1000)

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer))
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile])

  // Scheduled profiles only (Marcus's shift, or a general-code sign-in):
  // keep re-checking the clock while signed in, and log out automatically
  // once the window closes. Family and nurse profiles have no `schedule`,
  // so they're exempt and can use the app anytime.
  useEffect(() => {
    if (!activeProfile?.schedule) return

    const { startHour, endHour } = activeProfile.schedule
    const interval = setInterval(() => {
      if (isWithinWindow(startHour, endHour)) return
      setActiveProfile((current) => {
        if (current) {
          logAccess(current.name, 'Auto-logged out', `Access window ended (${formatWindow(startHour, endHour)})`)
        }
        return null
      })
    }, SCHEDULE_POLL_MS)

    return () => clearInterval(interval)
  }, [activeProfile, logAccess])

  const addLog = useCallback((entry) => {
    logCounter += 1
    const log = {
      id: `log-${logCounter}`,
      timestamp: new Date().toISOString(),
      ...entry,
    }
    setLogs((prev) => [log, ...prev])
    return log
  }, [])

  // Lets a caller amend an already-saved log — used to attach a note typed
  // in after the fact (e.g. a medication reason) without creating a
  // duplicate entry. `updater` can be a partial object or `(log) => patch`.
  const updateLog = useCallback((logId, updater) => {
    setLogs((prev) => prev.map((l) => {
      if (l.id !== logId) return l
      const patch = typeof updater === 'function' ? updater(l) : updater
      return { ...l, ...patch }
    }))
  }, [])

  // Notification-center transitions. Each stores { status, note, by, at } so
  // downstream can show who handled it, when, and how. Acknowledging and
  // resolving both drop the item from the unread / open counts (which key on
  // status === 'new'), so a handled 2-day-old item never resurfaces as "open".
  // Acknowledge marks "in progress" (note optional); resolve closes it out
  // (note required by the caller's UI).
  const acknowledgeNotification = useCallback((id, { note, by } = {}) => {
    setNotificationState((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), status: 'acknowledged', note: note ?? null, by, at: new Date().toISOString() },
    }))
  }, [])

  const resolveNotification = useCallback((id, { note, by } = {}) => {
    setNotificationState((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), status: 'resolved', note, by, at: new Date().toISOString() },
    }))
  }, [])

  // Family "seen" — records that a family member reviewed a needs-attention
  // flag WITHOUT touching the clinical status. Merges onto any existing state
  // so it never clears an acknowledge/resolve, and (by leaving `status`
  // untouched) it doesn't drop the item from the open/unread count. Clinical
  // closure stays nurse-only via acknowledge/resolve.
  const markSeenByFamily = useCallback((id, { by } = {}) => {
    setNotificationState((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), familySeenBy: by ?? null, familySeenAt: new Date().toISOString() },
    }))
  }, [])

  // `med` is a carePlan.medications entry; `reason` is the optional
  // free-text note a caregiver adds explaining why it was given, which
  // becomes the Timeline's "Medication Administered" sub-entry.
  const logMedsGiven = useCallback((med, reason, sessionId, urgency = 'green') => {
    const now = new Date()
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    return addLog({
      author: activeProfile?.name ?? 'You',
      type: 'meds',
      summary: `${med.name} given.`,
      urgency,
      sessionId,
      medicationGiven: {
        name: med.name,
        dose: med.dose,
        route: 'PO',
        time,
        reason: reason?.trim() || 'as scheduled',
      },
    })
  }, [addLog, activeProfile])

  const setPatientStatus = useCallback((nextStatus, nextLocation, sessionId, urgency = 'green') => {
    setStatus(nextStatus)
    setLocation(nextLocation)
    addLog({
      author: activeProfile?.name ?? 'You',
      type: 'status',
      summary: `Status set to ${nextStatus} in ${nextLocation}.`,
      urgency,
      sessionId,
    })
  }, [addLog, activeProfile])

  // Derived once per render so the bell badge, digest count, and inbox all
  // read one source of truth. Only "new" items count as open/unread.
  const notifications = buildNotifications(logs, notificationState)
  const unreadNotificationCount = notifications.filter((n) => n.status === 'new').length

  const value = {
    household,
    carePlan,
    contacts,
    profiles,
    logs,
    addLog,
    updateLog,
    logMedsGiven,
    notifications,
    unreadNotificationCount,
    acknowledgeNotification,
    resolveNotification,
    markSeenByFamily,
    status,
    location,
    setPatientStatus,
    activeProfile,
    loginWithPin,
    loginWithBiometric,
    loginWithCode,
    switchProfile,
    accessLog,
    logView,
    secondsUntilTimeout,
    sessionTimeoutSeconds: SESSION_TIMEOUT_MS / 1000,
    generalSlot,
    generalCode,
    updateProfileSchedule,
    updateGeneralSlot,
    regenerateGeneralCode,
  }

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider')
  return ctx
}
