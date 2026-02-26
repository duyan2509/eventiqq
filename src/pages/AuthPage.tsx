import { useState } from 'react'
import type { UserInfo } from '../types/auth'
import { signIn, signUp } from '../api/authApi'

interface AuthPageProps {
  onAuthenticated(user: UserInfo): void
}

type AuthTab = 'signin' | 'signup' | 'forgot'

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [tab, setTab] = useState<AuthTab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (tab === 'signin') {
        const { user } = await signIn({ email, password })
        onAuthenticated(user)
      } else if (tab === 'signup') {
        const { user } = await signUp({ email, password, name })
        onAuthenticated(user)
      } else {
        setMessage('Password reset link will be sent (skeleton).')
      }
    } catch (error) {
      const err = error as Error
      setMessage(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <div className="card auth-card">
        <div className="auth-tabs">
          <button
            className={tab === 'signin' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => setTab('signin')}
          >
            Sign in
          </button>
          <button
            className={tab === 'signup' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => setTab('signup')}
          >
            Sign up
          </button>
          <button
            className={tab === 'forgot' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => setTab('forgot')}
          >
            Forgot password
          </button>
        </div>

        {tab === 'forgot' && (
          <div className="forgot-skeleton">
            <div className="skeleton-line wide" />
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        )}

        {tab !== 'forgot' && (
          <form className="auth-form" onSubmit={handleSubmit}>
            {tab === 'signup' && (
              <div className="field">
                <label>Name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
            )}
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button className="btn primary w-full" disabled={loading}>
              {loading ? 'Processing...' : tab === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        )}

        {tab === 'forgot' && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="field">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <button className="btn primary w-full" disabled={loading}>
              {loading ? 'Sending link...' : 'Send reset link'}
            </button>
          </form>
        )}

        {message && <p className="auth-message">{message}</p>}
      </div>
    </div>
  )
}

