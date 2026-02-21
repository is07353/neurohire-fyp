import React, { useState, useEffect, useRef } from 'react';
import type { Job } from '../App';
import { MapPin, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { getApiBase } from '@/lib/apiConfig';
import { useTts } from '@/components/candidate/tts/useTts';

type Language = 'english' | 'urdu' | null;

interface JobSelectionProps {
  language: Language;
  selectedJob: Job | null;
  onJobSelect: (job: Job) => void;
  onContinue: () => void;
  audioGuidanceEnabled?: boolean;
}

interface ExtendedJob extends Job {
  type?: string;
  companyName?: string;
  branchName?: string;
  minExperience: number;
  minExperienceUr?: string | null;
  skills: string[];
  workMode: string[];
  salary: number;
  salaryUr?: string | null;
  otherRequirements: string;
  jobDescription?: string;
}

/** Map API job shape to ExtendedJob. When API is called with lang=ur, title/company/location/skills/workMode/otherRequirements are already in Urdu. */
function mapApiJobToExtended(api: Record<string, unknown>): ExtendedJob {
  const workMode = (api.workMode as string[]) ?? [];
  return {
    id: String(api.id ?? ''),
    title: String(api.title ?? ''),
    location: String(api.location ?? ''),
    companyName: String(api.company_name ?? ''),
    branchName: String(api.branch_name ?? ''),
    applicantCount: 0,
    cvWeight: Number(api.cv_score_weightage ?? 50),
    videoWeight: Number(api.video_score_weightage ?? 50),
    status: (api.status === 'closed' ? 'closed' : 'open') as 'open' | 'closed',
    type: String(api.type ?? 'Full-time'),
    minExperience: Number(api.minExperience ?? 0),
    minExperienceUr: api.minExperienceUr != null ? String(api.minExperienceUr) : undefined,
    skills: Array.isArray(api.skills) ? (api.skills as string[]) : [],
    workMode: workMode.map((m) => (typeof m === 'string' ? (m === 'REMOTE' ? 'Remote' : m === 'ONSITE' ? 'Onsite' : m) : String(m))),
    salary: Number(api.salary ?? 0),
    salaryUr: api.salaryUr != null ? String(api.salaryUr) : undefined,
    otherRequirements: String(api.otherRequirements ?? ''),
    jobDescription: String(api.job_description ?? ''),
  };
}

const translations = {
  english: {
    title: 'Select a Job Position',
    searchPlaceholder: 'Search job by title',
    selectButton: 'Select',
    continueButton: 'Continue',
    minExperience: 'Minimum Experience',
    years: 'years',
    year: 'year',
    location: 'Location',
    salary: 'PKR',
    perMonth: '/ month',
    viewDescription: 'View complete job description',
    hideDescription: 'Hide job description',
    otherRequirements: 'Other Requirements',
  },
  urdu: {
    title: 'ملازمت کا انتخاب کریں',
    searchPlaceholder: 'عنوان سے ملازمت تلاش کریں',
    selectButton: 'منتخب کریں',
    continueButton: 'جاری رکھیں',
    minExperience: 'کم از کم تجربہ',
    years: 'سال',
    year: 'سال',
    location: 'مقام',
    salary: 'PKR',
    perMonth: '/ ماہ',
    viewDescription: 'مکمل تفصیل دیکھیں',
    hideDescription: 'تفصیل چھپائیں',
    otherRequirements: 'دیگر تقاضے',
  },
};

export function JobSelection({ language, selectedJob, onJobSelect, onContinue, audioGuidanceEnabled = false }: JobSelectionProps) {
  const t = translations[language || 'english'];
  const { speak } = useTts(language);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<ExtendedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const didSpeakTitleRef = useRef(false);

  const langParam = language === 'urdu' ? 'ur' : 'en';

  // Read "Select a Job Position" (or Urdu title) when Audio Guidance is on and page loads
  useEffect(() => {
    if (!audioGuidanceEnabled || !language || didSpeakTitleRef.current) return;
    didSpeakTitleRef.current = true;
    speak(t.title);
  }, [audioGuidanceEnabled, language, t.title, speak]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${getApiBase()}/candidate/jobs?lang=${langParam}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load jobs: ${res.status}`);
        return res.json();
      })
      .then((data: unknown[]) => {
        if (!cancelled && Array.isArray(data)) {
          setJobs(data.map((item) => mapApiJobToExtended(item as Record<string, unknown>)));
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load jobs');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [langParam]);

  // Filter jobs based on search query
  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpand = (jobId: string) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };

  return (
    <div className="py-8">
      {/* Page Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-medium text-[#000000] mb-6">
          {t.title}
        </h1>
        
        {/* Search Bar */}
        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#FF13F0] transition-colors"
          />
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-xl">Loading jobs…</p>
        </div>
      )}
      {error && !loading && (
        <div className="text-center py-12 text-red-600">
          <p className="text-xl">{error}</p>
          <p className="text-sm mt-2">Ensure the backend is running at {getApiBase()}</p>
        </div>
      )}
      
      {/* Job Cards */}
      {!loading && !error && (
      <div className="space-y-6 mb-12">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            className={`p-6 rounded-lg border-2 transition-all ${
              selectedJob?.id === job.id
                ? 'border-[#FF13F0] bg-[#FFF5FE] shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {/* Job Card Header */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-4">
              <div className="flex-1 space-y-4">
                {/* Job Title */}
                <h2 className="text-2xl font-bold text-[#000000]">{job.title}</h2>
                {/* Company name and branch name below title */}
                {(job.companyName || job.branchName) && (
                  <p className="text-base text-gray-600">
                    {[job.companyName, job.branchName].filter(Boolean).join(' · ')}
                  </p>
                )}
                
                {/* Minimum Experience (use Urdu string when available and language is Urdu) */}
                <div className="text-base text-gray-700">
                  <span className="font-medium">{t.minExperience}:</span>{' '}
                  {language === 'urdu' && job.minExperienceUr ? job.minExperienceUr : `${job.minExperience} ${job.minExperience === 1 ? t.year : t.years}`}
                </div>
                
                {/* Skills */}
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full border border-gray-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                
                {/* Location and Work Mode */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-4 h-4" />
                    <span>{job.location}</span>
                  </div>
                  {job.workMode.map((mode, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-[#000000] text-white text-sm rounded-full"
                    >
                      {mode}
                    </span>
                  ))}
                </div>
                
                {/* Salary (use Urdu string when available and language is Urdu) */}
                <div className="text-lg font-medium text-[#000000]">
                  {language === 'urdu' && job.salaryUr ? job.salaryUr : `${t.salary} ${job.salary.toLocaleString()} ${t.perMonth}`}
                </div>
              </div>
              
              {/* Select Button */}
              <button
                onClick={() => onJobSelect(job)}
                className={`px-8 py-3 rounded-lg text-lg font-medium transition-all whitespace-nowrap self-start ${
                  selectedJob?.id === job.id
                    ? 'bg-[#FF13F0] text-white'
                    : 'bg-white text-[#000000] border-2 border-[#000000] hover:bg-[#000000] hover:text-white'
                }`}
              >
                {selectedJob?.id === job.id ? '✓ ' : ''}{t.selectButton}
              </button>
            </div>
            
            {/* View Complete Description Link */}
            <button
              onClick={() => toggleExpand(job.id)}
              className="flex items-center gap-2 text-[#FF13F0] hover:underline text-base mt-2"
            >
              {expandedJobId === job.id ? t.hideDescription : t.viewDescription}
              {expandedJobId === job.id ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            
            {/* Expandable Section - Other Requirements */}
            {expandedJobId === job.id && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-[#000000] mb-3">
                  {t.otherRequirements}
                </h3>
                <p className="text-base text-gray-700 leading-relaxed">
                  {job.otherRequirements}
                </p>
              </div>
            )}
          </div>
        ))}
        
        {/* No Results Message */}
        {filteredJobs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-xl">No jobs found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
      )}
      
      {/* Continue Button */}
      <button
        onClick={onContinue}
        disabled={!selectedJob}
        className={`w-full py-5 px-8 rounded-lg text-xl font-medium transition-all ${
          selectedJob
            ? 'bg-[#000000] text-white hover:bg-[#333333] active:bg-[#000000]'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {t.continueButton}
      </button>
    </div>
  );
}