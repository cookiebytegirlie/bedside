import { Link, useParams } from 'react-router-dom'
import { carePlanDocument } from '../mockData'
import { useHousehold } from '../state/HouseholdContext'
import OnDutyHeader from '../components/OnDutyHeader'
import { ArrowLeftIcon, FileTextIcon, ChevronRightIcon } from '../components/icons'

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
  const { activeProfile } = useHousehold()
  // Updating the care plan is a documented clinical action — nurses and family
  // only, matching the gate on the target screen (ClinicalRequest) and the
  // "Update care plan" row in Settings. Hidden entirely for other roles so the
  // shortcut never leads to a "not available" dead-end.
  const canUpdate = /nurse|family/i.test(activeProfile?.role || '')

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

        {canUpdate && (
          <Link
            to={`/household/${householdId}/settings/action/care-plan`}
            className="mb-4 flex items-center gap-3 rounded-card border border-line bg-white p-4 active:scale-[0.98]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-track text-icon">
              <FileTextIcon width={18} height={18} strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold tracking-tight text-ink">Update care plan</span>
              <span className="block text-[13px] font-medium text-muted">Shared with the care team</span>
            </span>
            <ChevronRightIcon width={17} height={17} strokeWidth={2.5} className="shrink-0 text-faint" />
          </Link>
        )}

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
