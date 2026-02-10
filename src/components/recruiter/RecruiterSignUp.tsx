import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';

interface RecruiterSignUpProps {
  onSignUp: (data: SignUpData) => void;
  onBackToLogin: () => void;
}

export interface SignUpData {
  email: string;
  username: string;
  password: string;
  fullName: string;
  companyName: string;
  employeeId?: string;
  recruiterRole?: string;
}

export function RecruiterSignUp({ onSignUp, onBackToLogin }: RecruiterSignUpProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [recruiterRole, setRecruiterRole] = useState('');
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [privacyExpanded, setPrivacyExpanded] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isFormValid = 
    email.trim() !== '' &&
    username.trim() !== '' &&
    password.trim() !== '' &&
    passwordsMatch &&
    fullName.trim() !== '' &&
    companyName.trim() !== '' &&
    employeeId.trim() !== '' &&
    agreedToTerms;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid) {
      onSignUp({
        email,
        username,
        password,
        fullName,
        companyName,
        employeeId: employeeId.trim(),
        recruiterRole: recruiterRole.trim() || undefined,
      });
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start px-6 py-12 relative">
      <button
        onClick={onBackToLogin}
        className="absolute top-6 left-6 flex items-center gap-2 text-[#000000] hover:underline"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>
      
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-medium text-[#000000] mb-3">
            Create Recruiter Account
          </h1>
          <p className="text-gray-600 text-base">
            Set up your account to start hiring with AI-powered tools.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Required Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF13F0] transition-colors text-base"
                placeholder="your.email@company.com"
                required
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF13F0] transition-colors text-base"
                placeholder="Choose a username"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF13F0] transition-colors text-base"
                placeholder="Create a strong password"
                required
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors text-base ${
                  confirmPassword && !passwordsMatch
                    ? 'border-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:border-[#FF13F0]'
                }`}
                placeholder="Re-enter your password"
                required
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-red-500 text-sm mt-1">Passwords do not match</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF13F0] transition-colors text-base"
              placeholder="Your full name"
              required
            />
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF13F0] transition-colors text-base"
              placeholder="Your company name"
              required
            />
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Employee ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF13F0] transition-colors text-base"
                placeholder="e.g., 12345"
                required
              />
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Recruiter Role / Title <span className="text-gray-400 text-sm">(optional)</span>
              </label>
              <input
                type="text"
                value={recruiterRole}
                onChange={(e) => setRecruiterRole(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF13F0] transition-colors text-base"
                placeholder="e.g., HR Manager"
              />
            </div>
          </div>

          {/* Terms & Privacy Section */}
          <div className="border-t-2 border-gray-200 pt-6 mt-8">
            <h2 className="text-xl font-medium text-[#000000] mb-4">
              Terms & Privacy
            </h2>

            {/* Terms of Service Accordion */}
            <div className="mb-4 border-2 border-gray-300 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setTermsExpanded(!termsExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium text-gray-800">Terms of Service (Recruiter Only)</span>
                {termsExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>
              
              {termsExpanded && (
                <div className="px-4 py-4 bg-white border-t-2 border-gray-200">
                  <ul className="space-y-2 text-gray-700 text-sm list-disc list-inside">
                    <li>This platform may be used only to create and manage job postings</li>
                    <li>Recruiters must provide accurate job and company information</li>
                    <li>Recruiters are responsible for maintaining account security</li>
                    <li>AI outputs are informational only and do not make hiring decisions</li>
                    <li>Final hiring decisions remain entirely the recruiter's responsibility</li>
                    <li>Misuse of the platform or data may result in account suspension</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Privacy Policy Accordion */}
            <div className="mb-6 border-2 border-gray-300 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setPrivacyExpanded(!privacyExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium text-gray-800">Privacy Policy</span>
                {privacyExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>
              
              {privacyExpanded && (
                <div className="px-4 py-4 bg-white border-t-2 border-gray-200">
                  <div className="space-y-3 text-sm">
                    <div>
                      <h4 className="font-medium text-gray-800 mb-1">Data Collected:</h4>
                      <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                        <li>Recruiter: email, username, company name, optional employee ID</li>
                        <li>Job data: job title, skills, experience, location, salary, questions</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-800 mb-1">Data Usage:</h4>
                      <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                        <li>Publishing job postings</li>
                        <li>Supporting AI-based job evaluation workflows</li>
                      </ul>
                    </div>

                    <div>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                        <li>Data is not sold or shared with third parties</li>
                        <li>Reasonable technical measures are used to protect data</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Agreement Checkbox */}
            <div className="flex items-start gap-3 mb-6">
              <input
                type="checkbox"
                id="terms-agreement"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-5 h-5 border-2 border-gray-300 rounded cursor-pointer accent-[#FF13F0]"
              />
              <label htmlFor="terms-agreement" className="text-gray-700 cursor-pointer">
                I agree to the Terms of Service and Privacy Policy
              </label>
            </div>
          </div>

          {/* Create Account Button */}
          <button
            type="submit"
            disabled={!isFormValid}
            className={`w-full py-3 px-6 rounded-lg text-lg font-medium transition-all ${
              isFormValid
                ? 'bg-[#000000] text-white hover:bg-[#333333] cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Create Account
          </button>

          {/* Secondary Navigation */}
          <div className="text-center mt-6">
            <p className="text-gray-700">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onBackToLogin}
                className="text-[#FF13F0] hover:underline font-medium"
              >
                Log in
              </button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}