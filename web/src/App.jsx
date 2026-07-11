import { Routes, Route, Navigate } from 'react-router-dom'
import Entry from './screens/Entry'
import HouseholdLayout from './screens/HouseholdLayout'
import Timeline from './screens/Timeline'
import MeetEllie from './screens/MeetEllie'
import ShiftEnd from './screens/ShiftEnd'
import LogShift from './screens/LogShift'
import CarePlanQA from './screens/CarePlanQA'
import Settings from './screens/Settings'
import RequestMedChange from './screens/RequestMedChange'
import ClinicalRequest from './screens/ClinicalRequest'
import AccessSchedule from './screens/AccessSchedule'
import EssentialInfo from './screens/EssentialInfo'
import CarePlanDoc from './screens/CarePlanDoc'
import PrivacySecurity from './screens/PrivacySecurity'
import VolunteerAccess from './screens/VolunteerAccess'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Entry />} />
      <Route path="/household/:householdId" element={<HouseholdLayout />}>
        <Route index element={<Timeline />} />
        <Route path="about" element={<MeetEllie />} />
        <Route path="end-shift" element={<ShiftEnd />} />
        <Route path="log" element={<LogShift />} />
        <Route path="ask" element={<CarePlanQA />} />
        <Route path="info" element={<EssentialInfo />} />
        <Route path="care-plan-doc" element={<CarePlanDoc />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/access" element={<AccessSchedule />} />
        <Route path="settings/request-med" element={<RequestMedChange />} />
        <Route path="settings/action/:kind" element={<ClinicalRequest />} />
        <Route path="privacy" element={<PrivacySecurity />} />
        <Route path="access" element={<VolunteerAccess />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
