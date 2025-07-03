import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { CheckCircle2, AlertTriangle, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

console.log("ModelManager component is rendering");

interface DownloadedModel {
  status: 'completed' | 'downloading' | 'failed';
  size: number;
  timestamp: string | null;
}

interface DownloadedModelsResponse {
  [key: string]: DownloadedModel;
}

const statusIcons = {
  completed: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  downloading: <Clock className="h-5 w-5 text-blue-500" />,
  failed: <AlertTriangle className="h-5 w-5 text-red-500" />,
};

export const ModelManager: React.FC<{ loadedModels: string[], setLoadedModels: React.Dispatch<React.SetStateAction<string[]>> }> = () => {
  const [downloadedModels, setDownloadedModels] = useState<DownloadedModelsResponse>({});

  const fetchDownloads = async () => {
    try {
      const response = await apiClient.get<DownloadedModelsResponse>('/models/downloaded');
      setDownloadedModels(response.data);
    } catch (error) {
      console.error("Failed to fetch downloaded models:", error);
    }
  };

  useEffect(() => {
    fetchDownloads();
    const intervalId = setInterval(fetchDownloads, 5000); // Poll every 5 seconds
    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);

  const handleDelete = async (modelId: string) => {
    try {
      await apiClient.delete(`/models/downloaded/${modelId}`);
      toast.success(`Deleted ${modelId}`);
      fetchDownloads(); // Refresh list after deleting
    } catch (error) {
      console.error(`Failed to delete ${modelId}:`, error);
      toast.error(`Failed to delete ${modelId}`);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Downloaded Models</h2>
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="space-y-2 p-4">
          {Object.entries(downloadedModels).length === 0 ? (
            <p className="text-gray-500 text-center py-4">No models downloaded yet.</p>
          ) : (
            Object.entries(downloadedModels).map(([modelId, details]) => (
              <div key={modelId} className="p-4 border-b last:border-b-0 flex items-center justify-between">
                <div className="flex-1 space-y-1">
                  <p className="font-semibold">{modelId}</p>
                  <p className="text-sm text-gray-500 capitalize">{details.status}</p>
                  {details.status === 'downloading' && (
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-blue-600 h-2.5 rounded-full w-1/2 animate-pulse"></div>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  {statusIcons[details.status]}
                  <span className="text-sm text-gray-700">{details.size} MB</span>
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
