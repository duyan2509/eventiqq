import { Link } from 'react-router-dom'

export function PaymentCancelPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="glass p-10 rounded-2xl flex flex-col items-center gap-4 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">Payment Cancelled</h1>
        <p className="text-slate-400 text-sm">
          Your payment was not completed. Your held seats will be released after the hold period expires.
        </p>
        <Link
          to="/events"
          className="w-full rounded-lg bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 text-center block"
        >
          Back to Events
        </Link>
      </div>
    </div>
  )
}
