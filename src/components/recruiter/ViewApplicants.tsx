import { useState } from 'react';
import { Search, Filter, ChevronLeft, MapPin, Calendar, User, Mail, Phone, FileText, Building2, TrendingUp, ChevronDown, ArrowLeft } from 'lucide-react';
import neurohireLogo from '@/assets/neurohire-logo.png';

interface ViewApplicantsProps {
  job: Job;
  recruiterName: string;
  onBack: () => void;
  onLogout: () => void;
  onReviewApplicant: (applicant: Applicant) => void;
}

const mockApplicants = [
  {
    id: 'APP-001',
    name: 'Ali Ahmed',
    jobId: '1',
    cvScore: 85,
    videoScore: 78,
    totalScore: 82,
    status: 'pending',
  },
  {
    id: 'APP-002',
    name: 'Fatima Khan',
    jobId: '1',
    cvScore: 92,
    videoScore: 88,
    totalScore: 90,
    status: 'pending',
  },
  {
    id: 'APP-003',
    name: 'Hassan Malik',
    jobId: '1',
    cvScore: 76,
    videoScore: 82,
    totalScore: 79,
    status: 'pending',
  },
  {
    id: 'APP-004',
    name: 'Ayesha Raza',
    jobId: '1',
    cvScore: 88,
    videoScore: 90,
    totalScore: 89,
    status: 'pending',
  },
  {
    id: 'APP-005',
    name: 'Muhammad Usman',
    jobId: '1',
    cvScore: 72,
    videoScore: 75,
    totalScore: 74,
    status: 'pending',
  },
];

export function ViewApplicants({
  job,
  recruiterName,
  onBack,
  onLogout,
  onReviewApplicant,
}: ViewApplicantsProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  // Get initials from recruiter name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Get AI recommendation based on total score
  const getRecommendation = (totalScore: number) => {
    if (totalScore >= 85) {
      return { label: 'Strong Fit', color: 'bg-green-100 text-green-800' };
    } else if (totalScore >= 75) {
      return { label: 'Good Fit', color: 'bg-blue-100 text-blue-800' };
    } else if (totalScore >= 65) {
      return { label: 'Needs Review', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { label: 'Low Fit', color: 'bg-red-100 text-red-800' };
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation Bar - No Border */}
      <nav className="bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Left: Logo */}
          <img src={neurohireLogo} alt="neurohire" className="h-8" />

          {/* Right: Avatar Only */}
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
      <div className="max-w-7xl mx-auto px-8 py-6">
        {/* Back to Dashboard Link */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-[#000000] transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Jobs</span>
        </button>

        {/* Applicants Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                    Application ID
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                    CV Score
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                    Video Score
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                    Total Score
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                    AI Recommendation
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mockApplicants.map((applicant, index) => {
                  const recommendation = getRecommendation(applicant.totalScore);
                  return (
                    <tr
                      key={applicant.id}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {applicant.id}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {applicant.cvScore}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">
                          {applicant.videoScore}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-base font-semibold text-gray-900">
                          {applicant.totalScore}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${recommendation.color}`}
                        >
                          {recommendation.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => onReviewApplicant(applicant)}
                          className="bg-[#FF13F0] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#FF13F0]/80 transition-all whitespace-nowrap"
                        >
                          View Detailed Report
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}