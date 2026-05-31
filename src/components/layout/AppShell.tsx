import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { AuthDropdown } from './AuthDropdown'
import { signOut, tryRefreshSession } from '../../api/authApi'
import { AppRoutes } from './AppRoutes'
import type { Role, UserInfo } from '../../types/auth'

type NavItem = { label: string; path: string; requiresAuth?: boolean; roles?: Role[] }

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', path: '/' },
  { label: 'Events', path: '/events' },
  { label: 'My Tickets', path: '/my-tickets', requiresAuth: true },
  { label: 'Organizations', path: '/organizations', requiresAuth: true },
  { label: 'Invitations', path: '/invitations', requiresAuth: true },
]

export function AppShell() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [restoring, setRestoring] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    tryRefreshSession()
      .then(u => setUser(u))
      .finally(() => setRestoring(false))
  }, [])

  const handleSignOut = async () => { await signOut(); setUser(null); navigate('/') }
  const handleRoleChange = (_role: Role, updatedUser: UserInfo) => { setUser(updatedUser) }
  const currentPath = location.pathname
  const isOrgWorkspace = /^\/organizations\/[^/]+/.test(currentPath)
  const isAdminRoute = currentPath.startsWith('/admin')
  const isSeatDesigner = /^\/events\/[^/]+\/seat-design/.test(currentPath)
  const isSeatBooking = /^\/sessions\/[^/]+\/book/.test(currentPath) || currentPath === '/checkout'

  if (restoring) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="spinner" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAdminRoute || isSeatDesigner || isSeatBooking) {
    return (
      <AppRoutes
        user={user}
        onAuthenticated={(nextUser) => { setUser(nextUser); navigate('/') }}
        onRoleChanged={handleRoleChange}
        onSignOut={handleSignOut}
      />
    )
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-slate-800/60 bg-slate-950/80 px-6 py-3 backdrop-blur-xl">
        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2.5 outline-none">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white">E</span>
          <span className="text-sm font-bold tracking-wider text-slate-200 uppercase">Eventiqq</span>
        </button>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            if (item.requiresAuth && !user) return null
            if (item.roles && (!user || !item.roles.includes(user.currentRole))) return null
            const isActive = currentPath === item.path
            return (
              <button
                key={item.path}
                className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${isActive ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
                onClick={() => navigate(item.path)}
              >
                {item.label}
              </button>
            )
          })}
          {user?.currentRole === 'Admin' && (
            <button
              className="rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              onClick={() => navigate('/admin/dashboard')}
            >
              Admin
            </button>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {!user && (
            <>
              <button className="rounded-full border border-slate-700 px-4 py-1.5 text-[13px] font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white" onClick={() => navigate('/auth')}>
                Sign In
              </button>
              <button className="rounded-full bg-indigo-500 px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-indigo-400" onClick={() => navigate('/auth')}>
                Sign Up
              </button>
            </>
          )}
          {user && (
            <AuthDropdown
              user={user}
              onOpenProfile={() => navigate('/auth')}
              onOpenSwitchRole={() => navigate('/switch-role')}
              onSignOut={handleSignOut}
            />
          )}
        </div>
      </header>

      {isOrgWorkspace ? (
        <AppRoutes
          user={user}
          onAuthenticated={(nextUser) => { setUser(nextUser); navigate('/') }}
          onRoleChanged={handleRoleChange}
          onSignOut={handleSignOut}
        />
      ) : (
        <main className="mx-auto max-w-7xl px-6 py-8">
          <AppRoutes
            user={user}
            onAuthenticated={(nextUser) => { setUser(nextUser); navigate('/') }}
            onRoleChanged={handleRoleChange}
            onSignOut={handleSignOut}
          />
        </main>
      )}
    </div>
  )
}
