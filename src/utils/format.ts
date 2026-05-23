export const formatPrice = (price: number) =>
  price === 0 ? 'Free' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(price)

export const formatDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return d }
}

export const statusColor = (s: string) =>
  s === 'Published' ? 'bg-emerald-500/15 text-emerald-400'
  : s === 'Cancelled' ? 'bg-red-500/15 text-red-400'
  : s === 'Approved' ? 'bg-blue-500/15 text-blue-400'
  : s === 'Pending' ? 'bg-amber-500/15 text-amber-400'
  : 'bg-slate-700/40 text-slate-400'
