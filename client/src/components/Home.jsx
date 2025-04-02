import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from 'react-router-dom';
import { Shield, LogOut } from "lucide-react";
import { auth } from '../firebase/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication status using Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    const setCanvasDimensions = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    setCanvasDimensions();
    window.addEventListener("resize", setCanvasDimensions);

    // Particle settings
    const particlesArray = [];
    const numberOfParticles = 50;

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 5 + 1;
        this.speedX = Math.random() * 1 - 0.5;
        this.speedY = Math.random() * 1 - 0.5;
        this.color = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width) this.x = 0;
        else if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        else if (this.y < 0) this.y = canvas.height;
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Create particles
    const init = () => {
      for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
      }
    };

    // Animation loop
    const animate = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
      }

      // Connect particles with lines
      connectParticles();

      requestAnimationFrame(animate);
    };

    // Connect nearby particles with lines
    const connectParticles = () => {
      if (!ctx) return;
      const maxDistance = 100;

      for (let a = 0; a < particlesArray.length; a++) {
        for (let b = a; b < particlesArray.length; b++) {
          const dx = particlesArray[a].x - particlesArray[b].x;
          const dy = particlesArray[a].y - particlesArray[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            const opacity = 1 - distance / maxDistance;
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.2})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }
      }
    };

    init();
    animate();

    return () => {
      window.removeEventListener("resize", setCanvasDimensions);
      unsubscribe(); // Clean up the auth listener
    };
  }, [navigate]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('authToken');
      navigate('/login');
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <div className="relative h-screen overflow-hidden bg-gradient-to-br from-blue-600 to-blue-400">
      {/* Navigation - 60% width with reduced height and padding */}
      <div className="flex justify-center mt-3">
        <nav className="w-3/5 flex justify-between items-center px-5 py-2 bg-white/10 backdrop-blur-lg rounded-2xl text-white  z-20">
          {/* Brand/Logo on left */}
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-white" />
            <span className="text-lg font-bold">SecureRights</span>
          </div>
          
          {/* Login/Dashboard/Logout buttons on right */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link 
                to="/dashboard" 
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium cursor-pointer"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
                Logout
              </button>
            </div>
          ) : (
            <Link 
              to="/login" 
              className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm font-medium cursor-pointer"
            >
              Login
            </Link>
          )}
        </nav>
      </div>

      {/* Background animation canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center h-screen">
        <div className="max-w-3xl px-6 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-3 rounded-full bg-white/10 backdrop-blur-sm">
              <Shield className="h-12 w-12 text-white" />
            </div>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl mb-4">SecureRights</h1>

          <p className="text-xl text-white/80 mb-8 max-w-lg mx-auto">
          afeguard, distribute, and manage digital content with advanced DRM, AI-powered insights, and seamless access for libraries and publishers.
          </p>

          {/* Stats cards */}
          <div className="mt-12 grid grid-cols-3 gap-8 text-white">
            <div className="flex flex-col items-center backdrop-blur-sm bg-white/10 p-4 rounded-xl">
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm text-white/70">Security Coverage</div>
            </div>
            <div className="flex flex-col items-center backdrop-blur-sm bg-white/10 p-4 rounded-xl">
              <div className="text-3xl font-bold">24/7</div>
              <div className="text-sm text-white/70">Monitoring</div>
            </div>
            <div className="flex flex-col items-center backdrop-blur-sm bg-white/10 p-4 rounded-xl">
              <div className="text-3xl font-bold">99.9%</div>
              <div className="text-sm text-white/70">Uptime</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}