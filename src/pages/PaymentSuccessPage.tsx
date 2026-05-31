import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getMyOrders } from '../api/paymentApi'
import type { OrderResponse } from '../types/index'

const MAX_ATTEMPTS = 8
const POLL_INTERVAL_MS = 2000
const REDIRECT_DELAY_MS = 2500

export function PaymentSuccessPage() {
  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let attempt = 0
    let cancelled = false

    const poll = async () => {
      while (attempt < MAX_ATTEMPTS && !cancelled) {
        try {
          const orders = await getMyOrders()
          const paid = orders.find(o => o.status === 'Paid')
          if (paid) {
            if (!cancelled) setOrder(paid)
            break
          }
        } catch {
          // ignore, keep polling
        }
        attempt++
        if (attempt < MAX_ATTEMPTS && !cancelled) {
          await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
        }
      }
      if (!cancelled) setLoading(false)
    }

    poll()
    return () => { cancelled = true }
  }, [])

  /* Auto-redirect once order is confirmed */
  useEffect(() => {
    if (!order) return
    const t = setTimeout(() => navigate('/my-tickets'), REDIRECT_DELAY_MS)
    return () => clearTimeout(t)
  }, [order, navigate])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="glass p-10 rounded-2xl flex flex-col items-center gap-4 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">Payment Successful!</h1>
        <p className="text-slate-400 text-sm">Your tickets have been issued. Check your tickets below.</p>

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Confirming your order...
          </div>
        )}

        {!loading && order && (
          <>
            <div className="w-full text-left bg-slate-800/40 rounded-xl p-4 space-y-1 text-sm">
              <p className="font-medium text-slate-200">{order.eventName}</p>
              <p className="text-slate-400">{order.sessionName}</p>
              <p className="text-slate-400">{order.items.length} ticket{order.items.length !== 1 ? 's' : ''} · ${order.totalAmount.toFixed(2)}</p>
            </div>
            <p className="text-[11px] text-slate-500">Redirecting to your tickets…</p>
          </>
        )}

        {!loading && !order && (
          <p className="text-slate-400 text-sm">Order is being processed. Check your tickets in a moment.</p>
        )}

        <Link
          to="/my-tickets"
          className="w-full rounded-lg bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 text-center block"
        >
          View My Tickets
        </Link>
        <Link to="/events" className="text-xs text-slate-500 hover:text-slate-300">
          Back to Events
        </Link>
      </div>
    </div>
  )
}
