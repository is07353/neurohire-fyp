import { useEffect, useState } from 'react';
import { Search, UserPlus, CheckCircle, XCircle, Clock, Mail, Phone, Building2 } from 'lucide-react';
import neurohireLogo from '@/assets/neurohire-logo-2.png';

interface CompanyRecruitersProps {
  companyName: string;
}

interface Recruiter {
  id: number;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  status: 'approved' | 'pending' | 'disabled';
  joinedDate: string;
  jobsPosted: number;
  totalApplicants: number;
}

const API_BASE =
  (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ??
  'http://127.0.0.1:8000';

export function CompanyRecruiters({ companyName }: CompanyRecruitersProps) {
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'disabled'>('all');

  useEffect(() => {
    let cancelled = false;
    const loadRecruiters = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/recruiter/company-recruiters?company_name=${encodeURIComponent(companyName)}`
        );
        if (!res.ok) {
          // eslint-disable-next-line no-console
          console.error('Failed to load recruiters', res.status);
          return;
        }
        const data = (await res.json()) as Recruiter[];
        if (!cancelled) {
          setRecruiters(data);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error loading recruiters', err);
      }
    };
    loadRecruiters();
    return () => {
      cancelled = true;
    };
  }, [companyName]);

  const handleApprove = async (recruiterId: number) => {
    try {
      const res = await fetch(`${API_BASE}/recruiter/${recruiterId}/approve`, {
        method: 'POST',
      });
      if (!res.ok) return;
      setRecruiters(recruiters.map(r =>
        r.id === recruiterId ? { ...r, status: 'approved' as const } : r
      ));
    } catch {
      // ignore for now
    }
  };

  const handleDisable = async (recruiterId: number) => {
    try {
      const res = await fetch(`${API_BASE}/recruiter/${recruiterId}/disable`, {
        method: 'POST',
      });
      if (!res.ok) return;
      setRecruiters(recruiters.map(r =>
        r.id === recruiterId ? { ...r, status: 'disabled' as const } : r
      ));
    } catch {
      // ignore for now
    }
  };

  const handleDelete = async (recruiterId: number) => {
    if (confirm('Are you sure you want to delete this recruiter? This action cannot be undone.')) {
      try {
        const res = await fetch(`${API_BASE}/recruiter/${recruiterId}`, {
          method: 'DELETE',
        });
        if (!res.ok) return;
        setRecruiters(recruiters.filter(r => r.id !== recruiterId));
      } catch {
        // ignore for now
      }
    }
  };

  const filteredRecruiters = recruiters.filter(recruiter => {
    const matchesSearch = 
      recruiter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recruiter.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recruiter.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || recruiter.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'disabled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl text-gray-800">Recruiters Management</h1>
          <img src={neurohireLogo} alt="NeuroHire" className="h-10" />
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
              placeholder="Search by name, email, or employee ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 transition-colors bg-white"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        {/* Summary Stats */}
        <div className="flex gap-6 mt-4 text-sm text-gray-600">
          <span>Total: <strong className="text-gray-900">{recruiters.length}</strong></span>
          <span>Approved: <strong className="text-green-700">{recruiters.filter(r => r.status === 'approved').length}</strong></span>
          <span>Pending: <strong className="text-yellow-700">{recruiters.filter(r => r.status === 'pending').length}</strong></span>
          <span>Disabled: <strong className="text-gray-700">{recruiters.filter(r => r.status === 'disabled').length}</strong></span>
        </div>
      </div>

      {/* Recruiters Table */}
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Recruiter</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Employee ID</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Role</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecruiters.map((recruiter, index) => (
                <tr 
                  key={recruiter.id} 
                  className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                    index === filteredRecruiters.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  {/* Recruiter Name */}
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{recruiter.name}</p>
                      <p className="text-sm text-gray-500">Joined {recruiter.joinedDate}</p>
                    </div>
                  </td>

                  {/* Employee ID */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700 font-mono">{recruiter.employeeId}</span>
                  </td>

                  {/* Role */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">{recruiter.role}</span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(recruiter.status)}`}>
                      {getStatusText(recruiter.status)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {recruiter.status === 'pending' && (
                        <button
                          onClick={() => handleApprove(recruiter.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Approve Recruiter"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      
                      {recruiter.status === 'approved' && (
                        <button
                          onClick={() => handleDisable(recruiter.id)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Disable Recruiter"
                        >
                          <Clock className="w-5 h-5" />
                        </button>
                      )}

                      {recruiter.status === 'disabled' && (
                        <button
                          onClick={() => handleApprove(recruiter.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Re-enable Recruiter"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDelete(recruiter.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Recruiter"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRecruiters.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No recruiters found matching your search criteria.
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Recruiter Approval Process</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Recruiters must be approved before they can access the platform and post jobs</li>
            <li>• You can disable recruiters temporarily or delete them permanently</li>
            <li>• Disabled recruiters cannot log in but their data is preserved</li>
            <li>• Deleted recruiters and their job postings will be permanently removed</li>
          </ul>
        </div>
      </div>
    </div>
  );
}