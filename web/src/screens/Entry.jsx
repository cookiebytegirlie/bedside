import { Link } from 'react-router-dom'
import { DEMO_HOUSEHOLD_ID } from '../mockData'
import { householdLogo } from '../assets'

export default function Entry() {
  return (
    <div className="bg-household mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <img src={householdLogo} alt="Bedside" className="mb-6 h-16 w-16 rounded-2xl shadow-card" />
      <h1 className="bg-gradient-to-b from-brand-green via-brand-mist to-brand-peach bg-clip-text text-3xl font-bold text-transparent">
        Bedside
      </h1>
      <p className="mt-2 max-w-xs text-base font-medium text-muted">
        In real use, a printed QR code by the bed opens a household's private link directly —
        no account, no app store. This screen just stands in for that scan.
      </p>
      <Link
        to={`/household/${DEMO_HOUSEHOLD_ID}`}
        className="mt-8 w-full rounded-full bg-mist py-4 text-lg font-bold text-white shadow-card active:scale-[0.98]"
      >
        Simulate QR scan → Enter household
      </Link>
      <p className="mt-3 text-sm font-semibold text-ink/30">/household/{DEMO_HOUSEHOLD_ID}</p>
    </div>
  )
}
