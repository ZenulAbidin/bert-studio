
import React, { useState } from 'react';
import { Play, Copy, Download, Loader } from 'lucide-react';

interface EmbeddingPlaygroundProps {
  loadedModels: string[];
}

export const EmbeddingPlayground: React.FC<EmbeddingPlaygroundProps> = ({ loadedModels }) => {
  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState('bert-base-uncased');
  const [embeddings, setEmbeddings] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const handleGenerateEmbeddings = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    const startTime = Date.now();

    try {
      // Simulate embedding generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate mock embeddings (in real app, this would use @huggingface/transformers)
      const mockEmbeddings = Array.from({ length: 768 }, () => Math.random() * 2 - 1);
      setEmbeddings(mockEmbeddings);
      setExecutionTime(Date.now() - startTime);
    } catch (error) {
      console.error('Error generating embeddings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyEmbeddings = () => {
    navigator.clipboard.writeText(JSON.stringify(embeddings, null, 2));
  };

  const downloadEmbeddings = () => {
    const blob = new Blob([JSON.stringify(embeddings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'embeddings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Embedding Playground</h2>
        <p className="text-gray-600 mb-6">
          Test your loaded models by generating embeddings for custom text input.
        </p>

        <div className="space-y-4">
          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="bert-base-uncased">BERT Base Uncased</option>
              <option value="distilbert-base-uncased">DistilBERT Base Uncased</option>
            </select>
          </div>

          {/* Text Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Input Text
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text to generate embeddings..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateEmbeddings}
            disabled={!inputText.trim() || isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span>{isLoading ? 'Generating...' : 'Generate Embeddings'}</span>
          </button>
        </div>
      </div>

      {/* Results */}
      {embeddings.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Generated Embeddings</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={copyEmbeddings}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy embeddings"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={downloadEmbeddings}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Download embeddings"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Model</p>
                <p className="font-medium">{selectedModel}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Dimensions</p>
                <p className="font-medium">{embeddings.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Execution Time</p>
                <p className="font-medium">{executionTime}ms</p>
              </div>
            </div>

            {/* Embeddings Visualization */}
            <div>
              <h4 className="font-medium mb-2">Embedding Vector (first 20 dimensions)</h4>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-5 gap-2 text-sm font-mono">
                  {embeddings.slice(0, 20).map((value, index) => (
                    <div key={index} className="text-center">
                      <div className="text-xs text-gray-500">{index}</div>
                      <div className="p-2 bg-white rounded border">
                        {value.toFixed(4)}
                      </div>
                    </div>
                  ))}
                </div>
                {embeddings.length > 20 && (
                  <p className="text-center text-gray-500 mt-2">
                    ... and {embeddings.length - 20} more dimensions
                  </p>
                )}
              </div>
            </div>

            {/* Raw JSON */}
            <div>
              <h4 className="font-medium mb-2">Raw JSON Output</h4>
              <pre className="p-4 bg-gray-900 text-green-400 rounded-lg overflow-x-auto text-sm max-h-64 overflow-y-auto">
                {JSON.stringify(embeddings, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
