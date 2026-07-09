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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    // Test API connection first
    const isConnected = await testAPIConnection();
    if (!isConnected) {
      setError('Cannot connect to backend server. Please check if backend is deployed and running.');
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        mode: 'cors',
        credentials: 'omit'
      })
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Login error response:', errorText);
        throw new Error(`Login failed: ${res.status} ${res.statusText} - ${errorText}`);
      }
      const json = await res.json()
      localStorage.setItem('auth_token', json.token)
      if (json.user) {
        localStorage.setItem('user', JSON.stringify(json.user));
      }
      
      // Trigger auth state change event
      window.dispatchEvent(new CustomEvent('authStateChanged'));
      
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Connection failed - check if backend is running');
      } else {
        setError(err.message ?? 'Login failed');
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
  className="min-h-[100dvh] flex items-center justify-center bg-slate-50"
    >
  <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-red-600 rounded-lg flex items-center justify-center mb-2">
            <span className="text-white text-2xl font-bold">S</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Spice Express</h1>
          <div className="text-gray-500 text-base font-medium mb-2">Sign in to your account</div>
        </div>
        <form onSubmit={onSubmit} className="w-full space-y-6">
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
              placeholder="Password"
              required
            />
          </div>
          {error && <div className={error.includes('success') ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>{error}</div>}
          <button
            className="w-full py-3 rounded-lg bg-red-500 text-white font-semibold text-lg hover:bg-red-600 transition disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </motion.div>
  )
}


