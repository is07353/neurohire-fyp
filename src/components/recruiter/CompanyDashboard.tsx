import { useState } from 'react';
import { Building2, LogOut, BarChart3, Users, Briefcase, FileText } from 'lucide-react';
import { CompanyOverview } from './CompanyOverview';
import { CompanyRecruiters } from './CompanyRecruiters';
import { CompanyJobs } from './CompanyJobs';
import { CompanyApplicants } from './CompanyApplicants';

interface CompanyDashboardProps {
  companyName: string;
  onLogout: () => void;
}

type ViewType = 'overview' | 'recruiters' | 'jobs' | 'applicants';

export function CompanyDashboard({ companyName, onLogout }: CompanyDashboardProps) {
  const [currentView, setCurrentView] = useState<ViewType>('overview');

  // Get initials from company name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Dark Sidebar */}
      <div className="w-64 bg-[#000000] flex flex-col">
        {/* Profile Section */}
        <div className="p-6 flex flex-col items-center">
          <div className="w-24 h-24 bg-[#333333] rounded-full flex items-center justify-center mb-4 border-4 border-[#444444]">
            <Building2 className="w-12 h-12 text-white" />
          </div>
          <h3 className="text-white font-medium text-center">{companyName}</h3>
          <p className="text-gray-400 text-sm mt-1">Company</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setCurrentView('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'overview' 
                ? 'bg-[#1a1a1a] text-white' 
                : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Overview</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('recruiters')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'recruiters' 
                ? 'bg-[#1a1a1a] text-white' 
                : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" />
            <span>Recruiters</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('jobs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'jobs' 
                ? 'bg-[#1a1a1a] text-white' 
                : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
            }`}
          >
            <Briefcase className="w-5 h-5" />
            <span>Jobs</span>
          </button>
          
          <button 
            onClick={() => setCurrentView('applicants')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'applicants' 
                ? 'bg-[#1a1a1a] text-white' 
                : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span>Applicants</span>
          </button>
        </nav>

        {/* Logout Button */}
        <div className="p-4">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-[#1a1a1a] rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {currentView === 'overview' && <CompanyOverview companyName={companyName} />}
        {currentView === 'recruiters' && <CompanyRecruiters companyName={companyName} />}
        {currentView === 'jobs' && <CompanyJobs companyName={companyName} />}
        {currentView === 'applicants' && <CompanyApplicants companyName={companyName} />}
      </div>
    </div>
  );
}
