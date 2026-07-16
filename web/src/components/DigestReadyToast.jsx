import { useHousehold } from '../state/HouseholdContext'
import { XIcon } from './icons'

// Floating "Your visit digest is ready · View →" pill. Persistent while
// digestReady is true — a user's "View" tap opens the modal (which marks
// seen and clears the toast); the X dismisses without opening.
//
// Rendered at HouseholdShell level so it's visible on every screen in the
// household, not just the timeline.
export default function DigestReadyToast() {
  const { digestReady, requestOpenDigest, markDigestSeen } = useHousehold()

  if (!digestReady) return null

  return (
    <div
      className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4"
      // pointer-events on the wrapper is auto — the pill itself handles taps.
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-full bg-ink px-4 py-2.5 shadow-soft">
        <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-routine-dot" aria-hidden />
        <span className="text-[13px] font-medium text-white">Your visit digest is ready</span>
        <button
          type="button"
          onClick={requestOpenDigest}
          className="rounded-full bg-white/10 px-3 py-1 text-[12px] font-semibold text-white active:scale-[0.98]"
        >
          View →
        </button>
        <button
          type="button"
          onClick={markDigestSeen}
          aria-label="Dismiss"
          className="text-white/60 active:text-white"
        >
          <XIcon width={14} height={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
