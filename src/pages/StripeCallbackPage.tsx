import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { handleOnboardingCallback, connectStripeAccount } from '../api/paymentApi'

type CallbackStatus = 'loading' | 'success' | 'error' | 'refreshing'

export function StripeReturnPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<CallbackStatus>('loading')
  const [message, setMessage] = useState('')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (!orgId) {
      setStatus('error')
      setMessage('Missing organization ID. Please try connecting Stripe again from your organization settings.')
      return
    }

    const processCallback = async () => {
      try {
        const result = await handleOnboardingCallback(orgId)
        if (result.isPaymentReady) {
          setStatus('success')
          setMessage('Stripe account connected successfully! Your organization is now ready to accept payments.')
        } else {
          setStatus('error')
          setMessage('Stripe onboarding is incomplete. Please try connecting again to complete the setup.')
        }
      } catch (e: any) {
        setStatus('error')
        setMessage(e?.response?.data?.message || 'Failed to verify Stripe connection. Please try again.')
      }
    }

    processCallback()
  }, [orgId])

  // Auto-redirect countdown
  useEffect(() => {
    if (status === 'loading') return
    if (countdown <= 0) { navigate('/organizations'); return }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [status, countdown, navigate])

  return (
    <div className="fade-in flex min-h-[60vh] items-center justify-center">
      <div className="glass w-full max-w-md p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15">
              <div className="spinner" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-white">Verifying Stripe Connection</h2>
            <p className="text-sm text-slate-400">Please wait while we verify your Stripe account setup...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15">
              <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-emerald-300">Connection Successful</h2>
            <p className="mb-4 text-sm text-slate-400">{message}</p>
            <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
              ✓ Stripe account is active and ready
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15">
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-red-300">Connection Issue</h2>
            <p className="mb-4 text-sm text-slate-400">{message}</p>
          </>
        )}

        {status !== 'loading' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Redirecting to Organizations in {countdown}s...
            </p>
            <div className="flex justify-center gap-3">
              <button
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-400 hover:text-white"
                onClick={() => navigate('/organizations')}
              >
                Go to Organizations
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function StripeRefreshPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'redirecting' | 'error'>('redirecting')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!orgId) {
      setStatus('error')
      setMessage('Missing organization ID.')
      return
    }

    const refreshOnboarding = async () => {
      try {
        const result = await connectStripeAccount(orgId)
        if (result.onboardingUrl) {
          window.location.href = result.onboardingUrl
        } else {
          setStatus('error')
          setMessage('Could not generate a new onboarding link. Please try again from your organization settings.')
        }
      } catch (e: any) {
        setStatus('error')
        setMessage(e?.response?.data?.message || 'Failed to create a new Stripe onboarding link.')
      }
    }

    refreshOnboarding()
  }, [orgId])

  return (
    <div className="fade-in flex min-h-[60vh] items-center justify-center">
      <div className="glass w-full max-w-md p-8 text-center">
        {status === 'redirecting' && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15">
              <div className="spinner" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-white">Refreshing Stripe Onboarding</h2>
            <p className="text-sm text-slate-400">Your previous onboarding link has expired. Generating a new one...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15">
              <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-red-300">Refresh Failed</h2>
            <p className="mb-4 text-sm text-slate-400">{message}</p>
            <div className="flex justify-center gap-3">
              <button
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-400 hover:text-white"
                onClick={() => navigate('/organizations')}
              >
                Go to Organizations
              </button>
              <button
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
