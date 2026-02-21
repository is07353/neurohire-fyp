import { useState, useEffect } from 'react';
import { Users, AlertCircle, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getApiBase } from '@/lib/apiConfig';

interface RecruiterOverviewProps {
  recruiterName: string;
  recruiterId: number | null;
}

type RecruiterAnalytics = {
  total_applicants: number;
  recommended_by_ai: number;
  needs_review: number;
  shortlisted: number;
  ai_recommendation_distribution: Array<{ name: string; value: number; color: string }>;
  monthly_applications: Array<{ month: string; applications: number }>;
};

const emptyAnalytics: RecruiterAnalytics = {
  total_applicants: 0,
  recommended_by_ai: 0,
  needs_review: 0,
  shortlisted: 0,
  ai_recommendation_distribution: [
    { name: 'Strong Fit', value: 0, color: '#10b981' },
    { name: 'Good Fit', value: 0, color: '#3b82f6' },
    { name: 'Needs Review', value: 0, color: '#f59e0b' },
    { name: 'Low Fit', value: 0, color: '#ef4444' },
  ],
  monthly_applications: [],
};

export function RecruiterOverview({ recruiterName, recruiterId }: RecruiterOverviewProps) {
  const [analytics, setAnalytics] = useState<RecruiterAnalytics>(emptyAnalytics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (recruiterId == null) {
      setAnalytics(emptyAnalytics);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${getApiBase()}/recruiter/analytics?recruiter_id=${recruiterId}`)
      .then((res) => (res.ok ? res.json() : emptyAnalytics))
      .then((data: RecruiterAnalytics) => {
        if (!cancelled) setAnalytics(data);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load analytics');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [recruiterId]);

  return (
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

      {/* Main Content - full width */}
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="w-full">
          <h2 className="text-xl font-medium text-gray-800 mb-6">Recruitment Analytics</h2>
          {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Applicants */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Total Applicants</p>
              <p className="text-3xl font-semibold text-gray-900">
                {loading ? '…' : analytics.total_applicants}
              </p>
            </div>

            {/* Candidates Needing Review */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Needs Review</p>
              <p className="text-3xl font-semibold text-gray-900">
                {loading ? '…' : analytics.needs_review}
              </p>
            </div>

            {/* Shortlisted Candidates */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Shortlisted</p>
              <p className="text-3xl font-semibold text-gray-900">
                {loading ? '…' : analytics.shortlisted}
              </p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-6">Monthly Applications</h3>
            <div style={{ width: '100%', height: '256px', minHeight: '256px' }}>
              <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                <BarChart data={analytics.monthly_applications}>
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
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="applications" fill="#000000" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
