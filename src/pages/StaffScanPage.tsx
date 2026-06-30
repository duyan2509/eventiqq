import { useState, useRef, useEffect, useCallback } from 'react'
import jsQR from 'jsqr'
import { checkInTicket, getOrgCheckIns } from '../api/ticketApi'
import type { OrgCheckInItem } from '../api/ticketApi'
import type { TicketResponse } from '../types/index'

type Status = 'idle' | 'decoding' | 'checking' | 'success' | 'fail'

export function StaffScanPage() {
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<TicketResponse | null>(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [history, setHistory] = useState<OrgCheckInItem[]>([])

  const loadHistory = useCallback(async () => {
    try {
      const items = await getOrgCheckIns()
      setHistory(items)
    } catch {
      // history is optional — fail silently
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const resetState = () => {
    setStatus('idle')
    setResult(null)
    setError('')
    setToken('')
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /* Decode QR from uploaded image client-side (no upload to server) */
  const handleFile = async (file: File) => {
    setStatus('decoding')
    setError('')
    setResult(null)
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

      if (!code) {
        setStatus('fail')
        setError('No QR code detected. Try another image.')
        return
      }
      setToken(code.data)
      setStatus('idle')
    } catch {
      setStatus('fail')
      setError('Could not read image.')
    }
  }

  const handleCheckIn = async () => {
    if (!token.trim()) return
    setStatus('checking')
    setError('')
    try {
      const ticket = await checkInTicket(token.trim())
      setResult(ticket)
      setStatus('success')
      loadHistory()
    } catch (err: any) {
      const msg = err?.response?.data?.message
        ?? err?.response?.data?.error
        ?? 'Check-in failed.'
      setError(msg)
      setStatus('fail')
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-200">Ticket Scanner</h1>
        <p className="text-xs text-slate-500 mt-0.5">Upload a QR image or paste a token to check in.</p>
      </div>

      {/* Upload */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">QR Image</label>
        <div className="flex items-start gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
            className="block flex-1 text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-500/15 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-indigo-300 hover:file:bg-indigo-500/25"
          />
          {preview && (
            <img src={preview} alt="preview" className="h-16 w-16 rounded-lg object-cover bg-white p-1" />
          )}
        </div>
        {status === 'decoding' && (
          <p className="text-xs text-slate-500">Decoding…</p>
        )}
      </div>

      {/* Manual paste */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Token</label>
        <textarea
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Paste signed token (e.g. 1a2b…X-signature)"
          rows={3}
          className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500"
        />
        <button
          onClick={handleCheckIn}
          disabled={!token.trim() || status === 'checking'}
          className="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-bold text-white hover:bg-indigo-400 disabled:opacity-40 transition-colors"
        >
          {status === 'checking' ? 'Checking in…' : 'Check In'}
        </button>
      </div>

      {/* Result */}
      {status === 'success' && result && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-emerald-300">Checked In</h3>
          </div>
          <div className="rounded-lg bg-slate-900/40 px-3 py-2 space-y-0.5 text-xs">
            <p className="text-slate-400">Seat <span className="font-semibold text-slate-200">{result.seatLabel}</span></p>
            <p className="text-slate-400">Type <span className="font-semibold text-slate-200">{result.legendName}</span></p>
            <p className="text-slate-400">Price <span className="font-semibold text-slate-200">${result.price.toFixed(2)}</span></p>
            <p className="text-slate-400 mt-1">
              At <span className="font-mono text-slate-300">{result.checkedInAt ? new Date(result.checkedInAt).toLocaleString('en-US') : '—'}</span>
            </p>
          </div>
          <button
            onClick={resetState}
            className="w-full rounded-lg bg-indigo-500 py-2 text-xs font-semibold text-white hover:bg-indigo-400 transition-colors"
          >
            Scan Next
          </button>
        </div>
      )}

      {status === 'fail' && error && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-red-300">Check-in Failed</h3>
          </div>
          <p className="text-xs text-slate-300">{error}</p>
          <button
            onClick={resetState}
            className="w-full rounded-lg border border-slate-600 py-2 text-xs text-slate-300 hover:text-white transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Org-wide check-in history */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Check-in History</label>
          <button onClick={loadHistory} className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors">Refresh</button>
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-slate-600 py-2">No check-ins yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 text-left">
                  <th className="pb-2 font-semibold">Event</th>
                  <th className="pb-2 font-semibold">Session</th>
                  <th className="pb-2 font-semibold">Seat</th>
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 font-semibold">Checked In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {history.map(item => (
                  <tr key={item.ticketId} className="text-slate-300">
                    <td className="py-2 pr-3 font-medium text-slate-200 max-w-[140px] truncate">{item.eventName}</td>
                    <td className="py-2 pr-3 text-slate-400">{item.sessionName}</td>
                    <td className="py-2 pr-3 font-mono">{item.seatLabel}</td>
                    <td className="py-2 pr-3 text-slate-400">{item.legendName}</td>
                    <td className="py-2 whitespace-nowrap text-slate-500">{new Date(item.checkedInAt).toLocaleString('en-US')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
