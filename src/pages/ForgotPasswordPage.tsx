import { useState } from 'react'
import { forgotPassword } from '../api/authApi'
import { useNavigate } from 'react-router-dom'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await forgotPassword(email)
      setSuccess(true)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send reset email.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md fade-in">
        <div className="glass p-8 text-center">
          <div className="mb-4 text-4xl">📧</div>
          <h2 className="text-xl font-bold text-white mb-2">Check Your Email</h2>
          <p className="text-sm text-slate-400 mb-6">
            If an account exists with <strong className="text-indigo-300">{email}</strong>, we've sent a password reset link to that address. The link expires in 30 minutes.
          </p>
          <button
            className="w-full rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            onClick={() => navigate('/auth')}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md fade-in">
      <div className="glass p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-lg">🔒</div>
          <h2 className="text-xl font-bold text-white">Forgot Password</h2>
          <p className="text-sm text-slate-400 text-center">Enter your email and we'll send you a link to reset your password.</p>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-50">
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            onClick={() => navigate('/auth')}
          >
            ← Back to Sign In
          </button>
        </div>
      </div>
    </div>
  )
}
