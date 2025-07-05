import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';

export const QAPlayground: React.FC<{ loadedModels: string[] }> = ({ loadedModels }) => {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [context, setContext] = useState('');
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setAvailableModels(loadedModels);
    if (loadedModels.length > 0) {
      setSelectedModel(loadedModels[0]);
    }
  }, [loadedModels]);

  const handleQA = async () => {
    if (!selectedModel || !context.trim() || !question.trim()) {
      toast.error('Please select a model, enter context, and a question.');
      return;
    }
    setIsLoading(true);
    setResult(null);
    try {
      const response = await apiClient.post('/qa', {
        context,
        question,
        model: selectedModel,
      });
      setResult(response.data);
      toast.success('Answer generated!');
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Question answering failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Question Answering Playground</h2>
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
        {/* Context Input */}
        <div>
          <label htmlFor="context-input" className="block text-sm font-medium text-gray-700 mb-1">
            Context
          </label>
          <textarea
            id="context-input"
            rows={4}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Enter context for the question..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {/* Question Input */}
        <div>
          <label htmlFor="question-input" className="block text-sm font-medium text-gray-700 mb-1">
            Question
          </label>
          <input
            id="question-input"
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your question..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {/* Action Button */}
        <button
          onClick={handleQA}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center"
        >
          {isLoading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>}
          {isLoading ? 'Answering...' : 'Get Answer'}
        </button>
        {/* Result Output */}
        {result && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Answer</h3>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all max-h-40 overflow-auto bg-gray-100 rounded p-2 mt-2">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}; 