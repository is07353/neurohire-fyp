import { useState } from 'react';
import { CandidateDashboard } from './components/candidate/CandidateDashboard';
import { SplashScreen } from './components/SplashScreen';
import { RoleLanding } from './components/recruiter/RoleLanding';
import { RecruiterLogin } from './components/recruiter/RecruiterLogin';
import { RecruiterSignUp } from './components/recruiter/RecruiterSignUp';
import { CompanyLogin } from './components/recruiter/CompanyLogin';
import { CompanySignUp } from './components/recruiter/CompanySignUp';
import { RecruiterDashboard } from './components/recruiter/RecruiterDashboard';
import { ViewApplicants } from './components/recruiter/ViewApplicants';
import { CandidateReview } from './components/recruiter/CandidateReview';
import { EditJob } from './components/recruiter/EditJob';
import { AddJob } from './components/recruiter/AddJob';
import { AdminDashboard } from './components/recruiter/AdminDashboard';
import { CompanyDashboard } from './components/recruiter/CompanyDashboard';

export type AppView = 
  | 'splash'
  | 'landing'
  | 'candidate'
  | 'recruiter-login'
  | 'recruiter-signup'
  | 'recruiter-dashboard'
  | 'view-applicants'
  | 'candidate-review'
  | 'edit-job'
  | 'add-job'
  | 'company-login'
  | 'company-signup'
  | 'company-dashboard'
  | 'super-admin-login'
  | 'super-admin-dashboard';

export interface Job {
  id: string;
  title: string;
  location: string;
  applicantCount: number;
  cvWeight: number;
  videoWeight: number;
  status: 'open' | 'closed';
  companyName?: string;
  branchName?: string;
}

export interface Applicant {
  id: string;
  name: string;
  jobId: string;
  cvScore: number;
  videoScore: number;
  status: 'pending' | 'accepted' | 'rejected' | 'interview';
}

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('splash');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [recruiterName, setRecruiterName] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');

  const handleRoleSelect = (role: 'candidate' | 'recruiter' | 'admin' | 'super-admin') => {
    if (role === 'candidate') {
      setCurrentView('candidate');
    } else if (role === 'recruiter') {
      setCurrentView('recruiter-login');
    } else if (role === 'admin') {
      setCurrentView('company-login');
    } else if (role === 'super-admin') {
      setCurrentView('super-admin-login');
    }
  };

  const handleRecruiterLogin = (name: string) => {
    setRecruiterName(name);
    setCurrentView('recruiter-dashboard');
  };

  const handleCompanyLogin = (name: string) => {
    setCompanyName(name);
    setCurrentView('company-dashboard');
  };

  const handleAdminLogin = () => {
    setCurrentView('super-admin-dashboard');
  };

  const handleLogout = () => {
    setRecruiterName('');
    setSelectedJob(null);
    setSelectedApplicant(null);
    setCurrentView('landing');
  };

  const handleViewApplicants = (job: Job) => {
    setSelectedJob(job);
    setCurrentView('view-applicants');
  };

  const handleReviewApplicant = (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setCurrentView('candidate-review');
  };

  const handleBackToApplicants = () => {
    setSelectedApplicant(null);
    setCurrentView('view-applicants');
  };

  const handleBackToMyJobs = () => {
    setSelectedJob(null);
    setCurrentView('recruiter-dashboard');
  };

  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    setCurrentView('edit-job');
  };

  const handleAddJob = () => {
    setCurrentView('add-job');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'splash' && (
        <SplashScreen onGetStarted={() => setCurrentView('landing')} />
      )}
      
      {currentView === 'landing' && (
        <RoleLanding onRoleSelect={handleRoleSelect} />
      )}
      
      {currentView === 'candidate' && (
        <CandidateDashboard onBackToLanding={() => setCurrentView('landing')} />
      )}
      
      {currentView === 'recruiter-login' && (
        <RecruiterLogin 
          onLogin={handleRecruiterLogin}
          onBack={() => setCurrentView('landing')}
          onSignUp={() => setCurrentView('recruiter-signup')}
        />
      )}
      
      {currentView === 'recruiter-signup' && (
        <RecruiterSignUp 
          onSignUp={(data) => {
            // Use fullName from signup data
            setRecruiterName(data.fullName);
            setCurrentView('recruiter-dashboard');
          }}
          onBackToLogin={() => setCurrentView('recruiter-login')}
        />
      )}
      
      {currentView === 'recruiter-dashboard' && (
        <RecruiterDashboard
          recruiterName={recruiterName}
          onLogout={handleLogout}
          onViewApplicants={handleViewApplicants}
          onEditJob={handleEditJob}
          onAddJob={handleAddJob}
        />
      )}
      
      {currentView === 'view-applicants' && selectedJob && (
        <ViewApplicants
          job={selectedJob}
          recruiterName={recruiterName}
          onBack={handleBackToMyJobs}
          onLogout={handleLogout}
          onReviewApplicant={handleReviewApplicant}
        />
      )}
      
      {currentView === 'candidate-review' && selectedApplicant && selectedJob && (
        <CandidateReview
          applicant={selectedApplicant}
          job={selectedJob}
          recruiterName={recruiterName}
          onBack={handleBackToApplicants}
          onLogout={handleLogout}
        />
      )}
      
      {currentView === 'edit-job' && selectedJob && (
        <EditJob
          job={selectedJob}
          recruiterName={recruiterName}
          onBack={handleBackToMyJobs}
          onLogout={handleLogout}
        />
      )}
      
      {currentView === 'add-job' && (
        <AddJob
          recruiterName={recruiterName}
          onBack={handleBackToMyJobs}
          onLogout={handleLogout}
        />
      )}
      
      {currentView === 'company-login' && (
        <CompanyLogin 
          onLogin={handleCompanyLogin}
          onBack={() => setCurrentView('landing')}
          onSignUp={() => setCurrentView('company-signup')}
        />
      )}
      
      {currentView === 'company-signup' && (
        <CompanySignUp 
          onSignUp={(data) => {
            // Use companyName from signup data
            setCompanyName(data.companyName);
            setCurrentView('company-dashboard');
          }}
          onBackToLogin={() => setCurrentView('company-login')}
        />
      )}
      
      {currentView === 'super-admin-login' && (
        <RecruiterLogin 
          onLogin={handleAdminLogin}
          onBack={() => setCurrentView('landing')}
          title="Super Admin Login"
        />
      )}
      
      {currentView === 'company-dashboard' && (
        <CompanyDashboard
          companyName={companyName}
          onLogout={handleLogout}
        />
      )}
      
      {currentView === 'super-admin-dashboard' && (
        <AdminDashboard
          role="Super Admin"
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}