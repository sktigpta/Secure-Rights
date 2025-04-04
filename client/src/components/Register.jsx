"use client"

import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerUser } from '../services/service'
import { motion } from 'framer-motion'
import { Shield, XCircle, ArrowRight } from 'lucide-react'

function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const canvasRef = useRef(null)
  const navigate = useNavigate()

  // Add particle animation from home.jsx here
  useEffect(() => {
    // Particle animation code from home component
    // ...
  }, [])

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !password || !fullName) {
      setError('Please fill in all required fields.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    try {
      const data = await registerUser(email, password, fullName)
      navigate('/login')
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#003366] to-[#001a33]">
      {/* Particle Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Changed container structure */}
      <div className="relative z-10 min-h-screen flex flex-col items-center px-4 py-8">
        <motion.div
          className="w-full max-w-md backdrop-blur-lg bg-white/5 p-8 rounded-2xl border border-white/10 shadow-xl mt-12 mb-8"
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
            <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-white/80">Get started with SecureRights</p>
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

          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-white placeholder-white/30"
                placeholder="Nitin Kumar"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-white placeholder-white/30"
                placeholder="email@example.com"
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
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/50 text-white placeholder-white/30"
                placeholder="••••••••"
                required
              />
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-blue-500 hover:bg-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              Create Account
              <ArrowRight className="h-4 w-4" />
            </motion.button>

            <p className="text-center text-white/70 text-sm mt-6">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Log in
              </Link>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

export default Register