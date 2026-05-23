import { useEffect, useState } from 'react'
import { getPlatformConfig, updatePlatformConfig } from '../../api/paymentApi'
import type { PlatformConfigResponse, UpdatePlatformConfigRequest } from '../../types/index'

export function AdminRevenuePage() {
  const [config, setConfig] = useState<PlatformConfigResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [pendingFeeRate, setPendingFeeRate] = useState('')
  const [payoutDay, setPayoutDay] = useState('')

  useEffect(() => {
    getPlatformConfig()
      .then(data => {
        setConfig(data)
        setPayoutDay(String(data.payoutDayOfMonth))
      })
      .catch(() => setError('Failed to load platform config'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const payload: UpdatePlatformConfigRequest = {}
      if (pendingFeeRate !== '') {
        const rate = parseFloat(pendingFeeRate) / 100
        if (isNaN(rate) || rate < 0 || rate > 0.3) {
          setError('Fee rate must be between 0% and 30%')
          return
        }
        payload.pendingFeeRate = rate
      }
      if (payoutDay !== '' && Number(payoutDay) !== config?.payoutDayOfMonth) {
        const day = parseInt(payoutDay)
        if (isNaN(day) || day < 1 || day > 28) {
          setError('Payout day must be between 1 and 28')
          return
        }
        payload.payoutDayOfMonth = day
      }
      if (Object.keys(payload).length === 0) return

      const updated = await updatePlatformConfig(payload)
      setConfig(updated)
      setPendingFeeRate('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Failed to update config')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Revenue</h1>
          <p className="text-sm text-gray-500">Platform revenue and transaction history.</p>
        </div>
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Revenue</h1>
        <p className="text-sm text-gray-500">Platform revenue and transaction history.</p>
      </div>

      {/* Platform Config Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Platform Fee Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">
            Changes to fee rate take effect on the next payout day of the following month.
          </p>
        </div>

        {/* Current config */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Fee Rate</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {((config?.currentFeeRate ?? 0) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payout Day</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {config?.payoutDayOfMonth ?? '—'}<span className="text-sm font-normal text-gray-500"> / month</span>
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending Change</p>
            {config?.pendingFeeRate != null ? (
              <div>
                <p className="mt-1 text-2xl font-bold text-amber-600">
                  {(config.pendingFeeRate * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Effective {config.effectiveDate ? new Date(config.effectiveDate).toLocaleDateString() : '—'}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-400">No pending change</p>
            )}
          </div>
        </div>

        {/* Edit form */}
        <div className="border-t border-gray-100 pt-5 space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Schedule a change</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                New Fee Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                step="0.1"
                placeholder={`Current: ${((config?.currentFeeRate ?? 0) * 100).toFixed(1)}%`}
                value={pendingFeeRate}
                onChange={e => setPendingFeeRate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">Will take effect on next payout day of following month</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Payout Day of Month (1–28)
              </label>
              <input
                type="number"
                min="1"
                max="28"
                value={payoutDay}
                onChange={e => setPayoutDay(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-400 mt-1">Day each month when payouts are processed</p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600">Configuration updated successfully.</p>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Revenue data placeholder */}
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <p className="text-gray-400 text-sm">Transaction history coming soon.</p>
      </div>
    </div>
  )
}
