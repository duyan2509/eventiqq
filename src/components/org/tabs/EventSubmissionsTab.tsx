import { useEffect, useState } from 'react'
import { message, Popconfirm } from 'antd'
import type { SubmissionResponse } from '../../../types/index'
import type { EventDetail } from '../../../types/event'
import { getSubmissions, submitEvent, acceptSubmission, rejectSubmission } from '../../../api/submissionApi'
import { formatDate } from '../../../utils/format'

interface Props {
  event: EventDetail
  orgId: string
  onRefreshList: () => void
}

export function EventSubmissionsTab({ event, orgId, onRefreshList }: Props) {
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSubmissions = async () => {
    setLoading(true)
    try { const r = await getSubmissions(event.id); setSubmissions(r.data) } catch { }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchSubmissions() }, [event.id])

  const handleSubmit = async () => {
    try { await submitEvent(event.id, orgId); message.success('Submitted for review'); fetchSubmissions(); onRefreshList() }
    catch (e: any) { message.error(e?.response?.data?.message || 'Failed to submit.') }
  }

  const handleAccept = async () => {
    try { await acceptSubmission(event.id, { message: '' }); fetchSubmissions() } catch { }
  }

  const handleReject = async () => {
    try { await rejectSubmission(event.id, { message: '' }); fetchSubmissions() } catch { }
  }

  return (
    <>
      {submissions.length === 0 && (
        <div className="mb-4">
          <Popconfirm title="Submit this event for review?" onConfirm={handleSubmit} okText="Submit" cancelText="Cancel">
            <button className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400">Submit for Review</button>
          </Popconfirm>
        </div>
      )}
      {loading ? <div className="skeleton h-20 w-full" /> : submissions.length === 0 ? <p className="text-sm text-slate-400">No submissions.</p> : (
        <div className="space-y-2">{submissions.map(s => (
          <div key={s.adminId} className="flex items-center justify-between rounded-xl border border-slate-700/30 bg-slate-900/40 px-4 py-3 text-sm">
            <div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.status === 0 ? 'bg-amber-500/15 text-amber-400' : s.status === 1 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                {s.status === 0 ? 'Pending' : s.status === 1 ? 'Accepted' : 'Rejected'}
              </span>
              <span className="ml-2 text-xs text-slate-500">{formatDate(s.createdAt)}</span>
            </div>
            {s.status === 0 && (
              <div className="flex gap-2">
                <button className="text-xs text-emerald-400 hover:text-emerald-300" onClick={handleAccept}>Accept</button>
                <button className="text-xs text-red-400 hover:text-red-300" onClick={handleReject}>Reject</button>
              </div>
            )}
          </div>
        ))}</div>
      )}
    </>
  )
}
