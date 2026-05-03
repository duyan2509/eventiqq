import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { OrganizationDetail, OrganizationDto } from '../types/organization'
import { getMyOrganizations, createOrganization } from '../api/organizationApi'

export function OrganizationsPage() {
  const navigate = useNavigate()
  const [orgs, setOrgs] = useState<OrganizationDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<OrganizationDto>({ name: '', description: '' })
  const [creating, setCreating] = useState(false)

  const fetchOrgs = async (p: number) => {
    setLoading(true)
    try { const r = await getMyOrganizations(p, 12); setOrgs(r.data); setTotal(r.total) }
    catch { setError('Failed to load organizations.') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchOrgs(page) }, [page])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setCreating(true)
    try {
      await createOrganization(createForm)
      setShowCreate(false)
      setCreateForm({ name: '', description: '' })
      fetchOrgs(1); setPage(1)
    }
    catch (e: any) { setError(e?.response?.data?.message || 'Failed to create.') }
    finally { setCreating(false) }
  }

  const totalPages = Math.ceil(total / 12)

  return (
    <div className="fade-in space-y-6">
      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="glass w-full max-w-md p-6 fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4">Create Organization</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div><label>Name</label><input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} required placeholder="Organization name" /></div>
              <div><label>Description <span className="text-slate-500 text-xs">(optional)</span></label><textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} rows={2} placeholder="What does this org do?" /></div>
              <div className="flex justify-end gap-2">
                <button type="button" className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors" onClick={() => setShowCreate(false)}>Cancel</button>
                <button className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1>Organizations</h1>
          <p className="text-sm text-slate-400">Select a workspace to manage members, invitations, and payments.</p>
        </div>
        <button className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors" onClick={() => setShowCreate(true)}>+ New Organization</button>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="skeleton h-10 w-10 rounded-xl" />
                <div className="space-y-1.5 flex-1"><div className="skeleton h-4 w-2/3" /><div className="skeleton h-3 w-1/3" /></div>
              </div>
            </div>
          ))}
        </div>
      ) : orgs.length === 0 ? (
        <div className="glass p-12 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10">
            <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
          </div>
          <p className="text-sm font-medium text-slate-300">No organizations yet</p>
          <p className="text-xs text-slate-500">Create your first organization to get started.</p>
          <button onClick={() => setShowCreate(true)} className="mt-2 rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors">Create Organization</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map(org => (
            <div
              key={org.id}
              className="glass group cursor-pointer p-5 transition-all hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5"
              onClick={() => navigate(`/organizations/${org.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-lg font-bold text-indigo-400 transition-colors group-hover:bg-indigo-500/25">
                  {org.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-slate-100">{org.name}</h3>
                  {org.description && <p className="mt-0.5 truncate text-xs text-slate-500">{org.description}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    {org.isOwner && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400">Owner</span>}
                    {org.size != null && <span className="text-[11px] text-slate-600">{org.size} member{org.size !== 1 ? 's' : ''}</span>}
                  </div>
                </div>
                <svg className="h-4 w-4 text-slate-600 transition-colors group-hover:text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-30 hover:border-slate-600 transition-colors" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
          <span className="text-sm text-slate-400">{page} / {totalPages}</span>
          <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-30 hover:border-slate-600 transition-colors" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</button>
        </div>
      )}
    </div>
  )
}
