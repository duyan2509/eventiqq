import { useState } from 'react'
import type { Role, UserInfo } from '../types/auth'

interface SwitchRolePageProps {
  user: UserInfo
  onRoleChanged(role: Role): void
}

export function SwitchRolePage({ user, onRoleChanged }: SwitchRolePageProps) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isLoadingOrgs, setLoadingOrgs] = useState(false)
  const [orgs, setOrgs] = useState<string[]>([])
  const [message, setMessage] = useState<string | null>(null)

  const handleSelectRole = async (role: Role) => {
    if (role === user.currentRole) return
    setSelectedRole(role)
    setLoadingOrgs(true)
    setMessage(null)

    try {
      setTimeout(() => {
        setOrgs(['Sample Organization A', 'Sample Organization B'])
        setLoadingOrgs(false)
      }, 600)
    } catch {
      setMessage('Could not load organizations. Please try again.')
      setLoadingOrgs(false)
    }
  }

  const handleSwitchOrg = async (orgName: string) => {
    setMessage(null)
    try {
      if (selectedRole) {
        onRoleChanged(selectedRole)
        setMessage(`Switched to ${selectedRole} at ${orgName} (mock).`)
      }
    } catch {
      setMessage('Switch role failed. Please try again.')
    }
  }

  const roles: Role[] = ['User', 'Org', 'Staff']

  return (
    <div className="switch-layout">
      <div className="card">
        <h2>Switch role</h2>
        <p className="text-muted">
          Choose a role to work with a specific organization. The current role is
          disabled.
        </p>

        <div className="role-list">
          {roles.map((role) => {
            const isCurrent = role === user.currentRole
            return (
              <button
                key={role}
                className={
                  'role-pill' +
                  (isCurrent ? ' role-pill-current' : '') +
                  (selectedRole === role ? ' role-pill-selected' : '')
                }
                disabled={isCurrent}
                onClick={() => handleSelectRole(role)}
              >
                <span>{role}</span>
                {isCurrent && <span className="role-tag">Current</span>}
              </button>
            )
          })}
        </div>

        <div className="org-panel">
          <h3>My organizations</h3>
          {!selectedRole && (
            <p className="text-muted">
              Select <strong>Org</strong> or <strong>Staff</strong> to see organizations.
            </p>
          )}
          {selectedRole && isLoadingOrgs && (
            <div className="org-skeleton-list">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="skeleton-line wide" />
              ))}
            </div>
          )}
          {selectedRole && !isLoadingOrgs && orgs.length > 0 && (
            <div className="org-list">
              {orgs.map((org) => (
                <button
                  key={org}
                  className="org-item"
                  onClick={() => handleSwitchOrg(org)}
                >
                  <span>{org}</span>
                  <span className="org-item-hint">Switch to this organization</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {message && <p className="auth-message">{message}</p>}
      </div>
    </div>
  )
}

