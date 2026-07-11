import { Link, useParams } from 'react-router-dom'
import { useHousehold } from '../state/HouseholdContext'
import { formatWindow } from '../utils/time'
import OnDutyHeader from '../components/OnDutyHeader'
import InfoPanel from '../components/InfoPanel'
import { ShieldIcon, ArrowLeftIcon, ActivityIcon } from '../components/icons'

const PROTECTED_NOW = [
  {
    title: 'Automatic logoff',
    detail: 'Any profile is signed out after 15 minutes of inactivity — no phone stays "logged in" forever at a bedside.',
  },
  {
    title: 'PIN lockout',
    detail: 'Repeated wrong PINs lock the pad out for a cooldown, the same brute-force protection a bank app uses.',
  },
  {
    title: 'Minimum-necessary views',
    detail: 'What a profile can see is scoped to their role — a volunteer/aide sees task-level info, not the full clinical picture, and can’t check off medication at all.',
  },
  {
    title: 'Scheduled access for volunteers/aides',
    detail: 'Named volunteers/aides can only sign in — and stay signed in — during their assigned shift window; general coverage needs a coordinator-issued code valid only for that slot. Nurses and family aren’t time-restricted. Worth being honest about: this checks the device clock, which anyone can change, so treat it as a scheduling aid alongside the PIN, not a replacement for it.',
  },
  {
    title: 'Face ID / fingerprint sign-in',
    detail: 'Anyone with a standing profile — family, patient, nurse, or a named volunteer/aide — can sign in with their device biometrics instead of typing a PIN. Covering volunteers (the one-time-code flow) don’t get this, since they have no persistent identity to bind it to. Worth being honest about: there’s no backend here to cryptographically verify the credential, so this proves the real OS Face ID / Touch ID / Windows Hello prompt appears, not that the result is provably secure end-to-end.',
  },
  {
    title: 'Visible audit trail',
    detail: 'Every sign-in, sign-out, and screen view this session is logged with a timestamp — shown live below, not hidden in a database only an admin can query.',
  },
  {
    title: 'No real data in this build',
    detail: 'Every name, medication, and phone number here is synthetic. This demo has never touched a real patient record.',
  },
]

const NEEDED_FOR_REAL = [
  'A real backend with encryption at rest, replacing in-memory state',
  'Signed Business Associate Agreements with every vendor that would touch data — hosting, AI, speech-to-text',
  'Authentication stronger than a link plus a PIN meant only for attribution',
  'On-device or BAA-covered voice transcription, not the browser default',
  'Server-side clock enforcement for shift windows and codes, not just a client-side check',
  'Server-side WebAuthn verification (public key storage + signed challenge check) for biometric sign-in, not just a successful local device ceremony',
  'A written incident response and breach notification plan',
]

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' })
}

export default function PrivacySecurity() {
  const { householdId } = useParams()
  const { activeProfile, accessLog, generalSlot } = useHousehold()

  const protectedNow = PROTECTED_NOW.map((item) =>
    item.title === 'Scheduled access for volunteers/aides'
      ? { ...item, detail: `${item.detail} Right now the general slot runs ${formatWindow(generalSlot.startHour, generalSlot.endHour)}.` }
      : item
  )

  return (
    <>
      <OnDutyHeader />
      <main className="flex-1 px-5 py-5">
        <div className="mb-5 text-center">
          <h1 className="text-2xl font-bold text-ink">Privacy & security</h1>
          <p className="mt-1 text-sm font-semibold text-muted">What's protecting this demo, and what's next</p>
        </div>

        {!activeProfile && (
          <Link
            to={`/household/${householdId}`}
            className="mb-5 flex items-center gap-1.5 text-sm font-semibold text-muted"
          >
            <ArrowLeftIcon width={16} height={16} strokeWidth={2} />
            Back to sign in
          </Link>
        )}

        <InfoPanel className="flex items-start gap-3 p-5 shadow-card">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mist text-white">
            <ShieldIcon width={18} height={18} strokeWidth={2} />
          </span>
          <p className="text-base font-medium leading-snug">
            Bedside is a prototype. It's built with real privacy and security practices in mind, but it has not been
            certified, audited, or deployed with real patient data. Here's exactly where that line is.
          </p>
        </InfoPanel>

        <section className="mt-6">
          <h2 className="mb-2 text-xl font-bold text-ink">Protected right now</h2>
          <div className="space-y-2.5">
            {protectedNow.map((item) => (
              <div key={item.title} className="rounded-4xl bg-white p-4 shadow-card">
                <p className="text-base font-bold text-ink">{item.title}</p>
                <p className="mt-0.5 text-sm font-medium leading-relaxed text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-xl font-bold text-ink">Needed before any real patient data</h2>
          <ul className="space-y-2 rounded-4xl bg-white p-5 shadow-card">
            {NEEDED_FOR_REAL.map((item) => (
              <li key={item} className="flex gap-2 text-base font-medium text-ink/80">
                <span className="text-clay-500">•</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-1.5 text-xl font-bold text-ink">
            <ActivityIcon width={17} height={17} strokeWidth={2} />
            Live audit trail — this session
          </h2>
          {accessLog.length === 0 ? (
            <p className="rounded-4xl bg-white p-4 text-base font-medium text-muted shadow-card">
              Nothing logged yet — sign in and this fills in live.
            </p>
          ) : (
            <ul className="space-y-1.5 rounded-4xl bg-white p-4 shadow-card">
              {accessLog.map((entry) => (
                <li key={entry.id} className="flex items-baseline gap-2 text-sm font-medium">
                  <span className="shrink-0 text-ink/30">{formatTime(entry.timestamp)}</span>
                  <span className="shrink-0 font-bold text-ink">{entry.actor}</span>
                  <span className="shrink-0 text-mist">{entry.action}</span>
                  <span className="truncate text-muted">{entry.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  )
}
