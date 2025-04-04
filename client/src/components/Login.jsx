"use client"

import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginUser } from '../services/service'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/firebase'
import { motion } from 'framer-motion'
import { Shield, XCircle, ArrowRight } from 'lucide-react'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const canvasRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Particle animation similar to home page
    const canvas = canvasRef.current
    if (!canvas) return
    // ... Include the same particle animation code from home.jsx here ...

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true)
        navigate('/dashboard')
      } else {
        setIsAuthenticated(false)
      }
    })

    return () => {
      unsubscribe()
      // Clean up canvas animation
    }
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }

    try {
      const data = await loginUser(email, password)
      localStorage.setItem('authToken', data.token)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    }
  }

  if (isAuthenticated) return null

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#003366] to-[#001a33]">
      {/* Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 pt-20">
        <motion.div 
          className="w-full max-w-md backdrop-blur-lg bg-white/5 p-8 rounded-2xl border border-white/10 shadow-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col items-center mb-8">
            <motion.div
              className="p-3 rounded-full bg-white/5 mb-4"
              whileHover={{ scale: 1.05 }}
            >
              <Shield className="h-12 w-12 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-white/80">Sign in to your account</p>
          </div>

          {error && (
            <motion.div
              className="flex items-center gap-2 mb-4 p-3 bg-red-500/20 rounded-lg text-red-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <XCircle className="h-5 w-5" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-white placeholder-white/30"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-white placeholder-white/30"
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="flex items-center justify-between">
              <Link
                to="/forgot-password"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Forgot password?
              </Link>
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-blue-500 hover:bg-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              Sign In
              <ArrowRight className="h-4 w-4" />
            </motion.button>

            <p className="text-center text-white/70 text-sm mt-6">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Register
              </Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

export default Login