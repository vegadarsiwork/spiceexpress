import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { API_BASE_URL, testAPIConnection } from '../lib/api'

export default function Login() {
  const navigate = useNavigate();
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    // Test API connection first
    console.log('🔍 Testing API connection...');
    const isConnected = await testAPIConnection();
    if (!isConnected) {
      setError('Cannot connect to backend server. Please check if backend is deployed and running.');
      setLoading(false);
      return;
    }
    
    try {
      if (mode === 'login') {
        console.log('🔐 Attempting login to:', `${API_BASE_URL}/auth/login`);
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          mode: 'cors',
          credentials: 'omit'
        })
        console.log('📊 Login response:', res.status, res.statusText);
        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Login error response:', errorText);
          throw new Error(`Login failed: ${res.status} ${res.statusText} - ${errorText}`);
        }
        const json = await res.json()
        localStorage.setItem('auth_token', json.token)
        if (json.user) {
          localStorage.setItem('user', JSON.stringify(json.user));
        }
        navigate('/dashboard', { replace: true })
      } else {
        console.log('📝 Attempting register to:', `${API_BASE_URL}/auth/register`);
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        })
        console.log('📊 Register response:', res.status, res.statusText);
        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Register error response:', errorText);
          throw new Error(`Registration failed: ${res.status} ${res.statusText} - ${errorText}`);
        }
        setMode('login')
        setError('Registration successful! Please sign in.')
      }
    } catch (err: any) {
      console.error('🚨 Auth error:', err);
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Connection failed - check if backend is running');
      } else {
        setError(err.message ?? (mode === 'login' ? 'Login failed' : 'Registration failed'));
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
  className="min-h-screen flex items-center justify-center bg-gray-50"
    >
  <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-red-600 rounded-lg flex items-center justify-center mb-2">
            <span className="text-white text-2xl font-bold">S</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Spice Express</h1>
          <div className="text-gray-500 text-base font-medium mb-2">{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</div>
        </div>
        <form onSubmit={onSubmit} className="w-full space-y-6">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700">Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="border rounded-lg px-4 py-3 w-full bg-gray-100 text-gray-900 focus:bg-white focus:outline-none"
                placeholder="Your name"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="border rounded-lg px-4 py-3 w-full bg-gray-100 text-gray-900 focus:bg-white focus:outline-none"
              placeholder="you@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="border rounded-lg px-4 py-3 w-full bg-gray-100 text-gray-900 focus:bg-white focus:outline-none"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <div className={error.includes('success') ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>{error}</div>}
          <button
            className="w-full py-3 rounded-lg bg-red-500 text-white font-semibold text-lg hover:bg-red-600 transition disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? (mode === 'login' ? 'Signing in…' : 'Registering…') : (mode === 'login' ? 'Sign in' : 'Register')}
          </button>
        </form>
        <div className="mt-6 text-center w-full">
          {mode === 'login' ? (
            <>
              <span className="text-gray-600">Don't have an account?</span>{' '}
              <button
                className="text-red-600 font-semibold hover:underline ml-1"
                onClick={() => { setMode('register'); setError(null); }}
                type="button"
              >
                Register
              </button>
            </>
          ) : (
            <>
              <span className="text-gray-600">Already have an account?</span>{' '}
              <button
                className="text-red-600 font-semibold hover:underline ml-1"
                onClick={() => { setMode('login'); setError(null); }}
                type="button"
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}


