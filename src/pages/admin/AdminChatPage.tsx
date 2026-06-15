import { useState } from 'react'
import { askAnalyticsChat } from '../../api/analyticsApi'
import type { Text2SqlResponse } from '../../api/analyticsApi'

const SAMPLE_QUESTIONS = [
  'Doanh thu tháng này là bao nhiêu?',
  'Top 5 sự kiện bán nhiều vé nhất',
  'Có bao nhiêu user mới tháng này?',
  'Tỷ lệ đơn hàng theo trạng thái',
]

function SqlBlock({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
      >
        <span>{open ? '▾' : '▸'}</span>
        <span>View executed SQL</span>
      </button>
      {open && (
        <pre className="mt-2 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-[11px] text-gray-700 whitespace-pre-wrap">
          {sql}
        </pre>
      )}
    </div>
  )
}

function DataTable({ rows, columns }: { rows: Record<string, unknown>[]; columns: string[] }) {
  if (rows.length === 0) return <p className="text-sm text-gray-400 italic">No data returned.</p>
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map(c => (
              <th key={c} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.slice(0, 50).map((r, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              {columns.map(c => (
                <td key={c} className="px-3 py-2 text-gray-700">{String(r[c] ?? '—')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 50 && (
        <p className="px-3 py-2 text-right text-[11px] text-gray-400 bg-gray-50 border-t border-gray-100">
          Showing 50 of {rows.length} rows
        </p>
      )}
    </div>
  )
}

function ResultCard({ result }: { result: Text2SqlResponse }) {
  if (result.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-3">
        <p className="text-sm font-medium text-red-700">Could not process question</p>
        <p className="text-sm text-red-600">{result.error}</p>
        {result.sql && <SqlBlock sql={result.sql} />}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      {/* Question label */}
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
          Question
        </span>
        <p className="text-sm text-gray-700">{result.question}</p>
      </div>

      {/* Answer */}
      {result.answer && (
        <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-4 py-3">
          <p className="text-sm text-indigo-900 leading-relaxed">{result.answer}</p>
        </div>
      )}

      {/* Data table */}
      <DataTable rows={result.rows} columns={result.columns} />

      {/* SQL */}
      <SqlBlock sql={result.sql} />

      {/* Meta */}
      <p className="text-[10px] text-gray-400">
        {result.relevantTables.join(', ')} · {result.method} · {result.retries} retry
      </p>
    </div>
  )
}

export function AdminChatPage() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Text2SqlResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ask = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed || loading) return
    setQuestion(trimmed)
    setResult(null)
    setError(null)
    setLoading(true)
    try {
      const res = await askAnalyticsChat(trimmed)
      setResult(res)
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      setError(e?.response?.data?.detail ?? e?.message ?? 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    ask(question)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Ask your data</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ask in natural language — the system generates SQL, runs it, and answers.
        </p>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="e.g. What is the total revenue this month?"
          disabled={loading}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Processing…' : 'Ask'}
        </button>
      </form>

      {/* Sample questions — only shown before any result */}
      {!result && !loading && !error && (
        <div className="flex flex-wrap gap-2">
          {SAMPLE_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => ask(q)}
              className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors shadow-sm"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 flex items-center gap-3">
          <div className="flex gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400" />
          </div>
          <p className="text-sm text-gray-500">Analyzing question and querying data…</p>
        </div>
      )}

      {/* Network/server error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-medium text-red-700">Connection error</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && <ResultCard result={result} />}
    </div>
  )
}
