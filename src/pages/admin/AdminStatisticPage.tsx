import { useState } from 'react'
import { Bar, Line, Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend
} from 'chart.js'
import { askAnalytics } from '../../api/analyticsApi'
import type { Text2SqlResponse } from '../../api/analyticsApi'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend)

const SAMPLE_QUESTIONS = [
  'Doanh thu theo tháng năm nay',
  'Top 5 sự kiện bán nhiều vé nhất',
  'Có bao nhiêu user mới tháng này?',
  'Tỷ lệ vé theo trạng thái',
  'Số order theo trạng thái',
]

const CHART_PALETTE = [
  'rgba(99,102,241,0.75)', 'rgba(16,185,129,0.75)', 'rgba(245,158,11,0.75)',
  'rgba(239,68,68,0.75)', 'rgba(168,85,247,0.75)', 'rgba(20,184,166,0.75)',
  'rgba(236,72,153,0.75)', 'rgba(132,204,22,0.75)',
]

const CHART_OPTS = {
  responsive: true,
  plugins: { legend: { labels: { color: '#4b5563', font: { size: 11 } } } },
  scales: {
    x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#9ca3af', font: { size: 11 } } },
    y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#9ca3af', font: { size: 11 } } }
  }
}

function ResultChart({ data }: { data: Text2SqlResponse }) {
  const { rows, columns, chartType } = data
  if (!rows.length || columns.length < 2) return null

  const labelKey = columns[0]
  const valueKeys = columns.slice(1).filter(k => rows.every(r => typeof r[k] === 'number' || (typeof r[k] === 'string' && !isNaN(Number(r[k])))))
  if (valueKeys.length === 0) return null

  const labels = rows.map(r => String(r[labelKey] ?? ''))

  if (chartType === 'pie') {
    const chartData = {
      labels,
      datasets: [{
        data: rows.map(r => Number(r[valueKeys[0]])),
        backgroundColor: CHART_PALETTE,
      }]
    }
    return <Pie data={chartData} options={{ responsive: true, plugins: { legend: { position: 'right' as const, labels: { color: '#4b5563', font: { size: 11 } } } } }} />
  }

  const datasets = valueKeys.map((k, i) => ({
    label: k,
    data: rows.map(r => Number(r[k])),
    backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length],
    borderColor: CHART_PALETTE[i % CHART_PALETTE.length].replace('0.75', '1'),
    borderRadius: chartType === 'bar' ? 6 : 0,
    tension: 0.4,
    fill: chartType === 'line',
  }))

  const chartData = { labels, datasets }
  return chartType === 'line' ? <Line data={chartData} options={CHART_OPTS} /> : <Bar data={chartData} options={CHART_OPTS} />
}

export function AdminStatisticPage() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Text2SqlResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSql, setShowSql] = useState(false)

  const ask = async (q: string) => {
    if (!q.trim()) return
    setLoading(true); setError(null); setResult(null); setQuestion(q)
    try {
      const res = await askAnalytics(q)
      setResult(res)
      if (res.error) setError(res.error)
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Statistics</h1>
        <p className="text-sm text-gray-500">Ask a question in natural language — powered by Text2SQL (Groq LLaMA-3.3).</p>
      </div>

      {/* Input */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <form onSubmit={e => { e.preventDefault(); ask(question) }} className="flex gap-2">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ví dụ: Doanh thu theo tháng năm nay"
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Thinking…' : 'Ask'}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="text-[11px] text-gray-400 mr-1">Try:</span>
          {SAMPLE_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => ask(q)}
              disabled={loading}
              className="rounded-full bg-gray-100 px-3 py-1 text-[11px] text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">Generating SQL and querying database…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <>
          {/* Chart */}
          {result.rows.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  Chart <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 uppercase">{result.chartType}</span>
                </h3>
                <span className="text-xs text-gray-400">{result.rows.length} row{result.rows.length > 1 ? 's' : ''}</span>
              </div>
              <ResultChart data={result} />
            </div>
          )}

          {/* Data table */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Data</h3>
            {result.rows.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No rows returned.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                      {result.columns.map(c => <th key={c} className="px-2 py-2 font-medium">{c}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        {result.columns.map(c => (
                          <td key={c} className="px-2 py-1.5 text-gray-700">{String(r[c] ?? '—')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.rows.length > 50 && (
                  <p className="text-[11px] text-gray-400 text-right mt-2">Showing first 50 of {result.rows.length} rows.</p>
                )}
              </div>
            )}
          </div>

          {/* SQL + meta */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <button
              onClick={() => setShowSql(s => !s)}
              className="flex w-full items-center justify-between text-sm font-semibold text-gray-900"
            >
              <span>Generated SQL & Metadata</span>
              <span className="text-xs text-gray-400">{showSql ? '▾' : '▸'}</span>
            </button>
            {showSql && (
              <div className="mt-3 space-y-3">
                <pre className="overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700 border border-gray-200 whitespace-pre-wrap">{result.sql}</pre>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400">Method</p>
                    <p className="font-mono font-semibold text-gray-700">{result.method}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400">Retries</p>
                    <p className="font-mono font-semibold text-gray-700">{result.retries}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400">Tables</p>
                    <p className="font-mono text-[11px] text-gray-700 truncate">{result.relevantTables.join(', ')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
