import { useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend
} from 'chart.js'
import { getOrgAnalytics } from '../../api/analyticsApi'
import type { OrgAnalyticsOverview } from '../../api/analyticsApi'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

export function OrgAnalyticsTab({ orgId }: { orgId: string }) {
  const [data, setData] = useState<OrgAnalyticsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    getOrgAnalytics(orgId)
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [orgId])

  if (loading) return <div className="flex justify-center py-16 text-slate-400">Loading…</div>
  if (error || !data) return <div className="text-center py-16 text-slate-500 text-sm">Could not load analytics.</div>

  const barData = {
    labels: data.byEvent.map(e =>
      (e.eventName + (data.byEvent.filter(x => x.eventName === e.eventName).length > 1 ? ` · ${e.sessionName}` : ''))
        .slice(0, 28)
    ),
    datasets: [
      {
        label: 'Revenue',
        data: data.byEvent.map(e => e.revenue),
        backgroundColor: 'rgba(129,140,248,0.7)',
        borderRadius: 4,
      },
      {
        label: 'Platform Fee',
        data: data.byEvent.map(e => e.platformFee),
        backgroundColor: 'rgba(52,211,153,0.5)',
        borderRadius: 4,
      }
    ]
  }

  const chartOpts = {
    responsive: true,
    plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
    scales: {
      x: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { color: '#64748b', font: { size: 10 } } },
      y: { grid: { color: 'rgba(148,163,184,0.06)' }, ticks: { color: '#64748b', font: { size: 11 } } }
    }
  }

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Revenue" value={`$${data.totalRevenue.toFixed(2)}`} color="text-slate-100" />
        <KpiCard label="Net Revenue" value={`$${data.netRevenue.toFixed(2)}`} sub="after platform fee" color="text-emerald-400" />
        <KpiCard label="Platform Fee" value={`$${data.totalPlatformFee.toFixed(2)}`} color="text-amber-400" />
        <KpiCard label="Total Orders" value={String(data.totalOrders)} sub="paid" color="text-indigo-400" />
      </div>

      {/* Bar chart */}
      {data.byEvent.length > 0 && (
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Revenue by Event</h3>
          <Bar data={barData} options={chartOpts} height={90} />
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-3">Breakdown by Event</h3>
        {data.byEvent.length === 0
          ? <p className="text-center py-8 text-sm text-slate-500">No paid orders yet.</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-700/50">
                    <th className="px-2 py-2 font-medium">Event</th>
                    <th className="px-2 py-2 font-medium">Session</th>
                    <th className="px-2 py-2 font-medium text-right">Tickets</th>
                    <th className="px-2 py-2 font-medium text-right">Revenue</th>
                    <th className="px-2 py-2 font-medium text-right">Fee</th>
                    <th className="px-2 py-2 font-medium text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byEvent.map((e, i) => (
                    <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-900/30">
                      <td className="px-2 py-2 text-slate-200 truncate max-w-[160px]">{e.eventName}</td>
                      <td className="px-2 py-2 text-slate-400 truncate max-w-[120px]">{e.sessionName}</td>
                      <td className="px-2 py-2 text-right font-mono text-slate-300">{e.tickets}</td>
                      <td className="px-2 py-2 text-right font-mono font-semibold text-slate-200">${e.revenue.toFixed(2)}</td>
                      <td className="px-2 py-2 text-right font-mono text-amber-400">${e.platformFee.toFixed(2)}</td>
                      <td className="px-2 py-2 text-right font-mono text-emerald-400">${(e.revenue - e.platformFee).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-700/50 font-semibold">
                    <td colSpan={2} className="px-2 py-2 text-xs text-slate-400">Total</td>
                    <td className="px-2 py-2 text-right font-mono text-xs text-slate-300">{data.byEvent.reduce((s, e) => s + e.tickets, 0)}</td>
                    <td className="px-2 py-2 text-right font-mono text-xs text-slate-200">${data.totalRevenue.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right font-mono text-xs text-amber-400">${data.totalPlatformFee.toFixed(2)}</td>
                    <td className="px-2 py-2 text-right font-mono text-xs text-emerald-400">${data.netRevenue.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        }
      </div>
    </div>
  )
}
