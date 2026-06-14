import { useState } from 'react'
import { Bar, Line, Pie, Scatter } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend
} from 'chart.js'
import { askAnalytics, pinQuery } from '../../api/analyticsApi'
import type { Text2SqlResponse, ChartConfig } from '../../api/analyticsApi'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend)

type Variant = 'admin' | 'org'

// Per-surface styling: admin pages are light, the org workspace is dark.
const THEMES: Record<Variant, Record<string, string>> = {
  admin: {
    card: 'rounded-xl border border-gray-200 bg-white',
    muted: 'text-gray-500', faint: 'text-gray-400',
    input: 'border-gray-300 bg-white text-gray-900 focus:border-indigo-500 focus:ring-indigo-500',
    chip: 'bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700',
    th: 'text-gray-500 border-gray-200', td: 'text-gray-700', rowBorder: 'border-gray-100',
    rowHover: 'hover:bg-gray-50',
    select: 'border-gray-300 bg-white text-gray-700 focus:border-indigo-500 focus:ring-indigo-500',
    heading: 'text-gray-900', kpiLabel: 'text-gray-400', kpiValue: 'text-indigo-600',
    sql: 'bg-gray-50 text-gray-700 border-gray-200', meta: 'bg-gray-50',
    tick: '#9ca3af', legend: '#4b5563',
  },
  org: {
    card: 'rounded-xl border border-slate-700/40 bg-slate-900/60',
    muted: 'text-slate-400', faint: 'text-slate-500',
    input: 'border-slate-700 bg-slate-900 text-slate-100 focus:border-indigo-500 focus:ring-indigo-500',
    chip: 'bg-slate-800 text-slate-300 hover:bg-indigo-500/20 hover:text-indigo-300',
    th: 'text-slate-500 border-slate-700/50', td: 'text-slate-300', rowBorder: 'border-slate-800/40',
    rowHover: 'hover:bg-slate-900/30',
    select: 'border-slate-700 bg-slate-900 text-slate-200 focus:border-indigo-500 focus:ring-indigo-500',
    heading: 'text-slate-100', kpiLabel: 'text-slate-500', kpiValue: 'text-indigo-400',
    sql: 'bg-slate-950/60 text-slate-300 border-slate-700/50', meta: 'bg-slate-800/40',
    tick: '#64748b', legend: '#94a3b8',
  },
}

const CHART_PALETTE = [
  'rgba(99,102,241,0.75)', 'rgba(16,185,129,0.75)', 'rgba(245,158,11,0.75)',
  'rgba(239,68,68,0.75)', 'rgba(168,85,247,0.75)', 'rgba(20,184,166,0.75)',
  'rgba(236,72,153,0.75)', 'rgba(132,204,22,0.75)',
]

const CHART_LABELS: Record<string, string> = {
  bar: 'Bar', line: 'Line', pie: 'Pie', scatter: 'Scatter', table: 'Table',
}

function chartOpts(t: Record<string, string>) {
  return {
    responsive: true,
    plugins: { legend: { labels: { color: t.legend, font: { size: 11 } } } },
    scales: {
      x: { grid: { color: 'rgba(128,128,128,0.08)' }, ticks: { color: t.tick, font: { size: 11 } } },
      y: { grid: { color: 'rgba(128,128,128,0.08)' }, ticks: { color: t.tick, font: { size: 11 } } }
    }
  }
}

function isNumericCol(rows: Record<string, unknown>[], col: string): boolean {
  return rows.length > 0 && rows.every(r => {
    const v = r[col]
    return typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)))
  })
}

/** Chart types the result can render as — derived from data shape, never the question text. */
function availableChartTypes(data: Text2SqlResponse): string[] {
  const { rows, columns } = data
  const numeric = columns.filter(c => isNumericCol(rows, c))
  const categorical = columns.filter(c => !numeric.includes(c))
  const opts: string[] = []
  if (categorical.length && numeric.length) opts.push('bar', 'line', 'pie')
  if (numeric.length >= 2) opts.push('scatter')
  opts.push('table')
  if (data.chartType !== 'kpi' && !opts.includes(data.chartType)) opts.unshift(data.chartType)
  return opts
}

function KpiCard({ data, t }: { data: Text2SqlResponse; t: Record<string, string> }) {
  const { rows } = data
  const col = data.chartConfig?.value ?? data.columns[0]
  const raw = rows[0]?.[col]
  const num = Number(raw)
  const display = !isNaN(num) && raw !== null && raw !== ''
    ? num.toLocaleString('en-US')
    : String(raw ?? '—')
  return (
    <div className={`${t.card} p-8 text-center`}>
      <p className={`text-[11px] uppercase tracking-wider ${t.kpiLabel}`}>{col}</p>
      <p className={`mt-2 text-4xl font-bold ${t.kpiValue}`}>{display}</p>
    </div>
  )
}

