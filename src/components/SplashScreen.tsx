import logoImage from "@/assets/neurohire-logo.png";

interface SplashScreenProps {
  onGetStarted: () => void;
}

export function SplashScreen({ onGetStarted }: SplashScreenProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FF13F0] via-purple-900 to-black animate-gradient-flow"></div>
      
      {/* AI-Inspired Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 10}s`,
            }}
          />
        ))}
        
        {/* Animated Neural Network Graph */}
        <svg className="absolute inset-0 w-full h-full opacity-10">
          <defs>
            <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF13F0" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {/* Create interconnected nodes */}
          {[
            { x: 20, y: 30 }, { x: 40, y: 20 }, { x: 60, y: 35 }, { x: 80, y: 25 },
            { x: 15, y: 50 }, { x: 35, y: 60 }, { x: 65, y: 55 }, { x: 85, y: 65 },
            { x: 25, y: 80 }, { x: 50, y: 75 }, { x: 75, y: 85 }
          ].map((node, i) => (
            <g key={`neural-${i}`}>
              {/* Connections to other nodes */}
              {i > 0 && (
                <>
                  <line
                    x1={`${node.x}%`}
                    y1={`${node.y}%`}
                    x2={`${[20, 40, 60, 80, 15, 35, 65, 85, 25, 50, 75][Math.max(0, i - 1)]}%`}
                    y2={`${[30, 20, 35, 25, 50, 60, 55, 65, 80, 75, 85][Math.max(0, i - 1)]}%`}
                    stroke="url(#neuralGradient)"
                    strokeWidth="1"
                    className="animate-pulse-slow"
                    style={{ animationDelay: `${i * 0.3}s` }}
                  />
                  {i < 7 && (
                    <line
                      x1={`${node.x}%`}
                      y1={`${node.y}%`}
                      x2={`${[20, 40, 60, 80, 15, 35, 65, 85, 25, 50, 75][i + 2]}%`}
                      y2={`${[30, 20, 35, 25, 50, 60, 55, 65, 80, 75, 85][i + 2]}%`}
                      stroke="url(#neuralGradient)"
                      strokeWidth="0.5"
                      className="animate-pulse-slow"
                      style={{ animationDelay: `${i * 0.5}s` }}
                    />
                  )}
                </>
              )}
              {/* Node circles */}
              <circle 
                cx={`${node.x}%`} 
                cy={`${node.y}%`} 
                r="3" 
                fill="#FF13F0" 
                opacity="0.4"
                className="animate-pulse-node"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            </g>
          ))}
        </svg>
        
        {/* Resume/Document Icons - Recruitment Theme */}
        {[...Array(6)].map((_, i) => (
          <div
            key={`resume-${i}`}
            className="absolute animate-float-slow"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 7}s`,
              animationDuration: `${14 + Math.random() * 8}s`,
            }}
          >
            <svg width="20" height="24" viewBox="0 0 20 24" fill="none" className="opacity-10">
              <rect x="2" y="2" width="16" height="20" stroke="white" strokeWidth="2" rx="1"/>
              <line x1="5" y1="7" x2="15" y2="7" stroke="white" strokeWidth="1.5"/>
              <line x1="5" y1="11" x2="12" y2="11" stroke="white" strokeWidth="1.5"/>
              <line x1="5" y1="15" x2="13" y2="15" stroke="white" strokeWidth="1.5"/>
            </svg>
          </div>
        ))}
        
        {/* Briefcase Icons - Hiring Theme */}
        {[...Array(5)].map((_, i) => (
          <div
            key={`briefcase-${i}`}
            className="absolute animate-float-profile"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${13 + Math.random() * 7}s`,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="opacity-10">
              <rect x="3" y="8" width="18" height="12" rx="2" stroke="white" strokeWidth="2"/>
              <path d="M8 8V6C8 4.89543 8.89543 4 10 4H14C15.1046 4 16 4.89543 16 6V8" stroke="white" strokeWidth="2"/>
              <line x1="3" y1="12" x2="21" y2="12" stroke="white" strokeWidth="1.5"/>
            </svg>
          </div>
        ))}
        
        {/* Floating User/Profile Icons - Recruitment Theme */}
        {[...Array(8)].map((_, i) => (
          <div
            key={`profile-${i}`}
            className="absolute animate-float-profile"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${12 + Math.random() * 8}s`,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="opacity-10">
              <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="2"/>
              <path d="M6 21C6 17.686 8.686 15 12 15C15.314 15 18 17.686 18 21" stroke="white" strokeWidth="2"/>
            </svg>
          </div>
        ))}
        
        {/* Checkmark Icons - Hiring/Selection Theme */}
        {[...Array(6)].map((_, i) => (
          <div
            key={`check-${i}`}
            className="absolute animate-float-slow"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="opacity-10">
              <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ))}
        
        {/* AI Brain/Neural Nodes */}
        {[...Array(15)].map((_, i) => (
          <div
            key={`node-${i}`}
            className="absolute w-2 h-2 rounded-full bg-[#FF13F0]/20 animate-pulse-node"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
        
        {/* Circuit Board Lines - AI/Tech Theme */}
        <svg className="absolute inset-0 w-full h-full opacity-5">
          <defs>
            <linearGradient id="circuitGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF13F0" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          {/* Horizontal circuit lines */}
          {[...Array(4)].map((_, i) => (
            <g key={`circuit-h-${i}`}>
              <line
                x1="0%"
                y1={`${(i + 1) * 20}%`}
                x2="100%"
                y2={`${(i + 1) * 20}%`}
                stroke="url(#circuitGradient)"
                strokeWidth="0.5"
                strokeDasharray="4 8"
                className="animate-circuit-h"
                style={{ animationDelay: `${i * 0.5}s` }}
              />
              <circle cx={`${(i + 1) * 15}%`} cy={`${(i + 1) * 20}%`} r="2" fill="#FF13F0" opacity="0.3" />
            </g>
          ))}
          {/* Vertical circuit lines */}
          {[...Array(4)].map((_, i) => (
            <g key={`circuit-v-${i}`}>
              <line
                x1={`${(i + 1) * 20}%`}
                y1="0%"
                x2={`${(i + 1) * 20}%`}
                y2="100%"
                stroke="url(#circuitGradient)"
                strokeWidth="0.5"
                strokeDasharray="4 8"
                className="animate-circuit-v"
                style={{ animationDelay: `${i * 0.7}s` }}
              />
            </g>
          ))}
        </svg>
        
        {/* Neural Network Lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF13F0" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          {[...Array(8)].map((_, i) => (
            <line
              key={i}
              x1={`${Math.random() * 100}%`}
              y1={`${Math.random() * 100}%`}
              x2={`${Math.random() * 100}%`}
              y2={`${Math.random() * 100}%`}
              stroke="url(#lineGradient)"
              strokeWidth="1"
              className="animate-pulse-slow"
              style={{ animationDelay: `${i * 0.5}s` }}
            />
          ))}
        </svg>
        
        {/* Flowing Waves */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FF13F0] to-transparent animate-wave-1"></div>
          <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-white to-transparent animate-wave-2"></div>
          <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FF13F0] to-transparent animate-wave-3"></div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center gap-12 px-8">
        {/* Logo */}
        <img 
          src={logoImage} 
          alt="neurohire" 
          className="w-80 md:w-96 lg:w-[32rem] h-auto"
        />
        
        {/* Get Started Button */}
        <button
          onClick={onGetStarted}
          className="px-12 py-4 bg-white text-black rounded-full text-lg font-medium hover:scale-105 hover:shadow-2xl transition-all duration-300 animate-pulse-button"
        >
          Get Started
        </button>
      </div>
      
      {/* Custom Animations in Style Tag */}
      <style>{`
        @keyframes gradient-flow {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.2;
          }
          50% {
            transform: translate(20px, -20px) scale(1.5);
            opacity: 0.5;
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.3;
          }
        }
        
        @keyframes wave-1 {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes wave-2 {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        
        @keyframes wave-3 {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(150%);
          }
        }
        
        @keyframes pulse-button {
          0%, 100% {
            box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
          }
          50% {
            box-shadow: 0 0 40px rgba(255, 255, 255, 0.6);
          }
        }
        
        @keyframes binary-fall {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
        
        @keyframes float-profile {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.2;
          }
          50% {
            transform: translate(10px, -10px) scale(1.2);
            opacity: 0.5;
          }
        }
        
        @keyframes pulse-node {
          0%, 100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.3;
          }
        }
        
        @keyframes circuit-h {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes circuit-v {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }
        
        .animate-gradient-flow {
          background-size: 200% 200%;
          animation: gradient-flow 15s ease infinite;
        }
        
        .animate-float {
          animation: float linear infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        
        .animate-wave-1 {
          animation: wave-1 8s linear infinite;
        }
        
        .animate-wave-2 {
          animation: wave-2 10s linear infinite;
        }
        
        .animate-wave-3 {
          animation: wave-3 12s linear infinite;
        }
        
        .animate-pulse-button {
          animation: pulse-button 2s ease-in-out infinite;
        }
        
        .animate-binary-fall {
          animation: binary-fall 10s linear infinite;
        }
        
        .animate-float-profile {
          animation: float-profile linear infinite;
        }
        
        .animate-float-slow {
          animation: float linear infinite;
        }
        
        .animate-pulse-node {
          animation: pulse-node 3s ease-in-out infinite;
        }
        
        .animate-circuit-h {
          animation: circuit-h 8s linear infinite;
        }
        
        .animate-circuit-v {
          animation: circuit-v 10s linear infinite;
        }
      `}</style>
    </div>
  );
}