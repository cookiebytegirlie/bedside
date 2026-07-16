import { useHousehold } from '../state/HouseholdContext'
import OnDutyHeader from '../components/OnDutyHeader'
import FamilyAccessPanel from '../components/access/FamilyAccessPanel'
import VolunteerSelfView from '../components/access/VolunteerSelfView'
import { familyMembers, volunteers } from '../data/accessScheduleData'

// The household owner / primary family contact — used as the coordinator that
// everyone-but-them can reach out to.
const owner = familyMembers.find((f) => f.permission === 'owner')

// The view shown here follows whoever is actually signed in — family, nurse,
// or volunteer — rather than any demo persona toggle.
export default function AccessSchedule() {
  const { activeProfile } = useHousehold()
  const role = activeProfile?.role || ''
  const isFamily = /family/i.test(role)
  const isNurse = /nurse/i.test(role)

  let content
  if (isFamily) {
    // Household owner: full management, edits everything, sees the family list.
    // No coordinator card — they are the coordinator.
    content = <FamilyAccessPanel viewer={{ id: owner.id, name: owner.name }} isOwner canEditSchedule />
  } else if (isNurse) {
    // Nurse: not family. Can view/manage volunteers and view the schedule, but
    // can't edit the schedule, can't add to the backup pool, and doesn't see
    // the family-members list. Gets a coordinator contact instead.
    content = (
      <FamilyAccessPanel
        viewer={{ id: 'nurse', name: activeProfile?.name }}
        canEditSchedule={false}
        showFamilyMembers={false}
        canManageBackupPool={false}
        coordinator={owner}
      />
    )
  } else {
    // Volunteers / guests: their own shifts + access level + coordinator.
    const firstName = (activeProfile?.name || '').split(' ')[0]
    const record =
      volunteers.find((v) => v.name.split(' ')[0] === firstName) || {
        id: null,
        name: activeProfile?.name || 'Volunteer',
        accessTier: 'schedule_only',
      }
    content = <VolunteerSelfView volunteer={record} coordinator={owner} />
  }

  return (
    <>
      <OnDutyHeader />
      <main className="bg-white flex-1 px-5 pb-6 pt-6">
        <h1 className="mb-5 text-center text-2xl font-bold text-ink">Volunteer Access &amp; Schedule</h1>
        {content}
      </main>
    </>
  )
}
