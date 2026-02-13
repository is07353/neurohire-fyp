import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

interface RecruiterLoginProps {
  onLogin: (name: string, recruiterId?: number) => void;
  onBack: () => void;
  onSignUp?: () => void;
  title?: string;
}

const API_BASE =
  (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ??
  'http://127.0.0.1:8000';

export function RecruiterLogin({ onLogin, onBack, onSignUp, title = 'Recruiter Login' }: RecruiterLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailValid = emailRegex.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !emailValid || loggingIn) return;
    setLoginError(null);
    setLoggingIn(true);
    try {
      const res = await fetch(`${API_BASE}/recruiter/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(data.detail || 'Login failed');
      }

      const data = (await res.json()) as { fullName?: string; recruiterId?: number };
      // eslint-disable-next-line no-console
      console.log('RecruiterLogin: Login response:', data);
      const name = data.fullName || email.split('@')[0] || 'Recruiter';
      const id = data.recruiterId;
      // eslint-disable-next-line no-console
      console.log('RecruiterLogin: Calling onLogin with name:', name, 'id:', id);
      onLogin(name, id);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Failed to log in');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetEmail) {
      // Mock password reset
      setResetSent(true);
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetSent(false);
        setResetEmail('');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 relative">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-[#000000] hover:underline"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>
      
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-medium text-[#000000] mb-8 text-center">
          {title}
        </h1>
        
        {!showForgotPassword ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-lg text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors text-base ${
                    email && !emailValid
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:border-[#FF13F0]'
                  }`}
                  placeholder="your.email@company.com"
                  required
                />
                {email && !emailValid && (
                  <p className="text-red-500 text-sm mt-1">
                    Enter a valid email address
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-lg text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF13F0] transition-colors text-base"
                  placeholder="Enter your password"
                  required
                />
                <div className="text-right mt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[#FF13F0] hover:underline text-sm font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
              </div>
              
              {loginError && (
                <p className="text-red-500 text-sm">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                className="w-full bg-[#000000] text-white py-3 px-6 rounded-lg text-lg font-medium hover:bg-[#333333] transition-all disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                disabled={loggingIn}
              >
                {loggingIn ? 'Logging in…' : 'Login'}
              </button>
            </form>

            {onSignUp && (
              <>
                <div className="text-center my-6">
                  <p className="text-gray-500 text-sm">– or –</p>
                </div>

                <div className="text-center">
                  <p className="text-gray-700">
                    Don't have an account?{' '}
                    <button
                      onClick={onSignUp}
                      className="text-[#FF13F0] hover:underline font-medium"
                    >
                      Sign Up
                    </button>
                  </p>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-medium text-[#000000] mb-2">
                Reset Your Password
              </h2>
              <p className="text-gray-600 text-sm">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {!resetSent ? (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div>
                  <label className="block text-lg text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF13F0] transition-colors text-base"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                    }}
                    className="flex-1 bg-white text-[#000000] py-3 px-6 rounded-lg text-lg font-medium border-2 border-[#000000] hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#000000] text-white py-3 px-6 rounded-lg text-lg font-medium hover:bg-[#333333] transition-all"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-medium text-[#000000] mb-2">
                  Email Sent!
                </h3>
                <p className="text-gray-600 mb-6">
                  Check your inbox for password reset instructions.
                </p>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetSent(false);
                    setResetEmail('');
                  }}
                  className="text-[#FF13F0] hover:underline font-medium"
                >
                  Back to Login
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}