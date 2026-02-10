import { NavBar } from './NavBar';

interface AdminDashboardProps {
  role: string;
  onLogout: () => void;
}

export function AdminDashboard({ role, onLogout }: AdminDashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar title={`${role} Dashboard`} userName={role} onLogout={onLogout} />
      
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <h2 className="text-3xl font-medium text-[#000000] mb-4">
            {role} Features Coming Soon
          </h2>
          <p className="text-xl text-gray-600">
            {role} dashboard and features will be available here.
          </p>
        </div>
      </div>
    </div>
  );
}