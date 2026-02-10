import { Users, CheckCircle, AlertCircle, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface RecruiterOverviewProps {
  recruiterName: string;
}

// Mock data for monthly applications
const monthlyData = [
  { month: 'Sep', applications: 45 },
  { month: 'Oct', applications: 62 },
  { month: 'Nov', applications: 58 },
  { month: 'Dec', applications: 73 },
  { month: 'Jan', applications: 89 },
  { month: 'Feb', applications: 67 },
];

// Mock data for AI recommendations
const aiRecommendationData = [
  { name: 'Strong Fit', value: 28, color: '#10b981' },
  { name: 'Good Fit', value: 42, color: '#3b82f6' },
  { name: 'Needs Review', value: 18, color: '#f59e0b' },
  { name: 'Low Fit', value: 12, color: '#ef4444' },
];

export function RecruiterOverview({ recruiterName }: RecruiterOverviewProps) {
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

      {/* Main Content */}
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="max-w-7xl">
          <h2 className="text-xl font-medium text-gray-800 mb-6">Recruitment Analytics</h2>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Applicants */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Total Applicants</p>
              <p className="text-3xl font-semibold text-gray-900">89</p>
            </div>

            {/* Applicants Recommended by AI */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Recommended by AI</p>
              <p className="text-3xl font-semibold text-gray-900">70</p>
              <p className="text-xs text-gray-500 mt-1">Strong Fit + Good Fit</p>
            </div>

            {/* Candidates Needing Review */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Needs Review</p>
              <p className="text-3xl font-semibold text-gray-900">18</p>
            </div>

            {/* Shortlisted Candidates */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Star className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">Shortlisted</p>
              <p className="text-3xl font-semibold text-gray-900">34</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Applications */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-6">Monthly Applications</h3>
              <div style={{ width: '100%', height: '256px', minHeight: '256px' }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                  <BarChart data={monthlyData}>
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
                    <Bar dataKey="applications" fill="#000000" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI Recommendations Pie Chart */}
            <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-800 mb-6">Applicants by AI Recommendation</h3>
              <div style={{ width: '100%', height: '256px', minHeight: '256px' }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                  <PieChart>
                    <Pie
                      data={aiRecommendationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {aiRecommendationData.map((entry, index) => (
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
        </div>
      </div>
    </div>
  );
}