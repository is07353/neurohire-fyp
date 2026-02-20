import { useState, useEffect } from 'react';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import neurohireLogo from '@/assets/neurohire-logo-2.png';
import type { Job, Applicant } from '../../App';

const API_BASE =
  (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ??
  'http://127.0.0.1:8000';

interface ViewApplicantsProps {
  job: Job;
  recruiterName: string;
  onBack: () => void;
  onLogout: () => void;
  onReviewApplicant: (applicant: Applicant) => void;
}

type ApplicantRow = {
  application_id: number;
  candidate_id: number;
  job_id: number;
  status: string;
  candidate_name: string;
  candidate_email: string | null;
  candidate_phone: string | null;
  candidate_address: string | null;
  cv_score: number | null;
  video_score: number | null;
  total_score: number | null;
  analysis_progress: number;
  analysis_complete: boolean;
};

function toApplicant(row: ApplicantRow, jobId: string): Applicant {
  return {
    id: String(row.application_id),
    name: row.candidate_name,
    jobId,
    cvScore: row.cv_score ?? 0,
    videoScore: row.video_score ?? 0,
    totalScore: row.total_score ?? undefined,
    status: (row.status as Applicant['status']) || 'pending',
  };
}

export function ViewApplicants({
  job,
  recruiterName,
  onBack,
  onLogout,
  onReviewApplicant,
}: ViewApplicantsProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/recruiter/jobs/${job.id}/applicants`);
        if (!res.ok) throw new Error(`Failed to load applicants: ${res.status}`);
        const data = (await res.json()) as ApplicantRow[];
        if (!cancelled) setApplicants(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load applicants');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [job.id]);

  // Poll while any applicant is still being analyzed (progress < 100)
  const anyInProgress = applicants.some((a) => !a.analysis_complete);
  useEffect(() => {
    if (!anyInProgress) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/recruiter/jobs/${job.id}/applicants`);
        if (!res.ok) return;
        const data = (await res.json()) as ApplicantRow[];
        setApplicants(data);
      } catch {
        // ignore
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [job.id, anyInProgress]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation Bar */}
      <nav className="bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <img src={neurohireLogo} alt="neurohire" className="h-10" />
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className="w-10 h-10 bg-[#FF13F0] rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{getInitials(recruiterName)}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </button>
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Back to My Jobs - below neurohire logo (same px-8 as EditJob) */}
      <div className="px-8 pt-2 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-[#000000] transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Jobs</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="px-6 py-12 text-center text-gray-500">Loading applicants…</div>
            ) : error ? (
              <div className="px-6 py-12 text-center text-red-600">{error}</div>
            ) : applicants.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">No applicants for this job yet.</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Application ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Phone Number</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Location</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Analysis progress</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {applicants.map((applicant, index) => (
                      <tr
                        key={applicant.application_id}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-6 py-4 text-sm text-gray-900">
                          APP-{String(applicant.application_id).padStart(3, '0')}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-gray-900">{applicant.candidate_name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900 truncate block max-w-xs">
                            {applicant.candidate_email ?? '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{applicant.candidate_phone ?? '—'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">{applicant.candidate_address ?? '—'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 min-w-[120px]">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#FF13F0] rounded-full transition-all duration-500"
                                style={{ width: `${applicant.analysis_progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">
                              {applicant.analysis_complete ? 'Complete' : `${applicant.analysis_progress}%`}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => applicant.analysis_complete && onReviewApplicant(toApplicant(applicant, job.id))}
                            disabled={!applicant.analysis_complete}
                            className={
                              applicant.analysis_complete
                                ? 'bg-[#FF13F0] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#FF13F0]/80 transition-all whitespace-nowrap'
                                : 'bg-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm cursor-not-allowed whitespace-nowrap'
                            }
                          >
                            View Detailed Report
                          </button>
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
