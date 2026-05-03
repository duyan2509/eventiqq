import { useState, useEffect, useCallback } from 'react'
import { Popconfirm } from 'antd'
import type { PermissionResponse, PermissionDto } from '../../types/index'
import { getPermissions, createPermission, deletePermission } from '../../api/permissionApi'

interface Props {
  orgId: string
  onError: (msg: string) => void
}

export function OrgPermissionsTab({ orgId, onError }: Props) {
  const [permissions, setPermissions] = useState<PermissionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<PermissionDto>({ name: '', isDesigner: false })
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [inlineSuccess, setInlineSuccess] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const showError = (msg: string) => {
    setInlineError(msg)
    setTimeout(() => setInlineError(null), 5000)
  }

  const showSuccess = (msg: string) => {
    setInlineSuccess(msg)
    setTimeout(() => setInlineSuccess(null), 4000)
  }

  const getCreateErrorMessage = (e: any): string => {
    const status = e?.response?.status
    if (status === 409) return 'A permission with this name already exists.'
    if (status === 403) return 'You do not have permission to create roles.'
    if (status === 404) return 'Organization not found.'
    return 'Failed to create permission. Please try again.'
  }

  const getDeleteErrorMessage = (e: any): string => {
    const status = e?.response?.status
    if (status === 400) return 'Cannot delete this permission because it is still assigned to members. Please reassign them first.'
    if (status === 403) return 'You do not have permission to delete roles.'
    if (status === 404) return 'Permission not found.'
    return 'Failed to delete permission. Please try again.'
  }

  const fetchPermissions = useCallback(async () => {
    setLoading(true)
    try { const r = await getPermissions(orgId, 1, 50); setPermissions(r.data) } catch { }
    finally { setLoading(false) }
  }, [orgId])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setInlineError(null)
    try {
      await createPermission(orgId, form)
      setShowForm(false)
      setForm({ name: '', isDesigner: false })
      showSuccess('Permission created successfully.')
      fetchPermissions()
    } catch (e: any) {
      showError(getCreateErrorMessage(e))
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setInlineError(null)
    try {
      await deletePermission(orgId, id)
      showSuccess('Permission deleted successfully.')
      fetchPermissions()
    } catch (e: any) {
      showError(getDeleteErrorMessage(e))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1>Permissions</h1>
          <p className="text-sm text-slate-400">Define roles for members of this organization.</p>
        </div>
        <button className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors" onClick={() => setShowForm(true)}>+ Permission</button>
      </div>

      {/* Inline error toast */}
      {inlineError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400 fade-in">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          <span className="flex-1">{inlineError}</span>
          <button onClick={() => setInlineError(null)} className="text-red-400/60 hover:text-red-300 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Inline success toast */}
      {inlineSuccess && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400 fade-in">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="flex-1">{inlineSuccess}</span>
          <button onClick={() => setInlineSuccess(null)} className="text-emerald-400/60 hover:text-emerald-300 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="glass p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200">New Permission Role</h3>
          <div>
            <label>Role Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Event Manager" />
          </div>
          <label className="flex items-center gap-2.5 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={form.isDesigner} onChange={e => setForm({ ...form, isDesigner: e.target.checked })} className="w-auto h-4 w-4 rounded" />
            Has Seat Designer access
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">Cancel</button>
            <button disabled={creating} className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors disabled:opacity-40">
              {creating ? <span className="flex items-center gap-2"><span className="spinner h-4! w-4!" />Creating...</span> : 'Create'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="glass p-4"><div className="skeleton h-4 w-1/3" /></div>)}</div>
      ) : permissions.length === 0 ? (
        <div className="glass p-8 text-center text-sm text-slate-400">No permissions defined yet.</div>
      ) : (
        <div className="space-y-2">
          {permissions.map(p => (
            <div key={p.id} className="glass flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{p.name}</p>
                  {p.isDesigner && <span className="text-[10px] font-semibold text-purple-400">Designer Access</span>}
                </div>
              </div>
              {p.name === 'Owner' ? (
                <span className="text-[10px] font-bold text-amber-500/50 uppercase tracking-wider">System Default</span>
              ) : (
                <Popconfirm
                  title="Delete permission role"
                  description="Are you sure you want to delete this permission? It cannot be deleted if members are still assigned to it."
                  onConfirm={() => handleDelete(p.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <button disabled={deletingId === p.id} className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-40">
                    {deletingId === p.id ? <span className="flex items-center gap-1"><span className="spinner h-3! w-3!" />Deleting...</span> : 'Delete'}
                  </button>
                </Popconfirm>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
