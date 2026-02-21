import { useState, useEffect } from 'react';
import { User, CheckCircle, XCircle, ChevronDown, ArrowLeft, AlertTriangle, Download, Brain, ChevronLeft, ChevronRight } from 'lucide-react';
import neurohireLogo from '@/assets/neurohire-logo-2.png';
import type { Applicant, Job } from '../../App';
import { getApiBase } from '@/lib/apiConfig';

interface ReviewData {
  cv_score: number | null;
  cv_matching_analysis: string | null;
  cv_reason_summary: string | null;
}

interface CandidateReviewProps {
  applicant: Applicant;
  job: Job;
  recruiterName: string;
  onBack: () => void;
  onLogout: () => void;
}

export function CandidateReview({
  applicant,
  job,
  recruiterName,
  onBack,
  onLogout,
}: CandidateReviewProps) {
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'accept' | 'interview' | 'reject' | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [jobQuestions, setJobQuestions] = useState<string[]>([]);
  const [videoSubmissions, setVideoSubmissions] = useState<
    Array<{
      question_index: number;
      question_text: string;
      video_url: string;
      video_score: number | null;
      confidence_score?: number | null;
      clarity?: number | null;
      answer_relevance?: number | null;
      speech_analysis?: string | null;
    }>
  >([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [cvUrl, setCvUrl] = useState<string | null>(null);

  useEffect(() => {
    const applicationId = applicant.id;
    if (!applicationId) {
      setReviewLoading(false);
      return;
    }
    let cancelled = false;
    setReviewLoading(true);
    fetch(`${getApiBase()}/recruiter/applications/${applicationId}/review`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ReviewData | null) => {
        if (!cancelled) setReviewData(data);
      })
      .catch(() => {
        if (!cancelled) setReviewData(null);
      })
      .finally(() => {
        if (!cancelled) setReviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applicant.id]);

  useEffect(() => {
    const jobId = job?.id;
    if (!jobId) return;
    let cancelled = false;
    fetch(`${getApiBase()}/recruiter/jobs/${jobId}/questions`)
      .then((res) => (res.ok ? res.json() : { questions: [] }))
      .then((data: { questions: string[] }) => {
        if (!cancelled) setJobQuestions(data.questions ?? []);
      })
      .catch(() => {
        if (!cancelled) setJobQuestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [job?.id]);

  useEffect(() => {
    const applicationId = applicant.id;
    if (!applicationId) return;
    let cancelled = false;
    fetch(`${getApiBase()}/recruiter/applications/${applicationId}/video-submissions`)
      .then((res) => (res.ok ? res.json() : { submissions: [] }))
      .then(
        (data: {
          submissions: Array<{
            question_index: number;
            question_text: string;
            video_url: string;
            video_score: number | null;
            confidence_score?: number | null;
            clarity?: number | null;
            answer_relevance?: number | null;
            speech_analysis?: string | null;
          }>;
        }) => {
          if (!cancelled) setVideoSubmissions(data.submissions ?? []);
        },
      )
      .catch(() => {
        if (!cancelled) setVideoSubmissions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [applicant.id]);

  useEffect(() => {
    const applicationId = applicant.id;
    if (!applicationId) return;
    let cancelled = false;
    fetch(`${getApiBase()}/recruiter/applications/${applicationId}/cv`)
      .then((res) => (res.ok ? res.json() : { cv_url: null }))
      .then((data: { cv_url: string | null }) => {
        if (!cancelled) setCvUrl(data.cv_url ?? null);
      })
      .catch(() => {
        if (!cancelled) setCvUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [applicant.id]);

  const cvScore = reviewData?.cv_score ?? applicant.cvScore ?? 0;
  const videoScore = applicant.videoScore ?? 0;
  const totalScore = applicant.totalScore ?? null;
  
  // AI recommendation based on total score: 0-33 reject, 34-66 interview, 67-100 accept
  const aiRecommendation: 'accept' | 'interview' | 'reject' = 
    totalScore === null 
      ? 'interview' // Default to interview if score not calculated yet
      : totalScore >= 67 
        ? 'accept'
        : totalScore >= 34 
          ? 'interview'
          : 'reject';

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const cvMatchingLines = reviewData?.cv_matching_analysis
    ? reviewData.cv_matching_analysis.split('\n').filter((s) => s.trim())
    : [];

  // Pair each job question (from job_questions table) with its recorded video (from video_submissions table)
  const videoSlides =
    jobQuestions.length > 0
      ? jobQuestions.map((questionText, i) => ({
          questionText,
          submission: videoSubmissions.find((s) => s.question_index === i) ?? null,
        }))
      : videoSubmissions.length > 0
        ? videoSubmissions.map((s) => ({ questionText: s.question_text, submission: s }))
        : [{ questionText: 'No video questions for this job.', submission: null as typeof videoSubmissions[0] | null }];

  const safeVideoIndex = Math.min(currentVideoIndex, Math.max(0, videoSlides.length - 1));
  const currentSlide = videoSlides[safeVideoIndex] ?? videoSlides[0];
  const currentSubmission = currentSlide?.submission ?? null;
  const hasMultipleSlides = videoSlides.length > 1;

  useEffect(() => {
    setCurrentVideoIndex(0);
  }, [applicant.id, job?.id]);

  const handleAction = (action: 'accept' | 'interview' | 'reject') => {
    // Show warning if action differs from AI recommendation
    if (action !== aiRecommendation) {
      setShowWarning(true);
    }
    setModalType(action);
    setShowModal(true);
  };

  const [decisionError, setDecisionError] = useState<string | null>(null);

  const confirmAction = async () => {
    if (!modalType || !applicant.id) return;
    setDecisionError(null);
    try {
      const res = await fetch(`${getApiBase()}/recruiter/applications/${applicant.id}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: modalType }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || `Failed to save decision (${res.status})`);
      }
      setShowModal(false);
      setShowWarning(false);
      onBack();
    } catch (e) {
      setDecisionError(e instanceof Error ? e.message : 'Failed to save decision.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white px-8 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <img src={neurohireLogo} alt="neurohire" className="h-10" />
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
      </nav>

      {/* Back to Applicants - below neurohire logo (same px-8 as EditJob) */}
      <div className="px-8 pt-2 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-[#000000] transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Applicants</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-900 mb-1">
            Applicant
          </h1>
          <p className="text-gray-500 text-sm">
            Application ID: APP-{String(applicant.id).padStart(3, '0')}
          </p>
        </div>

        <div className={`rounded-xl p-6 mb-8 border shadow-sm ${
          aiRecommendation === 'accept'
            ? 'bg-green-50 border-green-200'
            : aiRecommendation === 'reject'
            ? 'bg-red-50 border-red-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-lg ${
              aiRecommendation === 'accept' 
                ? 'bg-green-100' 
                : aiRecommendation === 'reject'
                ? 'bg-red-100'
                : 'bg-blue-100'
            }`}>
              <Brain className={`w-6 h-6 ${
                aiRecommendation === 'accept' 
                  ? 'text-green-600' 
                  : aiRecommendation === 'reject'
                  ? 'text-red-600'
                  : 'text-blue-600'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">AI Recommendation</h3>
              <p className="text-gray-700">
                {aiRecommendation === 'accept'
                  ? `This candidate is recommended for immediate acceptance based on high total score (${totalScore ?? 'N/A'}%).`
                  : aiRecommendation === 'reject'
                  ? `This candidate is not recommended based on low total score (${totalScore ?? 'N/A'}%).`
                  : `This candidate is recommended for a human interview to assess further (total score: ${totalScore ?? 'N/A'}%).`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">CV Preview</h3>
            <div className="bg-gray-100 rounded-lg overflow-hidden mb-4 border border-gray-200" style={{ height: '320px' }}>
              {cvUrl ? (
                <iframe
                  src={cvUrl}
                  className="w-full h-full"
                  title="CV PDF Viewer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                  No CV uploaded for this application.
                </div>
              )}
            </div>
            <div className="flex gap-3 mb-4">
              <a
                href={cvUrl ?? '#'}
                download
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 font-medium border-2 ${
                  cvUrl ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-gray-200 text-gray-400 cursor-not-allowed pointer-events-none'
                }`}
              >
                <Download className="w-4 h-4" />
                Download CV
              </a>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <span className="text-gray-600 text-sm">CV Score: </span>
              <span className="font-semibold text-gray-900 text-lg">
                {reviewLoading ? '…' : reviewData?.cv_score != null ? `${cvScore}%` : '—'}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">What the AI Found from the CV</h3>
              <p className="text-xs text-gray-500 mb-4">
                This analysis is based on CV compared to job requirements.
              </p>
              <ul className="space-y-3">
                {reviewLoading ? (
                  <li className="text-sm text-gray-500">Loading…</li>
                ) : cvMatchingLines.length > 0 ? (
                  cvMatchingLines.map((line, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="text-[#FF13F0] mt-1 text-lg">•</span>
                      <span className="text-sm text-gray-700 leading-relaxed flex-1">{line.trim()}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-500">No CV matching analysis available.</li>
                )}
              </ul>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Summary (CV-Based)</h3>
              <p className="text-xs text-gray-500 mb-4">
                Generated using CV and job description only.
              </p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {reviewLoading ? '…' : reviewData?.cv_reason_summary ?? 'No AI summary available.'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Video Interview</h3>
          <p className="text-sm text-gray-500 mb-4">
            Use the arrows to move between questions. Each slide: job question → video response → score & analysis.
          </p>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Question {safeVideoIndex + 1} of {videoSlides.length}
              </p>
              <p className="text-sm text-gray-900">{currentSlide?.questionText ?? '—'}</p>
            </div>

            <div className="rounded-lg overflow-hidden border border-gray-200 bg-black aspect-video flex items-center justify-center">
              {currentSlide?.submission?.video_url ? (
                <video
                  key={currentSlide.submission.video_url}
                  src={currentSlide.submission.video_url}
                  controls
                  className="w-full h-full object-contain"
                  preload="metadata"
                  playsInline
                />
              ) : (
                <div className="text-white/80 text-sm">No video recorded for this question.</div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-200">
              <span className="text-gray-600 text-sm">Video Score (this question): </span>
              <span className="font-semibold text-gray-900 text-lg">
                {currentSubmission?.video_score != null
                  ? `${currentSubmission.video_score}%`
                  : videoScore
                    ? `${videoScore}%`
                    : '—'}
              </span>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">AI Evaluation Metrics</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <div className="text-xs text-purple-600 font-medium mb-1">Confidence</div>
                  <div className="text-lg font-bold text-purple-900">
                    {reviewLoading
                      ? '…'
                      : currentSubmission?.confidence_score != null
                        ? `${currentSubmission.confidence_score}%`
                        : '—'}
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <div className="text-xs text-blue-600 font-medium mb-1">Clarity</div>
                  <div className="text-lg font-bold text-blue-900">
                    {reviewLoading
                      ? '…'
                      : currentSubmission?.clarity != null
                        ? `${currentSubmission.clarity}%`
                        : '—'}
                  </div>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                  <div className="text-xs text-indigo-600 font-medium mb-1">Answer Relevance</div>
                  <div className="text-lg font-bold text-indigo-900">
                    {reviewLoading
                      ? '…'
                      : currentSubmission?.answer_relevance != null
                        ? `${currentSubmission.answer_relevance}%`
                        : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Speech Analysis Insights</h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                {reviewLoading
                  ? '…'
                  : currentSubmission?.speech_analysis ?? 'No speech analysis available.'}
              </p>
            </div>
          </div>

          {hasMultipleSlides && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setCurrentVideoIndex((i) => Math.max(0, i - 1))}
                disabled={safeVideoIndex === 0}
                className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous question"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex gap-2">
                {videoSlides.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setCurrentVideoIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === safeVideoIndex ? 'bg-[#FF13F0] w-8' : 'bg-gray-300 w-2'
                    }`}
                    aria-label={`Question ${index + 1}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setCurrentVideoIndex((i) => Math.min(videoSlides.length - 1, i + 1))}
                disabled={safeVideoIndex >= videoSlides.length - 1}
                className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next question"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-5">Recruiter Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleAction('accept')}
              className="bg-green-600 text-white py-3.5 px-6 rounded-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 font-medium shadow-sm"
            >
              <CheckCircle className="w-5 h-5" />
              Accept Candidate
            </button>
            <button
              onClick={() => handleAction('interview')}
              className="bg-blue-600 text-white py-3.5 px-6 rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 font-medium shadow-sm"
            >
              <User className="w-5 h-5" />
              Send to Human Interview
            </button>
            <button
              onClick={() => handleAction('reject')}
              className="bg-red-600 text-white py-3.5 px-6 rounded-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 font-medium shadow-sm"
            >
              <XCircle className="w-5 h-5" />
              Reject Candidate
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-6">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
            {showWarning && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-1">Warning</h4>
                    <p className="text-sm text-yellow-800">
                      Your decision differs from the AI recommendation. Are you sure you want to proceed?
                    </p>
                  </div>
                </div>
              </div>
            )}
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              Confirm Action
            </h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to{' '}
              <strong>
                {modalType === 'accept' && 'accept'}
                {modalType === 'interview' && 'send to human interview'}
                {modalType === 'reject' && 'reject'}
              </strong>{' '}
              {applicant.name}? This will be saved to the application.
            </p>
            {decisionError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {decisionError}
              </div>
            )}
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  setShowWarning(false);
                  setDecisionError(null);
                }}
                className="flex-1 border-2 border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmAction()}
                className="flex-1 bg-[#FF13F0] text-white py-2.5 px-4 rounded-lg hover:bg-[#FF13F0]/90 transition-all font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
