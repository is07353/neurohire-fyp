import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, Briefcase, UserCheck, TrendingUp, Clock } from 'lucide-react';
import neurohireLogo from '@/assets/neurohire-logo.png';

interface CompanyOverviewProps {
  companyName: string;
}

// Mock data for applicants per recruiter
const recruiterData = [
  { recruiter: 'Ahmed Khan', applicants: 89 },
  { recruiter: 'Sara Ali', applicants: 67 },
  { recruiter: 'Usman Malik', applicants: 54 },
  { recruiter: 'Ayesha Tariq', applicants: 43 },
  { recruiter: 'Hassan Raza', applicants: 38 },
];

// Mock data for job status distribution
const jobStatusData = [
  { name: 'Open Jobs', value: 28, color: '#10b981' },
  { name: 'Closed Jobs', value: 12, color: '#6b7280' },
  { name: 'In Review', value: 5, color: '#f59e0b' },
];

// Mock data for monthly hiring trends
const monthlyHiringData = [
  { month: 'Sep', jobs: 12, applicants: 156 },
  { month: 'Oct', jobs: 15, applicants: 198 },
  { month: 'Nov', jobs: 18, applicants: 234 },
  { month: 'Dec', jobs: 14, applicants: 187 },
  { month: 'Jan', jobs: 22, applicants: 291 },
  { month: 'Feb', jobs: 19, applicants: 267 },
];

export function CompanyOverview({ companyName }: CompanyOverviewProps) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl text-gray-800">Company Dashboard</h1>
          <img src={neurohireLogo} alt="NeuroHire" className="h-8" />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="max-w-7xl">
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
              <p className="text-3xl font-semibold text-gray-900">45</p>
              <p className="text-xs text-gray-500 mt-1">28 Active • 12 Closed • 5 In Review</p>
            </div>

            {/* Total Applicants */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Total Applicants</p>
              <p className="text-3xl font-semibold text-gray-900">291</p>
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
              <p className="text-3xl font-semibold text-gray-900">5</p>
              <p className="text-xs text-gray-500 mt-1">4 Active • 1 Pending</p>
            </div>

            {/* Avg Applicants per Job */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Avg. Applicants/Job</p>
              <p className="text-3xl font-semibold text-gray-900">6.5</p>
              <p className="text-xs text-gray-500 mt-1">+12% from last month</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Applicants per Recruiter */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-6">Applicants per Recruiter</h3>
              <div style={{ width: '100%', height: '320px', minHeight: '320px' }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                  <BarChart data={recruiterData} layout="vertical">
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
                      data={jobStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {jobStatusData.map((entry, index) => (
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
                <BarChart data={monthlyHiringData}>
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