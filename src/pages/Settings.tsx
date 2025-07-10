import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';
import { Layout } from '../components/Layout';
import { Settings as SettingsIcon, Server, Database, Bell, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Settings {
  hf_token: string | null;
  server_url: string;
  model_cache_dir: string;
  notifications: {
    download_complete: boolean;
    on_error: boolean;
  };
  security: {
    verify_checksums: boolean;
    sandbox_mode: boolean;
  };
}

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get<Settings>('/settings');
        setSettings(response.data);
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        toast.error("Could not load settings from the server.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const [section, key] = name.split('.');

    setSettings(prev => {
      if (!prev) return null;

      const newSettings = { ...prev };
      if (key && (section === 'notifications' || section === 'security')) {
        (newSettings[section] as any)[key] = type === 'checkbox' ? checked : value;
      } else {
        (newSettings as any)[name] = value;
      }
      return newSettings;
    });
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      await apiClient.post('/settings', settings);
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings.");
    }
  };

  if (isLoading || !settings) {
    return <div>Loading settings...</div>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-6 flex items-center">
            <SettingsIcon className="h-5 w-5 mr-2" />
            Settings
          </h2>
          
          <div className="space-y-6">
            {/* API Configuration */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-md font-medium mb-4 flex items-center">
                <Server className="h-4 w-4 mr-2" />
                API Configuration
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hugging Face API Token
                  </label>
                  <input
                    type="password"
                    name="hf_token"
                    value={settings.hf_token || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Required for downloading private models and higher rate limits
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Local Server URL
                  </label>
                  <input
                    type="url"
                    name="server_url"
                    value={settings.server_url}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Storage Settings */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-md font-medium mb-4 flex items-center">
                <Database className="h-4 w-4 mr-2" />
                Storage Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model Cache Directory
                  </label>
                  <input
                    type="text"
                    name="model_cache_dir"
                    value={settings.model_cache_dir}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-md font-medium mb-4 flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="download-notifications"
                    name="notifications.download_complete"
                    checked={settings.notifications.download_complete}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="download-notifications" className="ml-2 text-sm text-gray-700">
                    Notify when model downloads complete
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="error-notifications"
                    name="notifications.on_error"
                    checked={settings.notifications.on_error}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="error-notifications" className="ml-2 text-sm text-gray-700">
                    Notify on errors and failures
                  </label>
                </div>
              </div>
            </div>

            {/* Security */}
            <div>
              <h3 className="text-md font-medium mb-4 flex items-center">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="verify-models"
                    name="security.verify_checksums"
                    checked={settings.security.verify_checksums}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="verify-models" className="ml-2 text-sm text-gray-700">
                    Verify model checksums before loading
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="sandbox-mode"
                    name="security.sandbox_mode"
                    checked={settings.security.sandbox_mode}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="sandbox-mode" className="ml-2 text-sm text-gray-700">
                    Run models in sandbox mode (experimental)
                  </label>
                </div>
                <button
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => navigate('/api-keys')}
                >
                  Manage API Keys
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
