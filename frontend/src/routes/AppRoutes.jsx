import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import DashboardLayout from '../components/layout/DashboardLayout'
import PublicLayout from '../components/layout/PublicLayout'
import { PageLoader } from '../components/ui/Feedback'
import HomePage from '../pages/public/HomePage'
import { AboutPage, ContactPage, DepartmentsPage, FAQPage, HowItWorksPage, NotFoundPage } from '../pages/public/InfoPages'
import TrackPage from '../pages/public/TrackPage'
import { LoginPage, RegisterPage } from '../pages/auth/AuthPages'
import { GuestRoute, ProtectedRoute } from './guards'

// Dashboards are code-split so public visitors never download staff code.
const named = (loader, name) => lazy(() => loader().then((m) => ({ default: m[name] })))
const CitizenDashboard = lazy(() => import('../pages/citizen/CitizenDashboard'))
const SubmitGrievancePage = lazy(() => import('../pages/citizen/SubmitGrievancePage'))
const MyGrievancesPage = lazy(() => import('../pages/citizen/MyGrievancesPage'))
const CitizenGrievanceDetail = lazy(() => import('../pages/citizen/CitizenGrievanceDetail'))
const CMODashboard = lazy(() => import('../pages/cmo/CMODashboard'))
const CMOGrievancesPage = lazy(() => import('../pages/cmo/CMOGrievancesPage'))
const CMOGrievanceDetail = lazy(() => import('../pages/cmo/CMOGrievanceDetail'))
const CMOReportsPage = lazy(() => import('../pages/cmo/CMOReportsPage'))
const CMOAnalyticsPage = lazy(() => import('../pages/cmo/CMOAnalyticsPage'))
const CMOEnquiriesPage = lazy(() => import('../pages/cmo/CMOEnquiriesPage'))
const officerPages = () => import('../pages/officer/OfficerPages')
const OfficerDashboard = named(officerPages, 'OfficerDashboard')
const OfficerGrievancesPage = named(officerPages, 'OfficerGrievancesPage')
const OfficerGrievanceDetail = named(officerPages, 'OfficerGrievanceDetail')
const NotificationsPage = lazy(() => import('../pages/shared/NotificationsPage'))

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="how-it-works" element={<HowItWorksPage />} />
          <Route path="departments" element={<DepartmentsPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="faq" element={<FAQPage />} />
          <Route path="track" element={<TrackPage />} />
          <Route path="track/:reference" element={<TrackPage />} />
          <Route element={<GuestRoute />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['CITIZEN']} />}>
          <Route path="citizen" element={<DashboardLayout />}>
            <Route index element={<CitizenDashboard />} />
            <Route path="grievances" element={<MyGrievancesPage />} />
            <Route path="grievances/new" element={<SubmitGrievancePage />} />
            <Route path="grievances/:reference" element={<CitizenGrievanceDetail />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['CMO_ADMIN']} />}>
          <Route path="cmo" element={<DashboardLayout />}>
            <Route index element={<CMODashboard />} />
            <Route path="grievances" element={<CMOGrievancesPage />} />
            <Route path="grievances/:reference" element={<CMOGrievanceDetail />} />
            <Route path="reports" element={<CMOReportsPage />} />
            <Route path="analytics" element={<CMOAnalyticsPage />} />
            <Route path="enquiries" element={<CMOEnquiriesPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['OFFICER']} />}>
          <Route path="officer" element={<DashboardLayout />}>
            <Route index element={<OfficerDashboard />} />
            <Route path="grievances" element={<OfficerGrievancesPage />} />
            <Route path="grievances/:reference" element={<OfficerGrievanceDetail />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
