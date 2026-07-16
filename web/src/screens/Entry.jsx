import { Link } from 'react-router-dom'
import { DEMO_HOUSEHOLD_ID } from '../mockData'
import { householdLogo } from '../assets'

// Splash intro shown before profile selection. The logo, wordmark, and CTA
// animate in as a short launch sequence (see `.intro-*` keyframes in index.css);
// the button stands in for scanning the printed QR code by the bed.
export default function Entry() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-white px-6 text-center">
      <img
        src={householdLogo}
        alt="Bedside"
        className="intro-logo h-20 w-20 rounded-[22px] shadow-soft"
      />

      <h1 className="intro-title mt-5 text-3xl font-bold tracking-tight text-ink">BedSide</h1>

      <Link
        to={`/household/${DEMO_HOUSEHOLD_ID}`}
        className="intro-cta mt-8 rounded-full bg-ink px-8 py-3.5 text-base font-bold text-white transition-transform active:scale-[0.98]"
      >
        Scan QR code
      </Link>

      <p className="intro-cta mt-5 max-w-xs text-xs font-medium leading-relaxed text-faint">
        In real use, a printed QR code by the bed opens a household's private link
        directly — no account, no app store. This stands in for that scan.
      </p>
    </div>
  )
}
