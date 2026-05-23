import { useRef, useState } from 'react'
import { message } from 'antd'
import type { EventDetail, UpdateEventDto } from '../../../types/event'
import { updateEvent, getEventDetail } from '../../../api/eventApi'
import { formatDate } from '../../../utils/format'

interface Props {
  event: EventDetail
  onUpdated: (ev: EventDetail) => void
  canEdit: boolean
}

export function EventInfoTab({ event, onUpdated, canEdit }: Props) {
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState<UpdateEventDto>({})
  const [editBanner, setEditBanner] = useState<File | null>(null)
  const [editBannerPreview, setEditBannerPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const bannerRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setEditForm({ name: event.name, description: event.description, detailAddress: event.detailAddress, provinceCode: event.provinceCode, communeCode: event.communeCode, provinceName: event.provinceName, communeName: event.communeName, startTime: event.startTime?.slice(0, 16), endTime: event.endTime?.slice(0, 16) })
    setEditBanner(null); setEditBannerPreview(null); setEditMode(true)
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setEditBanner(file)
    if (file) { const r = new FileReader(); r.onload = ev => setEditBannerPreview(ev.target?.result as string); r.readAsDataURL(file) }
    else setEditBannerPreview(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateEvent(event.id, editForm, editBanner ?? undefined)
      const updated = await getEventDetail(event.id)
      onUpdated(updated); setEditMode(false)
      message.success('Event updated')
    } catch (e: any) { message.error(e?.response?.data?.message || 'Failed to update.') }
    finally { setSaving(false) }
  }

  if (!editMode) return (
    <>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex justify-between"><span className="text-slate-400">Start</span><span>{formatDate(event.startTime)}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">End</span><span>{formatDate(event.endTime)}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Location</span><span>{event.detailAddress || '—'}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Province</span><span>{event.provinceName || '—'}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Commune</span><span>{event.communeName || '—'}</span></div>
      </div>
      {event.description && <div className="mt-3 rounded-lg border border-slate-700/30 bg-slate-900/40 p-3 text-sm text-slate-300">{event.description}</div>}
      {event.status === 'Draft' && canEdit && (
        <button className="mt-4 rounded-lg border border-indigo-500/30 px-4 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-500/10 transition-colors" onClick={startEdit}>Edit</button>
      )}
    </>
  )

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-slate-400">Banner</label>
        <div className="mt-1 flex items-center justify-center rounded-xl border-2 border-dashed border-slate-700/60 bg-slate-900/40 overflow-hidden cursor-pointer hover:border-indigo-500/40 transition-colors" style={{ minHeight: 80 }} onClick={() => bannerRef.current?.click()}>
          {editBannerPreview
            ? <img src={editBannerPreview} alt="preview" className="w-full h-28 object-cover" />
            : <p className="text-xs text-slate-500 py-4">Click to replace banner</p>}
          <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
        </div>
      </div>
      <div><label className="text-xs text-slate-400">Name</label><input value={editForm.name ?? ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} /></div>
      <div><label className="text-xs text-slate-400">Description</label><textarea value={editForm.description ?? ''} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={2} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-slate-400">Start</label><input type="datetime-local" value={editForm.startTime ?? ''} onChange={e => setEditForm({ ...editForm, startTime: e.target.value })} /></div>
        <div><label className="text-xs text-slate-400">End</label><input type="datetime-local" value={editForm.endTime ?? ''} onChange={e => setEditForm({ ...editForm, endTime: e.target.value })} /></div>
      </div>
      <div><label className="text-xs text-slate-400">Address</label><input value={editForm.detailAddress ?? ''} onChange={e => setEditForm({ ...editForm, detailAddress: e.target.value })} /></div>
      <div className="flex gap-3 pt-1">
        <button type="button" className="text-sm text-slate-400 hover:text-slate-200" onClick={() => setEditMode(false)}>Cancel</button>
        <button className="rounded-lg bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-50" disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </div>
  )
}
