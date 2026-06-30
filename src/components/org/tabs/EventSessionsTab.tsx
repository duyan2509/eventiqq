import { useEffect, useState } from 'react'
import { message, Popconfirm } from 'antd'
import { useNavigate } from 'react-router-dom'
import type { SessionResponse, ChartResponse, CreateSessionDto } from '../../../types/index'
import { getSessions, createSession, deleteSession } from '../../../api/sessionApi'
import { getCharts } from '../../../api/chartApi'
import { getSessionMeta } from '../../../api/seatApi'
import { formatDate } from '../../../utils/format'

interface Props {
  eventId: string
  orgId: string
  canEdit: boolean
  eventStatus?: string
}

export function EventSessionsTab({ eventId, orgId, canEdit, eventStatus }: Props) {
  const canModify = canEdit && (!eventStatus || eventStatus === 'Draft')
  const navigate = useNavigate()
  const [sessions, setSessions] = useState<SessionResponse[]>([])
  const [charts, setCharts] = useState<ChartResponse[]>([])
  const [designLoading, setDesignLoading] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateSessionDto>({ name: '', startTime: '', endTime: '', chartId: '' })

  const fetchAll = async () => {
    try {
      const [s, c] = await Promise.all([getSessions(eventId), getCharts(eventId)])
      setSessions(s.data); setCharts(c.data)
    } catch { }
  }

  useEffect(() => { fetchAll() }, [eventId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await createSession(eventId, orgId, form); message.success('Session created'); setShowForm(false); setForm({ name: '', startTime: '', endTime: '', chartId: '' }); fetchAll() }
    catch (e: any) { message.error(e?.response?.data?.message || 'Failed.') }
  }

  const handleDelete = async (id: string) => {
    try { await deleteSession(eventId, id, orgId); message.success('Session deleted'); fetchAll() } catch { }
  }

  const handleDesign = async (sessionId: string) => {
    setDesignLoading(sessionId)
    try {
      const meta = await getSessionMeta(sessionId)
      navigate(`/events/${eventId}/seat-design/${meta.id}`)
    } catch {
      message.error('Seat map not ready for this session yet.')
    } finally {
      setDesignLoading(null)
    }
  }

  return (
    <>
      {canModify && <button className="mb-3 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400" onClick={() => setShowForm(true)}>+ New Session</button>}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 space-y-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <h4 className="text-sm font-semibold text-indigo-300">Create Session</h4>
          <div><label className="text-xs text-slate-400">Session Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Morning Show" required /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-slate-400">Start</label><input type="datetime-local" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} required /></div>
            <div><label className="text-xs text-slate-400">End</label><input type="datetime-local" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} required /></div>
          </div>
          <div>
            <label className="text-xs text-slate-400">Chart (Seat Layout)</label>
            <select value={form.chartId} onChange={e => setForm({ ...form, chartId: e.target.value })} required className="w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500/50 focus:outline-none">
              <option value="" disabled>Select chart...</option>
              {charts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {charts.length === 0 && <p className="mt-1 text-xs text-amber-400">No charts yet. Create a chart in the Charts tab first.</p>}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" className="text-sm text-slate-400 hover:text-slate-200" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="rounded-lg bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400">Create</button>
          </div>
        </form>
      )}
      {sessions.length === 0 ? <p className="text-sm text-slate-400">No sessions yet.</p> : (
        <div className="space-y-2">{sessions.map(s => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-700/30 bg-slate-900/40 px-4 py-3 text-sm">
            <div>
              <strong className="text-slate-200">{s.name}</strong>
              <p className="text-xs text-slate-500 mt-0.5">📅 {formatDate(s.startTime)} → {formatDate(s.endTime)}</p>
              {s.chartName && <p className="text-xs text-indigo-400 mt-0.5">🗺 {s.chartName}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                disabled={designLoading === s.id}
                onClick={() => handleDesign(s.id)}
              >
                {designLoading === s.id ? '...' : 'Design'}
              </button>
              {canModify && (
                <Popconfirm title="Delete session?" onConfirm={() => handleDelete(s.id)}>
                  <button className="text-xs text-red-400 hover:text-red-300">Delete</button>
                </Popconfirm>
              )}
            </div>
          </div>
        ))}</div>
      )}
    </>
  )
}
