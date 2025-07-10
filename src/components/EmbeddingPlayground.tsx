import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';
import { ChartContainer } from "./ui/chart";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

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

  // Utility to download embeddings as JSON
  function handleDownload() {
    if (!embeddings) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(embeddings, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "embeddings.json");
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.remove();
  }

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
            <div className="flex flex-col md:flex-row gap-4 items-start">
              {/* Chart Visualization */}
              <div className="w-full md:w-2/3 h-64 bg-gray-50 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={embeddings[0].map((value, idx) => ({ dim: idx, value }))}>
                    <XAxis dataKey="dim" tick={false} label={{ value: 'Dimension', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Value', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Download Button */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Download Embedding (JSON)
                </button>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-gray-500">Show Raw Array</summary>
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all max-h-40 overflow-auto bg-gray-100 rounded p-2 mt-2">
                    {JSON.stringify(embeddings, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Batch Embedding Section */}
      <div className="mt-10 border-t pt-6">
        <h3 className="text-lg font-semibold mb-2">Batch Embedding</h3>
        <p className="text-sm text-gray-600 mb-2">Paste or upload multiple texts (one per line) to generate embeddings for all at once.</p>
        <BatchEmbeddingSection availableModels={availableModels} />
      </div>
    </div>
  );
};

// Batch Embedding Section Component
const BatchEmbeddingSection: React.FC<{ availableModels: string[] }> = ({ availableModels }) => {
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [batchInput, setBatchInput] = useState<string>('');
  const [embeddings, setEmbeddings] = useState<number[][] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (availableModels.length > 0) {
      setSelectedModel(availableModels[0]);
    }
  }, [availableModels]);

  const handleBatchGenerate = async () => {
    const texts = batchInput.split('\n').map(t => t.trim()).filter(Boolean);
    if (!selectedModel || texts.length === 0) {
      toast.error('Please select a model and enter at least one text.');
      return;
    }
    setIsLoading(true);
    setEmbeddings(null);
    setError(null);
    try {
      const response = await apiClient.post('/embed/batch', {
        texts,
        model: selectedModel,
      });
      setEmbeddings(response.data.embeddings);
      toast.success('Batch embeddings generated!');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Batch embedding failed.');
      toast.error(err?.response?.data?.detail || 'Batch embedding failed.');
    } finally {
      setIsLoading(false);
    }
  };

  function handleDownload() {
    if (!embeddings) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(embeddings, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "batch-embeddings.json");
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.remove();
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="batch-model-select" className="block text-sm font-medium text-gray-700 mb-1">
          Select Model
        </label>
        <select
          id="batch-model-select"
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
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
      <div>
        <label htmlFor="batch-input" className="block text-sm font-medium text-gray-700 mb-1">
          Batch Input (one text per line)
        </label>
        <textarea
          id="batch-input"
          rows={6}
          value={batchInput}
          onChange={e => setBatchInput(e.target.value)}
          placeholder="Paste or type one text per line..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <button
        onClick={handleBatchGenerate}
        disabled={isLoading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center"
      >
        {isLoading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>}
        {isLoading ? 'Generating...' : 'Generate Batch Embeddings'}
      </button>
      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}
      {embeddings && (
        <div>
          <div className="flex gap-2 mb-2">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Download Embeddings (JSON)
            </button>
            <details>
              <summary className="cursor-pointer text-xs text-gray-500">Show Raw Array</summary>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all max-h-40 overflow-auto bg-gray-100 rounded p-2 mt-2">
                {JSON.stringify(embeddings, null, 2)}
              </pre>
            </details>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Text #</th>
                  <th className="border px-2 py-1">Embedding (first 5 dims)</th>
                </tr>
              </thead>
              <tbody>
                {embeddings.map((emb, idx) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1">{idx + 1}</td>
                    <td className="border px-2 py-1">{JSON.stringify(emb.slice(0, 5))}...</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
