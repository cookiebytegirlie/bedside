import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useHousehold } from '../state/HouseholdContext'
import { household } from '../mockData'
import { profilePhotos, householdLogo } from '../assets'
import { isWithinWindow, formatWindow } from '../utils/time'
import { isBiometricAvailable, authenticateWithBiometric } from '../utils/webauthn'
import {
  BackspaceIcon,
  ArrowLeftIcon,
  ShieldIcon,
  ClockIcon,
  FingerprintIcon,
  ChevronRightIcon,
  UserIcon,
} from '../components/icons'

const PIN_LENGTH = 4
const CODE_LENGTH = 6
const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back']
const MAX_ATTEMPTS = 3
const LOCKOUT_MS = 30000

function Avatar({ photo, initials, size = 'h-11 w-11', textSize = 'text-base' }) {
  if (photo) {
    return <img src={photo} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  }
  return (
    <span className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-sage-100 text-mist`}>
      {initials === '+' ? (
        <UserIcon width={18} height={18} strokeWidth={1.8} />
      ) : (
        <span className={`font-bold ${textSize}`}>{initials}</span>
      )}
    </span>
  )
}

function ProfileRow({ photo, name, role, initials, dashed, dim, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-3xl px-4 py-2.5 text-left shadow-card transition-transform active:scale-[0.98] ${
        dashed ? 'border-2 border-dashed border-sage-300 bg-transparent shadow-none' : 'bg-white'
      } ${dim ? 'opacity-50' : ''}`}
    >
      <Avatar photo={photo} initials={initials} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-bold leading-tight text-ink">{name}</span>
        <span className="block text-xs font-semibold leading-snug text-muted">{role}</span>
      </span>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist text-white">
        <ChevronRightIcon width={15} height={15} strokeWidth={2.5} />
      </span>
    </button>
  )
}

