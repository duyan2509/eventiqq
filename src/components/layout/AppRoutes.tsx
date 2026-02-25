import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { HomePage } from '../../pages/HomePage'
import { AuthPage } from '../../pages/AuthPage'
import { SwitchRolePage } from '../../pages/SwitchRolePage'
import { AdminPage } from '../../pages/AdminPage'
import type { Role, UserInfo } from '../../types/auth'

interface AppRoutesProps {
  user: UserInfo | null
  onAuthenticated(user: UserInfo): void
  onRoleChanged(role: Role): void
}

export function AppRoutes({ user, onAuthenticated, onRoleChanged }: AppRoutesProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/auth"
        element={
          <AuthPage
            onAuthenticated={(nextUser) => {
              onAuthenticated(nextUser)
              navigate('/')
            }}
          />
        }
      />
      <Route
        path="/switch-role"
        element={
          user ? (
            <SwitchRolePage
              user={user}
              onRoleChanged={onRoleChanged}
            />
          ) : (
            <div className="card subtle">
              <p>Please sign in first to switch role.</p>
            </div>
          )
        }
      />
      <Route
        path="/admin"
        element={
          user?.currentRole === 'Admin' ? (
            <AdminPage />
          ) : (
            <div className="card subtle">
              <p>Only admin users can access this area.</p>
            </div>
          )
        }
      />
      <Route
        path="*"
        element={<Navigate to="/" replace state={{ from: location }} />}
      />
    </Routes>
  )
}

