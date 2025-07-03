import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

export const EmbeddingPlayground: React.FC<{ loadedModels: string[] }> = () => {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [embeddings, setEmbeddings] = useState<number[][] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch models that are ready to be used for embedding
    const fetchLoadedModels = async () => {
      try {
        const response = await apiClient.get<string[]>('/models/loaded');
        setAvailableModels(response.data);
        if (response.data.length > 0) {
          setSelectedModel(response.data[0]);
        }
      } catch (error) {
        console.error("Failed to fetch loaded models:", error);
        toast.error("Could not fetch loaded models from the server.");
      }
    };
    fetchLoadedModels();
  }, []);

  const handleGenerate = async () => {
    if (!selectedModel || !inputText.trim()) {
      toast.error("Please select a model and enter some text.");
      return;
    }

    setIsLoading(true);
    setEmbeddings(null);

    try {
      const response = await apiClient.post('/embed', {
        texts: [inputText],
        model: selectedModel,
      });
      setEmbeddings(response.data.embeddings);
      toast.success("Embeddings generated successfully!");
    } catch (error) {
      console.error("Failed to generate embeddings:", error);
      toast.error("Failed to generate embeddings. Check the console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Embedding Playground</h2>
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        
        {/* Model Selection */}
        <div>
          <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 mb-1">
            Select Model
          </label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            disabled={availableModels.length === 0}
          >
            {availableModels.length > 0 ? (
              availableModels.map(modelId => (
                <option key={modelId} value={modelId}>{modelId}</option>
              ))
            ) : (
              <option>No loaded models found</option>
            )}
          </select>
        </div>

        {/* Input Text */}
        <div>
          <label htmlFor="input-text" className="block text-sm font-medium text-gray-700 mb-1">
            Input Text
          </label>
          <textarea
            id="input-text"
            rows={4}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter text to generate embeddings..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Action Button */}
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center"
        >
          {isLoading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>}
          {isLoading ? 'Generating...' : 'Generate Embeddings'}
        </button>

        {/* Embeddings Output */}
        {embeddings && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Generated Embeddings</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all">
                {JSON.stringify(embeddings, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
