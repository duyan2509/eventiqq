import { useRef, useState } from 'react'
import { message } from 'antd'
import type { CreateEventDto } from '../../types/event'
import type { Province, Commune } from '../../api/addressApi'
import { getCommunes } from '../../api/addressApi'
import { createEvent } from '../../api/eventApi'

interface Props {
  orgId: string
  provinces: Province[]
  onCreated: () => void
  onClose: () => void
}

export function CreateEventModal({ orgId, provinces, onCreated, onClose }: Props) {
  const [form, setForm] = useState<CreateEventDto>({ name: '', description: '', startTime: '', endTime: '', detailAddress: '', provinceCode: '', communeCode: '', provinceName: '', communeName: '' })
  const [communes, setCommunes] = useState<Commune[]>([])
  const [loadingCommunes, setLoadingCommunes] = useState(false)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof CreateEventDto, string>>>({})
  const [error, setError] = useState<string | null>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  const handleProvinceChange = async (code: string) => {
    const province = provinces.find(p => p.code === code)
    setForm(f => ({ ...f, provinceCode: code, provinceName: province?.name ?? '', communeCode: '', communeName: '' }))
    setCommunes([])
    if (!code) return
    setLoadingCommunes(true)
    try { setCommunes(await getCommunes(code)) } catch { }
    finally { setLoadingCommunes(false) }
  }

  const handleCommuneChange = (code: string) => {
    const commune = communes.find(c => c.code === code)
    setForm(f => ({ ...f, communeCode: code, communeName: commune?.name ?? '' }))
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setBannerFile(file)
    if (file) { const r = new FileReader(); r.onload = ev => setBannerPreview(ev.target?.result as string); r.readAsDataURL(file) }
    else setBannerPreview(null)
  }

  const validate = () => {
    const errs: Partial<Record<keyof CreateEventDto, string>> = {}
    if (!form.name.trim()) errs.name = 'Event name is required.'
    else if (form.name.trim().length < 3) errs.name = 'Name must be at least 3 characters.'
    if (!form.startTime) errs.startTime = 'Start time is required.'
    else if (new Date(form.startTime) <= new Date()) errs.startTime = 'Start time must be in the future.'
    if (!form.endTime) errs.endTime = 'End time is required.'
    if (form.startTime && form.endTime && form.endTime <= form.startTime) errs.endTime = 'End time must be after start time.'
    if (!form.provinceCode) errs.provinceCode = 'Please select a province.'
    if (form.provinceCode && !form.communeCode) errs.communeCode = 'Please select a commune.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setCreating(true); setError(null)
    try {
      await createEvent(orgId, form, bannerFile ?? undefined)
      message.success('Event created successfully')
      onCreated()
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed to create event.') }
    finally { setCreating(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 fade-in" onClick={e => e.stopPropagation()}>
        <h2 className="mb-5">Create Event</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Event Banner</label>
            <div className="mt-2 relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700/60 bg-slate-900/40 overflow-hidden transition-colors hover:border-indigo-500/40 cursor-pointer" style={{ minHeight: bannerPreview ? 160 : 100 }} onClick={() => bannerRef.current?.click()}>
              {bannerPreview ? (<>
                <img src={bannerPreview} alt="preview" className="w-full h-40 object-cover" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"><span className="text-xs font-semibold text-white">Click to change</span></div>
              </>) : (
                <div className="py-6 text-center">
                  <div className="text-2xl mb-1">🖼</div>
                  <p className="text-xs text-slate-400">Click to upload banner</p>
                  <p className="text-[10px] text-slate-600 mt-1">JPG, PNG, WEBP — max 5MB</p>
                </div>
              )}
              <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
            </div>
            {bannerFile && <p className="mt-1 text-[10px] text-indigo-400 truncate">📎 {bannerFile.name}</p>}
          </div>

          <div>
            <label>Event Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Summer Music Festival 2026" />
            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
          </div>
          <div><label>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Short description of the event..." /></div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label>Start Date &amp; Time</label>
              <input type="datetime-local" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
              {errors.startTime && <p className="mt-1 text-xs text-red-400">{errors.startTime}</p>}
            </div>
            <div>
              <label>End Date &amp; Time</label>
              <input type="datetime-local" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
              {errors.endTime && <p className="mt-1 text-xs text-red-400">{errors.endTime}</p>}
            </div>
          </div>

          <div><label>Address</label><input value={form.detailAddress} onChange={e => setForm({ ...form, detailAddress: e.target.value })} placeholder="123 Main Street" /></div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label>Province</label>
              <select value={form.provinceCode} onChange={e => handleProvinceChange(e.target.value)} className="w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500/50 focus:outline-none">
                <option value="">Select province...</option>
                {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
              {errors.provinceCode && <p className="mt-1 text-xs text-red-400">{errors.provinceCode}</p>}
            </div>
            <div>
              <label>Commune</label>
              <select value={form.communeCode} onChange={e => handleCommuneChange(e.target.value)} disabled={!form.provinceCode || loadingCommunes} className="w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500/50 focus:outline-none disabled:opacity-40">
                <option value="">{loadingCommunes ? 'Loading...' : 'Select commune...'}</option>
                {communes.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
              {errors.communeCode && <p className="mt-1 text-xs text-red-400">{errors.communeCode}</p>}
            </div>
          </div>

          {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500" onClick={onClose}>Cancel</button>
            <button className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50" disabled={creating}>{creating ? 'Creating…' : 'Create Event'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
