import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { storage } from '@/utils/storage';
import { cn } from '@/utils/cn';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/company/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Vagas', href: '/company/jobs', icon: <Briefcase size={18} /> },
  { label: 'Talentos', href: '/company/talents', icon: <Users size={18} /> },
];

interface CompanyLayoutProps {
  children: React.ReactNode;
}

export const CompanyLayout: React.FC<CompanyLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    storage.clearAll();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-primary flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:flex',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <Logo size={36} showText textColor="white" />
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-all"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between h-16 px-6 bg-white shadow-sm lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-primary p-1.5 rounded-lg hover:bg-surface"
          >
            <Menu size={22} />
          </button>
          <Logo size={32} showText />
          <div className="w-9" />
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
};
