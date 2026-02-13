import { useEffect, useState } from 'react';
import { Plus, Search, Grid, LogOut, Edit, MoreVertical, BarChart3 } from 'lucide-react';
import { Job } from '../../App';
import { RecruiterOverview } from './RecruiterOverview';

interface RecruiterDashboardProps {
  recruiterName: string;
  recruiterId: number | null;
  onLogout: () => void;
  onViewApplicants: (job: Job) => void;
  onEditJob: (job: Job) => void;
  onAddJob: () => void;
}

const API_BASE =
  (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ??
  'http://127.0.0.1:8000';

export function RecruiterDashboard({
  recruiterName,
  recruiterId,
  onLogout,
  onViewApplicants,
  onEditJob,
  onAddJob,
}: RecruiterDashboardProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'overview' | 'my-jobs'>('overview');
  const [deleteConfirmJob, setDeleteConfirmJob] = useState<Job | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadJobs = async () => {
      if (!recruiterId) {
        // eslint-disable-next-line no-console
        console.warn('RecruiterDashboard: recruiterId is not set, cannot load jobs');
        return;
      }
      try {
        // eslint-disable-next-line no-console
        console.log('RecruiterDashboard: Loading jobs for recruiter_id:', recruiterId, 'type:', typeof recruiterId);
        const recruiterIdParam = Number(recruiterId);
        if (isNaN(recruiterIdParam)) {
          // eslint-disable-next-line no-console
          console.error('RecruiterDashboard: Invalid recruiterId, cannot convert to number');
          return;
        }
        const res = await fetch(`${API_BASE}/recruiter/jobs?recruiter_id=${recruiterIdParam}`);
        if (!res.ok) {
          // eslint-disable-next-line no-console
          console.error('Failed to load recruiter jobs', res.status, await res.text().catch(() => ''));
          return;
        }
        const data = (await res.json()) as Array<{
          id: string;
          title: string;
          companyName: string;
          location: string;
          status: string;
          salary: number;
          cvWeight: number;
          videoWeight: number;
          applicantCount: number;
        }>;
        // eslint-disable-next-line no-console
        console.log('RecruiterDashboard: Loaded', data.length, 'jobs');
        if (!cancelled) {
          const mapped: Job[] = data.map((j) => ({
            id: j.id,
            title: j.title,
            companyName: j.companyName,
            location: j.location,
            status: (j.status === 'closed' ? 'closed' : 'open') as 'open' | 'closed',
            salary: j.salary,
            cvWeight: j.cvWeight,
            videoWeight: j.videoWeight,
            applicantCount: j.applicantCount ?? 0,
          }));
          setJobs(mapped);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error loading recruiter jobs', err);
      }
    };
    // Reload jobs when recruiterId changes or when switching to 'my-jobs' view
    if (currentView === 'my-jobs') {
      loadJobs();
    }
    return () => {
      cancelled = true;
    };
  }, [recruiterId, currentView]);

  const handleToggleStatus = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    const newStatus = job.status === 'open' ? 'closed' : 'open';
    
    // Optimistically update UI
    setJobs(jobs.map(j => 
      j.id === jobId 
        ? { ...j, status: newStatus }
        : j
    ));
    
    try {
      const res = await fetch(`${API_BASE}/recruiter/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) {
        // Revert on error
        setJobs(jobs);
        // eslint-disable-next-line no-console
        console.error('Failed to update job status', res.status);
        return;
      }
      
      const updatedJob = await res.json();
      // Update with server response to ensure consistency
      setJobs(jobs.map(j => 
        j.id === jobId 
          ? {
              ...j,
              status: updatedJob.status === 'closed' ? 'closed' : 'open',
            }
          : j
      ));
    } catch (err) {
      // Revert on error
      setJobs(jobs);
      // eslint-disable-next-line no-console
      console.error('Error updating job status', err);
    }
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

  const handleDeleteJob = (job: Job) => {
    setOpenDropdown(null);
    setDeleteConfirmJob(job);
  };

  const confirmDeleteJob = async () => {
    if (!deleteConfirmJob) return;
    
    try {
      const res = await fetch(`${API_BASE}/recruiter/jobs/${deleteConfirmJob.id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        // eslint-disable-next-line no-console
        console.error('Failed to delete job', res.status);
        alert('Failed to delete job. Please try again.');
        setDeleteConfirmJob(null);
        return;
      }
      
      // Remove job from local state
      setJobs(jobs.filter(j => j.id !== deleteConfirmJob.id));
      setDeleteConfirmJob(null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error deleting job', err);
      alert('Failed to delete job. Please try again.');
      setDeleteConfirmJob(null);
    }
  };

  const cancelDeleteJob = () => {
    setDeleteConfirmJob(null);
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
                    <span>{job.companyName || 'N/A'} • PKR {job.salary?.toLocaleString() || '0'} • {job.location}</span>
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
                          <button
                            onClick={() => handleDeleteJob(job)}
                            className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Delete Job
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          {/* Modal - no backdrop */}
          <div className="relative bg-white rounded-lg shadow-2xl border border-gray-200 max-w-md w-full mx-4 p-6 pointer-events-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Delete Job
            </h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <span className="font-medium">"{deleteConfirmJob.title}"</span>? 
              This action cannot be undone.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDeleteJob}
                className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 hover:text-gray-900 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteJob}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}