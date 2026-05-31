import { useEffect, useState } from 'react'
import { getPlatformConfig, updatePlatformConfig } from '../../api/paymentApi'
import { http } from '../../api/httpClient'
import type { PlatformConfigResponse, UpdatePlatformConfigRequest, OrderResponse } from '../../types/index'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const STATUS_BADGE: Record<string, string> = {
  Paid: 'bg-emerald-50 text-emerald-700',
  Pending: 'bg-yellow-50 text-yellow-700',
  Failed: 'bg-red-50 text-red-600',
}

export function AdminRevenuePage() {
  const [config, setConfig] = useState<PlatformConfigResponse | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [configSuccess, setConfigSuccess] = useState(false)
  const [pendingFeeRate, setPendingFeeRate] = useState('')
  const [payoutDay, setPayoutDay] = useState('')

  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    getPlatformConfig()
      .then(d => { setConfig(d); setPayoutDay(String(d.payoutDayOfMonth)) })
      .catch(() => setConfigError('Failed to load config'))
      .finally(() => setLoadingConfig(false))
  }, [])

  useEffect(() => {
    setLoadingOrders(true)
    http.get<OrderResponse[]>('/payments/orders/all', { params: { page, size: 20 } })
      .then(r => setOrders(r.data))
      .finally(() => setLoadingOrders(false))
  }, [page])

  const handleSave = async () => {
    setSaving(true); setConfigError(null); setConfigSuccess(false)
    try {
      const payload: UpdatePlatformConfigRequest = {}
      if (pendingFeeRate !== '') {
        const rate = parseFloat(pendingFeeRate) / 100
        if (isNaN(rate) || rate < 0 || rate > 0.3) { setConfigError('Fee rate must be 0–30%'); return }
        payload.pendingFeeRate = rate
      }
      if (payoutDay !== '' && Number(payoutDay) !== config?.payoutDayOfMonth) {
        const day = parseInt(payoutDay)
        if (isNaN(day) || day < 1 || day > 28) { setConfigError('Payout day must be 1–28'); return }
        payload.payoutDayOfMonth = day
      }
      if (Object.keys(payload).length === 0) return
      const updated = await updatePlatformConfig(payload)
      setConfig(updated); setPendingFeeRate(''); setConfigSuccess(true)
      setTimeout(() => setConfigSuccess(false), 3000)
    } catch { setConfigError('Failed to update') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Revenue</h1>
        <p className="text-sm text-gray-400">Platform fee configuration and transaction history.</p>
      </div>

      {/* Platform Config */}
      {!loadingConfig && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-5">
          <h2 className="text-sm font-semibold text-gray-900">Platform Fee Configuration</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Current Fee Rate', value: `${((config?.currentFeeRate ?? 0) * 100).toFixed(1)}%`, color: 'text-gray-900' },
              { label: 'Payout Day', value: `${config?.payoutDayOfMonth ?? '—'} / month`, color: 'text-gray-900' },
              { label: 'Pending Change', value: config?.pendingFeeRate != null ? `${(config.pendingFeeRate * 100).toFixed(1)}%` : '—', color: 'text-amber-600' },
            ].map(c => (
              <div key={c.label} className="rounded-lg bg-gray-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{c.label}</p>
                <p className={`mt-1 text-2xl font-bold ${c.color}`}>{c.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-300/40 pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">New Fee Rate (%)</label>
              <input type="number" min="0" max="30" step="0.1"
                placeholder={`Current: ${((config?.currentFeeRate ?? 0) * 100).toFixed(1)}%`}
                value={pendingFeeRate} onChange={e => setPendingFeeRate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Payout Day (1–28)</label>
              <input type="number" min="1" max="28" value={payoutDay} onChange={e => setPayoutDay(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 outline-none" />
            </div>
          </div>
          {configError && <p className="text-xs text-red-400">{configError}</p>}
          {configSuccess && <p className="text-xs text-emerald-600">Saved successfully.</p>}
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={saving}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Transaction History</h2>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30">‹</button>
            <span className="px-2 py-1 text-xs text-gray-500">Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={orders.length < 20}
              className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30">›</button>
          </div>
        </div>
        {loadingOrders
          ? <div className="text-center py-12 text-gray-500 text-sm">Loading…</div>
          : orders.length === 0
          ? <div className="text-center py-12 text-gray-500 text-sm">No transactions yet.</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-300/50">
                    <th className="px-2 py-2 font-medium">Event</th>
                    <th className="px-2 py-2 font-medium">Session</th>
                    <th className="px-2 py-2 font-medium text-right">Amount</th>
                    <th className="px-2 py-2 font-medium text-right">Fee</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                    <th className="px-2 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-2 py-2 text-gray-900 truncate max-w-[160px]">{o.eventName}</td>
                      <td className="px-2 py-2 text-gray-400 truncate max-w-[120px]">{o.sessionName}</td>
                      <td className="px-2 py-2 text-right font-mono font-semibold text-gray-900">${o.totalAmount.toFixed(2)}</td>
                      <td className="px-2 py-2 text-right font-mono text-emerald-600">${o.platformFee.toFixed(2)}</td>
                      <td className="px-2 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[o.status] ?? 'bg-slate-700/40 text-gray-400'}`}>{o.status}</span>
                      </td>
                      <td className="px-2 py-2 text-gray-500 whitespace-nowrap">{formatDate(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  )
}
