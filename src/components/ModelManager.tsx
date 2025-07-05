import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { CheckCircle2, AlertTriangle, Clock, Trash2, Upload, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

console.log("ModelManager component is rendering");

interface DownloadedModel {
  status: 'completed' | 'downloading' | 'failed';
  size: number;
  timestamp: string | null;
  progress?: number;
  files_downloaded?: number;
  total_files?: number;
  downloaded_size_mb?: number;
  total_size_mb?: number;
}

interface LoadingModel {
  status: 'loading' | 'completed' | 'failed';
  timestamp: string | null;
  progress: number;
  error_message?: string;
}

interface DownloadedModelsResponse {
  [key: string]: DownloadedModel;
}

interface LoadingModelsResponse {
  [key: string]: LoadingModel;
}

const statusIcons = {
  completed: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  downloading: <Clock className="h-5 w-5 text-blue-500" />,
  failed: <AlertTriangle className="h-5 w-5 text-red-500" />,
  loading: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />,
};

export const ModelManager: React.FC<{ loadedModels: string[], setLoadedModels: React.Dispatch<React.SetStateAction<string[]>> }> = ({ loadedModels, setLoadedModels }) => {
  const [downloadedModels, setDownloadedModels] = useState<DownloadedModelsResponse>({});
  const [loadingModels, setLoadingModels] = useState<LoadingModelsResponse>({});

  const fetchDownloads = async () => {
    try {
      const response = await apiClient.get<DownloadedModelsResponse>('/models/downloaded');
      setDownloadedModels(response.data);
    } catch (error) {
      console.error("Failed to fetch downloaded models:", error);
    }
  };

  const fetchLoadingStatus = async () => {
    try {
      const response = await apiClient.get<LoadingModelsResponse>('/models/loading');
      setLoadingModels(response.data);
    } catch (error) {
      console.error("Failed to fetch loading models:", error);
    }
  };

  const fetchLoadedModels = async () => {
    try {
      const response = await apiClient.get<string[]>('/models/loaded');
      setLoadedModels(response.data);
    } catch (error) {
      console.error("Failed to fetch loaded models:", error);
    }
  };

  useEffect(() => {
    fetchDownloads();
    fetchLoadingStatus();
    fetchLoadedModels();
    const intervalId = setInterval(() => {
      fetchDownloads();
      fetchLoadingStatus();
      fetchLoadedModels();
    }, 5000); // Poll every 5 seconds
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);

  const handleDelete = async (modelId: string) => {
    try {
      // Split modelId into author and model name
      const [author, ...modelParts] = modelId.split("/");
      const model = modelParts.join("/");
      if (!author || !model) {
        toast.error(`Invalid model id: ${modelId}`);
        return;
      }
      await apiClient.delete(`/models/downloaded`, { params: { author, model } });
      toast.success(`Deleted ${modelId}`);
      fetchDownloads(); // Refresh list after deleting
    } catch (error) {
      console.error(`Failed to delete ${modelId}:`, error);
      toast.error(`Failed to delete ${modelId}`);
    }
  };

  // Load model into memory (background task)
  const handleLoad = async (modelId: string) => {
    try {
      const response = await apiClient.post('/models/load', { model_id: modelId });
      toast.success(response.data.message || `Started loading ${modelId}`);
      // Immediately fetch loading status to show the loading state
      fetchLoadingStatus();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.message || `Failed to start loading ${modelId}`;
      toast.error(msg);
    }
  };

  // Retry loading a failed model
  const handleRetry = async (modelId: string) => {
    try {
      const response = await apiClient.post('/models/load', { model_id: modelId });
      toast.success(response.data.message || `Retrying load for ${modelId}`);
      fetchLoadingStatus();
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.message || `Failed to retry loading ${modelId}`;
      toast.error(msg);
    }
  };

  // Check if a model is currently being loaded
  const isModelLoading = (modelId: string) => {
    return modelId in loadingModels && loadingModels[modelId].status === 'loading';
  };

  // Check if a model is loaded
  const isModelLoaded = (modelId: string) => {
    return loadedModels.includes(modelId);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Downloaded Models</h2>
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="space-y-2 p-4">
          {Object.entries(downloadedModels).length === 0 ? (
            <p className="text-gray-500 text-center py-4">No models downloaded yet.</p>
          ) : (
            Object.entries(downloadedModels)
              .sort(([aId, aDetails], [bId, bDetails]) => {
                // Downloading models first
                if (aDetails.status === 'downloading' && bDetails.status !== 'downloading') return -1;
                if (aDetails.status !== 'downloading' && bDetails.status === 'downloading') return 1;
                // Case-insensitive alphabetical sort
                return aId.toLowerCase().localeCompare(bId.toLowerCase());
              })
              .map(([modelId, details]) => (
                <div key={modelId} className="p-4 border-b last:border-b-0 flex items-center justify-between">
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold">{modelId}</p>
                    <p className="text-sm text-gray-500 capitalize">{details.status}</p>
                    {details.status === 'downloading' && (
                      <>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all"
                            style={{ width: `${details.progress ?? 0}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>
                            {details.progress ?? 0}%
                            {typeof details.files_downloaded === 'number' && typeof details.total_files === 'number' &&
                              ` • File ${details.files_downloaded}/${details.total_files}`}
                          </span>
                          <span>
                            {typeof details.downloaded_size_mb === 'number' && typeof details.total_size_mb === 'number'
                              ? `${details.downloaded_size_mb} MB / ${details.total_size_mb} MB`
                              : `${details.size} MB`}
                          </span>
                        </div>
                      </>
                    )}
                    {/* Show loading progress for models being loaded */}
                    {isModelLoading(modelId) && (
                      <>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                          <div
                            className="bg-green-600 h-2.5 rounded-full transition-all"
                            style={{ width: `${loadingModels[modelId].progress}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Loading: {loadingModels[modelId].progress}%</span>
                        </div>
                      </>
                    )}
                    {/* Show error message for failed loads */}
                    {modelId in loadingModels && loadingModels[modelId].status === 'failed' && loadingModels[modelId].error_message && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        <strong>Error:</strong> {loadingModels[modelId].error_message}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    {modelId in loadingModels && loadingModels[modelId].status === 'loading' ? (
                      statusIcons.loading
                    ) : modelId in loadingModels && loadingModels[modelId].status === 'failed' ? (
                      statusIcons.failed
                    ) : isModelLoaded(modelId) ? (
                      statusIcons.completed
                    ) : (
                      statusIcons[details.status]
                    )}
                    {details.status === 'completed' && !isModelLoaded(modelId) && 
                     !(modelId in loadingModels && loadingModels[modelId].status === 'loading') && (
                      <button
                        onClick={() => handleLoad(modelId)}
                        className="text-gray-400 hover:text-blue-600 disabled:text-gray-300"
                        disabled={modelId in loadingModels && loadingModels[modelId].status === 'loading'}
                        title={modelId in loadingModels && loadingModels[modelId].status === 'loading' ? 'Model is loading' : 'Load model'}
                      >
                        <Upload className={`h-5 w-5 ${modelId in loadingModels && loadingModels[modelId].status === 'loading' ? 'opacity-50' : ''}`} />
                      </button>
                    )}
                    {/* Retry button for failed loads */}
                    {modelId in loadingModels && loadingModels[modelId].status === 'failed' && (
                      <button
                        onClick={() => handleRetry(modelId)}
                        className="text-gray-400 hover:text-orange-600 disabled:text-gray-300"
                        title="Retry loading model"
                      >
                        <RefreshCw className="h-5 w-5" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(modelId)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};
