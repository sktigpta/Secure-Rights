"use client"

import { useEffect, useRef, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Shield, LogOut, ArrowRight, CheckCircle, XCircle, BookOpen, Lock, Database, BarChart4 } from "lucide-react"
import { auth } from "../firebase/firebase"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { motion, useScroll, useTransform } from "framer-motion"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const canvasRef = useRef(null)
  const scrollRef = useRef(null)
  const navigate = useNavigate()

  // Scroll animation
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start start", "end start"],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9])

  useEffect(() => {
    // Check authentication status using Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
      }
      setIsLoaded(true)
    })

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const setCanvasDimensions = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    setCanvasDimensions()
    window.addEventListener("resize", setCanvasDimensions)

    // Particle settings
    const particlesArray = []
    const numberOfParticles = 50

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.size = Math.random() * 5 + 1
        this.speedX = Math.random() * 1 - 0.5
        this.speedY = Math.random() * 1 - 0.5
        this.color = `rgba(255, 255, 255, ${Math.random() * 0.3})`
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY

        if (this.x > canvas.width) this.x = 0
        else if (this.x < 0) this.x = canvas.width
        if (this.y > canvas.height) this.y = 0
        else if (this.y < 0) this.y = canvas.height
      }

      draw() {
        if (!ctx) return
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Create particles
    const init = () => {
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle())
      }
    }

    // Animation loop
    const animate = () => {
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update()
        particlesArray[i].draw()
      }

      // Connect particles with lines
      connectParticles()

      requestAnimationFrame(animate)
    }

    // Connect nearby particles with lines
    const connectParticles = () => {
      if (!ctx) return
      const maxDistance = 100

      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          const dx = particlesArray[a].x - particlesArray[b].x
          const dy = particlesArray[a].y - particlesArray[b].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < maxDistance) {
            const opacity = 1 - distance / maxDistance
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.2})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y)
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y)
            ctx.stroke()
          }
        }
      }
    }

    init()
    animate()

    return () => {
      window.removeEventListener("resize", setCanvasDimensions)
      unsubscribe() // Clean up the auth listener
    }
  }, [navigate])

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth)
      localStorage.removeItem("authToken")
      navigate("/login")
    } catch (error) {
      console.error("Logout Error:", error)
    }
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 },
    },
  }

  const featureCardVariants = {
    offscreen: { y: 50, opacity: 0 },
    onscreen: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 15 },
    },
  }

  return (
    <div className="relative bg-gradient-to-br from-[#003366] to-[#001a33]" ref={scrollRef}>
      {/* Fixed Navigation Bar */}
      <div className="fixed top-0 w-full z-50 px-0">
        <nav className="w-full lg:container mx-auto flex justify-between items-center px-4 py-3 bg-white/10 backdrop-blur-md text-white border-b lg:border lg:mt-3 lg:rounded-2xl border-white/10">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-white" />
            <span className="text-lg font-bold">SecureRights</span>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-2 md:gap-3">
              {/* Hide Dashboard on mobile */}
              <Link
                to="/dashboard"
                className="hidden md:inline-block px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
              >
                Dashboard
              </Link>
              {/* Logout - Icon only on mobile */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-2 md:px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/20 transition-colors text-sm"
              >
                <LogOut className="h-3 w-3" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
            >
              Login
            </Link>
          )}
        </nav>
      </div>

      {/* First Section - Hero */}
      <div className="relative min-h-screen pt-16">
        {/* Background animation canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* Animated orbs in background */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-[10%] right-[15%] w-64 h-64 rounded-full bg-blue-400/10 blur-3xl"
            animate={{
              x: [0, 30, 0],
              y: [0, -30, 0],
            }}
            transition={{
              duration: 8,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
          <motion.div
            className="absolute bottom-[20%] left-[10%] w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl"
            animate={{
              x: [0, -20, 0],
              y: [0, 20, 0],
            }}
            transition={{
              duration: 10,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
        </div>

        {/* Hero Content */}
        <motion.div className="relative z-10 flex items-center justify-center min-h-screen px-4 pt-10" style={{ opacity, scale }}>
          <div className="max-w-3xl px-4 md:px-6 text-center">
            {/* Logo/Shield */}
            <div className="flex justify-center mb-6">
              <div className="p-3 rounded-full bg-white/5 backdrop-blur">
                <motion.div
                  className="h-12 w-12 text-white"
                  whileHover={{
                    x: [0, -5, 5, -5, 5, 0],
                    transition: { duration: 0.3 },
                  }}
                >
                  <Shield className="h-12 w-12 text-white" />
                </motion.div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4">SecureRights</h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-lg mx-auto">
              Safeguard, distribute, and manage digital content with advanced DRM, AI-powered insights, and seamless
              access for libraries and publishers.
            </p>

            {/* CTA Button */}
            <motion.div
              className="flex justify-center gap-4 mb-8"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to={isAuthenticated ? "/dashboard" : "/login"}
                className="relative overflow-hidden flex items-center bg-white text-blue-600 hover:bg-white/90 px-6 py-2.5 rounded-full font-medium"
              >
                {isAuthenticated ? "Go to Dashboard" : "Get Started"}
                <ArrowRight className="ml-2 h-4 w-4" />
                <motion.div
                  className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-blue-100/30 to-transparent"
                  animate={{
                    x: ["-100%", "100%"],
                  }}
                  transition={{
                    repeat: Number.POSITIVE_INFINITY,
                    duration: 1.5,
                    ease: "linear",
                  }}
                />
              </Link>
            </motion.div>

            {/* Dashboard Button (Mobile Only) */}
            {isAuthenticated && (
              <div className="md:hidden mb-6">
                <Link
                  to="/dashboard"
                  className="text-white/80 inline-block px-6 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/20 hover:bg-white/30 transition-colors text-sm font-medium"
                >
                  Dashboard
                </Link>
              </div>
            )}

            {/* Stats Cards */}
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 text-white">
              {[
                { value: "100%", label: "Security Coverage" },
                { value: "24/7", label: "Monitoring" },
                { value: "99.9%", label: "Uptime" },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  className="flex flex-col items-center backdrop-blur bg-white/3 p-4 rounded-xl transition-all duration-300 hover:bg-white/10 hover:scale-105"
                  whileHover={{ scale: 1.05 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <div className="text-2xl md:text-3xl font-bold">{item.value}</div>
                  <div className="text-sm text-white/70">{item.label}</div>
                </motion.div>
              ))}
            </div>

            {/* Scroll indicator */}
            <motion.div
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center text-white/60"
              animate={{
                y: [0, 10, 0],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "loop",
              }}
            >
              <p className="text-sm mb-2">Scroll to explore</p>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 5V19M12 19L19 12M12 19L5 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Second Section - Features (now with consistent background) */}
      <div className="relative min-h-screen py-20">
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-[60%] right-[10%] w-96 h-96 rounded-full bg-blue-400/5 blur-3xl"
            animate={{
              x: [0, -30, 0],
              y: [0, 30, 0],
            }}
            transition={{
              duration: 12,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
          <motion.div
            className="absolute top-[20%] left-[5%] w-80 h-80 rounded-full bg-cyan-400/5 blur-3xl"
            animate={{
              x: [0, 20, 0],
              y: [0, -20, 0],
            }}
            transition={{
              duration: 15,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
          />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Section Title */}
          <motion.div
            className="text-center mb-12 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4">Advanced Features</h2>
            <p className="text-white/70 max-w-2xl mx-auto text-base md:text-lg">
              Discover how SecureRights transforms content protection and distribution with cutting-edge technology
            </p>
          </motion.div>

          {/* AI Comparison */}
          <motion.div
            className="mb-16 md:mb-20 backdrop-blur-md bg-white/5 p-4 md:p-8 rounded-2xl border border-white/10 shadow-xl max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-xl md:text-2xl font-bold text-white mb-6 text-center">AI-Powered Protection</h3>

            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <div className="relative">
                  <div className="flex gap-4 justify-center md:justify-start">
                    {/* Left comparison frame */}
                    <motion.div
                      className="relative w-32 md:w-40 h-28 md:h-32 bg-gradient-to-br from-blue-800/40 to-blue-600/40 rounded-lg backdrop-blur-md border border-white/10 overflow-hidden flex flex-col items-center justify-center p-2"
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="absolute top-2 left-2 right-2 h-1 bg-white/20 rounded-full">
                        <motion.div
                          className="w-1/3 h-full bg-red-400 rounded-full"
                          animate={{ width: ["30%", "40%", "25%", "35%"] }}
                          transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                        />
                      </div>

                      <div className="flex items-center justify-center mb-1  mt-5">
                        <XCircle className="h-5 w-5 md:h-6 md:w-6 text-red-400 mr-1" />
                        <span className="text-xs text-white/90 font-medium">Vulnerable</span>
                      </div>

                      <svg viewBox="0 0 100 100" width="40" height="40" className="text-white/70 md:w-50 md:h-50 ">
                        <motion.circle
                          cx="50"
                          cy="30"
                          r="20"
                          fill="currentColor"
                          opacity="0.5"
                          animate={{ opacity: [0.3, 0.5, 0.3] }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                        />
                        <motion.rect
                          x="20"
                          y="60"
                          width="60"
                          height="10"
                          rx="2"
                          fill="currentColor"
                          opacity="0.7"
                          animate={{ opacity: [0.5, 0.7, 0.5] }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 0.3 }}
                        />
                        <motion.rect
                          x="30"
                          y="75"
                          width="40"
                          height="5"
                          rx="2"
                          fill="currentColor"
                          opacity="0.4"
                          animate={{ opacity: [0.2, 0.4, 0.2] }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 0.6 }}
                        />
                        <motion.circle
                          cx="20"
                          cy="20"
                          r="4"
                          fill="#ff6b6b"
                          animate={{ opacity: [0.6, 1, 0.6], r: [3, 4, 3] }}
                          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                        />
                        <motion.circle
                          cx="80"
                          cy="20"
                          r="4"
                          fill="#ff6b6b"
                          animate={{ opacity: [0.6, 1, 0.6], r: [3, 4, 3] }}
                          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.5 }}
                        />
                      </svg>

                      <div className="text-xs text-white/80 mt-1 text-center">Traditional</div>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-400/50"></div>
                    </motion.div>

                    {/* Right comparison frame */}
                    <motion.div
                      className="relative w-32 md:w-40 h-28 md:h-32 bg-gradient-to-br from-blue-500/40 to-cyan-400/40 rounded-lg backdrop-blur-md border border-white/20 overflow-hidden flex flex-col items-center justify-center p-2"
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="absolute top-2 left-2 right-2 h-1 bg-white/20 rounded-full">
                        <motion.div
                          className="w-4/5 h-full bg-green-400 rounded-full"
                          animate={{ width: ["75%", "85%", "80%", "90%"] }}
                          transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                        />
                      </div>

                      <div className="flex items-center justify-center mb-1 mt-5">
                        <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-green-400 mr-1" />
                        <span className="text-xs text-white/90 font-medium">Protected</span>
                      </div>

                      <svg viewBox="0 0 100 100" width="40" height="40" className="text-white md:w-50 md:h-50">
                        <motion.circle
                          cx="50"
                          cy="30"
                          r="20"
                          fill="currentColor"
                          opacity="0.8"
                          animate={{ opacity: [0.7, 0.9, 0.7] }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                        />
                        <motion.rect
                          x="20"
                          y="60"
                          width="60"
                          height="10"
                          rx="2"
                          fill="currentColor"
                          opacity="0.9"
                          animate={{ opacity: [0.8, 1, 0.8] }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 0.3 }}
                        />
                        <motion.rect
                          x="30"
                          y="75"
                          width="40"
                          height="5"
                          rx="2"
                          fill="currentColor"
                          opacity="0.7"
                          animate={{ opacity: [0.6, 0.8, 0.6] }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: 0.6 }}
                        />
                        <motion.circle
                          cx="20"
                          cy="20"
                          r="4"
                          fill="#4ade80"
                          animate={{ opacity: [0.7, 1, 0.7], r: [3, 4, 3] }}
                          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                        />
                        <motion.circle
                          cx="80"
                          cy="20"
                          r="4"
                          fill="#4ade80"
                          animate={{ opacity: [0.7, 1, 0.7], r: [3, 4, 3] }}
                          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.5 }}
                        />
                      </svg>

                      <div className="text-xs text-white/90 mt-1 text-center">SecureRights AI</div>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-400/50"></div>
                    </motion.div>
                  </div>

                  {/* Animated dots between frames */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1">
                    <motion.div
                      className="w-1.5 h-1.5 bg-white rounded-full"
                      animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0 }}
                    />
                    <motion.div
                      className="w-1.5 h-1.5 bg-white rounded-full"
                      animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 0.5 }}
                    />
                    <motion.div
                      className="w-1.5 h-1.5 bg-white rounded-full"
                      animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, delay: 1 }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 text-white">
                <h4 className="text-lg md:text-xl font-semibold mb-3">Intelligent Content Protection</h4>
                <p className="text-white/80 mb-4 text-sm md:text-base">
                  Our AI-powered system continuously monitors and adapts to new threats, providing real-time protection
                  against unauthorized access and distribution.
                </p>
                <ul className="space-y-2">
                  {[
                    "Advanced pattern recognition detects potential breaches",
                    "Self-learning algorithms improve over time",
                    "Automated threat response without human intervention",
                    "Comprehensive audit trails for compliance",
                  ].map((item, index) => (
                    <motion.li
                      key={index}
                      className="flex items-start text-sm md:text-base"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-white/80">{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 mb-16">
            {[
              {
                icon: <BookOpen className="h-6 w-6 md:h-8 md:w-8" />,
                title: "Digital Rights Management",
                description:
                  "Comprehensive DRM solutions that protect content while ensuring seamless access for authorized users.",
                color: "from-blue-500/20 to-blue-600/20",
              },
              {
                icon: <Lock className="h-6 w-6 md:h-8 md:w-8" />,
                title: "Secure Distribution",
                description: "End-to-end encrypted content delivery with granular access controls and usage policies.",
                color: "from-blue-500/20 to-blue-600/20",
              },
              {
                icon: <Database className="h-6 w-6 md:h-8 md:w-8" />,
                title: "Content Repository",
                description: "Centralized storage with version control, metadata management, and content organization.",
                color: "from-blue-500/20 to-blue-600/20",
              },
              {
                icon: <BarChart4 className="h-6 w-6 md:h-8 md:w-8" />,
                title: "Analytics Dashboard",
                description: "Comprehensive insights into content usage, user behavior, and security metrics.",
                color: "from-blue-500/20 to-blue-600/20",
              },
              {
                icon: <Shield className="h-6 w-6 md:h-8 md:w-8" />,
                title: "Compliance Management",
                description: "Tools to ensure adherence to industry regulations and copyright laws.",
                color: "from-blue-500/20 to-blue-600/20",
              },
              {
                icon: <ArrowRight className="h-6 w-6 md:h-8 md:w-8" />,
                title: "API Integration",
                description: "Seamless integration with existing systems through our comprehensive API.",
                color: "from-blue-500/20 to-blue-600/20",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="backdrop-blur-md bg-gradient-to-br from-blue-500/20 to-blue-600/20 p-4 md:p-6 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300"
                variants={featureCardVariants}
                initial="offscreen"
                whileInView="onscreen"
                viewport={{ once: true, amount: 0.3 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <div className="bg-white/10 rounded-full w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mb-4 text-white">
                  {feature.icon}
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-white/70 text-sm md:text-base">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          {/* CTA Section */}
          <motion.div
            className="text-center py-8 md:py-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-xl md:text-2xl font-bold text-white mb-4">Ready to secure your digital content?</h3>
            <p className="text-white/70 mb-6 max-w-lg mx-auto">
              Join libraries and publishers worldwide who trust SecureRights for their content protection needs.
            </p>
            <Link
              to={isAuthenticated ? "/dashboard" : "/register"}
              className="inline-flex items-center bg-white text-blue-600 hover:bg-white/90 px-6 py-3 rounded-full font-medium"
            >
              {isAuthenticated ? "Access Dashboard" : "Start Free Trial"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative bg-blue-900/30 backdrop-blur-md border-t border-white/10 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <Shield className="h-5 w-5 text-white/80 mr-2" />
              <span className="text-white/90 font-medium">SecureRights</span>
            </div>
            <div className="text-white/60 text-sm">
              © {new Date().getFullYear()} SecureRights. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}