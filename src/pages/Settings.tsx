
import React from 'react';
import { Layout } from '../components/Layout';
import { Settings as SettingsIcon, Server, Database, Bell, Shield } from 'lucide-react';

const Settings = () => {
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
                    placeholder="hf_..."
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
                    placeholder="http://localhost:8000"
                    defaultValue="http://localhost:8000"
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
                    placeholder="./models"
                    defaultValue="./models"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="auto-cleanup"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="auto-cleanup" className="ml-2 text-sm text-gray-700">
                    Automatically clean up unused models after 30 days
                  </label>
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
                    defaultChecked
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
                    defaultChecked
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
                    defaultChecked
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
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="sandbox-mode" className="ml-2 text-sm text-gray-700">
                    Run models in sandbox mode (experimental)
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
