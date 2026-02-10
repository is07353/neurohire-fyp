import { useState } from 'react';
import { ChevronLeft, MapPin, Calendar, User, Mail, Phone, FileText, Building2, TrendingUp, CheckCircle, XCircle, ChevronDown, ArrowLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import neurohireLogo from '@/assets/neurohire-logo.png';

interface CandidateReviewProps {
  applicant: Applicant;
  job: Job;
  recruiterName: string;
  onBack: () => void;
  onLogout: () => void;
}

export function CandidateReview({
  applicant,
  job,
  recruiterName,
  onBack,
  onLogout,
}: CandidateReviewProps) {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'accept' | 'interview' | 'reject' | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const aiRecommendation = applicant.cvScore >= 85 && applicant.videoScore >= 85 ? 'accept' : 'interview';

  // Get initials from recruiter name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Mock interview questions and videos
  const interviewQuestions = [
    {
      question: "Tell us about your previous work experience and how it relates to this delivery rider role.",
      videoUrl: "/mock-video-1.mp4"
    },
    {
      question: "How would you handle a situation where a customer is not available to receive their delivery?",
      videoUrl: "/mock-video-2.mp4"
    },
    {
      question: "What motivates you to work as a delivery rider, and what are your availability expectations?",
      videoUrl: "/mock-video-3.mp4"
    }
  ];

  // Mock CV analysis data
  const cvAnalysis = [
    'Experience in logistics and warehouse work is relevant to delivery riding (40%)',
    'Lack of specific bike riding or delivery experience (30%)',
    'Strong physical fitness aligns well with delivery work requirements (30%)',
  ];

  // Mock model summary
  const cvModelSummary = "The candidate's warehouse experience provides a foundation for delivery work, but lacks specific bike riding skills.";

  const handleAction = (action: 'accept' | 'interview' | 'reject') => {
    if (action !== aiRecommendation && aiRecommendation === 'accept') {
      setShowWarning(true);
    }
    setModalType(action);
    setShowModal(true);
  };

  const confirmAction = () => {
    console.log(`Candidate ${modalType}: ${applicant.name}`);
    setShowModal(false);
    setShowWarning(false);
    onBack();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation Bar - No Border */}
      <nav className="bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Left: Logo */}
          <img src={neurohireLogo} alt="neurohire" className="h-8" />

          {/* Right: Dashboard Button + Avatar */}
          <div className="flex items-center gap-4">
            {/* Avatar with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className="w-10 h-10 bg-[#FF13F0] rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{getInitials(recruiterName)}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </button>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - White Background */}
      <div className="max-w-6xl mx-auto px-8 py-6">
        {/* Page Header */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-[#000000] transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Applicants</span>
        </button>
        
        <div className="mb-8">
          <h1 className="text-4xl font-medium text-[#000000] mb-2">
            {applicant.name}
          </h1>
          <p className="text-gray-600 text-lg">Application ID: {applicant.id}</p>
        </div>
        
        {/* AI Recommendation Banner */}
        <div className={`p-6 rounded-lg mb-6 ${
          aiRecommendation === 'accept' 
            ? 'bg-green-50 border-2 border-green-500' 
            : 'bg-blue-50 border-2 border-blue-500'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            {aiRecommendation === 'accept' ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <User className="w-6 h-6 text-blue-600" />
            )}
            <h3 className="text-xl font-medium text-gray-900">AI Recommendation</h3>
          </div>
          <p className="text-gray-700 text-lg">
            {aiRecommendation === 'accept' 
              ? 'This candidate is recommended for immediate acceptance based on high scores.'
              : 'This candidate is recommended for a human interview to assess further.'}
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* CV Preview with PDF Viewer */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-medium text-[#000000] mb-4">CV Preview</h3>
            
            {/* Embedded PDF Viewer */}
            <div className="bg-gray-100 rounded-lg overflow-hidden mb-4" style={{ height: '400px' }}>
              <iframe
                src="/sample-cv.pdf"
                className="w-full h-full"
                title="CV PDF Viewer"
              />
            </div>
            
            {/* CV Score */}
            <div className="pt-2">
              <span className="font-medium text-[#000000] text-lg">CV Score: {applicant.cvScore}%</span>
            </div>
          </div>
          
          {/* Video Interview with Question Carousel */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-medium text-[#000000] mb-4">Video Interview</h3>
            
            {/* Question Text */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-2">Question {currentQuestionIndex + 1} of {interviewQuestions.length}</p>
              <p className="text-gray-900">{interviewQuestions[currentQuestionIndex].question}</p>
            </div>
            
            {/* Video Player */}
            <div className="bg-black rounded-lg aspect-video mb-4 flex items-center justify-center">
              <div className="text-white text-sm">Video Response {currentQuestionIndex + 1}</div>
            </div>
            
            {/* Navigation Controls */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              
              <div className="flex gap-2">
                {interviewQuestions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentQuestionIndex ? 'bg-[#FF13F0] w-6' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              
              <button
                onClick={() => setCurrentQuestionIndex(Math.min(interviewQuestions.length - 1, currentQuestionIndex + 1))}
                disabled={currentQuestionIndex === interviewQuestions.length - 1}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            
            {/* Video Score */}
            <div className="pt-2">
              <span className="font-medium text-[#000000] text-lg">Video Score: {applicant.videoScore}%</span>
            </div>
          </div>
        </div>
        
        {/* AI Evaluation Metrics */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-xl font-medium text-[#000000] mb-6">AI Evaluation Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Confidence</div>
              <div className="text-2xl font-semibold text-gray-900">85%</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Clarity</div>
              <div className="text-2xl font-semibold text-gray-900">78%</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Answer Relevance</div>
              <div className="text-2xl font-semibold text-gray-900">88%</div>
            </div>
          </div>
        </div>

        {/* Matching Analysis */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-xl font-medium text-[#000000] mb-2">What the AI Found from the CV</h3>
          <p className="text-sm text-gray-500 mb-4">
            This analysis is based only on the candidate's CV compared with the job requirements.
          </p>
          <ul className="space-y-3">
            {cvAnalysis.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="text-gray-400 mt-1">•</span>
                <span className="text-gray-700 leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Model Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h3 className="text-xl font-medium text-[#000000] mb-2">AI Summary (CV-Based)</h3>
          <p className="text-sm text-gray-500 mb-4">
            Generated using CV and job description only.
          </p>
          <p className="text-gray-700 leading-relaxed">{cvModelSummary}</p>
        </div>
        
        {/* Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-medium text-[#000000] mb-6">Recruiter Actions</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => handleAction('accept')}
              className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              Accept Candidate
            </button>
            <button
              onClick={() => handleAction('interview')}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
            >
              <User className="w-5 h-5" />
              Send to Human Interview
            </button>
            <button
              onClick={() => handleAction('reject')}
              className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              Reject Candidate
            </button>
          </div>
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            {showWarning && (
              <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-medium text-yellow-900 mb-1">Warning</h4>
                    <p className="text-sm text-yellow-800">
                      Your decision differs from the AI recommendation. Are you sure you want to proceed?
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <h3 className="text-2xl font-medium text-[#1e3a5f] mb-4">
              Confirm Action
            </h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to{' '}
              <strong>
                {modalType === 'accept' && 'accept'}
                {modalType === 'interview' && 'send to human interview'}
                {modalType === 'reject' && 'reject'}
              </strong>{' '}
              {applicant.name}?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  setShowWarning(false);
                }}
                className="flex-1 border-2 border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className="flex-1 bg-[#1e3a5f] text-white py-2 px-4 rounded-lg hover:bg-[#2d5080] transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}