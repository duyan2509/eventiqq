import { useEffect, useState } from 'react'
import { getMyOrders } from '../api/paymentApi'
import { getTicketsByOrder } from '../api/ticketApi'
import type { OrderResponse, TicketResponse } from '../types/index'

interface EnrichedTicket extends TicketResponse {
  eventName: string
  sessionName: string
  sessionDate: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function QrModal({ ticket, onClose }: { ticket: EnrichedTicket; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="glass rounded-2xl p-6 flex flex-col items-center gap-4 max-w-xs w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between w-full">
          <div>
            <p className="text-sm font-semibold text-slate-200">{ticket.seatLabel}</p>
            <p className="text-xs text-slate-400">{ticket.legendName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <img
          src={`data:image/png;base64,${ticket.qrCode}`}
          alt="QR code"
          className="w-52 h-52 rounded-xl bg-white p-2"
        />

        <div className="text-center space-y-0.5">
          <p className="text-xs font-medium text-slate-300">{ticket.eventName}</p>
          <p className="text-xs text-slate-400">{ticket.sessionName}</p>
          <p className="text-xs text-slate-500">{formatDate(ticket.sessionDate)}</p>
        </div>

        {ticket.isCheckedIn ? (
          <span className="text-xs bg-slate-500/20 text-slate-400 px-3 py-1 rounded-full">
            Used · {ticket.checkedInAt ? formatDate(ticket.checkedInAt) : ''}
          </span>
        ) : (
          <span className="text-xs bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded-full">
            Valid — show this to staff
          </span>
        )}
      </div>
    </div>
  )
}

function TicketCard({ ticket, onClick }: { ticket: EnrichedTicket; onClick: () => void }) {
  return (
    <button
      className="glass rounded-xl p-4 flex items-center gap-4 text-left hover:bg-white/5 active:scale-[0.99] transition-all w-full"
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-slate-200 truncate">{ticket.eventName}</p>
        <p className="text-xs text-slate-400 truncate">{ticket.sessionName} · {ticket.seatLabel}</p>
        <p className="text-xs text-slate-500">{ticket.legendName} · ${ticket.price.toFixed(2)}</p>
      </div>

      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {ticket.isCheckedIn ? (
          <span className="text-xs bg-slate-500/15 text-slate-400 px-2 py-0.5 rounded-full">Used</span>
        ) : (
          <span className="text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full">Valid</span>
        )}
        <span className="text-xs text-slate-600">Tap for QR</span>
      </div>
    </button>
  )
}

export function MyTicketsPage() {
  const [tickets, setTickets] = useState<EnrichedTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<EnrichedTicket | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const orders = await getMyOrders()
        const paidOrders = orders.filter((o: OrderResponse) => o.status === 'Paid')

        const nested = await Promise.all(
          paidOrders.map(async (order: OrderResponse) => {
            try {
              const orderTickets = await getTicketsByOrder(order.id)
              return orderTickets.map(t => ({
                ...t,
                eventName: order.eventName,
                sessionName: order.sessionName,
                sessionDate: order.sessionDate,
              }))
            } catch {
              return []
            }
          })
        )

        setTickets(
          nested.flat().sort((a, b) =>
            new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
          )
        )
      } catch {
        setError('Failed to load tickets.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div className="flex justify-center py-16 text-slate-400">Loading…</div>
  if (error) return <div className="flex justify-center py-16 text-red-400">{error}</div>

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-200">My Tickets</h1>
        {tickets.length > 0 && (
          <span className="text-xs text-slate-500">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {tickets.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center text-slate-400 text-sm">
          No tickets yet.{' '}
          <a href="/events" className="text-indigo-400 hover:underline">Browse events</a>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => (
            <TicketCard key={t.id} ticket={t} onClick={() => setSelected(t)} />
          ))}
        </div>
      )}

      {selected && <QrModal ticket={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
