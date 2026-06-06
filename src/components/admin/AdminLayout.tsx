import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import type { UserInfo } from '../../types/auth'

interface Props {
  user: UserInfo
  onSignOut(): void
}

const NAV_ITEMS = [
  {
    path: '/admin/dashboard', label: 'Dashboard',
    icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="2"/></svg>,
  },
  {
    path: '/admin/events', label: 'Events',
    icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" strokeWidth="2" strokeLinecap="round"/></svg>,
  },
  {
    path: '/admin/users', label: 'Users',
    icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="9" cy="7" r="4" strokeWidth="2"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" strokeWidth="2" strokeLinecap="round"/><path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.87" strokeWidth="2" strokeLinecap="round"/></svg>,
  },
  {
    path: '/admin/revenue', label: 'Revenue',
    icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23" strokeWidth="2" strokeLinecap="round"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeWidth="2" strokeLinecap="round"/></svg>,
  },
  {
    path: '/admin/statistic', label: 'Statistics',
    icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
  {
    path: '/admin/chat', label: 'Chat',
    icon: <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  },
]

export function AdminLayout({ user, onSignOut }: Props) {
  const navigate = useNavigate()


  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="flex w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="flex h-14 items-center gap-2.5 border-b border-gray-200 px-5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">E</span>
          <div>
            <p className="text-sm font-bold tracking-wide text-gray-900">EventIQ</p>
            <p className="text-[10px] text-indigo-600 font-semibold uppercase tracking-widest">Admin</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-gray-200 p-3 space-y-0.5">
          <button
            onClick={() => navigate('/')}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Main Site
          </button>
          <button
            onClick={onSignOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Sign Out
          </button>
          <div className="px-3 pt-1">
            <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
      </aside>

      {/* Content area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
