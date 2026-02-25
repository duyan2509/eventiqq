import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthDropdown } from './AuthDropdown'
import { AppRoutes } from './AppRoutes'
import type { Role, UserInfo } from '../../types/auth'

type View = 'home' | 'auth' | 'switch-role' | 'admin'

export function AppShell() {
  const [view, setView] = useState<View>('home')
  const [user, setUser] = useState<UserInfo | null>(null)
  const navigate = useNavigate()

  const handleSignOut = () => {
    setUser(null)
    setView('home')
    navigate('/')
  }

  const handleRoleChange = (nextRole: Role) => {
    if (!user) return
    setUser({ ...user, currentRole: nextRole })
  }

  return (
    <div className="mx-auto my-6 max-w-5xl rounded-3xl border border-slate-600/60 bg-slate-900/95 px-6 pb-10 pt-5 shadow-[0_24px_80px_rgba(15,23,42,0.8)]">
      <header className="mb-4 flex items-center gap-6 border-b border-slate-600/70 pb-4">
        <button
          type="button"
          onClick={() => {
            setView('home')
            navigate('/')
          }}
          className="flex items-center gap-2 text-left"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-emerald-400 text-base font-semibold text-slate-50">
            E
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
            Eventiqq
          </span>
        </button>

        <nav className="flex flex-1 gap-2">
          <button
            className={`rounded-full px-3 py-2 text-sm transition ${
              view === 'home'
                ? 'bg-indigo-600/80 text-slate-50 shadow-[0_8px_24px_rgba(37,99,235,0.6)]'
                : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
            }`}
            onClick={() => setView('home')}
          >
            Home
          </button>
          {user?.currentRole === 'Admin' && (
            <button
              className={`rounded-full px-3 py-2 text-sm transition ${
                view === 'admin'
                  ? 'bg-indigo-600/80 text-slate-50 shadow-[0_8px_24px_rgba(37,99,235,0.6)]'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
              }`}
              onClick={() => {
                setView('admin')
                navigate('/admin')
              }}
            >
              Admin
            </button>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {!user && (
            <>
              <button
                className="rounded-full border border-slate-500/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 hover:bg-slate-900"
                onClick={() => {
                  setView('auth')
                  navigate('/auth')
                }}
              >
                Sign in
              </button>
              <button
                className="rounded-full bg-indigo-600 px-3 py-2 text-sm font-medium text-slate-50 shadow-[0_10px_24px_rgba(37,99,235,0.7)] hover:bg-indigo-500"
                onClick={() => {
                  setView('auth')
                  navigate('/auth')
                }}
              >
                Sign up
              </button>
            </>
          )}

          {user && (
            <AuthDropdown
              user={user}
              onOpenProfile={() => {
                setView('auth')
                navigate('/auth')
              }}
              onOpenSwitchRole={() => {
                setView('switch-role')
                navigate('/switch-role')
              }}
              onSignOut={handleSignOut}
            />
          )}
        </div>
      </header>

      <main className="pt-5">
        <AppRoutes
          user={user}
          onAuthenticated={(nextUser) => {
            setUser(nextUser)
            setView('home')
          }}
          onRoleChanged={handleRoleChange}
        />
      </main>
    </div>
  )
}

