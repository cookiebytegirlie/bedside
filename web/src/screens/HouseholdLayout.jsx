import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { HouseholdProvider, useHousehold } from '../state/HouseholdContext'
import BottomNav from '../components/BottomNav'
import Sidebar from '../components/Sidebar'
import DigestReadyToast from '../components/DigestReadyToast'
import ProfileGate from './ProfileGate'

function RouteAuditLogger() {
  const location = useLocation()
  const { logView } = useHousehold()

  useEffect(() => {
    logView(location.pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  return null
}

function HouseholdShell() {
  const { activeProfile } = useHousehold()
  const location = useLocation()
  const isPublicRoute = location.pathname.endsWith('/privacy')

  if (!activeProfile && !isPublicRoute) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col">
        <ProfileGate />
      </div>
    )
  }

  return (
    <>
      {activeProfile && <Sidebar />}
      <RouteAuditLogger />
      <div className={`flex min-h-screen flex-col bg-white pb-20 lg:pb-10 ${activeProfile ? 'lg:pl-64' : ''}`}>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col lg:max-w-2xl">
          <Outlet />
        </div>
      </div>
      {activeProfile && <BottomNav />}
      {activeProfile && <DigestReadyToast />}
    </>
  )
}

export default function HouseholdLayout() {
  return (
    <HouseholdProvider>
      <HouseholdShell />
    </HouseholdProvider>
  )
}
