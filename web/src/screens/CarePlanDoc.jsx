import { Link, useParams } from 'react-router-dom'
import { carePlanDocument } from '../mockData'
import OnDutyHeader from '../components/OnDutyHeader'
import { ArrowLeftIcon } from '../components/icons'

// Matches the "Last updated" line on CarePlanLink so the viewer header and
// the entry-point card read the same.
function formatLastUpdated(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// In-app viewer for the full Care Plan PDF — embedded rather than opened in a
// new tab. The iframe is sandboxed to allow-same-origin only: the document
// can render but can't run scripts or navigate the app out from under the
// caregiver.
export default function CarePlanDoc() {
  const { householdId } = useParams()

  return (
    <>
      <OnDutyHeader />
      <main className="flex flex-1 flex-col px-5 py-5">
        <Link
          to={`/household/${householdId}/info`}
          aria-label="Back"
          className="mb-3 -ml-1 flex h-9 w-9 items-center justify-center text-muted active:scale-[0.94]"
        >
          <ArrowLeftIcon width={22} height={22} strokeWidth={2} />
        </Link>

        <div className="mb-4">
          <h1 className="text-2xl font-bold text-ink">{carePlanDocument.fileName}</h1>
          <p className="mt-1 text-sm font-semibold text-muted">
            Last updated {formatLastUpdated(carePlanDocument.lastUpdated)}
          </p>
        </div>

        <iframe
          src={carePlanDocument.url}
          title="Full Care Plan"
          sandbox="allow-same-origin"
          className="min-h-0 w-full flex-1 rounded-[8px] bg-white shadow-card"
        />
      </main>
    </>
  )
}