function ResultChart({ data, type, t }: { data: Text2SqlResponse; type: string; t: Record<string, string> }) {
  const { rows, columns } = data
  // Backend may omit chartConfig — fall back to {} so axes are derived from data shape.
  const chartConfig: Partial<ChartConfig> = data.chartConfig ?? {}
  if (!rows.length || type === 'table') return null

  const numeric = columns.filter(c => isNumericCol(rows, c))
  const categorical = columns.filter(c => !numeric.includes(c))

  if (type === 'pie') {
    const label = chartConfig.label ?? chartConfig.x ?? categorical[0] ?? columns[0]
    const value = chartConfig.value ?? numeric[0]
    if (!value) return null
    const chartData = {
      labels: rows.map(r => String(r[label] ?? '')),
      datasets: [{ data: rows.map(r => Number(r[value])), backgroundColor: CHART_PALETTE }]
    }
    return <Pie data={chartData} options={{ responsive: true, plugins: { legend: { position: 'right' as const, labels: { color: t.legend, font: { size: 11 } } } } }} />
  }

  if (type === 'scatter') {
    const xKey = chartConfig.x ?? numeric[0]
    const yKey = chartConfig.y?.[0] ?? numeric.find(c => c !== xKey)
    if (!xKey || !yKey) return null
    const chartData = {
      datasets: [{
        label: `${yKey} vs ${xKey}`,
        data: rows.map(r => ({ x: Number(r[xKey]), y: Number(r[yKey]) })),
        backgroundColor: CHART_PALETTE[0],
      }]
    }
    return <Scatter data={chartData} options={chartOpts(t)} />
  }

  const xKey = chartConfig.x ?? categorical[0] ?? columns[0]
  const valueKeys = (chartConfig.y?.length ? chartConfig.y : columns.filter(c => c !== xKey))
    .filter(k => numeric.includes(k))
  if (valueKeys.length === 0) return null

  const labels = rows.map(r => String(r[xKey] ?? ''))
  const isLine = type === 'line'
  const datasets = valueKeys.map((k, i) => ({
    label: k,
    data: rows.map(r => Number(r[k])),
    backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length],
    borderColor: CHART_PALETTE[i % CHART_PALETTE.length].replace('0.75', '1'),
    borderRadius: isLine ? 0 : 6,
    tension: 0.4,
    fill: isLine,
  }))

  const chartData = { labels, datasets }
  return isLine ? <Line data={chartData} options={chartOpts(t)} /> : <Bar data={chartData} options={chartOpts(t)} />
}

export interface Text2SqlConsoleProps {
  variant?: Variant
  /** Suggested questions shown as quick-fill chips. */
  samples?: string[]
  placeholder?: string
  /** Called after a query is successfully pinned (org variant only). */
  onQueryPinned?: () => void
}

/**
 * Natural-language → SQL console (Text2SQL). The backend scopes results by the
 * caller's JWT: admins see all data, org users see only their own org. This
 * component is presentation-only and identical for both — the difference is
 * enforced server-side.
 */
