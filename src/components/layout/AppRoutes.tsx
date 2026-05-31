import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { HomePage } from '../../pages/HomePage'
import { AuthPage } from '../../pages/AuthPage'
import { ForgotPasswordPage } from '../../pages/ForgotPasswordPage'
import { ResetPasswordPage } from '../../pages/ResetPasswordPage'
import { SwitchRolePage } from '../../pages/SwitchRolePage'
import { OrganizationsPage } from '../../pages/OrganizationsPage'
import { EventsPage } from '../../pages/EventsPage'
import { InvitationsPage } from '../../pages/InvitationsPage'
import { SeatDesignerPage } from '../../pages/SeatDesignerPage'
import { SeatBookingPage } from '../../pages/SeatBookingPage'
import { StripeReturnPage, StripeRefreshPage } from '../../pages/StripeCallbackPage'
import { PaymentSuccessPage } from '../../pages/PaymentSuccessPage'
import { PaymentCancelPage } from '../../pages/PaymentCancelPage'
import { CheckoutPage } from '../../pages/CheckoutPage'
import { MyTicketsPage } from '../../pages/MyTicketsPage'
import { StaffScanPage } from '../../pages/StaffScanPage'
import { EventCheckInPage } from '../../pages/EventCheckInPage'
import { OrgWorkspacePage } from '../../pages/OrgWorkspacePage'
import { AdminLayout } from '../admin/AdminLayout'
import { AdminDashboardPage } from '../../pages/admin/AdminDashboardPage'
import { AdminEventsPage } from '../../pages/admin/AdminEventsPage'
import { AdminUsersPage } from '../../pages/admin/AdminUsersPage'
import { AdminRevenuePage } from '../../pages/admin/AdminRevenuePage'
import { AdminStatisticPage } from '../../pages/admin/AdminStatisticPage'
import type { Role, UserInfo } from '../../types/auth'

interface AppRoutesProps {
  user: UserInfo | null
  onAuthenticated(user: UserInfo): void
  onRoleChanged(role: Role, user: UserInfo): void
  onSignOut(): void
}

const AuthGuard = ({ children, user, message }: { children: React.ReactNode; user: UserInfo | null; message: string }) =>
  user ? <>{children}</> : <div className="glass p-8 text-center text-sm text-slate-400">{message}</div>

export function AppRoutes({ user, onAuthenticated, onRoleChanged, onSignOut }: AppRoutesProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const adminGuard = user?.currentRole === 'Admin' && user != null
    ? user
    : null

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth" element={<AuthPage onAuthenticated={(u) => { onAuthenticated(u); navigate(u.currentRole === 'Admin' ? '/admin/dashboard' : '/') }} />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/organizations" element={<AuthGuard user={user} message="Please sign in to view organizations."><OrganizationsPage /></AuthGuard>} />
      <Route path="/organizations/:orgId" element={<AuthGuard user={user} message="Please sign in to view this organization."><OrgWorkspacePage user={user} /></AuthGuard>} />
      <Route path="/invitations" element={<AuthGuard user={user} message="Please sign in to view invitations."><InvitationsPage /></AuthGuard>} />
      <Route path="/switch-role" element={<AuthGuard user={user} message="Please sign in to switch roles.">{user && <SwitchRolePage user={user} onRoleChanged={onRoleChanged} />}</AuthGuard>} />

      <Route
        path="/admin"
        element={adminGuard
          ? <AdminLayout user={adminGuard} onSignOut={onSignOut} />
          : <div className="glass p-8 text-center text-sm text-slate-400">Admin access only.</div>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="events" element={<AdminEventsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="revenue" element={<AdminRevenuePage />} />
        <Route path="statistic" element={<AdminStatisticPage />} />
      </Route>

      <Route path="/sessions/:sessionId/book" element={<AuthGuard user={user} message="Please sign in to book seats."><SeatBookingPage /></AuthGuard>} />
      <Route path="/checkout" element={<AuthGuard user={user} message="Please sign in to checkout."><CheckoutPage /></AuthGuard>} />
      <Route path="/events/:eventId/seat-design" element={<AuthGuard user={user} message="Please sign in to use Seat Designer."><SeatDesignerPage user={user} /></AuthGuard>} />
      <Route path="/events/:eventId/seat-design/:seatMapId" element={<AuthGuard user={user} message="Please sign in to use Seat Designer."><SeatDesignerPage user={user} /></AuthGuard>} />
      <Route path="/organizations/:orgId/payment/return" element={<AuthGuard user={user} message="Please sign in to complete Stripe setup."><StripeReturnPage /></AuthGuard>} />
      <Route path="/organizations/:orgId/payment/refresh" element={<AuthGuard user={user} message="Please sign in to complete Stripe setup."><StripeRefreshPage /></AuthGuard>} />
      <Route path="/payment/success" element={<AuthGuard user={user} message="Please sign in to view payment result."><PaymentSuccessPage /></AuthGuard>} />
      <Route path="/payment/cancel" element={<PaymentCancelPage />} />
      <Route path="/my-tickets" element={<AuthGuard user={user} message="Please sign in to view your tickets."><MyTicketsPage /></AuthGuard>} />
      <Route path="/staff/scan" element={
        user && (user.currentRole === 'Staff' || user.currentRole === 'Organization')
          ? <StaffScanPage />
          : <div className="glass p-8 text-center text-sm text-slate-400">Staff or Organization role required.</div>
      } />
      <Route path="/events/:eventId/checkin" element={
        user && (user.currentRole === 'Staff' || user.currentRole === 'Organization')
          ? <EventCheckInPage />
          : <div className="glass p-8 text-center text-sm text-slate-400">Staff or Organization role required.</div>
      } />
      <Route path="*" element={<Navigate to="/" replace state={{ from: location }} />} />
    </Routes>
  )
}
