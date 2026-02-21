import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { getApiBase } from '@/lib/apiConfig';

interface CompanySignUpProps {
  onSignUp: (data: CompanySignUpData) => void;
  onBackToLogin: () => void;
}

export interface CompanySignUpData {
  companyName: string;
  companyDescription: string;
  industry: string;
  websiteUrl?: string;
  contactEmail: string;
  contactPersonName: string;
  contactPhone: string;
  password: string;
}

export function CompanySignUp({ onSignUp, onBackToLogin }: CompanySignUpProps) {
  const [companyName, setCompanyName] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [customIndustry, setCustomIndustry] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPersonName, setContactPersonName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [privacyExpanded, setPrivacyExpanded] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailValid = emailRegex.test(contactEmail);

  const passwordStrong = password.length >= 8;
  const passwordsMatch = password === confirmPassword && password.length > 0;
  
  // Determine the final industry value
  const finalIndustry = industry === 'other' ? customIndustry : industry;
  
  const isFormValid = 
    companyName.trim() !== '' &&
    companyDescription.trim() !== '' &&
    finalIndustry.trim() !== '' &&
    contactEmail.trim() !== '' &&
    emailValid &&
    contactPersonName.trim() !== '' &&
    contactPhone.trim() !== '' &&
    password.trim() !== '' &&
    passwordStrong &&
    passwordsMatch &&
    agreedToTerms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${getApiBase()}/company/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyDescription,
          industry: finalIndustry,
          websiteUrl: websiteUrl.trim() || undefined,
          contactEmail,
          contactPersonName,
          contactPhone,
          password,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(data.detail || `Sign up failed (${res.status})`);
      }

      const data = (await res.json()) as { companyName?: string };
      onSignUp({
        companyName: data.companyName || companyName,
        companyDescription,
        industry: finalIndustry,
        websiteUrl: websiteUrl.trim() || undefined,
        contactEmail,
        contactPersonName,
        contactPhone,
        password,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create company account');
    } finally {
      setSubmitting(false);
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
            Create Company Account
          </h1>
          <p className="text-gray-600 text-base">
            Register your company to access AI-powered recruitment solutions.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Information */}
          <div className="border-2 border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-medium text-[#000000] mb-4">
              Company Information
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF13F0] transition-colors text-base"
                  placeholder="e.g., Acme Corporation"
                  required
                />
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Company Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF13F0] transition-colors text-base resize-none"
                  placeholder="Briefly describe your company, what you do, and your mission..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Industry <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF13F0] transition-colors text-base"
                    required
                  >
                    <option value="">Select Industry</option>
                    <option value="retail">Retail</option>
                    <option value="hospitality">Hospitality & Food Services</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="logistics">Logistics & Transportation</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="technology">Technology</option>
                    <option value="finance">Finance & Banking</option>
                    <option value="education">Education</option>
                    <option value="real-estate">Real Estate</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {industry === 'other' && (
                  <div>
                    <label className="block text-base font-medium text-gray-700 mb-2">
                      Specify Industry <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customIndustry}
                      onChange={(e) => setCustomIndustry(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF13F0] transition-colors text-base"
                      placeholder="Enter your industry"
                      required
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Website URL <span className="text-gray-400 text-sm">(optional)</span>
                </label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF13F0] transition-colors text-base"
                  placeholder="https://www.yourcompany.com"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-2 border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-medium text-[#000000] mb-4">
              Primary Contact Information
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Contact Person Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={contactPersonName}
                  onChange={(e) => setContactPersonName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF13F0] transition-colors text-base"
                  placeholder="Full name of primary contact"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Login Email / Contact Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors text-base ${
                      contactEmail && !emailValid
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:border-[#FF13F0]'
                    }`}
                    placeholder="contact@company.com"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">This email will be used for logging in</p>
                  {contactEmail && !emailValid && (
                    <p className="text-red-500 text-sm mt-1">Enter a valid email address (e.g. name@company.com)</p>
                  )}
                </div>

                <div>
                  <label className="block text-base font-medium text-gray-700 mb-2">
                    Contact Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF13F0] transition-colors text-base"
                    placeholder="+92 300 1234567"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Account Security */}
          <div className="border-2 border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-medium text-[#000000] mb-4">
              Account Security
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors text-base ${
                    password && !passwordStrong
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:border-[#FF13F0]'
                  }`}
                  placeholder="Create a strong password"
                  required
                />
                {password && !passwordStrong && (
                  <p className="text-red-500 text-sm mt-1">
                    Password must be at least 8 characters long
                  </p>
                )}
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
                <span className="font-medium text-gray-800">Terms of Service (Company)</span>
                {termsExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>
              
              {termsExpanded && (
                <div className="px-4 py-4 bg-white border-t-2 border-gray-200">
                  <ul className="space-y-2 text-gray-700 text-sm list-disc list-inside">
                    <li>This platform may be used only for legitimate recruitment purposes</li>
                    <li>Companies must provide accurate company and job information</li>
                    <li>Companies are responsible for maintaining account security</li>
                    <li>Company data will be used to create job postings and manage recruitment</li>
                    <li>AI outputs are informational only and do not make hiring decisions</li>
                    <li>Final hiring decisions remain entirely the company's responsibility</li>
                    <li>Misuse of the platform or candidate data may result in account suspension</li>
                    <li>Companies must comply with all applicable employment laws</li>
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
                        <li>Company: name, description, industry, size, website, contact details</li>
                        <li>Account: email, password (encrypted), contact person information</li>
                        <li>Job data: postings, requirements, and recruitment preferences</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-800 mb-1">Data Usage:</h4>
                      <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
                        <li>Creating and managing company profile</li>
                        <li>Publishing job postings to candidates</li>
                        <li>Supporting AI-based candidate evaluation workflows</li>
                        <li>Platform communication and support</li>
                      </ul>
                    </div>

                    <div>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                        <li>Data is not sold or shared with third parties</li>
                        <li>Reasonable technical measures are used to protect data</li>
                        <li>Companies can request data deletion by contacting support</li>
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

          {/* Error message */}
          {submitError && (
            <p className="text-red-500 text-sm mb-2">
              {submitError}
            </p>
          )}

          {/* Create Account Button */}
          <button
            type="submit"
            disabled={!isFormValid || submitting}
            className={`w-full py-3 px-6 rounded-lg text-lg font-medium transition-all ${
              isFormValid && !submitting
                ? 'bg-[#000000] text-white hover:bg-[#333333] cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {submitting ? 'Creating Account…' : 'Create Company Account'}
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