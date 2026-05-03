import { useState } from 'react'
import { resetPassword } from '../api/authApi'
import { useNavigate } from 'react-router-dom'

export function ResetPasswordPage() {
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await resetPassword(token, newPassword)
      setSuccess(true)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to reset password. Token may be invalid or expired.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-md fade-in">
        <div className="glass p-8 text-center">
          <div className="mb-4 text-4xl">✅</div>
          <h2 className="text-xl font-bold text-white mb-2">Password Reset Successful</h2>
          <p className="text-sm text-slate-400 mb-6">Your password has been reset. You can now sign in with your new password.</p>
          <button
            className="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
            onClick={() => navigate('/auth')}
          >
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md fade-in">
      <div className="glass p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-lg">🔑</div>
          <h2 className="text-xl font-bold text-white">Reset Password</h2>
          <p className="text-sm text-slate-400 text-center">Enter the token from your email and your new password.</p>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label>Reset Token</label>
            <input type="text" value={token} onChange={e => setToken(e.target.value)} placeholder="Paste token from email" required />
          </div>
          <div>
            <label>New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <div>
            <label>Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-50">
            {loading ? 'Resetting...' : 'Reset Password'}
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
