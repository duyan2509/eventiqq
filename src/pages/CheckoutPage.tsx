import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getHoldStatus, releaseSeats } from '../api/seatApi'
import { createCheckout } from '../api/paymentApi'
import { getLegends } from '../api/legendApi'
import type { LegendResponse } from '../types/index'
import { getSeatMapBySession } from '../api/seatApi'

interface HeldSeat {
  id: string
  label: string
  seatNumber: number
  legendId?: string
}

type PageState = 'loading' | 'success' | 'fail' | 'paying' | 'cancelling'

export function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const sessionId = searchParams.get('sessionId') ?? ''
  const seatMapId = searchParams.get('seatMapId') ?? ''
  const seatIds = (searchParams.get('seatIds') ?? '').split(',').filter(Boolean)

  const [pageState, setPageState] = useState<PageState>('loading')
  const [failReason, setFailReason] = useState('')
  const [heldUntil, setHeldUntil] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState('')
  const [seats, setSeats] = useState<HeldSeat[]>([])
  const [legends, setLegends] = useState<LegendResponse[]>([])

  /* Verify the user owns these holds, fetch heldUntil + seat info */
  useEffect(() => {
    if (!seatMapId || !sessionId || seatIds.length === 0) { navigate('/events'); return }

    (async () => {
      try {
        // 1) Get hold status (verifies ownership server-side, returns heldUntil + seat info)
        const status = await getHoldStatus(seatMapId, seatIds)
        setSeats(status.seats)
        setHeldUntil(new Date(status.heldUntil))

        // 2) Fetch legends to compute prices/colors
        const layout = await getSeatMapBySession(sessionId)
        const legendsRes = await getLegends(layout.eventId, 1, 50)
        setLegends(legendsRes.data ?? [])

        setPageState('success')
      } catch (err: any) {
        const msg = err?.response?.data?.error
          ?? 'Your seat reservation is no longer valid. Someone else may have taken these seats.'
        setFailReason(msg)
        setPageState('fail')
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* Countdown from heldUntil */
  useEffect(() => {
    if (!heldUntil) return
    const tick = () => {
      const diff = heldUntil.getTime() - Date.now()
      if (diff <= 0) { setCountdown('Expired'); return }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${m}:${s.toString().padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [heldUntil])

  const handlePay = async () => {
    setPageState('paying')
    try {
      const { checkoutUrl } = await createCheckout(sessionId, seatIds)
      window.location.href = checkoutUrl
    } catch (err: any) {
      setFailReason(err?.response?.data?.message ?? 'Payment could not be started.')
      setPageState('fail')
      // Pay failed → release the hold so user (or others) can re-select these seats
      try { await releaseSeats(seatMapId, seatIds) } catch { /* best-effort */ }
    }
  }

  const handleCancel = async () => {
    setPageState('cancelling')
    try {
      await releaseSeats(seatMapId, seatIds)
    } catch { /* best-effort */ }
    navigate(-1)
  }

  const legendMap = new Map(legends.map(l => [l.id, l]))
  const total = seats.reduce((sum, seat) => {
    return sum + (seat.legendId ? (legendMap.get(seat.legendId)?.price ?? 0) : 0)
  }, 0)
  const expired = countdown === 'Expired'

  /* ── Loading ── */
  if (pageState === 'loading') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <div className="spinner" />
        <p className="text-sm text-slate-400">Verifying your reservation…</p>
      </div>
    )
  }

  /* ── Fail ── */
  if (pageState === 'fail') {
    return (
      <div className="flex h-screen flex-col items-center justify-center px-4">
        <div className="glass w-full max-w-md rounded-2xl p-8 text-center space-y-4">
          <div className="text-4xl">😕</div>
          <h2 className="text-base font-bold text-slate-100">Reservation Unavailable</h2>
          <p className="text-sm text-slate-400">{failReason}</p>
          <button
            className="w-full rounded-lg border border-slate-600 py-2 text-sm text-slate-300 hover:text-white transition-colors"
            onClick={() => navigate(`/sessions/${sessionId}/book`)}
          >
            ← Back to Seat Map
          </button>
        </div>
      </div>
    )
  }

  /* ── Success ── */
  return (
    <div className="flex h-screen flex-col items-center justify-center px-4">
      <div className="glass w-full max-w-md rounded-2xl p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">Order Summary</h2>
          {countdown && (
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${expired ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
              {expired ? 'Reservation Expired' : `⏱ ${countdown}`}
            </span>
          )}
        </div>

        {/* Seat list */}
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          {seats.map(seat => {
            const legend = seat.legendId ? legendMap.get(seat.legendId) : undefined
            return (
              <div key={seat.id} className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {legend?.color && (
                    <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: legend.color }} />
                  )}
                  <span className="text-slate-200 truncate">
                    {seat.label || `Seat ${seat.seatNumber}`}
                  </span>
                  {legend && (
                    <span className="text-xs text-slate-500 flex-shrink-0">{legend.name}</span>
                  )}
                </div>
                <span className="font-semibold text-slate-200 tabular-nums ml-3 flex-shrink-0">
                  {legend ? `$${legend.price.toFixed(2)}` : '—'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between border-t border-slate-700/60 pt-3">
          <span className="text-sm font-semibold text-slate-300">Total</span>
          <span className="text-lg font-bold text-slate-100">${total.toFixed(2)}</span>
        </div>

        {/* Pay */}
        <button
          className="w-full rounded-xl bg-indigo-500 py-3 text-sm font-bold text-white hover:bg-indigo-400 disabled:opacity-40 transition-colors"
          onClick={handlePay}
          disabled={pageState === 'paying' || expired}
        >
          {pageState === 'paying' ? 'Redirecting to Stripe…' : 'Pay with Stripe'}
        </button>

        {/* Cancel */}
        <button
          className="w-full rounded-lg border border-slate-700 py-2 text-xs text-slate-400 hover:text-red-400 transition-colors disabled:opacity-40"
          onClick={handleCancel}
          disabled={pageState === 'cancelling' || pageState === 'paying'}
        >
          {pageState === 'cancelling' ? 'Cancelling…' : 'Cancel & Release Seats'}
        </button>
      </div>
    </div>
  )
}
