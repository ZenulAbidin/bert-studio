import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

export const SummarizationPlayground: React.FC<{ loadedModels: string[] }> = ({ loadedModels }) => {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [maxLength, setMaxLength] = useState(50);
  const [minLength, setMinLength] = useState(25);

  useEffect(() => {
    setAvailableModels(loadedModels);
    if (loadedModels.length > 0) {
      setSelectedModel(loadedModels[0]);
    }
  }, [loadedModels]);

  const handleSummarize = async () => {
    if (!selectedModel || !inputText.trim()) {
      toast.error('Please select a model and enter some text.');
      return;
    }
    setIsLoading(true);
    setSummary(null);
    try {
      const response = await apiClient.post('/summarize', {
        text: inputText,
        model: selectedModel,
        max_length: maxLength,
        min_length: minLength,
      });
      setSummary(response.data.summary);
      toast.success('Summary generated!');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Summarization failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Summarization Playground</h2>
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
            placeholder="Enter text to summarize..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {/* Length Controls */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="min-length" className="block text-xs text-gray-600 mb-1">Min Length</label>
            <input
              id="min-length"
              type="number"
              min={1}
              value={minLength}
              onChange={e => setMinLength(Number(e.target.value))}
              className="w-full px-2 py-1 border border-gray-300 rounded"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="max-length" className="block text-xs text-gray-600 mb-1">Max Length</label>
            <input
              id="max-length"
              type="number"
              min={1}
              value={maxLength}
              onChange={e => setMaxLength(Number(e.target.value))}
              className="w-full px-2 py-1 border border-gray-300 rounded"
            />
          </div>
        </div>
        {/* Action Button */}
        <button
          onClick={handleSummarize}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center"
        >
          {isLoading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>}
          {isLoading ? 'Summarizing...' : 'Summarize'}
        </button>
        {/* Summary Output */}
        {summary && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Summary</h3>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all max-h-40 overflow-auto bg-gray-100 rounded p-2 mt-2">
              {summary}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}; 