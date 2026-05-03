import { useState } from 'react'
import type { UserInfo } from '../../types/auth'

interface AuthDropdownProps {
  user: UserInfo
  onOpenProfile(): void
  onOpenSwitchRole(): void
  onSignOut(): void
}

export function AuthDropdown({ user, onOpenProfile, onOpenSwitchRole, onSignOut }: AuthDropdownProps) {
  const [open, setOpen] = useState(false)

  const roleColor: Record<string, string> = {
    User: 'text-slate-400',
    Admin: 'text-red-400',
    Organization: 'text-indigo-400',
    Staff: 'text-emerald-400',
    Organizer: 'text-amber-400',
  }

  const color = roleColor[user.currentRole] || 'text-slate-400'

  return (
    <div className="relative">
      <button className="flex items-center gap-2.5 rounded-full border border-slate-700/50 px-3 py-1.5 transition-colors hover:border-slate-600" onClick={() => setOpen(p => !p)}>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-300">
          {user.email[0]?.toUpperCase() ?? 'U'}
        </div>
        <div className="hidden flex-col items-start sm:flex">
          <span className="text-xs font-medium text-slate-200">{user.email}</span>
          <span className={`text-[10px] ${color}`}>
            {user.currentRole}{user.orgName ? ` · ${user.orgName}` : ''}
          </span>
        </div>
        <span className="text-[10px] text-slate-500">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[160px] rounded-xl border border-slate-700/50 bg-slate-900/95 p-1 shadow-xl backdrop-blur-lg fade-in">
          {/* Role badge */}
          <div className="px-3 py-2 border-b border-slate-700/50">
            <div className="flex items-center gap-2">
              <span className={`rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold ${color}`}>
                {user.currentRole}
              </span>
              {user.orgName && (
                <span className="text-[10px] text-slate-400 truncate max-w-[100px]">{user.orgName}</span>
              )}
            </div>
          </div>
          <button className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-slate-300 transition-colors hover:bg-slate-800/60" onClick={() => { onOpenProfile(); setOpen(false) }}>
            Profile
          </button>
          <button className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-slate-300 transition-colors hover:bg-slate-800/60" onClick={() => { onOpenSwitchRole(); setOpen(false) }}>
            Switch Role
          </button>
          <div className="my-1 h-px bg-slate-700/50" />
          <button className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-red-400 transition-colors hover:bg-red-500/10" onClick={() => { onSignOut(); setOpen(false) }}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
