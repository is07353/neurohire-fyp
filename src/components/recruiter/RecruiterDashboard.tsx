import { useState } from 'react';
import { Plus, Search, Grid, LogOut, Edit, MoreVertical, BarChart3 } from 'lucide-react';
import { Job } from '../../App';
import { RecruiterOverview } from './RecruiterOverview';

interface RecruiterDashboardProps {
  recruiterName: string;
  onLogout: () => void;
  onViewApplicants: (job: Job) => void;
  onEditJob: (job: Job) => void;
  onAddJob: () => void;
}

const mockJobs: Job[] = [
  {
    id: '1',
    title: 'Store Worker – Branch 1',
    location: 'Gulberg, Lahore',
    applicantCount: 24,
    cvWeight: 40,
    videoWeight: 60,
    status: 'open',
  },
  {
    id: '2',
    title: 'Cashier – DHA Branch',
    location: 'DHA, Karachi',
    applicantCount: 18,
    cvWeight: 50,
    videoWeight: 50,
    status: 'open',
  },
  {
    id: '3',
    title: 'Delivery Rider – F-7',
    location: 'F-7, Islamabad',
    applicantCount: 32,
    cvWeight: 30,
    videoWeight: 70,
    status: 'closed',
  },
  {
    id: '4',
    title: 'Store Worker – Saddar',
    location: 'Saddar, Rawalpindi',
    applicantCount: 15,
    cvWeight: 40,
    videoWeight: 60,
    status: 'open',
  },
];

export function RecruiterDashboard({
  recruiterName,
  onLogout,
  onViewApplicants,
  onEditJob,
  onAddJob,
}: RecruiterDashboardProps) {
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'overview' | 'my-jobs'>('overview');

  const handleToggleStatus = (jobId: string) => {
    setJobs(jobs.map(job => 
      job.id === jobId 
        ? { ...job, status: job.status === 'open' ? 'closed' : 'open' }
        : job
    ));
  };

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get initials from recruiter name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const toggleDropdown = (jobId: string) => {
    setOpenDropdown(openDropdown === jobId ? null : jobId);
  };

  const handleViewApplicants = (job: Job) => {
    setOpenDropdown(null);
    onViewApplicants(job);
  };

  // Pastel colors for job cards
  const pastelColors = [
    'bg-pink-50',
    'bg-purple-50',
    'bg-indigo-50',
    'bg-blue-50',
    'bg-teal-50',
    'bg-green-50',
    'bg-yellow-50',
    'bg-orange-50',
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Dark Sidebar */}
      <div className="w-64 bg-[#000000] flex flex-col">
        {/* Profile Section */}
        <div className="p-6 flex flex-col items-center">
          <div className="w-24 h-24 bg-[#333333] rounded-full flex items-center justify-center mb-4 border-4 border-[#444444]">
            <span className="text-white text-3xl font-medium">{getInitials(recruiterName)}</span>
          </div>
          <h3 className="text-white font-medium text-center">{recruiterName}</h3>
        </div>

        {/* Post New Job Button */}
        <div className="px-6 mb-6">
          <button
            onClick={onAddJob}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Post a New Job
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2">
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
            onClick={() => setCurrentView('my-jobs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              currentView === 'my-jobs' 
                ? 'bg-[#1a1a1a] text-white' 
                : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
            }`}
          >
            <Grid className="w-5 h-5" />
            <span>My Jobs</span>
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
      {currentView === 'overview' ? (
        <RecruiterOverview recruiterName={recruiterName} />
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl text-gray-800">Welcome back, {recruiterName}</h1>
              <div className="px-4 py-2 border-2 border-gray-300 rounded-full">
                <span className="text-sm font-medium text-gray-700">Recruiter</span>
              </div>
            </div>
          </header>

          {/* Search Section */}
          <div className="bg-white border-b border-gray-200 px-8 py-6">
            <div className="flex gap-3 max-w-4xl">
              <input
                type="text"
                placeholder="Search job by title"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 transition-colors"
              />
              <button className="bg-[#000000] text-white px-8 py-3 rounded-lg hover:bg-[#333333] transition-all font-medium">
                Search
              </button>
            </div>
          </div>

          {/* Job Cards */}
          <div className="flex-1 px-8 py-6 overflow-y-auto">
            <div className="space-y-4 max-w-6xl">
              {filteredJobs.map((job, index) => (
                <div
                  key={job.id}
                  className={`rounded-lg p-6 border border-gray-200 ${
                    pastelColors[index % pastelColors.length]
                  }`}
                >
                  {/* Meta Info Row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Posted: Feb 3, 2026</span>
                      <span>•</span>
                      <span>Posted by: {recruiterName.split(' ')[0]}</span>
                    </div>
                    <span
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        job.status === 'open'
                          ? 'bg-green-200 text-green-800'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      {job.status === 'open' ? 'Active' : 'Closed'}
                    </span>
                  </div>

                  {/* Job Title */}
                  <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    {job.title}
                  </h3>

                  {/* Company Info */}
                  <div className="text-gray-700 mb-4">
                    <span>KFC • PKR 20,000 • {job.location}</span>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      {/* Applicant Count */}
                      <div className="text-gray-700">
                        <span className="font-medium">Applicants: {job.applicantCount}</span>
                      </div>

                      {/* Edit Job */}
                      <button
                        onClick={() => onEditJob(job)}
                        className="flex items-center gap-2 text-gray-700 hover:text-[#000000]"
                        title="Edit Job"
                      >
                        <Edit className="w-4 h-4" />
                        <span className="text-sm">Edit</span>
                      </button>

                      {/* Status Toggle */}
                      <button
                        onClick={() => handleToggleStatus(job.id)}
                        className="flex items-center gap-2"
                      >
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          job.status === 'open' ? 'bg-green-500' : 'bg-gray-300'
                        }`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            job.status === 'open' ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </div>
                        <span className="text-sm text-gray-700">
                          {job.status === 'open' ? 'Open' : 'Closed'}
                        </span>
                      </button>
                    </div>

                    {/* More Options */}
                    <div className="relative">
                      <button 
                        onClick={() => toggleDropdown(job.id)}
                        className="p-2 hover:bg-white rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                      </button>
                      
                      {/* Dropdown Menu */}
                      {openDropdown === job.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <button
                            onClick={() => handleViewApplicants(job)}
                            className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            View Applicants
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredJobs.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No jobs found matching your search.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}