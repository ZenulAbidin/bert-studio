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
  const [batchInput, setBatchInput] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchResults, setBatchResults] = useState<any[] | null>(null);
  const [batchErrors, setBatchErrors] = useState<(string | null)[] | null>(null);

  useEffect(() => {
    setAvailableModels(loadedModels);
    if (loadedModels.length > 0) {
      setSelectedModel(loadedModels[0]);
    }
  }, [loadedModels]);

  const handleExecute = async () => {
    if (!selectedModel || !tokenizerCode.trim() || !modelCode.trim() || !functionCode.trim()) {
      toast.error('Please fill in all fields: model, tokenizer code, model code, and function code.');
      return;
    }
    if (batchMode) {
      const input_texts = batchInput.split('\n').map(t => t.trim()).filter(Boolean);
      if (input_texts.length === 0) {
        toast.error('Please enter at least one text for batch mode.');
        return;
      }
      setIsLoading(true);
      setBatchResults(null);
      setBatchErrors(null);
      setResult(null);
      setError(null);
      try {
        const response = await apiClient.post('/custom-task/batch', {
          tokenizer_code: tokenizerCode,
          model_code: modelCode,
          function_code: functionCode,
          input_texts,
          model_id: selectedModel,
        });
        setBatchResults(response.data.results);
        setBatchErrors(response.data.errors);
        toast.success('Batch custom task executed!');
      } catch (err: any) {
        setBatchResults(null);
        setBatchErrors([err?.response?.data?.detail || 'Batch custom task failed.']);
        toast.error(err?.response?.data?.detail || 'Batch custom task failed.');
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!inputText.trim()) {
        toast.error('Please enter input text.');
        return;
      }
      setIsLoading(true);
      setResult(null);
      setError(null);
      setBatchResults(null);
      setBatchErrors(null);
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
    }
  };

  const loadExample = () => {
    setTokenizerCode(`import transformers\n\ntokenizer = AutoTokenizer.from_pretrained(model_id)`);
    setModelCode(`import transformers\n\nmodel = AutoModelForSequenceClassification.from_pretrained(model_id)`);
    if (batchMode) {
      setFunctionCode(`# 'tokenizer' and 'model' are already defined above\nimport torch\n\ndef custom_function(input_texts):\n    # input_texts is a list of strings\n    # Example: return [len(text) for text in input_texts]\n    return [tokenizer.decode(tokenizer.encode(text)) for text in input_texts]`);
    } else {
      setFunctionCode(`# 'tokenizer' and 'model' are already defined above\nimport torch\n\ndef custom_function(text):\n    # Tokenize the input text\n    inputs = tokenizer(text, return_tensors=\"pt\")\n    outputs = model(**inputs)\n    probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)\n    return {\n        \"probability\": probabilities[0][1].item(),\n        \"confidence\": float(probabilities.max().item())\n    }`);
    }
    setInputText('This is a sample text for testing the model.');
    setBatchInput('This is a sample text for testing the model.\nAnother example input.');
  };

  const handleDownloadBatch = () => {
    if (!batchResults) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(batchResults, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "batch-custom-task-results.json");
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.remove();
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
            batchMode={batchMode}
            onLoadTask={(task) => {
              setSelectedModel(task.model_id);
              setTokenizerCode(task.tokenizer_code);
              setModelCode(task.model_code);
              setFunctionCode(task.function_code);
              setResult(null);
              setError(null);
              setBatchMode(!!task.batch_mode);
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
              setBatchInput('');
              setResult(null);
              setError(null);
              setBatchResults(null);
              setBatchErrors(null);
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
            Write custom Python code to process text with your models. Only 'transformers' and 'torch' imports are allowed. <br />
            Your function must be named <code>custom_function</code> and accept a {batchMode ? <b>list of texts (<code>input_texts: List[str]</code>)</b> : <b>single text (<code>text: str</code>)</b>}. <b>The variable <code>model_id</code> is available in the sandbox and contains the selected model's ID.</b> Use the "Load Example" button to get started.
          </p>
        </div>
      </Alert>

      {/* Select Model (move to top) */}
      <div className="mb-4">
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
          placeholder={`import transformers\n\ntokenizer = AutoTokenizer.from_pretrained('model-name')`}
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
          placeholder={`import transformers\n\nmodel = AutoModelForSequenceClassification.from_pretrained('model-name')`}
          height="120px"
        />
      </div>

      {/* Function Code */}
      <div>
        <label htmlFor="function-code" className="block text-sm font-medium text-gray-700 mb-1">
          Function Code (must define function 'custom_function({batchMode ? 'input_texts: List[str]' : 'text: str'})')
        </label>
        <CodeEditor
          value={functionCode}
          onChange={setFunctionCode}
          language="python"
          placeholder={batchMode
            ? `# 'tokenizer' and 'model' are already defined above\nimport torch\n\ndef custom_function(input_texts):\n    # input_texts is a list of strings\n    # Example: return [len(text) for text in input_texts]\n    return [tokenizer.decode(tokenizer.encode(text)) for text in input_texts]`
            : `# 'tokenizer' and 'model' are already defined above\nimport torch\n\ndef custom_function(text):\n    # Tokenize the input text\n    inputs = tokenizer(text, return_tensors=\"pt\")\n    outputs = model(**inputs)\n    # Your custom logic here\n    return result`}
          height="200px"
        />
      </div>

      {/* Input Text or Batch Input (moved below code editors) */}
      {!batchMode ? (
        <div className="mt-4">
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
      ) : (
        <div className="mt-4">
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
      )}

      {/* Batch Mode Toggle (moved below input) */}
      <div className="flex items-center gap-3 my-4">
        <label htmlFor="batch-mode-toggle" className="flex items-center cursor-pointer select-none">
          <span className="mr-2 text-sm font-medium text-gray-700">Batch Mode</span>
          <span className="relative">
            <input
              id="batch-mode-toggle"
              type="checkbox"
              checked={batchMode}
              onChange={e => setBatchMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-gray-200 rounded-full shadow-inner peer-checked:bg-blue-500 transition-colors"></div>
            <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform"></div>
          </span>
        </label>
      </div>

      {/* Action Button */}
      <button
        onClick={handleExecute}
        disabled={isLoading}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center"
      >
        {isLoading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>}
        <Play className="h-5 w-5 mr-2" />
        {isLoading ? (batchMode ? 'Executing Batch...' : 'Executing...') : (batchMode ? 'Execute Batch Custom Task' : 'Execute Custom Task')}
      </button>

      {/* Error Display */}
      {!batchMode && error && (
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
      {batchMode && batchErrors && batchErrors.some(e => e) && (
        <div className="text-red-600 text-sm">{batchErrors.filter(e => e).join('; ')}</div>
      )}

      {/* Result Display */}
      {!batchMode && result && (
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
      {batchMode && batchResults && (
        <div>
          <div className="flex gap-2 mb-2">
            <button
              onClick={handleDownloadBatch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Download Results (JSON)
            </button>
            <details>
              <summary className="cursor-pointer text-xs text-gray-500">Show Raw Array</summary>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all max-h-40 overflow-auto bg-gray-100 rounded p-2 mt-2">
                {JSON.stringify(batchResults, null, 2)}
              </pre>
            </details>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Text #</th>
                  <th className="border px-2 py-1">Result</th>
                  <th className="border px-2 py-1">Error</th>
                </tr>
              </thead>
              <tbody>
                {batchResults.map((res, idx) => (
                  <tr key={idx}>
                    <td className="border px-2 py-1">{idx + 1}</td>
                    <td className="border px-2 py-1">{JSON.stringify(res)}</td>
                    <td className="border px-2 py-1 text-red-600">{batchErrors && batchErrors[idx]}</td>
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