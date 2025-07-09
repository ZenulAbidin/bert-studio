import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Tag, Loader2, ChevronLeft, ChevronRight, X, Upload } from 'lucide-react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

// Custom hook to debounce the search input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface Model {
  id: string;
  name: string;
  description: string;
  tags: string[];
  downloads: number;
  likes: number;
}

const ITEMS_PER_PAGE = 10;

export const ModelBrowser: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allModels, setAllModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [manualModelId, setManualModelId] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // State is now derived from the URL search parameters
  const selectedTag = searchParams.get('tag');
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const query = searchParams.get('q') || '';

  // Local state for the input field to allow for debouncing
  const [searchTerm, setSearchTerm] = useState(query);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Fetch models whenever the source-of-truth URL params change
  useEffect(() => {
    const fetchAllModels = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get<Model[]>('/models/available', {
          params: {
            search: query || 'bert',
            tag: selectedTag || undefined,
          },
        });
        setAllModels(response.data);
      } catch (error) {
        console.error("Failed to fetch models:", error);
        toast.error("Failed to fetch models from Hugging Face.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllModels();
  }, [query, selectedTag]);

  // Update the URL's 'q' param when the debounced search term changes
  useEffect(() => {
    // Only update the URL if the debounced search term is different from the current URL query
    if (debouncedSearchTerm !== query) {
      const newParams = new URLSearchParams(searchParams);
      if (debouncedSearchTerm) {
        newParams.set('q', debouncedSearchTerm);
      } else {
        newParams.delete('q');
      }
      newParams.delete('page'); // Reset page only on a new search
      setSearchParams(newParams, { replace: true });
    }
  }, [debouncedSearchTerm, query, setSearchParams]);

  // Pagination Logic
  const totalPages = Math.ceil(allModels.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentModels = allModels.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Handlers now update the URL search params, which triggers the fetch effect
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('page', newPage.toString());
      setSearchParams(newParams);
    }
  };

  const handleTagChange = (tag: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (tag) {
      newParams.set('tag', tag);
    } else {
      newParams.delete('tag');
    }
    newParams.delete('page'); // Reset page
    setSearchParams(newParams);
  };

  const handleDownload = async (modelId: string) => {
    try {
      await apiClient.post('/models/download', { model_id: modelId });
      toast.success(`Download started for ${modelId}`);
    } catch (error) {
      console.error("Failed to start download:", error);
      toast.error(`Failed to start download for ${modelId}`);
    }
  };

  const handleManualLoad = async () => {
    if (!manualModelId.trim()) {
      toast.error('Please enter a model ID.');
      return;
    }
    try {
      let alreadyDownloaded = false;
      // Check if model is already downloaded
      const downloadedResp = await apiClient.get('/models/downloaded');
      const modelStatus = downloadedResp.data[manualModelId.trim()];
      if (modelStatus && modelStatus.status === 'completed') {
        alreadyDownloaded = true;
      }
      if (alreadyDownloaded) {
        toast.info(`Model already downloaded. Loading ${manualModelId} into memory...`);
      } else {
        toast.info(`Downloading ${manualModelId} from Hugging Face...`);
        await apiClient.post('/models/download', { model_id: manualModelId.trim() });
      }
      // Poll for download status if not already downloaded
      if (!alreadyDownloaded) {
        const pollInterval = 3000; // 3 seconds
        const maxAttempts = 40; // 2 minutes
        let attempts = 0;
        let status = '';
        while (attempts < maxAttempts) {
          const resp = await apiClient.get('/models/downloaded');
          const modelStatus = resp.data[manualModelId.trim()];
          if (modelStatus && modelStatus.status === 'completed') {
            status = 'completed';
            break;
          } else if (modelStatus && modelStatus.status === 'failed') {
            status = 'failed';
            break;
          }
          await new Promise(res => setTimeout(res, pollInterval));
          attempts++;
        }
        if (status === 'failed') {
          toast.error(`Download failed for ${manualModelId}`);
          return;
        } else if (status !== 'completed') {
          toast.error(`Timed out waiting for download of ${manualModelId}`);
          return;
        }
        toast.info(`Loading ${manualModelId} into memory...`);
      }
      // Now load the model
      await apiClient.post('/models/load', { model_id: manualModelId.trim() });
      toast.success(`Model ${manualModelId} loaded successfully!`);
      setManualModelId('');
      setIsDialogOpen(false);
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || error?.message || `Failed to download or load ${manualModelId}`;
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center justify-between">
        <span>Browse Hugging Face Models</span>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 border border-gray-200 ml-4"
              style={{ minWidth: 120 }}
            >
              Advanced Load
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Advanced Model Load</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 mt-2">
              <input
                type="text"
                value={manualModelId}
                onChange={e => setManualModelId(e.target.value)}
                placeholder="author/model (e.g. jpwahle/longformer-base-plagiarism-detection)"
                className="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                style={{ minWidth: 340 }}
              />
              <span className="text-xs text-gray-500">Enter the full model ID in the format <code>author/model</code> (e.g. <b>jpwahle/longformer-base-plagiarism-detection</b>).</span>
              <button
                onClick={handleManualLoad}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 flex items-center gap-1"
                title="Manually load a HuggingFace model by ID"
              >
                <Upload className="h-4 w-4" />
                Load Model
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </h2>

      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for BERT models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <Tag className="h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium">Tags:</span>
          {['text-classification', 'feature-extraction', 'distilbert', 'roberta', 'efficient', 'nlp'].map(tag => (
            <button
              key={tag}
              onClick={() => handleTagChange(tag)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${selectedTag === tag ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {tag}
            </button>
          ))}
          {selectedTag && (
            <button
              onClick={() => handleTagChange(null)}
              className="ml-2 px-3 py-1 text-xs bg-red-100 text-red-700 rounded-full hover:bg-red-200 flex items-center"
            >
              <X className="h-3 w-3 mr-1" />
              Clear Tag
            </button>
          )}
        </div>
      </div>

      {/* Model List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-600">Searching models...</span>
          </div>
        ) : allModels.length === 0 ? (
          <p className="text-center text-gray-500 py-10">No models found for your search.</p>
        ) : (
          currentModels.map(model => (
            <div key={model.id} className="bg-white rounded-lg border p-4 flex items-start justify-between">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-blue-600">{model.name}</h3>
                <p className="text-sm text-gray-600">{model.description}</p>
                <div className="flex items-center text-sm text-gray-500 space-x-4">
                  <span>{model.downloads.toLocaleString()} downloads</span>
                  <span>{model.likes.toLocaleString()} likes</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {model.tags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleTagChange(tag)}
                      className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${selectedTag === tag ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-blue-100'}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <button
                  onClick={() => handleDownload(model.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Download
                </button>
                <a
                  href={`https://huggingface.co/${model.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  View Details
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 disabled:opacity-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};
