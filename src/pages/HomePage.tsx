import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { EventQuickViewData } from '../types/event'
import { getAllEvents } from '../api/eventApi'
import { formatPrice } from '../utils/format'

export function HomePage() {
  const [events, setEvents] = useState<EventQuickViewData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllEvents({ page: 1, size: 6 })
      .then(r => setEvents(r.data))
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (d: string) => { try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return d } }

  return (
    <div className="fade-in">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-950 p-12 text-center mb-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12),transparent_70%)]" />
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Discover Amazing Events</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">Browse, create, and manage events with a powerful collaborative seat map designer.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/events" className="rounded-full bg-indigo-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400">
              Browse Events
            </Link>
            <Link to="/switch-role" className="rounded-full border border-indigo-500/40 px-6 py-2.5 text-sm font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/10">
              + Create Organization
            </Link>
            <Link to="/auth" className="rounded-full border border-slate-600 px-6 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-400 hover:text-white">
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Latest Events */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Latest Events</h2>
          <Link to="/events" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">View all →</Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass p-5 space-y-3">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
                <div className="skeleton h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="glass p-8 text-center text-sm text-slate-400">No events yet. Be the first to create one!</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map(ev => (
              <Link key={ev.id} to="/events" className="glass group p-5 transition-all hover:border-indigo-500/30">
                <div className="flex items-center justify-between mb-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${ev.status === 'Published' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/40 text-slate-400'}`}>
                    {ev.status}
                  </span>
                  {ev.provinceName && <span className="text-xs text-slate-500">📍 {ev.provinceName}</span>}
                </div>
                <h3 className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">{ev.name}</h3>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span> {formatDate(ev.start)}</span>
                  {ev.lowestPrice !== undefined && ev.lowestPrice !== null && (
                    <span className="font-medium text-emerald-400">{formatPrice(ev.lowestPrice)}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
