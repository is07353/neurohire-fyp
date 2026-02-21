import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, X, Plus, Trash2 } from 'lucide-react';
import neurohireLogo from '@/assets/neurohire-logo-2.png';
import type { Job } from '../../App';
import { getApiBase } from '@/lib/apiConfig';

interface EditJobProps {
  job: Job;
  recruiterName: string;
  onBack: () => void;
  onLogout: () => void;
}

export function EditJob({ job, recruiterName, onBack, onLogout }: EditJobProps) {
  const [title, setTitle] = useState(job.title);
  const [companyName, setCompanyName] = useState((job as { companyName?: string }).companyName ?? '');
  const [branchName, setBranchName] = useState((job as { branchName?: string }).branchName ?? '');
  const [location, setLocation] = useState(job.location);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [minExperience, setMinExperience] = useState(0);
  const [otherRequirements, setOtherRequirements] = useState('');
  const [workMode, setWorkMode] = useState<string[]>([]);
  const [salary, setSalary] = useState('0');
  const [questions, setQuestions] = useState<string[]>(['']);
  const [cvWeight, setCvWeight] = useState(job.cvWeight);
  const [videoWeight, setVideoWeight] = useState(job.videoWeight);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get initials from recruiter name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const toggleWorkMode = (mode: string) => {
    // Work mode should be single selection (Onsite OR Remote)
    setWorkMode([mode]);
  };

  const handleCvWeightChange = (value: number) => {
    setCvWeight(value);
    setVideoWeight(100 - value);
  };

  const handleVideoWeightChange = (value: number) => {
    setVideoWeight(value);
    setCvWeight(100 - value);
  };

  const addQuestion = () => {
    setQuestions([...questions, '']);
  };

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const updateQuestion = (index: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[index] = value;
    setQuestions(newQuestions);
  };

  // Load existing job data when component mounts
  useEffect(() => {
    let cancelled = false;
    const loadJobData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${getApiBase()}/recruiter/jobs/${job.id}`);
        if (!res.ok) {
          throw new Error(`Failed to load job: ${res.status}`);
        }
        const data = await res.json();
        
        if (!cancelled) {
          setTitle(data.title || job.title);
          setCompanyName(data.company_name || '');
          setBranchName(data.branch_name || '');
          setLocation(data.location || job.location);
          setSkills(data.skills || []);
          setMinExperience(data.minExperience || 0);
          setOtherRequirements(data.otherRequirements || '');
          setWorkMode(data.workMode || []);
          setSalary(String(data.salary || job.salary || 0));
          setQuestions(data.questions && data.questions.length > 0 ? data.questions : ['']);
          setCvWeight(data.cv_score_weightage || job.cvWeight);
          setVideoWeight(data.video_score_weightage || job.videoWeight);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load job data');
          // Fallback to using job prop data
          setTitle(job.title);
          setCompanyName((job as { companyName?: string }).companyName ?? '');
          setLocation(job.location);
          setSalary(String((job as { salary?: number }).salary || 0));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    
    loadJobData();
    return () => {
      cancelled = true;
    };
  }, [job.id, job.title, job.location, job.cvWeight, job.videoWeight]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      // Filter out empty questions
      const validQuestions = questions.filter(q => q.trim().length > 0);
      
      const payload = {
        title,
        companyName,
        branchName,
        location,
        skills,
        minExperience,
        otherRequirements: otherRequirements || null,
        workMode,
        salary: parseInt(salary, 10),
        cvWeight,
        videoWeight,
        questions: validQuestions.length > 0 ? validQuestions : [''],
      };
      
      const res = await fetch(`${getApiBase()}/recruiter/jobs/${job.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: `Failed to update job: ${res.status}` }));
        throw new Error(errorData.detail || `Failed to update job: ${res.status}`);
      }
      
      // Success - go back to job list
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation Bar */}
      <nav className="bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          {/* Left: Logo */}
          <img src={neurohireLogo} alt="neurohire" className="h-10" />

          {/* Right: Avatar Only */}
          <div className="flex items-center gap-4">
            {/* Avatar with Dropdown */}
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

              {/* Dropdown Menu */}
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

      {/* Back to Dashboard - Left-aligned below logo */}
      <div className="px-8 pt-2 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-[#000000] transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Jobs</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-8 py-2">
        {/* Page Title */}
        <h1 className="text-4xl font-medium text-[#000000] mb-8">
          Edit Job Position
        </h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            Loading job details...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Details */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-medium text-[#000000] mb-6">Job Details</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#000000] transition-colors"
                  placeholder="Who would you like to hire today?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#000000] transition-colors"
                  placeholder="e.g. RetailCo Pakistan"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#000000] transition-colors"
                  placeholder="e.g. Gulberg Branch"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skills
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#000000] transition-colors"
                    placeholder="Type and press Enter or click Add"
                  />
                  <button
                    type="button"
                    onClick={addSkill}
                    className="px-6 py-3 bg-[#000000] text-white rounded-lg hover:bg-gray-800 transition-all"
                  >
                    Add
                  </button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {skills.map(skill => (
                      <span key={skill} className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 px-3 py-1.5 rounded-full text-sm">
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="hover:text-red-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Experience Required (years)
                </label>
                <input
                  type="number"
                  min="0"
                  value={minExperience}
                  onChange={(e) => setMinExperience(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#000000] transition-colors"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Other Requirements
                </label>
                <textarea
                  value={otherRequirements}
                  onChange={(e) => setOtherRequirements(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#000000] transition-colors resize-none"
                  placeholder="For Example:
Atleast 5 years of experience is required. Must have good
communication skills. Banking industry experience is preferred.
Atleast 16 years of education and a masters degree in business or
engineering is required."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#000000] transition-colors"
                  placeholder="Gulberg, Lahore"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Mode
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => toggleWorkMode('Onsite')}
                    className={`px-6 py-3 rounded-lg border-2 transition-all ${
                      workMode.includes('Onsite') 
                        ? 'bg-[#000000] text-white border-[#000000]' 
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#000000]'
                    }`}
                  >
                    Onsite
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleWorkMode('Remote')}
                    className={`px-6 py-3 rounded-lg border-2 transition-all ${
                      workMode.includes('Remote') 
                        ? 'bg-[#000000] text-white border-[#000000]' 
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#000000]'
                    }`}
                  >
                    Remote
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salary (PKR monthly)
                </label>
                <input
                  type="number"
                  min="0"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#000000] transition-colors"
                  placeholder="50000"
                  required
                />
              </div>
            </div>
          </div>
          
          {/* Video Questions */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-[#000000]">
                Job-Specific Video Questions
              </h3>
              <button
                type="button"
                onClick={addQuestion}
                className="flex items-center gap-2 text-gray-600 hover:text-[#000000] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add Question</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question {index + 1}
                    </label>
                    <textarea
                      value={question}
                      onChange={(e) => updateQuestion(index, e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#000000] transition-colors resize-none"
                      placeholder="Type the video interview question here"
                      required
                    />
                  </div>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="mt-8 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Scoring Weightage */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-medium text-[#000000] mb-6">
              Scoring Weightage
            </h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    CV Score Weightage
                  </label>
                  <span className="text-[#000000] font-medium">{cvWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cvWeight}
                  onChange={(e) => handleCvWeightChange(Number(e.target.value))}
                  className="w-full accent-[#000000]"
                />
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Video Score Weightage
                  </label>
                  <span className="text-[#000000] font-medium">{videoWeight}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={videoWeight}
                  onChange={(e) => handleVideoWeightChange(Number(e.target.value))}
                  className="w-full accent-[#000000]"
                />
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Total</span>
                  <span className={`font-medium ${cvWeight + videoWeight === 100 ? 'text-[#000000]' : 'text-gray-400'}`}>
                    {cvWeight + videoWeight}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="flex-1 border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:border-[#000000] hover:text-[#000000] transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#000000] text-white py-3 px-6 rounded-lg hover:bg-gray-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}