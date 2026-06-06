import { useState } from 'react'
import { OrgAnalyticsTab } from './OrgAnalyticsTab'
import { Text2SqlConsole } from '../analytics/Text2SqlConsole'

const ORG_SAMPLES = [
  'Doanh thu theo tháng',
  'Top 5 sự kiện bán nhiều vé nhất',
  'Số vé theo trạng thái',
  'Số sự kiện theo trạng thái',
  'Đơn hàng đã thanh toán theo tháng',
]

type SubTab = 'overview' | 'ask'

/** Org analytics: a fixed dashboard plus a scoped Text2SQL console.
 *  Text2SQL results are restricted to this org server-side (JWT + DB views). */
export function OrgAnalyticsSection({ orgId }: { orgId: string }) {
  const [sub, setSub] = useState<SubTab>('overview')

  const tabClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
      active ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
    }`

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setSub('overview')} className={tabClass(sub === 'overview')}>Tổng quan</button>
        <button onClick={() => setSub('ask')} className={tabClass(sub === 'ask')}>Hỏi đáp dữ liệu</button>
      </div>

      {sub === 'overview'
        ? <OrgAnalyticsTab orgId={orgId} />
        : <Text2SqlConsole variant="org" samples={ORG_SAMPLES} placeholder="Hỏi về dữ liệu của tổ chức bạn…" />}
    </div>
  )
}
