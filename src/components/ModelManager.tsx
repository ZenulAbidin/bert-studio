
import React, { useState } from 'react';
import { Trash2, Play, Pause, Info, CheckCircle, XCircle } from 'lucide-react';

interface ModelManagerProps {
  loadedModels: string[];
  setLoadedModels: React.Dispatch<React.SetStateAction<string[]>>;
}

interface LoadedModel {
  id: string;
  name: string;
  status: 'loaded' | 'loading' | 'error';
  size: string;
  loadedAt: string;
  isActive: boolean;
}

export const ModelManager: React.FC<ModelManagerProps> = ({ loadedModels, setLoadedModels }) => {
  const [models, setModels] = useState<LoadedModel[]>([
    {
      id: 'bert-base-uncased',
      name: 'BERT Base Uncased',
      status: 'loaded',
      size: '440 MB',
      loadedAt: '2024-01-15 14:30',
      isActive: true
    },
    {
      id: 'distilbert-base-uncased',
      name: 'DistilBERT Base Uncased',
      status: 'loaded',
      size: '268 MB',
      loadedAt: '2024-01-15 14:25',
      isActive: false
    }
  ]);

  const handleUnloadModel = (modelId: string) => {
    setModels(prev => prev.filter(model => model.id !== modelId));
    setLoadedModels(prev => prev.filter(id => id !== modelId));
  };

  const handleToggleActive = (modelId: string) => {
    setModels(prev => prev.map(model => 
      model.id === modelId 
        ? { ...model, isActive: !model.isActive }
        : { ...model, isActive: false } // Only one model can be active
    ));
  };

  const getStatusIcon = (status: string, isActive: boolean) => {
    if (status === 'loading') return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>;
    if (status === 'error') return <XCircle className="h-4 w-4 text-red-500" />;
    if (isActive) return <Play className="h-4 w-4 text-green-500" />;
    return <Pause className="h-4 w-4 text-gray-400" />;
  };

  const getStatusText = (status: string, isActive: boolean) => {
    if (status === 'loading') return 'Loading...';
    if (status === 'error') return 'Error';
    if (isActive) return 'Active';
    return 'Inactive';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Loaded Models</h2>
          <div className="text-sm text-gray-600">
            {models.length} model{models.length !== 1 ? 's' : ''} loaded
          </div>
        </div>

        {models.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No models loaded yet.</p>
            <p className="text-sm mt-1">Browse and download models to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {models.map(model => (
              <div key={model.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(model.status, model.isActive)}
                      <span className={`text-sm font-medium ${
                        model.isActive ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {getStatusText(model.status, model.isActive)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{model.name}</h3>
                      <p className="text-sm text-gray-500">
                        {model.size} • Loaded {model.loadedAt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleToggleActive(model.id)}
                      disabled={model.status !== 'loaded'}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        model.isActive
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {model.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    
                    <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                    
                    <button 
                      onClick={() => handleUnloadModel(model.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {model.isActive && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700">
                        This model is currently active and ready for use in the playground.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-3">Memory Usage</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Memory Used</span>
            <span className="font-medium">708 MB</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>708 MB used</span>
            <span>1.5 GB available</span>
          </div>
        </div>
      </div>
    </div>
  );
};
