import { LogOut } from 'lucide-react';

interface NavBarProps {
  title: string;
  userName: string;
  onLogout: () => void;
}

export function NavBar({ title, userName, onLogout }: NavBarProps) {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-medium text-[#000000]">{title}</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <span className="text-gray-700">Welcome, {userName}</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-[#000000] border-2 border-[#000000] rounded-lg hover:bg-[#000000] hover:text-white transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}