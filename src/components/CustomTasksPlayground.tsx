import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';
import { Alert } from './ui/alert';
import { CodeEditor } from './ui/code-editor';
import { TaskManager } from './TaskManager';
import { Code, Play, AlertTriangle } from 'lucide-react';

export const CustomTasksPlayground: React.FC<{ loadedModels: string[] }> = ({ loadedModels }) => {
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [tokenizerCode, setTokenizerCode] = useState<string>('');
  const [modelCode, setModelCode] = useState<string>('');
  const [functionCode, setFunctionCode] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setAvailableModels(loadedModels);
    if (loadedModels.length > 0) {
      setSelectedModel(loadedModels[0]);
    }
  }, [loadedModels]);

  const handleExecute = async () => {
    if (!selectedModel || !tokenizerCode.trim() || !modelCode.trim() || !functionCode.trim() || !inputText.trim()) {
      toast.error('Please fill in all fields: model, tokenizer code, model code, function code, and input text.');
      return;
    }

    // Validate that function code defines a function named 'custom_function'
    if (!functionCode.includes('def custom_function') && !functionCode.includes('custom_function(')) {
      toast.error('Function code must define a function named "custom_function"');
      return;
    }

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await apiClient.post('/custom-task', {
        tokenizer_code: tokenizerCode,
        model_code: modelCode,
        function_code: functionCode,
        input_text: inputText,
        model_id: selectedModel,
      });

      if (response.data.error) {
        setError(response.data.error);
        toast.error('Custom task execution failed');
      } else {
        setResult(response.data.result);
        toast.success('Custom task executed successfully!');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || 'Custom task execution failed.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadExample = () => {
    setTokenizerCode(`tokenizer = AutoTokenizer.from_pretrained("${selectedModel}")`);
    setModelCode(`model = AutoModelForSequenceClassification.from_pretrained("${selectedModel}")`);
    setFunctionCode(`def custom_function(text):
    # Tokenize the input text
    inputs = tokenizer(text, return_tensors="pt")
    
    # Get model outputs
    outputs = model(**inputs)
    
    # Apply softmax to get probabilities
    probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)
    
    # Return the probability of the positive class (index 1)
    return {
        "probability": probabilities[0][1].item(),
        "confidence": float(probabilities.max().item())
    }`);
    setInputText('This is a sample text for testing the model.');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Custom Tasks Playground</h2>
        <div className="flex gap-2">
          <TaskManager
            selectedModel={selectedModel}
            tokenizerCode={tokenizerCode}
            modelCode={modelCode}
            functionCode={functionCode}
            onLoadTask={(task) => {
              setSelectedModel(task.model_id);
              setTokenizerCode(task.tokenizer_code);
              setModelCode(task.model_code);
              setFunctionCode(task.function_code);
              setResult(null);
              setError(null);
            }}
          />
          <button
            onClick={loadExample}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 flex items-center gap-2"
          >
            <Code className="h-4 w-4" />
            Load Example
          </button>
          <button
            onClick={() => {
              setTokenizerCode('');
              setModelCode('');
              setFunctionCode('');
              setInputText('');
              setResult(null);
              setError(null);
            }}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2"
          >
            Clear All
          </button>
        </div>
      </div>

      <Alert className="bg-blue-50 border-blue-200 text-blue-800">
        <AlertTriangle className="h-4 w-4" />
        <div>
          <h4 className="font-medium">Custom Tasks Playground</h4>
          <p className="text-sm mt-1">
            Write custom Python code to process text with your models. Only 'transformers' and 'torch' imports are allowed. 
            Your function must be named 'custom_function' and accept a text parameter. Use the "Load Example" button to get started.
          </p>
        </div>
      </Alert>

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

        {/* Tokenizer Code */}
        <div>
          <label htmlFor="tokenizer-code" className="block text-sm font-medium text-gray-700 mb-1">
            Tokenizer Code (must assign to variable 'tokenizer')
          </label>
          <CodeEditor
            value={tokenizerCode}
            onChange={setTokenizerCode}
            language="python"
            placeholder="tokenizer = AutoTokenizer.from_pretrained('model-name')"
            height="120px"
          />
        </div>

        {/* Model Code */}
        <div>
          <label htmlFor="model-code" className="block text-sm font-medium text-gray-700 mb-1">
            Model Code (must assign to variable 'model')
          </label>
          <CodeEditor
            value={modelCode}
            onChange={setModelCode}
            language="python"
            placeholder="model = AutoModelForSequenceClassification.from_pretrained('model-name')"
            height="120px"
          />
        </div>

        {/* Function Code */}
        <div>
          <label htmlFor="function-code" className="block text-sm font-medium text-gray-700 mb-1">
            Function Code (must define function 'custom_function(text)')
          </label>
          <CodeEditor
            value={functionCode}
            onChange={setFunctionCode}
            language="python"
            placeholder={`def custom_function(text):
    inputs = tokenizer(text, return_tensors="pt")
    outputs = model(**inputs)
    # Your custom logic here
    return result`}
            height="200px"
          />
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
            placeholder="Enter text to process..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Action Button */}
        <button
          onClick={handleExecute}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center"
        >
          {isLoading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>}
          <Play className="h-5 w-5 mr-2" />
          {isLoading ? 'Executing...' : 'Execute Custom Task'}
        </button>

        {/* Error Display */}
        {error && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-red-700 mb-2">Execution Error:</h4>
            <CodeEditor
              value={error}
              onChange={() => {}} // Read-only
              language="text"
              height="100px"
              readOnly={true}
            />
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Result:</h4>
            <CodeEditor
              value={JSON.stringify(result, null, 2)}
              onChange={() => {}} // Read-only
              language="json"
              height="150px"
              readOnly={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}; 