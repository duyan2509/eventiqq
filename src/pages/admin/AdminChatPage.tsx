import { useEffect, useRef, useState } from 'react'
import { askAnalyticsChat } from '../../api/analyticsApi'
import type { Text2SqlResponse } from '../../api/analyticsApi'

const SAMPLE_QUESTIONS = [
  'Doanh thu tháng này là bao nhiêu?',
  'Top 5 sự kiện bán nhiều vé nhất',
  'Có bao nhiêu user mới tháng này?',
  'Tỷ lệ đơn hàng theo trạng thái',
]

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  text: string
  data?: Text2SqlResponse
  isError?: boolean
}

/** Collapsible "SQL & data" detail under an assistant answer. */
function Details({ data }: { data: Text2SqlResponse }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-2 border-t border-gray-100 pt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-[11px] font-semibold text-gray-400 hover:text-gray-600"
      >
        {open ? '▾' : '▸'} SQL & dữ liệu ({data.rows.length} dòng)
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-[11px] text-gray-700 whitespace-pre-wrap">{data.sql}</pre>
          {data.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    {data.columns.map(c => <th key={c} className="px-2 py-1.5 font-medium">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      {data.columns.map(c => (
                        <td key={c} className="px-2 py-1 text-gray-700">{String(r[c] ?? '—')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.rows.length > 20 && (
                <p className="text-[10px] text-gray-400 text-right mt-1">Hiển thị 20/{data.rows.length} dòng.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AdminChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const nextId = useRef(1)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (q: string) => {
    if (!q.trim() || loading) return
    setQuestion('')
    setMessages(m => [...m, { id: nextId.current++, role: 'user', text: q }])
    setLoading(true)
    try {
      const res = await askAnalyticsChat(q)
      setMessages(m => [...m, {
        id: nextId.current++,
        role: 'assistant',
        text: res.error ? res.error : (res.answer ?? 'Không có câu trả lời.'),
        data: res,
        isError: !!res.error,
      }])
    } catch (err) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string }
      setMessages(m => [...m, {
        id: nextId.current++,
        role: 'assistant',
        text: e?.response?.data?.detail ?? e?.message ?? 'Đã xảy ra lỗi.',
        isError: true,
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Chat with Data</h1>
        <p className="text-sm text-gray-500">Hỏi bằng ngôn ngữ tự nhiên, nhận câu trả lời từ dữ liệu — Text2SQL (Groq LLaMA-3.3).</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-gray-400">Bắt đầu bằng một câu hỏi về dữ liệu của hệ thống.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              {SAMPLE_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full bg-gray-100 px-3 py-1 text-[11px] text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(m => (
          m.role === 'user' ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-2 text-sm text-white">
                {m.text}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-start">
              <div className={`max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm ${
                m.isError ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-800'
              }`}>
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.data && !m.isError && <Details data={m.data} />}
              </div>
            </div>
          )
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={e => { e.preventDefault(); send(question) }}
        className="mt-3 flex gap-2"
      >
        <input
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Hỏi về dữ liệu hệ thống…"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  )
}
