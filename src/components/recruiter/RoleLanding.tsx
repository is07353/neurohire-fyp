interface RoleLandingProps {
  onRoleSelect: (role: 'candidate' | 'recruiter' | 'admin' | 'super-admin') => void;
}

export function RoleLanding({ onRoleSelect }: RoleLandingProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-medium text-[#000000] mb-16 text-center">
        Bilingual AI Recruitment System
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <button
          onClick={() => onRoleSelect('recruiter')}
          className="bg-white border-4 border-gray-300 rounded-lg p-12 text-center hover:border-[#000000] hover:bg-[#f5f5f5] transition-all"
        >
          <div className="text-3xl font-medium text-[#000000]">Recruiter</div>
        </button>
        
        <button
          onClick={() => onRoleSelect('admin')}
          className="bg-white border-4 border-gray-300 rounded-lg p-12 text-center hover:border-[#000000] hover:bg-[#f5f5f5] transition-all"
        >
          <div className="text-3xl font-medium text-[#000000]">Company</div>
        </button>
        
        <button
          onClick={() => onRoleSelect('super-admin')}
          className="bg-white border-4 border-gray-300 rounded-lg p-12 text-center hover:border-[#000000] hover:bg-[#f5f5f5] transition-all"
        >
          <div className="text-3xl font-medium text-[#000000]">Super Admin</div>
        </button>
      </div>
      
      <div className="mt-12">
        <button
          onClick={() => onRoleSelect('candidate')}
          className="text-[#000000] underline text-lg hover:text-[#333333]"
        >
          Apply as a Candidate
        </button>
      </div>
    </div>
  );
}