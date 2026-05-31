import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { verifyResetToken, resetPassword } from '../api/authApi'

type State = 'verifying' | 'valid' | 'invalid' | 'submitting' | 'success'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [state, setState] = useState<State>('verifying')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) { setState('invalid'); return }
    verifyResetToken(token)
      .then(valid => setState(valid ? 'valid' : 'invalid'))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return }
    setState('submitting')
    setError(null)
    try {
      await resetPassword(token, newPassword)
      setState('success')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reset password.')
      setState('valid')
    }
  }

  /* Verifying */
  if (state === 'verifying') {
    return (
      <div className="mx-auto max-w-md fade-in">
        <div className="glass p-8 text-center space-y-3">
          <div className="spinner mx-auto" />
          <p className="text-sm text-slate-400">Verifying your reset link…</p>
        </div>
      </div>
    )
  }

  /* Invalid / expired */
  if (state === 'invalid') {
    return (
      <div className="mx-auto max-w-md fade-in">
        <div className="glass p-8 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-bold text-white">Link Invalid or Expired</h2>
          <p className="text-sm text-slate-400">This password reset link is invalid or has already been used. Please request a new one.</p>
          <button
            className="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
            onClick={() => navigate('/forgot-password')}
          >
            Request New Link
          </button>
          <button className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors" onClick={() => navigate('/auth')}>
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  /* Success */
  if (state === 'success') {
    return (
      <div className="mx-auto max-w-md fade-in">
        <div className="glass p-8 text-center space-y-4">
          <div className="text-4xl">✅</div>
          <h2 className="text-xl font-bold text-white">Password Reset Successful</h2>
          <p className="text-sm text-slate-400">Your password has been updated. You can now sign in with your new password.</p>
          <button
            className="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
            onClick={() => navigate('/auth')}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  /* Valid — show form */
  return (
    <div className="mx-auto max-w-md fade-in">
      <div className="glass p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-lg">🔑</div>
          <h2 className="text-xl font-bold text-white">Set New Password</h2>
          <p className="text-sm text-slate-400 text-center">Enter your new password below.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoFocus
            />
          </div>
          <div>
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={state === 'submitting'}
            className="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-50"
          >
            {state === 'submitting' ? 'Updating…' : 'Reset Password'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors" onClick={() => navigate('/auth')}>
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  )
}
