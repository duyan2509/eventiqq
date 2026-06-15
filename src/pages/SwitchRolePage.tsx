import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Role, UserInfo } from '../types/auth'
import type { OrganizationDetail, OrganizationDto } from '../types/organization'
import { getMyOrganizations, createOrganization } from '../api/organizationApi'
import { switchRole, switchToUser } from '../api/authApi'
import { getAccessToken } from '../store/authStore'
import { getOrgIdFromToken } from '../utils/jwt'

interface Props { user: UserInfo; onRoleChanged(role: Role, user: UserInfo): void }

export function SwitchRolePage({ user, onRoleChanged }: Props) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orgs, setOrgs] = useState<OrganizationDetail[]>([])
  const [loadingOrgs, setLoadingOrgs] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState('')

  // Create org
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<OrganizationDto>({ name: '' })
  const [creating, setCreating] = useState(false)

  const loadOrgs = async () => {
    setLoadingOrgs(true)
    try {
      const r = await getMyOrganizations(1, 50)
      setOrgs(r.data)
      if (r.data.length > 0 && !selectedOrgId) setSelectedOrgId(r.data[0].id)
    } catch {
      setError('Failed to load organizations.')
    } finally {
      setLoadingOrgs(false)
    }
  }

  useEffect(() => { loadOrgs() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setCreating(true); setError(null)
    try {
      await createOrganization(createForm)
      setShowCreate(false); setCreateForm({ name: '' })
      await loadOrgs()
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to create organization.')
    } finally { setCreating(false) }
  }

  const handleConfirmSwitch = async () => {
    if (!selectedOrgId) return
    setLoading(true)
    setError(null)
    try {
      const selectedOrg = orgs.find(o => o.id === selectedOrgId)
      const updated = await switchRole({
        organizationId: selectedOrgId,
        organizationName: selectedOrg?.name,
      })
      onRoleChanged(updated.currentRole, updated)
      // On a successful switch into an org context (Organization / Organizer / Staff),
      // decode the new JWT for the org id and jump straight to that org's workspace.
      const ORG_SCOPED: Role[] = ['Organization', 'Organizer', 'Staff']
      if (ORG_SCOPED.includes(updated.currentRole)) {
        const orgId = getOrgIdFromToken(getAccessToken()) ?? updated.orgId ?? selectedOrgId
        navigate(`/organizations/${orgId}`)
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to switch role.')
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchToUser = async () => {
    setLoading(true)
    setError(null)
    try {
      const updated = await switchToUser()
      onRoleChanged(updated.currentRole, updated)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to switch to User role.')
    } finally {
      setLoading(false)
    }
  }

  const selectedOrg = orgs.find(o => o.id === selectedOrgId)

  return (
    <div className="mx-auto max-w-lg fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Switch Organization</h1>
          <p className="text-sm text-slate-400">
            Current role: <span className="rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">{user.currentRole}</span>
            {user.orgName && <span className="ml-2 text-xs text-slate-500">({user.orgName})</span>}
          </p>
        </div>
        <button
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
          onClick={() => setShowCreate(true)}
        >
          + Create Org
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</div>}

      {/* Create Org Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="glass w-full max-w-md p-6 fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4">Create Organization</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label>Name</label>
                <input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} required placeholder="Organization name" />
              </div>
              <div>
                <label>Description (optional)</label>
                <textarea value={createForm.description ?? ''} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} rows={2} placeholder="Short description" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:text-white" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Switch to User role button */}
      {user.currentRole !== 'User' && (
        <button
          className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
          disabled={loading}
          onClick={handleSwitchToUser}
        >
          {loading ? 'Switching...' : '👤 Switch Back to User Role'}
        </button>
      )}

      {loadingOrgs ? (
        <div className="flex items-center justify-center py-12"><div className="spinner" /></div>
      ) : orgs.length === 0 ? (
        <div className="glass p-6 text-center text-sm text-slate-400">
          <p className="text-2xl mb-2">🏢</p>
          <p>You have no organizations yet.</p>
          <p className="text-xs text-slate-500 mt-1">Create one to get started!</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {orgs.map(o => (
              <button key={o.id}
                className={`glass w-full p-5 text-left transition-all hover:border-indigo-500/30 ${selectedOrgId === o.id ? 'border-indigo-500/40 bg-indigo-500/5' : ''}`}
                onClick={() => setSelectedOrgId(o.id)}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏢</span>
                  <div>
                    <h3 className="font-semibold">{o.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{o.id.slice(0, 8)}...</p>
                  </div>
                  {selectedOrgId === o.id && <span className="ml-auto rounded-full bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-400">Selected</span>}
                </div>
              </button>
            ))}
          </div>

          <button
            className="w-full rounded-lg bg-indigo-500 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors disabled:opacity-40"
            disabled={!selectedOrgId || loading}
            onClick={handleConfirmSwitch}>
            {loading ? 'Switching...' : `Switch to ${selectedOrg?.name ?? 'Organization'}`}
          </button>
        </>
      )}
    </div>
  )
}
