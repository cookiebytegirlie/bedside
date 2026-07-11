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
import { isWithinWindow } from '../utils/time'

const HouseholdContext = createContext(null)

let logCounter = initialLogs.length

// A realistic production default per typical HIPAA-adjacent guidance
// (10-15 minutes of inactivity before automatic logoff).
const SESSION_TIMEOUT_MS = 15 * 60 * 1000
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart']

function initialsFor(name) {
  const parts = name.trim().split(/\s+/)
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
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

  // Schedule enforcement is login-gated only (see loginWithPin above): a
  // volunteer with a 3pm-8pm window cannot sign in at 9pm. We deliberately
  // do NOT poll the clock mid-session and boot the user - a background
  // interval that terminates a session while the user is mid-action looks
  // like "the app just logged me out for no reason" (and in demo/testing
  // hours outside the volunteer's schedule, it fires every 30 seconds).
  // Production auto-logoff belongs to the inactivity timer above, which
  // resets on activity events and is the actual HIPAA-shaped requirement.

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

  const value = {
    household,
    carePlan,
    contacts,
    profiles,
    logs,
    addLog,
    updateLog,
    logMedsGiven,
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
