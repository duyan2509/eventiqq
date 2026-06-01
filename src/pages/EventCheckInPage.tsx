import { useState, useRef, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import { checkInTicket, getEventCheckIns } from '../api/ticketApi'
import type { EventCheckInItem } from '../api/ticketApi'

type Status = 'idle' | 'decoding' | 'checking' | 'success' | 'fail'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export function EventCheckInPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()

  const [token, setToken] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [lastResult, setLastResult] = useState<{ seatLabel: string; legendName: string; checkedInAt?: string } | null>(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [history, setHistory] = useState<EventCheckInItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)

  const reloadHistory = useCallback(async () => {
    if (!eventId) return
    try { setHistory(await getEventCheckIns(eventId)) } catch { /* ignore */ }
    finally { setLoadingHistory(false) }
  }, [eventId])

  useEffect(() => { reloadHistory() }, [reloadHistory])

  const resetScan = () => {
    setStatus('idle')
    setLastResult(null)
    setError('')
    setToken('')
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFile = async (file: File) => {
    setStatus('decoding')
    setError('')
    setLastResult(null)
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
      if (!code) { setStatus('fail'); setError('No QR detected. Try another image.'); return }
      setToken(code.data)
      setStatus('idle')
    } catch {
      setStatus('fail'); setError('Could not read image.')
    }
  }

  const handleCheckIn = async () => {
    if (!token.trim()) return
    setStatus('checking'); setError('')
    try {
      const t = await checkInTicket(token.trim())
      setLastResult({ seatLabel: t.seatLabel, legendName: t.legendName, checkedInAt: t.checkedInAt ?? new Date().toISOString() })
      setStatus('success')
      reloadHistory()
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? 'Check-in failed.'
      setError(msg); setStatus('fail')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate(-1)} className="text-xs text-slate-500 hover:text-slate-300">← Back</button>
          <h1 className="text-xl font-bold text-slate-200 mt-1">Event Check-in</h1>
          <p className="text-xs text-slate-500">Scan QR or paste token to admit attendees.</p>
        </div>
        <span className="text-xs text-slate-500">
          {loadingHistory ? '…' : `${history.length} checked in`}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">

        {/* ── Left: Scan section ── */}
        <div className="space-y-4">
          {/* Upload QR */}
          <div className="glass rounded-2xl p-4 space-y-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Upload QR Image</label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                className="block flex-1 text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-500/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-300 hover:file:bg-indigo-500/25"
              />
              {preview && <img src={preview} alt="" className="h-14 w-14 rounded-lg object-cover bg-white p-1 flex-shrink-0" />}
            </div>
            {status === 'decoding' && <p className="text-xs text-slate-500">Decoding…</p>}
            {token && (status === 'idle' || status === 'checking') && (
              <button
                onClick={handleCheckIn}
                disabled={status === 'checking'}
                className="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-bold text-white hover:bg-indigo-400 disabled:opacity-40 transition-colors"
              >
                {status === 'checking' ? 'Checking…' : 'Check In'}
              </button>
            )}
          </div>

          {/* Result */}
          {status === 'success' && lastResult && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-sm font-bold text-emerald-300">Checked In</h3>
              </div>
              <div className="rounded-lg bg-slate-900/40 px-3 py-2 space-y-0.5 text-xs">
                <p className="text-slate-300"><span className="font-semibold text-slate-200">Seat:</span> {lastResult.seatLabel}</p>
                <p className="text-slate-300"><span className="font-semibold text-slate-200">Type:</span> {lastResult.legendName}</p>
              </div>
              <button onClick={resetScan} className="w-full rounded-lg bg-indigo-500 py-2 text-xs font-semibold text-white hover:bg-indigo-400 transition-colors">Scan Next</button>
            </div>
          )}

          {status === 'fail' && error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
                <h3 className="text-sm font-bold text-red-300">Failed</h3>
              </div>
              <p className="text-xs text-slate-300">{error}</p>
              <button onClick={resetScan} className="w-full rounded-lg border border-slate-600 py-2 text-xs text-slate-300 hover:text-white transition-colors">Try Again</button>
            </div>
          )}
        </div>

        {/* ── Right: History table ── */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-200">Check-in History</h3>
            <button onClick={reloadHistory} className="text-xs text-slate-500 hover:text-slate-300">Refresh</button>
          </div>

          {loadingHistory ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading…</div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">No check-ins yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-700/50">
                    <th className="px-2 py-2 font-medium">Seat</th>
                    <th className="px-2 py-2 font-medium">Type</th>
                    <th className="px-2 py-2 font-medium text-right">Price</th>
                    <th className="px-2 py-2 font-medium">Session</th>
                    <th className="px-2 py-2 font-medium">Checked In</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.ticketId} className="border-b border-slate-800/40 hover:bg-slate-900/30">
                      <td className="px-2 py-2 font-semibold text-slate-200">{h.seatLabel}</td>
                      <td className="px-2 py-2 text-slate-300">{h.legendName}</td>
                      <td className="px-2 py-2 text-right font-mono text-slate-300">${h.price.toFixed(2)}</td>
                      <td className="px-2 py-2 text-slate-400 truncate max-w-[180px]">{h.sessionName}</td>
                      <td className="px-2 py-2 text-slate-500 font-mono whitespace-nowrap">{formatDateTime(h.checkedInAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
