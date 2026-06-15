import { useCallback, useEffect, useState } from 'react'
import { OrgAnalyticsTab } from './OrgAnalyticsTab'
import { Text2SqlConsole } from '../analytics/Text2SqlConsole'
import { listPinnedQueries, unpinQuery, askAnalytics } from '../../api/analyticsApi'
import type { SavedQuery, Text2SqlResponse } from '../../api/analyticsApi'

const ORG_SAMPLES = [
  'Doanh thu theo tháng',
  'Top 5 sự kiện bán nhiều vé nhất',
  'Số vé theo trạng thái',
  'Số sự kiện theo trạng thái',
  'Đơn hàng đã thanh toán theo tháng',
]

type SubTab = 'overview' | 'ask'

export function OrgAnalyticsSection({ orgId }: { orgId: string }) {
  const [sub, setSub] = useState<SubTab>('overview')
  const [pinned, setPinned] = useState<SavedQuery[]>([])
  const [runningId, setRunningId] = useState<string | null>(null)
  const [runResult, setRunResult] = useState<{ id: string; data: Text2SqlResponse } | null>(null)

  const loadPinned = useCallback(async () => {
    try { setPinned(await listPinnedQueries()) } catch { }
  }, [])

  useEffect(() => { loadPinned() }, [loadPinned])

  const handleUnpin = async (id: string) => {
    try {
      await unpinQuery(id)
      setPinned(p => p.filter(q => q.id !== id))
      if (runResult?.id === id) setRunResult(null)
    } catch { }
  }

  const handleRun = async (q: SavedQuery) => {
    setRunningId(q.id)
    try {
      const data = await askAnalytics(q.question)
      setRunResult({ id: q.id, data })
    } catch { }
    finally { setRunningId(null) }
  }

  const tabClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
      active ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
    }`

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setSub('overview')} className={tabClass(sub === 'overview')}>Overview</button>
        <button onClick={() => setSub('ask')} className={tabClass(sub === 'ask')}>Ask Data</button>
      </div>

      {sub === 'ask' ? (
        <Text2SqlConsole
          variant="org"
          samples={ORG_SAMPLES}
          placeholder="Ask about your organization's data…"
          onQueryPinned={loadPinned}
        />
      ) : (
        <div className="space-y-6">
          <OrgAnalyticsTab orgId={orgId} />

          {/* Pinned queries */}
          {pinned.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300">📌 Pinned questions</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {pinned.map(q => (
                  <div key={q.id} className="rounded-xl border border-slate-700/40 bg-slate-900/60 p-4 space-y-2">
                    <p className="text-sm font-medium text-slate-200 line-clamp-2">{q.title}</p>
                    <p className="text-xs text-slate-500 line-clamp-1">{q.question}</p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleRun(q)}
                        disabled={runningId !== null}
                        className="rounded-lg bg-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 disabled:opacity-50 transition-colors"
                      >
                        {runningId === q.id ? 'Running…' : '▶ Run'}
                      </button>
                      <button
                        onClick={() => handleUnpin(q.id)}
                        className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        Unpin
                      </button>
                    </div>

                    {/* Inline result */}
                    {runResult?.id === q.id && (
                      <div className="mt-2 border-t border-slate-700/40 pt-3 space-y-2">
                        {runResult.data.error ? (
                          <p className="text-xs text-red-400">{runResult.data.error}</p>
                        ) : runResult.data.rows.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">No data returned.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-700/50">
                                  {runResult.data.columns.map(c => <th key={c} className="px-2 py-1.5 font-medium">{c}</th>)}
                                </tr>
                              </thead>
                              <tbody>
                                {runResult.data.rows.slice(0, 10).map((r, i) => (
                                  <tr key={i} className="border-b border-slate-800/40">
                                    {runResult.data.columns.map(c => (
                                      <td key={c} className="px-2 py-1.5 text-slate-300">{String(r[c] ?? '—')}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {runResult.data.rows.length > 10 && (
                              <p className="text-[10px] text-slate-500 text-right mt-1">Showing 10 of {runResult.data.rows.length} rows</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
