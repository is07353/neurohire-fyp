import { useState, useEffect } from 'react';
import { Search, Filter, Users, Briefcase } from 'lucide-react';
import neurohireLogo from '@/assets/neurohire-logo-2.png';
import { getApiBase } from '@/lib/apiConfig';

interface CompanyApplicantsProps {
  companyName: string;
}

interface JobApplicantData {
  jobId: string;
  jobTitle: string;
  location: string;
  recruiterName: string;
  applicantCount: number;
  status: 'open' | 'closed';
  postedDate: string;
}

function formatPostedDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function CompanyApplicants({ companyName }: CompanyApplicantsProps) {
  const [jobApplicants, setJobApplicants] = useState<JobApplicantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recruiterFilter, setRecruiterFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ company_name: companyName });
    fetch(`${getApiBase()}/company/jobs-with-applicant-counts?${params}`)
      .then((res) => (res.ok ? res.json() : { jobs: [] }))
      .then((data: { jobs: Array<{ id: string; title: string; location: string; recruiter_name: string; applicant_count: number; status: string; created_at: string }> }) => {
        if (cancelled) return;
        const mapped: JobApplicantData[] = (data.jobs || []).map((j) => ({
          jobId: j.id,
          jobTitle: j.title,
          location: j.location || '—',
          recruiterName: j.recruiter_name || 'Recruiter',
          applicantCount: typeof j.applicant_count === 'number' ? j.applicant_count : 0,
          status: j.status === 'open' ? 'open' : 'closed',
          postedDate: formatPostedDate(j.created_at),
        }));
        setJobApplicants(mapped);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load applicants overview');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [companyName]);

  // Get unique recruiter names
  const uniqueRecruiters = Array.from(new Set(jobApplicants.map(job => job.recruiterName)));

  const filteredJobs = jobApplicants.filter(job => {
    const matchesSearch = 
      job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.recruiterName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRecruiter = recruiterFilter === 'all' || job.recruiterName === recruiterFilter;
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    
    return matchesSearch && matchesRecruiter && matchesStatus;
  });

  const totalApplicants = filteredJobs.reduce((sum, job) => sum + job.applicantCount, 0);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl text-gray-800">Applicants Overview</h1>
              <p className="text-sm text-gray-600 mt-1">View applicant counts across all jobs</p>
            </div>
            <img src={neurohireLogo} alt="NeuroHire" className="h-10" />
          </div>
        </header>
        <div className="flex-1 px-8 py-12 text-center text-gray-500">Loading applicants overview…</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl text-gray-800">Applicants Overview</h1>
            <p className="text-sm text-gray-600 mt-1">View applicant counts across all jobs</p>
          </div>
          <img src={neurohireLogo} alt="NeuroHire" className="h-10" />
        </div>
      </header>

      {/* Summary Cards */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        {error && (
          <div className="mb-4 text-red-600 text-sm">{error}</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Applicants */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-2">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-blue-700 text-sm mb-1 font-medium">Total Applicants</p>
            <p className="text-3xl font-semibold text-blue-900">{totalApplicants}</p>
            <p className="text-xs text-blue-600 mt-1">Across {filteredJobs.length} jobs</p>
          </div>

          {/* Active Jobs */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-2">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-green-700 text-sm mb-1 font-medium">Active Jobs</p>
            <p className="text-3xl font-semibold text-green-900">
              {filteredJobs.filter(j => j.status === 'open').length}
            </p>
            <p className="text-xs text-green-600 mt-1">Currently accepting applications</p>
          </div>

          {/* Average per Job */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-6">
            <div className="flex items-start justify-between mb-2">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <Filter className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-purple-700 text-sm mb-1 font-medium">Avg. Applicants/Job</p>
            <p className="text-3xl font-semibold text-purple-900">
              {filteredJobs.length > 0 ? Math.round(totalApplicants / filteredJobs.length) : 0}
            </p>
            <p className="text-xs text-purple-600 mt-1">Per job posting</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by job title, location, or recruiter"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          {/* Recruiter Filter */}
          <select
            value={recruiterFilter}
            onChange={(e) => setRecruiterFilter(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 transition-colors bg-white"
          >
            <option value="all">All Recruiters</option>
            {uniqueRecruiters.map(recruiter => (
              <option key={recruiter} value={recruiter}>{recruiter}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 transition-colors bg-white"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Applicants Table */}
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Job Title</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Location</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Recruiter</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Posted Date</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Status</th>
                <th className="text-center px-6 py-4 text-sm font-medium text-gray-700">Applicants</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job, index) => (
                <tr 
                  key={job.jobId} 
                  className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                    index === filteredJobs.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  {/* Job Title */}
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{job.jobTitle}</p>
                  </td>

                  {/* Location */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">{job.location}</span>
                  </td>

                  {/* Recruiter */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">{job.recruiterName}</span>
                  </td>

                  {/* Posted Date */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{job.postedDate}</span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        job.status === 'open'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {job.status === 'open' ? 'Open' : 'Closed'}
                    </span>
                  </td>

                  {/* Applicant Count */}
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center justify-center bg-blue-100 text-blue-800 px-4 py-2 rounded-full">
                      <Users className="w-4 h-4 mr-2" />
                      <span className="font-semibold">{job.applicantCount}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredJobs.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No jobs found matching your search criteria.
            </div>
          )}
        </div>

        {/* Info Box */}
        {filteredJobs.length > 0 && (
          <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Company-Level Overview</h4>
            <p className="text-sm text-blue-800">
              This page shows applicant counts aggregated by job. For detailed applicant information, 
              individual review, and candidate evaluation, please contact the recruiter managing each job.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}