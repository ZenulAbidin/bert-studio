
import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import apiClient from '@/lib/api';

interface NavbarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, sidebarOpen }) => {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // Check for session cookie
    setLoggedIn(document.cookie.includes('session='));
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.post('/logout');
      setLoggedIn(false);
      window.location.href = '/login';
    } catch {
      setLoggedIn(false);
      window.location.href = '/login';
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        {/* Logout button removed from navbar */}
      </div>
    </nav>
  );
};
