
import React, { useState, useEffect } from 'react';
import { ModelBrowser } from './ModelBrowser';
import { ModelManager } from './ModelManager';
import { EmbeddingPlayground } from './EmbeddingPlayground';
import { Download, Brain, Play, TrendingUp } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loadedModels, setLoadedModels] = useState<string[]>([]);

  const stats = [
    { name: 'Loaded Models', value: loadedModels.length, icon: Brain, color: 'text-blue-600' },
    { name: 'Available Models', value: '1,000+', icon: Download, color: 'text-green-600' },
    { name: 'Embeddings Generated', value: '0', icon: TrendingUp, color: 'text-purple-600' },
    { name: 'Playground Sessions', value: '1', icon: Play, color: 'text-orange-600' },
  ];

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'browse', name: 'Browse Models' },
    { id: 'manage', name: 'Manage Models' },
    { id: 'playground', name: 'Playground' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Manage your BERT models and explore text embeddings</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <Icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                py-2 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium mb-2">1. Browse Models</h3>
                  <p className="text-sm text-gray-600">
                    Explore thousands of pre-trained BERT models from Hugging Face
                  </p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium mb-2">2. Load Model</h3>
                  <p className="text-sm text-gray-600">
                    Download and load models for text classification and embeddings
                  </p>
                </div>
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium mb-2">3. Generate Embeddings</h3>
                  <p className="text-sm text-gray-600">
                    Test your models with the interactive playground
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'browse' && <ModelBrowser />}
        {activeTab === 'manage' && <ModelManager loadedModels={loadedModels} setLoadedModels={setLoadedModels} />}
        {activeTab === 'playground' && <EmbeddingPlayground loadedModels={loadedModels} />}
      </div>
    </div>
  );
};
