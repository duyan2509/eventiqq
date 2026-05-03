import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { HomePage } from '../../pages/HomePage'
import { AuthPage } from '../../pages/AuthPage'
import { ForgotPasswordPage } from '../../pages/ForgotPasswordPage'
import { ResetPasswordPage } from '../../pages/ResetPasswordPage'
import { SwitchRolePage } from '../../pages/SwitchRolePage'
import { AdminPage } from '../../pages/AdminPage'
import { OrganizationsPage } from '../../pages/OrganizationsPage'
import { EventsPage } from '../../pages/EventsPage'

import { InvitationsPage } from '../../pages/InvitationsPage'
import { SeatDesignerPage } from '../../pages/SeatDesignerPage'
import { StripeReturnPage, StripeRefreshPage } from '../../pages/StripeCallbackPage'
import { OrgWorkspacePage } from '../../pages/OrgWorkspacePage'
import type { Role, UserInfo } from '../../types/auth'

interface AppRoutesProps {
  user: UserInfo | null
  onAuthenticated(user: UserInfo): void
  onRoleChanged(role: Role, user: UserInfo): void
}

const AuthGuard = ({ children, user, message }: { children: React.ReactNode; user: UserInfo | null; message: string }) =>
  user ? <>{children}</> : <div className="glass p-8 text-center text-sm text-slate-400">{message}</div>

export function AppRoutes({ user, onAuthenticated, onRoleChanged }: AppRoutesProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/auth" element={<AuthPage onAuthenticated={(u) => { onAuthenticated(u); navigate('/') }} />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/organizations" element={<AuthGuard user={user} message="Please sign in to view organizations."><OrganizationsPage /></AuthGuard>} />
      <Route path="/organizations/:orgId" element={<AuthGuard user={user} message="Please sign in to view this organization."><OrgWorkspacePage user={user} /></AuthGuard>} />

      <Route path="/invitations" element={<AuthGuard user={user} message="Please sign in to view invitations."><InvitationsPage /></AuthGuard>} />
      <Route path="/switch-role" element={<AuthGuard user={user} message="Please sign in to switch roles.">{user && <SwitchRolePage user={user} onRoleChanged={onRoleChanged} />}</AuthGuard>} />
      <Route path="/admin" element={user?.currentRole === 'Admin' ? <AdminPage /> : <div className="glass p-8 text-center text-sm text-slate-400">Admin access only.</div>} />
      <Route path="/events/:eventId/seat-design" element={<AuthGuard user={user} message="Please sign in to use Seat Designer."><SeatDesignerPage /></AuthGuard>} />
      <Route path="/events/:eventId/seat-design/:seatMapId" element={<AuthGuard user={user} message="Please sign in to use Seat Designer."><SeatDesignerPage /></AuthGuard>} />
      <Route path="/organizations/:orgId/payment/return" element={<AuthGuard user={user} message="Please sign in to complete Stripe setup."><StripeReturnPage /></AuthGuard>} />
      <Route path="/organizations/:orgId/payment/refresh" element={<AuthGuard user={user} message="Please sign in to complete Stripe setup."><StripeRefreshPage /></AuthGuard>} />
      <Route path="*" element={<Navigate to="/" replace state={{ from: location }} />} />
    </Routes>
  )
}
