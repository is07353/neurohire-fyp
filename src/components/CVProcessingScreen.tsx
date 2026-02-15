import { useEffect, useState, useRef } from 'react';
import { Language } from '../App';

const API_BASE =
  (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ??
  'http://127.0.0.1:8000';

interface CVProcessingScreenProps {
  language: Language;
  onComplete: () => void;
}

const statusMessages = {
  english: [
    'Analyzing your CV',
    'Extracting information from your CV',
    'Matching your profile with job requirements',
    'Hold tight, this won\'t take long',
  ],
  urdu: [
    'آپ کی سی وی کا تجزیہ کیا جا رہا ہے',
    'آپ کی سی وی سے معلومات نکالی جا رہی ہیں',
    'آپ کی پروفائل کو ملازمت کی ضروریات سے ملایا جا رہا ہے',
    'ذرا صبر کریں، یہ زیادہ وقت نہیں لے گا',
  ],
};

const POLL_INTERVAL_MS = 2000;
const MAX_WAIT_MS = 120000; // 2 minutes fallback

export function CVProcessingScreen({ language, onComplete }: CVProcessingScreenProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const messages = statusMessages[language || 'english'];
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);

    const startTime = Date.now();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function poll() {
      if (completedRef.current) return;
      if (Date.now() - startTime > MAX_WAIT_MS) {
        completedRef.current = true;
        onCompleteRef.current();
        return;
      }
      fetch(`${API_BASE}/candidate/analysis-status`)
        .then((res) => res.json())
        .then((data) => {
          if (completedRef.current) return;
          if (data.pending === false || data.pending === 'false') {
            completedRef.current = true;
            onCompleteRef.current();
            return;
          }
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
        })
        .catch(() => {
          if (completedRef.current) return;
          timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
        });
    }

    poll();

    return () => {
      completedRef.current = true;
      clearInterval(messageInterval);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
    // Run once on mount; use refs for onComplete so parent re-renders don't tear down the effect
  }, [messages.length]);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-animation">
        <div className="absolute inset-0 animate-gradient-shift" style={{
          background: 'linear-gradient(135deg, #FF13F0 0%, #9333EA 50%, #000000 100%)',
          backgroundSize: '200% 200%',
        }} />
      </div>

      {/* Abstract AI Background Animations */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        {/* Floating nodes/particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute rounded-full bg-white animate-float-particle"
            style={{
              width: `${Math.random() * 8 + 4}px`,
              height: `${Math.random() * 8 + 4}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 10 + 10}s`,
            }}
          />
        ))}

        {/* Neural network lines */}
        <svg className="absolute inset-0 w-full h-full">
          {[...Array(8)].map((_, i) => (
            <line
              key={`line-${i}`}
              x1={`${Math.random() * 100}%`}
              y1={`${Math.random() * 100}%`}
              x2={`${Math.random() * 100}%`}
              y2={`${Math.random() * 100}%`}
              stroke="white"
              strokeWidth="1"
              className="animate-pulse-line"
              style={{
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </svg>

        {/* Flowing waves */}
        <div className="absolute inset-0">
          {[...Array(3)].map((_, i) => (
            <div
              key={`wave-${i}`}
              className="absolute w-full h-px bg-gradient-to-r from-transparent via-white to-transparent animate-flow-wave"
              style={{
                top: `${25 * (i + 1)}%`,
                animationDelay: `${i * 1.5}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6">
        {/* Animated Loading Element */}
        <div className="mb-12">
          {/* Outer pulsing ring */}
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-pulse-ring" />
            <div className="absolute inset-2 rounded-full border-4 border-white/50 animate-pulse-ring-delayed" />
            
            {/* Inner spinning loader */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-transparent border-t-white border-r-white animate-spin" />
            </div>

            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-white animate-pulse" />
            </div>
          </div>
        </div>

        {/* Dynamic Status Text */}
        <div className="h-16 flex items-center justify-center">
          <p
            key={currentMessageIndex}
            className="text-white text-2xl font-medium text-center animate-fade-in-text max-w-2xl"
          >
            {messages[currentMessageIndex]}
          </p>
        </div>
      </div>

      {/* Custom Animations */}
      <style>{`
        @keyframes gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes float-particle {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.3;
          }
          25% {
            transform: translate(20px, -30px) scale(1.2);
            opacity: 0.6;
          }
          50% {
            transform: translate(-10px, -50px) scale(0.8);
            opacity: 0.4;
          }
          75% {
            transform: translate(-30px, -20px) scale(1.1);
            opacity: 0.7;
          }
        }

        @keyframes pulse-line {
          0%, 100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.4;
          }
        }

        @keyframes flow-wave {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        @keyframes pulse-ring {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.3;
          }
        }

        @keyframes pulse-ring-delayed {
          0%, 100% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.4;
          }
        }

        @keyframes fade-in-text {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-gradient-shift {
          animation: gradient-shift 8s ease infinite;
        }

        .animate-float-particle {
          animation: float-particle linear infinite;
        }

        .animate-pulse-line {
          animation: pulse-line 3s ease-in-out infinite;
        }

        .animate-flow-wave {
          animation: flow-wave 6s ease-in-out infinite;
        }

        .animate-pulse-ring {
          animation: pulse-ring 2s ease-in-out infinite;
        }

        .animate-pulse-ring-delayed {
          animation: pulse-ring-delayed 2s ease-in-out infinite 0.3s;
        }

        .animate-fade-in-text {
          animation: fade-in-text 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
