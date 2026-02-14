import { useState, useEffect } from 'react';
import { Search, Briefcase, MapPin } from 'lucide-react';
import neurohireLogo from '@/assets/neurohire-logo.png';

const API_BASE =
  (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ??
  'http://127.0.0.1:8000';

interface CompanyJobsProps {
  companyName: string;
}

interface Job {
  id: string;
  title: string;
  location: string;
  salary: string;
  recruiterName: string;
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

export function CompanyJobs({ companyName }: CompanyJobsProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [recruiterFilter, setRecruiterFilter] = useState<string>('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ company_name: companyName });
    fetch(`${API_BASE}/company/jobs?${params}`)
      .then((res) => (res.ok ? res.json() : { jobs: [] }))
      .then((data: { jobs: Array<{ id: string; title: string; location: string; salary_monthly_pkr: number; recruiter_name: string; status: string; created_at: string }> }) => {
        if (cancelled) return;
        const mapped: Job[] = (data.jobs || []).map((j) => ({
          id: j.id,
          title: j.title,
          location: j.location || '—',
          salary: j.salary_monthly_pkr ? `PKR ${Number(j.salary_monthly_pkr).toLocaleString()}` : '—',
          recruiterName: j.recruiter_name || 'Recruiter',
          status: j.status === 'open' ? 'open' : 'closed',
          postedDate: formatPostedDate(j.created_at),
        }));
        setJobs(mapped);
      })
      .catch(() => {
        if (!cancelled) setJobs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [companyName]);

  // Get unique recruiter names
  const uniqueRecruiters = Array.from(new Set(jobs.map(job => job.recruiterName)));

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.recruiterName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesRecruiter = recruiterFilter === 'all' || job.recruiterName === recruiterFilter;
    
    return matchesSearch && matchesStatus && matchesRecruiter;
  });

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
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl text-gray-800">All Jobs</h1>
            <p className="text-sm text-gray-600 mt-1">View all jobs posted by your recruiters</p>
          </div>
          <img src={neurohireLogo} alt="NeuroHire" className="h-8" />
        </div>
      </header>

      {/* Filters & Search */}
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

        {/* Summary Stats - jobs only, no applicant counts */}
        <div className="flex gap-6 mt-4 text-sm text-gray-600">
          <span>Total Jobs: <strong className="text-gray-900">{jobs.length}</strong></span>
          <span>Open: <strong className="text-green-700">{jobs.filter(j => j.status === 'open').length}</strong></span>
          <span>Closed: <strong className="text-gray-700">{jobs.filter(j => j.status === 'closed').length}</strong></span>
        </div>
      </div>

      {/* Job Cards */}
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        {loading && (
          <div className="text-center py-12 text-gray-500">Loading jobs…</div>
        )}
        {!loading && (
        <>
        <div className="space-y-4 max-w-6xl">
          {filteredJobs.map((job, index) => (
            <div
              key={job.id}
              className={`rounded-lg p-6 border-2 border-gray-200 ${
                pastelColors[index % pastelColors.length]
              }`}
            >
              {/* Meta Info Row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Posted: {job.postedDate}</span>
                  <span>•</span>
                  <span>Posted by: {job.recruiterName}</span>
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
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                {job.title}
              </h3>

              {/* Job Details - no applicant count */}
              <div className="flex flex-wrap items-center gap-4 mb-4 text-gray-700">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-gray-500" />
                  <span>{job.salary}</span>
                </div>
              </div>

              {/* Company Name */}
              <div className="text-sm text-gray-600">
                <span className="font-medium">{companyName}</span>
              </div>
            </div>
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No jobs found matching your search criteria.
          </div>
        )}

        {/* Info Box */}
        {filteredJobs.length > 0 && (
          <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4 max-w-6xl">
            <h4 className="font-medium text-blue-900 mb-2">Read-Only View</h4>
            <p className="text-sm text-blue-800">
              This is a company-level overview. Jobs are managed by individual recruiters. 
              To edit or manage applicants, please contact the recruiter who posted the job.
            </p>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}