function HeroCard({ photo, name, subtitle, dim, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative block w-full rounded-3xl bg-white px-5 pb-4 pt-11 text-left shadow-card transition-transform active:scale-[0.98] ${dim ? 'opacity-50' : ''}`}
    >
      <img
        src={photo}
        alt=""
        className="absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white object-cover shadow-card"
      />
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block text-xl font-bold leading-tight text-ink">{name}</span>
          <span className="block text-sm font-semibold leading-tight text-muted">{subtitle}</span>
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mist text-white">
          <ChevronRightIcon width={16} height={16} strokeWidth={2.5} />
        </span>
      </div>
    </button>
  )
}

function SelectStep({ onPickProfile, onPickGuest }) {
  const { profiles, generalSlot } = useHousehold()
  const guestWindowOpen = isWithinWindow(generalSlot.startHour, generalSlot.endHour)
  // Hero (patient) cards lead the list — their photo overlaps above the
  // card, so they need open space above them, not another row.
  const heroProfiles = profiles.filter((p) => p.cardLabel)
  const rowProfiles = profiles.filter((p) => !p.cardLabel)

  return (
    <div className="w-full">
      <p className={`text-center text-base font-semibold text-muted ${heroProfiles.length ? 'mb-12' : 'mb-3'}`}>
        Who's logging in?
      </p>
      <div className="space-y-2">
        {heroProfiles.map((p) => {
          const windowOpen = !p.schedule || isWithinWindow(p.schedule.startHour, p.schedule.endHour)
          return (
            <HeroCard
              key={p.id}
              photo={profilePhotos[p.id]}
              name={p.name}
              subtitle={p.cardLabel}
              dim={!windowOpen}
              onClick={() => onPickProfile(p)}
            />
          )
        })}
        {rowProfiles.map((p) => {
          const windowOpen = !p.schedule || isWithinWindow(p.schedule.startHour, p.schedule.endHour)
          const role = p.schedule ? `${p.role} · ${formatWindow(p.schedule.startHour, p.schedule.endHour)}` : p.role
          return (
            <ProfileRow
              key={p.id}
              photo={profilePhotos[p.id]}
              name={p.name}
              role={role}
              initials={p.initials}
              dim={!windowOpen}
              onClick={() => onPickProfile(p)}
            />
          )
        })}
        <ProfileRow
          name="Guest Volunteer"
          role={`One-time code · ${formatWindow(generalSlot.startHour, generalSlot.endHour)}`}
          initials="+"
          dashed
          dim={!guestWindowOpen}
          onClick={onPickGuest}
        />
      </div>
    </div>
  )
}

function PinStep({ profile, onBack }) {
  const { loginWithPin, loginWithBiometric } = useHousehold()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null) // null | 'wrong' | 'window-closed'
  const [attempts, setAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState(null)
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0)
  const [biometricSupported, setBiometricSupported] = useState(false)
  const [biometricBusy, setBiometricBusy] = useState(false)
  const [biometricError, setBiometricError] = useState(null) // null | 'failed' | 'window-closed'
  const locked = Boolean(lockedUntil)
  const photo = profilePhotos[profile.id]

  useEffect(() => {
    let cancelled = false
    isBiometricAvailable().then((available) => {
      if (!cancelled) setBiometricSupported(available)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const tryBiometric = async () => {
    setBiometricError(null)
    setBiometricBusy(true)
    try {
      const verified = await authenticateWithBiometric(profile.id, profile.name)
      if (!verified) {
        setBiometricError('failed')
        return
      }
      const result = loginWithBiometric(profile.id)
      if (!result.ok) {
        setBiometricError(result.reason === 'window-closed' ? 'window-closed' : 'failed')
      }
    } catch {
      setBiometricError('failed')
    } finally {
      setBiometricBusy(false)
    }
  }

  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return
    const result = loginWithPin(profile.id, pin)
    if (!result.ok) {
      if (result.reason === 'window-closed') {
        setError('window-closed')
        setPin('')
        return
      }
      setError('wrong')
      setAttempts((prev) => {
        const next = prev + 1
        if (next >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_MS)
          setLockSecondsLeft(Math.ceil(LOCKOUT_MS / 1000))
        }
        return next
      })
      const t = setTimeout(() => setPin(''), 400)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  // Brute-force protection: lock the pad out after repeated wrong PINs.
  useEffect(() => {
    if (!lockedUntil) return
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setLockedUntil(null)
        setAttempts(0)
        setLockSecondsLeft(0)
      } else {
        setLockSecondsLeft(remaining)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockedUntil])

  const press = (key) => {
    if (locked) return
    setError(null)
    if (key === 'back') {
      setPin((p) => p.slice(0, -1))
      return
    }
    setPin((p) => (p.length >= PIN_LENGTH ? p : p + key))
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back"
        className="absolute left-4 top-[calc(env(safe-area-inset-top)+1rem)] flex h-9 w-9 items-center justify-center text-muted active:scale-[0.94]"
      >
        <ArrowLeftIcon width={22} height={22} strokeWidth={2} />
      </button>

      <div className="mb-2 flex flex-col items-center">
        <Avatar photo={photo} initials={profile.initials} size="h-16 w-16" textSize="text-2xl" />
        <p className="mt-1.5 text-xl font-bold leading-tight text-ink">{profile.name}</p>
        <p className="text-sm font-semibold text-muted">{profile.cardLabel ? '' : profile.role}</p>
      </div>

      <p className="mb-1.5 text-center text-sm font-semibold text-muted">Enter your PIN</p>
      <div className={`mb-2 flex justify-center gap-3 ${error === 'wrong' ? 'animate-pulse' : ''}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 ${
              i < pin.length ? (error === 'wrong' ? 'border-attention-fg bg-attention-fg' : 'border-mist bg-mist') : 'border-ink/15'
            }`}
          />
        ))}
      </div>
      {locked ? (
        <p className="mb-2 text-center text-xs font-semibold text-attention-fg">
          Too many attempts — locked for {lockSecondsLeft}s
        </p>
      ) : error === 'wrong' ? (
        <p className="mb-2 text-center text-xs font-semibold text-attention-fg">Incorrect PIN, try again</p>
      ) : error === 'window-closed' ? (
        <p className="mb-2 text-center text-xs font-semibold text-attention-fg">
          That shift just ended — sign-in isn't available right now.
        </p>
      ) : null}

      <div className={`mx-auto grid max-w-[240px] grid-cols-3 gap-2 ${locked ? 'opacity-40' : ''}`}>
        {KEYPAD.map((key, i) =>
          key === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={locked}
              onClick={() => press(key)}
              className="flex items-center justify-center rounded-full bg-white text-lg font-bold text-ink shadow-card active:scale-[0.96] disabled:active:scale-100"
              style={{ height: '46px' }}
            >
              {key === 'back' ? <BackspaceIcon width={17} height={17} strokeWidth={2} /> : key}
            </button>
          )
        )}
      </div>

      {biometricSupported && (
        <div className="mx-auto mt-6 flex max-w-[240px] flex-col items-center gap-1 border-t border-sage-100 pt-5">
          <button
            type="button"
            onClick={tryBiometric}
            disabled={biometricBusy || locked}
            className="flex items-center gap-1.5 text-sm font-semibold text-mist disabled:opacity-40"
          >
            <FingerprintIcon width={17} height={17} strokeWidth={1.8} />
            {biometricBusy ? 'Waiting…' : 'Use Facial/Fingerprint Recognition'}
          </button>
          {biometricError === 'failed' && (
            <p className="text-center text-xs font-medium text-attention-fg">
              That didn't go through — try again or use your PIN.
            </p>
          )}
          {biometricError === 'window-closed' && (
            <p className="text-center text-xs font-medium text-attention-fg">
              That shift just ended — sign-in isn't available right now.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function CodeGuestStep({ onBack }) {
  const { loginWithCode } = useHousehold()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(null) // null | 'invalid-code' | 'window-closed'

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim() || code.length !== CODE_LENGTH) return
    const result = loginWithCode(name, code)
    if (!result.ok) {
      setError(result.reason)
      setCode('')
    }
  }

  return (
    <div className="w-full">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted">
        <ArrowLeftIcon width={16} height={16} strokeWidth={2} />
        Choose someone else
      </button>
      <p className="mb-1 text-xl font-bold text-ink">Covering a shift tonight?</p>
      <p className="mb-3 text-sm font-semibold text-muted">
        Enter your name and the code your coordinator sent you. It only works during this slot.
      </p>
      <form onSubmit={submit} className="space-y-2.5">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your first name"
          className="w-full rounded-full border border-sage-200 bg-white px-4 py-2.5 text-base font-semibold text-ink placeholder:font-medium placeholder:text-ink/30 focus:border-mist focus:outline-none"
        />
        <input
          value={code}
          onChange={(e) => {
            setError(null)
            setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))
          }}
          inputMode="numeric"
          placeholder="6-digit code"
          className="w-full rounded-full border border-sage-200 bg-white px-4 py-2.5 text-center text-lg font-bold tracking-[0.3em] text-ink placeholder:text-sm placeholder:font-medium placeholder:tracking-normal placeholder:text-ink/30 focus:border-mist focus:outline-none"
        />
        {error === 'invalid-code' && (
          <p className="text-center text-xs font-semibold text-attention-fg">That code isn't valid — check with your coordinator.</p>
        )}
        {error === 'window-closed' && (
          <p className="text-center text-xs font-semibold text-attention-fg">This slot has closed — the code no longer works.</p>
        )}
        <button
          type="submit"
          disabled={!name.trim() || code.length !== CODE_LENGTH}
          className="w-full rounded-full bg-mist py-2.5 text-base font-bold text-white disabled:opacity-40"
        >
          Continue
        </button>
      </form>
    </div>
  )
}

function TimeBlockedStep({ label, startHour, endHour, onRecheck, onBack }) {
  return (
    <div className="w-full">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted">
        <ArrowLeftIcon width={16} height={16} strokeWidth={2} />
        Choose someone else
      </button>

      <div className="rounded-3xl bg-white p-5 text-center shadow-card">
        <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-watch-bg text-watch-fg">
          <ClockIcon width={19} height={19} strokeWidth={2} />
        </span>
        <p className="text-lg font-bold text-ink">Not available right now</p>
        <p className="mt-1 text-sm font-semibold text-muted">
          {label} is only available {formatWindow(startHour, endHour)}.
        </p>
      </div>

      <button
        type="button"
        onClick={onRecheck}
        className="mt-3 w-full rounded-full bg-mist py-2.5 text-base font-bold text-white"
      >
        Check again
      </button>
    </div>
  )
}

export default function ProfileGate() {
  const { householdId } = useParams()
  const { generalSlot } = useHousehold()
  const [step, setStep] = useState('select')
  const [selected, setSelected] = useState(null)
  const [blocked, setBlocked] = useState(null) // { label, startHour, endHour, target }

  const gateThenGo = (target, label, schedule) => {
    if (isWithinWindow(schedule.startHour, schedule.endHour)) {
      setStep(target)
    } else {
      setBlocked({ label, startHour: schedule.startHour, endHour: schedule.endHour, target })
      setStep('time-blocked')
    }
  }

  const handlePickProfile = (profile) => {
    setSelected(profile)
    if (profile.schedule) {
      gateThenGo('pin', `${profile.name}'s shift`, profile.schedule)
    } else {
      setStep('pin')
    }
  }

  const handlePickGuest = () => gateThenGo('code', 'General volunteer sign-in', generalSlot)

  return (
    <div className="relative bg-household flex min-h-screen flex-col items-center justify-center px-5 py-3">
      <img src={householdLogo} alt="Bedside" className="mb-1.5 h-9 w-9 rounded-xl shadow-card" />
      <p className="text-center text-lg font-bold text-ink">{household.preferredName}'s Household</p>
      <p className="mb-3 text-center text-[9px] font-bold uppercase tracking-wide text-mist">
        Demo · Synthetic data only
      </p>

      {step === 'select' && <SelectStep onPickProfile={handlePickProfile} onPickGuest={handlePickGuest} />}
      {step === 'time-blocked' && blocked && (
        <TimeBlockedStep
          label={blocked.label}
          startHour={blocked.startHour}
          endHour={blocked.endHour}
          onRecheck={() =>
            gateThenGo(blocked.target, blocked.label, { startHour: blocked.startHour, endHour: blocked.endHour })
          }
          onBack={() => setStep('select')}
        />
      )}
      {step === 'pin' && <PinStep profile={selected} onBack={() => setStep('select')} />}
      {step === 'code' && <CodeGuestStep onBack={() => setStep('select')} />}

      <Link
        to={`/household/${householdId}/privacy`}
        className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-mist"
      >
        <ShieldIcon width={13} height={13} strokeWidth={2} />
        How this demo protects your data
      </Link>
    </div>
  )
}
