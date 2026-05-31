import { useEffect, useState } from 'react'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { getAdminOverview, getMonthlyRevenue, getTopOrgs } from '../../api/analyticsApi'
import type { AdminOverview, MonthlyRevenue, TopOrg } from '../../api/analyticsApi'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler)

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

const CHART_OPTS = {
  responsive: true,
  plugins: { legend: { display: false }, tooltip: { mode: 'index' as const, intersect: false } },
  scales: {
    x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#9ca3af', font: { size: 11 } } },
    y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#9ca3af', font: { size: 11 } } }
  }
}

export function AdminDashboardPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [monthly, setMonthly] = useState<MonthlyRevenue[]>([])
  const [topOrgs, setTopOrgs] = useState<TopOrg[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getAdminOverview(), getMonthlyRevenue(12), getTopOrgs(8)])
      .then(([ov, mo, to]) => { setOverview(ov); setMonthly(mo); setTopOrgs(to) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20 text-gray-400">Loading…</div>

  const lineData = {
    labels: monthly.map(m => m.month),
    datasets: [
      {
        label: 'Revenue',
        data: monthly.map(m => m.revenue),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.08)',
        fill: true, tension: 0.4, pointRadius: 3,
      },
      {
        label: 'Platform Fee',
        data: monthly.map(m => m.platformFee),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.06)',
        fill: true, tension: 0.4, pointRadius: 3,
      }
    ]
  }

  const barData = {
    labels: topOrgs.map(o => o.eventName.length > 22 ? o.eventName.slice(0, 22) + '…' : o.eventName),
    datasets: [{
      label: 'Revenue',
      data: topOrgs.map(o => o.revenue),
      backgroundColor: 'rgba(99,102,241,0.75)',
      borderRadius: 6,
    }]
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Platform overview and key metrics.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue" value={`$${(overview?.totalRevenue ?? 0).toFixed(2)}`} color="text-gray-900" />
        <KpiCard label="Platform Fee" value={`$${(overview?.totalPlatformFee ?? 0).toFixed(2)}`} sub="collected" color="text-emerald-600" />
        <KpiCard label="Total Orders" value={String(overview?.totalOrders ?? 0)} sub="paid" color="text-indigo-600" />
        <KpiCard label="Active Orgs" value={String(overview?.totalOrgs ?? 0)} sub="with revenue" color="text-amber-600" />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Revenue (Last 12 Months)</h3>
          <div className="flex items-center gap-3 ml-auto text-xs text-gray-400">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-indigo-500" />Revenue</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-emerald-500" />Platform Fee</span>
          </div>
        </div>
        <Line data={lineData} options={CHART_OPTS} height={80} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Events by Revenue</h3>
        {topOrgs.length === 0
          ? <p className="text-sm text-gray-400 text-center py-8">No paid orders yet.</p>
          : <Bar data={barData} options={CHART_OPTS} height={80} />
        }
      </div>
    </div>
  )
}
