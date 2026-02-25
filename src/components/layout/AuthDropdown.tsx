import { useState } from 'react'
import type { UserInfo } from '../../types/auth'

interface AuthDropdownProps {
  user: UserInfo
  onOpenProfile(): void
  onOpenSwitchRole(): void
  onSignOut(): void
}

export function AuthDropdown({
  user,
  onOpenProfile,
  onOpenSwitchRole,
  onSignOut,
}: AuthDropdownProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="auth-dropdown-wrapper">
      <button
        className="auth-trigger"
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="auth-trigger-avatar">
          {user.email[0]?.toUpperCase() ?? 'U'}
        </div>
        <div className="auth-trigger-text">
          <span className="auth-trigger-email">{user.email}</span>
          <span className="auth-trigger-role">
            Current role: {user.currentRole}
          </span>
        </div>
        <span className="auth-trigger-caret">▾</span>
      </button>

      {open && (
        <div className="auth-dropdown">
          <button
            className="auth-dropdown-item"
            onClick={() => {
              onOpenProfile()
              setOpen(false)
            }}
          >
            Profile
          </button>
          <button
            className="auth-dropdown-item"
            onClick={() => {
              onOpenSwitchRole()
              setOpen(false)
            }}
          >
            Switch role
          </button>
          <div className="auth-dropdown-divider" />
          <button
            className="auth-dropdown-item danger"
            onClick={() => {
              onSignOut()
              setOpen(false)
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

