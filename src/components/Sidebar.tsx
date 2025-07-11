import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  Download, 
  Play, 
  Settings,
  Brain,
  CheckCircle,
  HelpCircle,
  UserCheck,
  Edit,
  FileText,
  Sliders,
  Code,
  LogOut
} from 'lucide-react';
import apiClient from '@/lib/api';

interface SidebarProps {
  isOpen: boolean;
}

const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/', current: false },
  { name: 'Browse Models', icon: Search, href: '/browse', current: false },
  { name: 'Downloads', icon: Download, href: '/downloads', current: false },
  // Playground section will be inserted here
  // Settings will be rendered at the bottom
];

const playgroundActivities = [
  { name: 'Embedding', href: '/playground/embedding', icon: Play },
  { name: 'Classification', href: '/playground/classification', icon: CheckCircle },
  { name: 'Question Answering', href: '/playground/qa', icon: HelpCircle },
  { name: 'NER', href: '/playground/ner', icon: UserCheck },
  { name: 'Fill Mask', href: '/playground/fill-mask', icon: Edit },
  { name: 'Summarization', href: '/playground/summarization', icon: FileText },
  { name: 'Feature Extraction', href: '/playground/features', icon: Sliders },
  { name: 'Custom Tasks', href: '/playground/custom-tasks', icon: Code },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const location = useLocation();
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    apiClient.get('/auth/check')
      .then(res => setLoggedIn(res.data.authenticated))
      .catch(() => setLoggedIn(false));
  }, [location]);

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

  if (!loggedIn) {
    return (
      <div className={`fixed left-0 top-0 h-full ${isOpen ? 'w-64' : 'w-16'} bg-gray-900 text-white flex flex-col z-40 transition-all duration-300`}>
        <div className="p-4">
          <div className="flex items-center space-x-3">
            <Brain className="h-8 w-8 text-blue-400" />
            {isOpen && (
              <div>
                <h2 className="text-lg font-semibold">BERT Studio</h2>
                <p className="text-xs text-gray-400">Model Playground</p>
              </div>
            )}
          </div>
        </div>
        <div className="px-2 pt-2">
          <Link
            to="/login"
            className={`group flex items-center ${isOpen ? 'px-3' : 'justify-center'} py-2 text-sm font-medium rounded-md transition-colors text-gray-300 hover:bg-gray-700 hover:text-white w-full`}
          >
            <LogOut className={`${isOpen ? 'mr-3' : ''} h-5 w-5 flex-shrink-0`} />
            {isOpen && 'Login'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed left-0 top-0 h-full ${isOpen ? 'w-64' : 'w-16'} bg-gray-900 text-white flex flex-col z-40 transition-all duration-300`}>
      <div className="p-4">
        <div className="flex items-center space-x-3">
          <Brain className="h-8 w-8 text-blue-400" />
          {isOpen && (
            <div>
              <h2 className="text-lg font-semibold">BERT Studio</h2>
              <p className="text-xs text-gray-400">Model Playground</p>
            </div>
          )}
        </div>
      </div>

      <nav className="mt-8 flex-1 flex flex-col justify-between">
        <div className="px-2 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            if (item.name === 'Playground' || item.name === 'Settings') return null;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  group flex items-center ${isOpen ? 'px-3' : 'justify-center'} py-2 text-sm font-medium rounded-md transition-colors
                  ${isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
              >
                <Icon className={`${isOpen ? 'mr-3' : ''} h-5 w-5 flex-shrink-0`} />
                {isOpen && item.name}
              </Link>
            );
          })}
          {/* Playground Section */}
          <div className="mt-6">
            {isOpen && <div className="text-xs text-gray-400 font-semibold mb-2 px-3">Playground</div>}
            <div className="space-y-1">
              {playgroundActivities.map((activity) => {
                const isActive = location.pathname === activity.href;
                const Icon = activity.icon;
                return (
                  <Link
                    key={activity.name}
                    to={activity.href}
                    className={`
                      group flex items-center ${isOpen ? 'px-3' : 'justify-center'} py-2 text-sm rounded-md transition-colors
                      ${isActive
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }
                    `}
                  >
                    <Icon className={`${isOpen ? 'mr-3' : ''} h-5 w-5 flex-shrink-0`} />
                    {isOpen && activity.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
        {/* Settings button at the bottom of the sidebar content */}
        <div className="px-2 mt-auto">
          <Link
            to="/settings"
            className={`
              group flex items-center ${isOpen ? 'px-3' : 'justify-center'} py-2 text-sm font-medium rounded-md transition-colors
              ${location.pathname === '/settings'
                ? 'bg-gray-800 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }
            `}
          >
            <Settings className={`${isOpen ? 'mr-3' : ''} h-5 w-5 flex-shrink-0`} />
            {isOpen && 'Settings'}
          </Link>
          <button
            onClick={handleLogout}
            className={`group flex items-center ${isOpen ? 'px-3' : 'justify-center'} py-2 text-sm font-medium rounded-md transition-colors text-gray-300 hover:bg-gray-700 hover:text-white mb-4 w-full`}
          >
            <LogOut className={`${isOpen ? 'mr-3' : ''} h-5 w-5 flex-shrink-0`} />
            {isOpen && 'Logout'}
          </button>
        </div>
      </nav>
    </div>
  );
};
