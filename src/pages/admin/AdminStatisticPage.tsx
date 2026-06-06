import { Text2SqlConsole } from '../../components/analytics/Text2SqlConsole'

const SAMPLE_QUESTIONS = [
  'Doanh thu theo tháng năm nay',
  'Top 5 sự kiện bán nhiều vé nhất',
  'Có bao nhiêu user mới tháng này?',
  'Tỷ lệ vé theo trạng thái',
  'Số order theo trạng thái',
]

export function AdminStatisticPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Statistics</h1>
        <p className="text-sm text-gray-500">Ask a question in natural language — powered by Text2SQL (Groq LLaMA-3.3).</p>
      </div>
      <Text2SqlConsole variant="admin" samples={SAMPLE_QUESTIONS} />
    </div>
  )
}
