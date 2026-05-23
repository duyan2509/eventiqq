import { useEffect, useState } from 'react'
import { message, Popconfirm } from 'antd'
import type { LegendResponse, CreateLegendDto } from '../../../types/index'
import { getLegends, createLegend, deleteLegend } from '../../../api/legendApi'
import { formatPrice } from '../../../utils/format'

interface Props {
  eventId: string
  orgId: string
  canEdit: boolean
  eventStatus?: string
}

export function EventLegendsTab({ eventId, orgId, canEdit, eventStatus }: Props) {
  const canModify = canEdit && (!eventStatus || eventStatus === 'Draft')
  const [legends, setLegends] = useState<LegendResponse[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateLegendDto>({ name: '', color: '#6366f1', price: 0 })

  const fetchLegends = async () => {
    try { const r = await getLegends(eventId); setLegends(r.data) } catch { }
  }

  useEffect(() => { fetchLegends() }, [eventId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await createLegend(eventId, orgId, form); message.success('Legend created'); setShowForm(false); setForm({ name: '', color: '#6366f1', price: 0 }); fetchLegends() }
    catch (e: any) { message.error(e?.response?.data?.message || 'Failed.') }
  }

  const handleDelete = async (id: string) => {
    try { await deleteLegend(eventId, id, orgId); message.success('Legend deleted'); fetchLegends() } catch { }
  }

  return (
    <>
      {canModify && <button className="mb-3 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400" onClick={() => setShowForm(true)}>+ New Legend</button>}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 space-y-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <h4 className="text-sm font-semibold text-indigo-300">Create Legend (Ticket Tier)</h4>
          <div><label className="text-xs text-slate-400">Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. VIP, General" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="h-9 w-12 cursor-pointer rounded border border-slate-700 bg-transparent p-0.5" />
                <span className="text-xs text-slate-400 font-mono">{form.color}</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400">Price (USD)</label>
              <input type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} placeholder="0 = Free" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" className="text-sm text-slate-400 hover:text-slate-200" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="rounded-lg bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400">Create</button>
          </div>
        </form>
      )}
      {legends.length === 0 ? <p className="text-sm text-slate-400">No legends yet.</p> : (
        <div className="space-y-2">{legends.map(l => (
          <div key={l.id} className="flex items-center justify-between rounded-xl border border-slate-700/30 bg-slate-900/40 px-4 py-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="h-5 w-5 rounded-full flex-shrink-0 border border-white/10" style={{ background: l.color }} />
              <div>
                <strong className="text-slate-200">{l.name}</strong>
                <p className="text-xs text-slate-500 mt-0.5">{formatPrice(l.price)}</p>
              </div>
            </div>
            {canModify && (
              <Popconfirm title="Delete legend?" onConfirm={() => handleDelete(l.id)}>
                <button className="text-xs text-red-400 hover:text-red-300">Delete</button>
              </Popconfirm>
            )}
          </div>
        ))}</div>
      )}
    </>
  )
}
