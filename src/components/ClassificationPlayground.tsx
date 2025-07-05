import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';
import { Alert } from './ui/alert';

export const ClassificationPlayground: React.FC<{ loadedModels: string[] }> = ({ loadedModels }) => {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [results, setResults] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setAvailableModels(loadedModels);
    if (loadedModels.length > 0) {
      setSelectedModel(loadedModels[0]);
    }
  }, [loadedModels]);

  const handleClassify = async () => {
    if (!selectedModel || !inputText.trim()) {
      toast.error('Please select a model and enter some text.');
      return;
    }
    setIsLoading(true);
    setResults(null);
    try {
      const response = await apiClient.post('/classify', {
        texts: [inputText],
        model: selectedModel,
      });
      setResults(response.data.results);
      toast.success('Classification complete!');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Classification failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Classification Playground</h2>
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
            placeholder="Enter text to classify..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {/* Action Button */}
        <button
          onClick={handleClassify}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center"
        >
          {isLoading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>}
          {isLoading ? 'Classifying...' : 'Classify'}
        </button>
        {/* Results Output */}
        {results && (
          <div>
            {/* Warning for generic labels */}
            {results.some(r => /^LABEL_\d+$/i.test(r.label)) && (
              <Alert variant="default" className="mb-4">
                <b>Note:</b> This model does not provide descriptive class labels. Try a model fine-tuned for classification, such as <code>distilbert-base-uncased-finetuned-sst-2-english</code>.
              </Alert>
            )}
            <h3 className="text-lg font-medium text-gray-900 mb-2">Classification Results</h3>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all max-h-40 overflow-auto bg-gray-100 rounded p-2 mt-2">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}; 