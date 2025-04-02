import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Shield } from "lucide-react";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthenticationStatus = () => {
      const user = localStorage.getItem("user");
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };

    checkAuthenticationStatus();

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
    };
  }, []);

  // Handle "Get Started" button click
  const handleGetStartedClick = () => {
    if (isAuthenticated) {
      navigate("/dashboard"); // Redirect to dashboard if authenticated
    } else {
      navigate("/register"); // Redirect to register page if not authenticated
    }
  };

  return (
    <div className="relative h-screen overflow-hidden bg-gradient-to-br from-blue-600 to-blue-400">
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
            Protect and manage your digital content rights with our advanced security platform.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={handleGetStartedClick}
              className="bg-white text-blue-600 hover:bg-white/90 px-6 py-3 rounded-lg text-lg flex items-center backdrop-blur-sm"
            >
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </button>
            <button className="border-white text-white hover:bg-white/10 px-6 py-3 rounded-lg text-lg backdrop-blur-sm">
              Learn More
            </button>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-8 text-white">
            <div className="flex flex-col items-center backdrop-blur-sm p-4">
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm text-white/70">Security Coverage</div>
            </div>
            <div className="flex flex-col items-center backdrop-blur-sm p-4">
              <div className="text-3xl font-bold">24/7</div>
              <div className="text-sm text-white/70">Monitoring</div>
            </div>
            <div className="flex flex-col items-center backdrop-blur-sm p-4">
              <div className="text-3xl font-bold">99.9%</div>
              <div className="text-sm text-white/70">Uptime</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