export function Text2SqlConsole({
  variant = 'admin',
  samples = [],
  placeholder = 'Ví dụ: Doanh thu theo tháng năm nay',
  onQueryPinned,
}: Text2SqlConsoleProps) {
  const t = THEMES[variant]
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Text2SqlResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSql, setShowSql] = useState(false)
  const [chartType, setChartType] = useState<string | null>(null)
  const [pinning, setPinning] = useState(false)
  const [pinned, setPinned] = useState(false)

  const ask = async (q: string) => {
    if (!q.trim()) return
    setLoading(true); setError(null); setResult(null); setChartType(null); setQuestion(q); setPinned(false)
    try {
      const res = await askAnalytics(q)
      setResult(res)
      if (res.error) setError(res.error)
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      setError(e?.response?.data?.detail ?? e?.message ?? 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePin = async () => {
    if (!result || pinned) return
    setPinning(true)
    try {
      await pinQuery(result.title ?? result.question, result.question, result.sql)
      setPinned(true)
      onQueryPinned?.()
    } catch {
      // silent — pin failure shouldn't disrupt the result view
    } finally {
      setPinning(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Input */}
      <div className={`${t.card} p-5`}>
        <form onSubmit={e => { e.preventDefault(); ask(question) }} className="flex gap-2">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder={placeholder}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm focus:ring-1 outline-none ${t.input}`}
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Thinking…' : 'Ask'}
          </button>
        </form>

        {samples.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className={`text-[11px] ${t.faint} mr-1`}>Try:</span>
            {samples.map(q => (
              <button
                key={q}
                onClick={() => ask(q)}
                disabled={loading}
                className={`rounded-full px-3 py-1 text-[11px] disabled:opacity-50 transition-colors ${t.chip}`}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className={`${t.card} p-10 text-center`}>
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className={`mt-3 text-sm ${t.muted}`}>Generating SQL and querying database…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl border border-red-300/40 bg-red-500/10 p-4 text-sm text-red-500">
          {error}
        </div>
      )}

      {/* Result */}
      {result && !loading && (() => {
        const options = availableChartTypes(result)
        const effectiveType = chartType ?? result.chartType
        return (
          <>
            {result.rows.length > 0 && (
              <h2 className={`text-lg font-bold ${t.heading}`}>{result.title ?? result.question}</h2>
            )}

            {result.rows.length > 0 && result.chartType === 'kpi' && (
              <KpiCard data={result} t={t} />
            )}

            {result.rows.length > 0 && result.chartType !== 'kpi' && (
              <div className={`${t.card} p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-semibold ${t.heading}`}>Chart</h3>
                    <select
                      value={effectiveType}
                      onChange={e => setChartType(e.target.value)}
                      className={`rounded-md border px-2 py-1 text-xs font-medium focus:ring-1 outline-none ${t.select}`}
                    >
                      {options.map(ct => (
                        <option key={ct} value={ct}>{CHART_LABELS[ct] ?? ct}</option>
                      ))}
                    </select>
                  </div>
                  <span className={`text-xs ${t.faint}`}>{result.rows.length} row{result.rows.length > 1 ? 's' : ''}</span>
                </div>
                {effectiveType === 'table'
                  ? <p className={`text-sm text-center py-6 ${t.faint}`}>Displayed as the data table below.</p>
                  : <ResultChart data={result} type={effectiveType} t={t} />}
              </div>
            )}

            {/* Data table */}
            <div className={`${t.card} p-5`}>
              <h3 className={`text-sm font-semibold mb-3 ${t.heading}`}>Data</h3>
              {result.rows.length === 0 ? (
                <p className={`text-sm text-center py-6 ${t.faint}`}>No rows returned.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className={`text-left text-[10px] uppercase tracking-wider border-b ${t.th}`}>
                        {result.columns.map(c => <th key={c} className="px-2 py-2 font-medium">{c}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.slice(0, 50).map((r, i) => (
                        <tr key={i} className={`border-b ${t.rowBorder} ${t.rowHover}`}>
                          {result.columns.map(c => (
                            <td key={c} className={`px-2 py-1.5 ${t.td}`}>{String(r[c] ?? '—')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.rows.length > 50 && (
                    <p className={`text-[11px] text-right mt-2 ${t.faint}`}>Showing first 50 of {result.rows.length} rows.</p>
                  )}
                </div>
              )}
            </div>

            {/* Pin button — org variant only, disabled after pinned */}
            {variant === 'org' && !result.error && (
              <div className="flex justify-end">
                <button
                  onClick={handlePin}
                  disabled={pinning || pinned}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                    pinned
                      ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                      : 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                  }`}
                >
                  <span>{pinned ? '✓' : '📌'}</span>
                  <span>{pinned ? 'Pinned to dashboard' : pinning ? 'Pinning…' : 'Pin to dashboard'}</span>
                </button>
              </div>
            )}

            {/* SQL + meta */}
            <div className={`${t.card} p-5`}>
              <button
                onClick={() => setShowSql(s => !s)}
                className={`flex w-full items-center justify-between text-sm font-semibold ${t.heading}`}
              >
                <span>Generated SQL & Metadata</span>
                <span className={`text-xs ${t.faint}`}>{showSql ? '▾' : '▸'}</span>
              </button>
              {showSql && (
                <div className="mt-3 space-y-3">
                  <pre className={`overflow-x-auto rounded-lg p-3 text-xs border whitespace-pre-wrap ${t.sql}`}>{result.sql}</pre>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className={`rounded-lg px-3 py-2 ${t.meta}`}>
                      <p className={`text-[10px] uppercase tracking-wider ${t.faint}`}>Method</p>
                      <p className={`font-mono font-semibold ${t.td}`}>{result.method}</p>
                    </div>
                    <div className={`rounded-lg px-3 py-2 ${t.meta}`}>
                      <p className={`text-[10px] uppercase tracking-wider ${t.faint}`}>Retries</p>
                      <p className={`font-mono font-semibold ${t.td}`}>{result.retries}</p>
                    </div>
                    <div className={`rounded-lg px-3 py-2 ${t.meta}`}>
                      <p className={`text-[10px] uppercase tracking-wider ${t.faint}`}>Tables</p>
                      <p className={`font-mono text-[11px] truncate ${t.td}`}>{result.relevantTables.join(', ')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )
      })()}
    </div>
  )
}
