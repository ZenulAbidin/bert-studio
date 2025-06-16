
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  Download, 
  Play, 
  Settings,
  Brain
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
}

const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/', current: false },
  { name: 'Browse Models', icon: Search, href: '/browse', current: false },
  { name: 'Downloads', icon: Download, href: '/downloads', current: false },
  { name: 'Playground', icon: Play, href: '/playground', current: false },
  { name: 'Settings', icon: Settings, href: '/settings', current: false },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const location = useLocation();

  return (
    <div className="h-full bg-gray-900 text-white">
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

      <nav className="mt-8">
        <div className="px-2 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {isOpen && item.name}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
