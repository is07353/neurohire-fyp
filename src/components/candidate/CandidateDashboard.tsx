import { useState } from 'react';
import { LanguageSelection } from '../LanguageSelection';
import { JobSelection } from '../JobSelection';
import { CVUpload } from '../CVUpload';
import { CVProcessingScreen } from '../CVProcessingScreen';
import { ReviewInformation } from '../ReviewInformation';
import { VideoInterview } from '../VideoInterview';
import { SubmissionComplete } from '../SubmissionComplete';
import { ProgressIndicator } from '../ProgressIndicator';
import { ArrowLeft } from 'lucide-react';
import { getApiBase } from '@/lib/apiConfig';

export type Language = 'english' | 'urdu' | null;

export interface Job {
  id: string;
  title: string;
  location: string;
  type: string;
}

export interface CandidateInfo {
  fullName: string;
  phone: string;
  email: string;
  address: string;
}

interface CandidateDashboardProps {
  onBackToLanding: () => void;
}

export function CandidateDashboard({ onBackToLanding }: CandidateDashboardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [language, setLanguage] = useState<Language>(null);
  const [audioGuidanceEnabled, setAudioGuidanceEnabled] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isProcessingCV, setIsProcessingCV] = useState(false);
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo>({
    fullName: '',
    phone: '',
    email: '',
    address: '',
  });

  const totalSteps = 6;

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
  };

  const handleLanguageContinue = () => {
    if (language) {
      setCurrentStep(2);
    }
  };

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
  };

  const handleJobContinue = async () => {
    if (!selectedJob) return;
    try {
      const payload = {
        job_id: selectedJob.id,
        title: selectedJob.title,
        location: selectedJob.location,
        company_name: (selectedJob as { companyName?: string }).companyName ?? undefined,
        branch_name: (selectedJob as { branchName?: string }).branchName ?? undefined,
        job_description: (selectedJob as { jobDescription?: string }).jobDescription ?? undefined,
      };
      await fetch(`${getApiBase()}/candidate/selected-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (_err) {
      // Continue to next step even if backend call fails (e.g. offline)
    }
    setCurrentStep(3);
  };

  const handleCVUpload = (file: File) => {
    setCvFile(file);
  };

  const handleCVContinue = () => {
    if (cvFile) {
      setIsProcessingCV(true);
      // CVProcessingScreen polls /candidate/analysis-status and calls onComplete when backend has finished CV analysis
    }
  };

  const handleProcessingComplete = () => {
    setIsProcessingCV(false);
    setCurrentStep(4);
  };

  const handleReuploadCV = () => {
    setCvFile(null);
    setCandidateInfo({
      fullName: '',
      phone: '',
      email: '',
      address: '',
    });
    setCurrentStep(3);
  };

  const handleInfoUpdate = (info: CandidateInfo) => {
    setCandidateInfo(info);
  };

  const handleInfoContinue = () => {
    setCurrentStep(5);
  };

  const handleVideoComplete = () => {
    setCurrentStep(6);
  };

  const handleFinish = () => {
    setCurrentStep(1);
    setLanguage(null);
    setSelectedJob(null);
    setCvFile(null);
    setCandidateInfo({
      fullName: '',
      phone: '',
      email: '',
      address: '',
    });
    onBackToLanding();
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-white relative">
      {/* CV Processing Screen - Full Screen Overlay */}
      {isProcessingCV && (
        <CVProcessingScreen
          language={language}
          onComplete={handleProcessingComplete}
        />
      )}

      {/* Progress Indicator */}
      {!isProcessingCV && currentStep > 0 && currentStep <= totalSteps && (
        <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} language={language} />
      )}
      
      {/* Back button - positioned in top left */}
      {!isProcessingCV && currentStep === 1 && (
        <button
          onClick={onBackToLanding}
          className="fixed top-6 left-6 flex items-center gap-2 text-[#000000] hover:underline z-[100]"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
      )}
      
      {!isProcessingCV && currentStep > 1 && currentStep < 6 && (
        <button
          onClick={handleBack}
          className="fixed top-6 left-6 flex items-center gap-2 text-[#000000] hover:underline z-[100]"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
      )}
      
      {!isProcessingCV && (
        <div className="max-w-4xl mx-auto px-6 py-8">
          {currentStep === 1 && (
            <LanguageSelection
              language={language}
              onLanguageSelect={handleLanguageSelect}
              onContinue={handleLanguageContinue}
              audioGuidanceEnabled={audioGuidanceEnabled}
              onAudioGuidanceChange={setAudioGuidanceEnabled}
            />
          )}
          
          {currentStep === 2 && (
            <JobSelection
              language={language}
              selectedJob={selectedJob}
              onJobSelect={handleJobSelect}
              onContinue={handleJobContinue}
              audioGuidanceEnabled={audioGuidanceEnabled}
            />
          )}
          
          {currentStep === 3 && (
            <CVUpload
              language={language}
              cvFile={cvFile}
              onCVUpload={handleCVUpload}
              onContinue={handleCVContinue}
              audioGuidanceEnabled={audioGuidanceEnabled}
            />
          )}
          
          {currentStep === 4 && (
            <ReviewInformation
              language={language}
              candidateInfo={candidateInfo}
              onInfoUpdate={handleInfoUpdate}
              onReupload={handleReuploadCV}
              onContinue={handleInfoContinue}
              audioGuidanceEnabled={audioGuidanceEnabled}
            />
          )}
          
          {currentStep === 5 && (
            <VideoInterview
              language={language}
              jobId={selectedJob?.id ?? null}
              onComplete={handleVideoComplete}
              audioGuidanceEnabled={audioGuidanceEnabled}
            />
          )}
          
          {currentStep === 6 && (
            <SubmissionComplete
              language={language}
              onFinish={handleFinish}
              audioGuidanceEnabled={audioGuidanceEnabled}
            />
          )}
        </div>
      )}
    </div>
  );
}