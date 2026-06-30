import { useState, useEffect, useCallback, useRef } from 'react'
import jsQR from 'jsqr'
import { getOrgCheckIns, checkInTicket } from '../../api/ticketApi'
import type { OrgCheckInItem } from '../../api/ticketApi'
import type { TicketResponse } from '../../types/index'

type ScanStatus = 'idle' | 'decoding' | 'checking' | 'success' | 'fail'

export function OrgCheckInsTab() {
  // History
  const [items, setItems] = useState<OrgCheckInItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)

  // Scanner
  const [token, setToken] = useState('')
  const [scanStatus, setScanStatus] = useState<ScanStatus>('idle')
  const [scanResult, setScanResult] = useState<TicketResponse | null>(null)
  const [scanError, setScanError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    setHistoryError(null)
    try {
      setItems(await getOrgCheckIns())
    } catch {
      setHistoryError('Failed to load check-in history.')
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const resetScan = () => {
    setScanStatus('idle')
    setScanResult(null)
    setScanError('')
    setToken('')
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFile = async (file: File) => {
    setScanStatus('decoding')
    setScanError('')
    setScanResult(null)
    setPreview(URL.createObjectURL(file))
    try {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(bitmap, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (!code) { setScanStatus('fail'); setScanError('No QR code detected.'); return }
      setToken(code.data)
      setScanStatus('idle')
    } catch {
      setScanStatus('fail')
      setScanError('Could not read image.')
    }
  }

  const handleCheckIn = async () => {
    if (!token.trim()) return
    setScanStatus('checking')
    setScanError('')
    try {
      const ticket = await checkInTicket(token.trim())
      setScanResult(ticket)
      setScanStatus('success')
      loadHistory()
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? 'Check-in failed.'
      setScanError(msg)
      setScanStatus('fail')
    }
  }

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1>Check-ins</h1>
        <p className="text-sm text-slate-400">Scan or paste a ticket token to check in, then view history below.</p>
      </div>

      {/* Scanner card */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Scan Ticket</label>

        {/* QR upload + token input row */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs text-slate-500">Upload QR image</p>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                className="block flex-1 text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-500/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-300 hover:file:bg-indigo-500/25"
              />
              {preview && <img src={preview} alt="preview" className="h-12 w-12 rounded-lg object-cover bg-white p-0.5" />}
            </div>
            {scanStatus === 'decoding' && <p className="text-xs text-slate-500">Decoding…</p>}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-500">Or paste token</p>
            <textarea
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="Paste signed token…"
              rows={2}
              className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <button
          onClick={handleCheckIn}
          disabled={!token.trim() || scanStatus === 'checking'}
          className="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-bold text-white hover:bg-indigo-400 disabled:opacity-40 transition-colors"
        >
          {scanStatus === 'checking' ? 'Checking in…' : 'Check In'}
        </button>

        {/* Result */}
        {scanStatus === 'success' && scanResult && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-bold text-emerald-300">Checked In</span>
            </div>
            <div className="rounded-lg bg-slate-900/40 px-3 py-2 space-y-0.5 text-xs">
              <p className="text-slate-400">Seat <span className="font-semibold text-slate-200">{scanResult.seatLabel}</span></p>
              <p className="text-slate-400">Type <span className="font-semibold text-slate-200">{scanResult.legendName}</span></p>
              <p className="text-slate-400">Price <span className="font-semibold text-slate-200">${scanResult.price.toFixed(2)}</span></p>
            </div>
            <button onClick={resetScan} className="w-full rounded-lg bg-indigo-500 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400 transition-colors">
              Scan Next
            </button>
          </div>
        )}

        {scanStatus === 'fail' && scanError && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-sm font-bold text-red-300">Check-in Failed</span>
            </div>
            <p className="text-xs text-slate-300">{scanError}</p>
            <button onClick={resetScan} className="w-full rounded-lg border border-slate-600 py-1.5 text-xs text-slate-300 hover:text-white transition-colors">
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">History</p>
          <button onClick={loadHistory} disabled={loadingHistory} className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-40">
            Refresh
          </button>
        </div>

        {historyError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{historyError}</div>
        )}

        {loadingHistory ? (
          <div className="glass p-6 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-8 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="glass border-dashed p-10 text-center">
            <p className="text-sm text-slate-500">No check-ins yet.</p>
          </div>
        ) : (
          <div className="glass overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/60 text-left text-xs text-slate-500">
                    <th className="px-4 py-3 font-semibold">Event</th>
                    <th className="px-4 py-3 font-semibold">Session</th>
                    <th className="px-4 py-3 font-semibold">Seat</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Price</th>
                    <th className="px-4 py-3 font-semibold">Checked In At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {items.map(item => (
                    <tr key={item.ticketId} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-200 max-w-[160px] truncate">{item.eventName}</td>
                      <td className="px-4 py-3 text-slate-400">{item.sessionName}</td>
                      <td className="px-4 py-3 font-mono text-slate-300">{item.seatLabel}</td>
                      <td className="px-4 py-3 text-slate-400">{item.legendName}</td>
                      <td className="px-4 py-3 text-slate-300">${item.price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(item.checkedInAt).toLocaleString('en-US')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-800/60 px-4 py-2.5 text-xs text-slate-500">
              {items.length} check-in{items.length !== 1 ? 's' : ''} total
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
