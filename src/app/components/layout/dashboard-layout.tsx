import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useAuthStore } from '../../store/auth-store';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { MobileNav } from './mobile-nav';

export function DashboardLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, initialize } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <div className="px-4 py-6 md:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
