import { useState } from 'react'
import { PhoneIcon } from '../icons'

// The "who do I contact" section shown to everyone who isn't the household
// owner/coordinator themselves (nurse, volunteers, guests). Points at the
// primary family contact.
export default function CoordinatorCard({ coordinator }) {
  const [messageStubShown, setMessageStubShown] = useState(false)

  return (
    <section>
      <h2 className="mb-2 text-xl font-bold text-ink">Coordinator</h2>
      <div className="rounded-card border border-line bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-ink">{coordinator.name}</p>
            <p className="text-sm font-semibold text-muted">Primary family contact</p>
          </div>
          <button
            type="button"
            onClick={() => setMessageStubShown(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-mist px-4 py-2 text-sm font-bold text-white"
          >
            <PhoneIcon width={15} height={15} strokeWidth={2} />
            Message
          </button>
        </div>
        {/* TODO: real messaging once a backend exists — this just proves the affordance. */}
        {messageStubShown && (
          <p className="mt-2 text-xs font-semibold text-muted">Messaging isn't wired up in this demo yet.</p>
        )}
      </div>
    </section>
  )
}
