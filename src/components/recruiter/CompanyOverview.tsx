import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, Briefcase, UserCheck, TrendingUp, ExternalLink, Tag } from 'lucide-react';
import neurohireLogo from '@/assets/neurohire-logo-2.png';

const API_BASE =
  (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ??
  'http://127.0.0.1:8000';

interface CompanyOverviewProps {
  companyName: string;
}

type CompanyProfile = {
  companyName: string;
  companyDescription: string;
  industry: string;
  websiteUrl: string | null;
};

type CompanyAnalytics = {
  total_jobs: number;
  jobs_open: number;
  jobs_closed: number;
  total_applicants: number;
  total_recruiters: number;
  recruiters_approved: number;
  recruiters_pending: number;
  avg_applicants_per_job: number;
  applicants_per_recruiter: Array<{ recruiter: string; applicants: number }>;
  job_status_distribution: Array<{ name: string; value: number; color: string }>;
  monthly_trends: Array<{ month: string; year: number; jobs: number; applicants: number }>;
};

export function CompanyOverview({ companyName }: CompanyOverviewProps) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [analytics, setAnalytics] = useState<CompanyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ company_name: companyName });
        const [profileRes, analyticsRes] = await Promise.all([
          fetch(`${API_BASE}/company/profile?${params}`),
          fetch(`${API_BASE}/company/analytics?${params}`),
        ]);
        if (!profileRes.ok) throw new Error('Failed to load company profile');
        const profileData = await profileRes.json();
        if (!cancelled && profileData) setProfile(profileData as CompanyProfile);
        else if (!cancelled) setProfile({ companyName, companyDescription: '', industry: '', websiteUrl: null });

        if (!cancelled && analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData as CompanyAnalytics);
        } else if (!cancelled) {
          setAnalytics({
            total_jobs: 0,
            jobs_open: 0,
            jobs_closed: 0,
            total_applicants: 0,
            total_recruiters: 0,
            recruiters_approved: 0,
            recruiters_pending: 0,
            avg_applicants_per_job: 0,
            applicants_per_recruiter: [],
            job_status_distribution: [
              { name: 'Open Jobs', value: 0, color: '#10b981' },
              { name: 'Closed Jobs', value: 0, color: '#6b7280' },
            ],
            monthly_trends: [],
          });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [companyName]);

  const displayName = profile?.companyName ?? companyName;
  const displayDescription = profile?.companyDescription ?? '';
  const displayIndustry = profile?.industry ?? '';
  const websiteUrl = profile?.websiteUrl?.trim();
  const websiteHref = websiteUrl
    ? /^https?:\/\//i.test(websiteUrl)
      ? websiteUrl
      : `https://${websiteUrl}`
    : null;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl text-gray-800">Company Dashboard</h1>
          <img src={neurohireLogo} alt="NeuroHire" className="h-10" />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="w-full">
          {/* Company Profile Header */}
          <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm p-8 mb-8">
            {loading ? (
              <div className="text-gray-500">Loading company profile…</div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : (
              <>
                <h1 className="text-3xl font-semibold text-gray-900 mb-3">
                  {displayName}
                </h1>
                {displayDescription && (
                  <p className="text-gray-600 mb-5 leading-relaxed">
                    {displayDescription}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-6">
                  {displayIndustry && (
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-500">Industry:</span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {displayIndustry}
                      </span>
                    </div>
                  )}
                  {websiteHref && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-500">Website:</span>
                      <a
                        href={websiteHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                      >
                        {websiteUrl}
                      </a>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <h2 className="text-xl font-medium text-gray-800 mb-6">Company-Wide Analytics</h2>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Jobs Posted */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Total Jobs Posted</p>
              <p className="text-3xl font-semibold text-gray-900">{analytics?.total_jobs ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">{analytics?.jobs_open ?? 0} Active • {analytics?.jobs_closed ?? 0} Closed</p>
            </div>

            {/* Total Applicants */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Total Applicants</p>
              <p className="text-3xl font-semibold text-gray-900">{analytics?.total_applicants ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Across all jobs</p>
            </div>

            {/* Total Recruiters */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Total Recruiters</p>
              <p className="text-3xl font-semibold text-gray-900">{analytics?.total_recruiters ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">{analytics?.recruiters_approved ?? 0} Active • {analytics?.recruiters_pending ?? 0} Pending</p>
            </div>

            {/* Avg Applicants per Job */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Avg. Applicants/Job</p>
              <p className="text-3xl font-semibold text-gray-900">{analytics?.avg_applicants_per_job ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">Per job posting</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Applicants per Recruiter */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-6">Applicants per Recruiter</h3>
              <div style={{ width: '100%', height: '320px', minHeight: '320px' }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                  <BarChart data={analytics?.applicants_per_recruiter ?? []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      type="number"
                      stroke="#6b7280"
                      style={{ fontSize: '14px' }}
                    />
                    <YAxis 
                      type="category"
                      dataKey="recruiter" 
                      stroke="#6b7280"
                      style={{ fontSize: '14px' }}
                      width={100}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="applicants" fill="#000000" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Job Status Distribution */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-6">Job Status Distribution</h3>
              <div style={{ width: '100%', height: '320px', minHeight: '320px' }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                  <PieChart>
                    <Pie
                      data={analytics?.job_status_distribution ?? []}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {(analytics?.job_status_distribution ?? []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                      wrapperStyle={{ fontSize: '14px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Monthly Hiring Trends */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-6">Monthly Hiring Trends</h3>
            <div style={{ width: '100%', height: '320px', minHeight: '320px' }}>
              <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                <BarChart data={(analytics?.monthly_trends ?? []).map(t => ({ ...t, month: `${t.month} ${t.year}` }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6b7280"
                    style={{ fontSize: '14px' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '14px' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '14px' }}
                  />
                  <Bar dataKey="jobs" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Jobs Posted" />
                  <Bar dataKey="applicants" fill="#000000" radius={[4, 4, 0, 0]} name="Total Applicants" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}