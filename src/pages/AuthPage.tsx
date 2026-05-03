import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LoginDto, RegisterDto, UserInfo } from '../types/auth'
import { signIn, signUp } from '../api/authApi'

interface Props { onAuthenticated(u: UserInfo): void }

export function AuthPage({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null)
    try {
      if (mode === 'login') {
        const dto: LoginDto = { email, password }
        const result = await signIn(dto)
        onAuthenticated(result.user)
      } else {
        const dto: RegisterDto = { email, password }
        await signUp(dto)
        // Auto-login after register
        const loginResult = await signIn({ email, password })
        onAuthenticated(loginResult.user)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || (mode === 'login' ? 'Invalid credentials.' : 'Registration failed.'))
    } finally { setLoading(false) }
  }

  return (
    <div className="mx-auto max-w-md fade-in">
      <div className="glass p-8">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-lg font-bold text-white">E</div>
          <h2 className="text-xl font-bold text-white">Eventiqq</h2>
          <p className="text-sm text-slate-400">{mode === 'login' ? 'Welcome back! Sign in to continue.' : 'Create an account to get started.'}</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex rounded-full bg-slate-900/80 p-1">
          <button className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${mode === 'login' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-slate-300'}`} onClick={() => setMode('login')}>Sign In</button>
          <button className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-slate-300'}`} onClick={() => setMode('register')}>Sign Up</button>
        </div>

        {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div>
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {mode === 'login' && (
            <div className="text-right">
              <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors" onClick={() => navigate('/forgot-password')}>
                Forgot Password?
              </button>
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:opacity-50">
            {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
