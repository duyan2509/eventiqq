import { useEffect, useState } from 'react'
import { message, Popconfirm } from 'antd'
import type { ChartResponse } from '../../../types/index'
import { getCharts, createChart, deleteChart } from '../../../api/chartApi'
import { getSeatMapsByEvent, createSeatMap } from '../../../api/seatApi'

interface Props {
  eventId: string
  orgId: string
  onClose: () => void
  canEdit: boolean
  isDesigner?: boolean
  eventStatus?: string
}

export function EventChartsTab({ eventId, orgId, canEdit, isDesigner, eventStatus }: Props) {
  const isDraft = !eventStatus || eventStatus === 'Draft'
  const canDesign = (canEdit || isDesigner) && isDraft
  const [charts, setCharts] = useState<ChartResponse[]>([])
  const [showForm, setShowForm] = useState(false)
  const [chartName, setChartName] = useState('')
  const [openingChartId, setOpeningChartId] = useState<string | null>(null)

  const fetchCharts = async () => {
    try { const r = await getCharts(eventId); setCharts(r.data) } catch { }
  }

  useEffect(() => { fetchCharts() }, [eventId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createChart(eventId, orgId, { name: chartName })
      message.success('Chart created')
      setShowForm(false); setChartName(''); fetchCharts()
    } catch (e: any) { message.error(e?.response?.data?.message || 'Failed.') }
  }

  const handleDelete = async (id: string) => {
    try { await deleteChart(eventId, id, orgId); message.success('Chart deleted'); fetchCharts() } catch { }
  }

  const handleOpenDesigner = async (chart: ChartResponse) => {
    setOpeningChartId(chart.id)
    try {
      const all = await getSeatMapsByEvent(eventId)
      const maps = Array.isArray(all) ? all : []
      const existing = maps.find(sm => sm.chartId === chart.id)
      const readOnlyParam = canDesign ? '' : '&readOnly=true'
      if (existing) {
        window.open(`/events/${eventId}/seat-design/${existing.id}?orgId=${orgId}${readOnlyParam}`, '_blank')
      } else {
        const created = await createSeatMap({ chartId: chart.id, eventId, name: chart.name })
        window.open(`/events/${eventId}/seat-design/${created.id}?orgId=${orgId}${readOnlyParam}`, '_blank')
      }
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Failed to open designer.')
    } finally {
      setOpeningChartId(null)
    }
  }

  return (
    <>
      {canEdit && isDraft && <button className="mb-3 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400" onClick={() => setShowForm(true)}>+ New Chart</button>}
      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 space-y-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <h4 className="text-sm font-semibold text-indigo-300">Create Chart (Seat Layout)</h4>
          <div><label className="text-xs text-slate-400">Chart Name</label><input value={chartName} onChange={e => setChartName(e.target.value)} placeholder="e.g. Main Hall, Floor A" required /></div>
          <div className="flex gap-2 pt-1">
            <button type="button" className="text-sm text-slate-400 hover:text-slate-200" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="rounded-lg bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400">Create</button>
          </div>
        </form>
      )}

      {charts.length === 0 ? <p className="text-sm text-slate-400">No charts yet.</p> : (
        <div className="space-y-2">
          {charts.map(c => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-700/30 bg-slate-900/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🗺</span>
                <span className="text-slate-200 font-medium text-sm">{c.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400 transition-colors disabled:opacity-50"
                  disabled={openingChartId === c.id}
                  onClick={() => handleOpenDesigner(c)}
                >
                  {openingChartId === c.id ? '...' : canDesign ? '🎨 Design Seat Map' : '👁 View Seat Map'}
                </button>
                {canEdit && isDraft && (
                  <Popconfirm title="Delete chart?" onConfirm={() => handleDelete(c.id)}>
                    <button className="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </Popconfirm>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
