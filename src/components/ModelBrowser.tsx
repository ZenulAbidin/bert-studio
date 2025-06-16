
import React, { useState, useEffect } from 'react';
import { Search, Download, Star, Filter } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  author: string;
  downloads: number;
  likes: number;
  description: string;
  tags: string[];
}

export const ModelBrowser: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('downloads');
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration
  const mockModels: Model[] = [
    {
      id: 'bert-base-uncased',
      name: 'BERT Base Uncased',
      author: 'google',
      downloads: 1500000,
      likes: 3421,
      description: 'BERT base model (uncased) for text classification and feature extraction',
      tags: ['text-classification', 'feature-extraction', 'bert']
    },
    {
      id: 'distilbert-base-uncased',
      name: 'DistilBERT Base Uncased',
      author: 'huggingface',
      downloads: 980000,
      likes: 2156,
      description: 'Smaller, faster version of BERT with 97% performance',
      tags: ['text-classification', 'distilbert', 'efficient']
    },
    {
      id: 'roberta-base',
      name: 'RoBERTa Base',
      author: 'facebook',
      downloads: 750000,
      likes: 1843,
      description: 'Robustly optimized BERT pretraining approach',
      tags: ['text-classification', 'roberta', 'nlp']
    }
  ];

  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setModels(mockModels);
      setLoading(false);
    }, 1000);
  }, [searchQuery, selectedTags, sortBy]);

  const filteredModels = models.filter(model => 
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableTags = ['text-classification', 'feature-extraction', 'bert', 'distilbert', 'roberta', 'efficient', 'nlp'];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Browse Hugging Face Models</h2>
        
        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Tags:</span>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedTags(prev => 
                        prev.includes(tag) 
                          ? prev.filter(t => t !== tag)
                          : [...prev, tag]
                      );
                    }}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Models List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading models...</p>
          </div>
        ) : (
          filteredModels.map(model => (
            <div key={model.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
                    <span className="text-sm text-gray-500">by {model.author} • {model.id}</span>
                  </div>
                  <p className="text-gray-600 mb-3">{model.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Download className="h-4 w-4" />
                      <span>{model.downloads.toLocaleString()} downloads</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4" />
                      <span>{model.likes} likes</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {model.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col space-y-2 ml-4">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Download
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
