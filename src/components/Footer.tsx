
import React from 'react';
import { Brain, Github, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 px-6 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-3">
              <Brain className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-semibold text-gray-900">BERT Studio</span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              A powerful interface for exploring, downloading, and working with BERT models 
              from Hugging Face. Generate embeddings, classify text, and experiment with 
              state-of-the-art language models.
            </p>
            <div className="flex space-x-4">
              <a 
                href="https://github.com" 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-5 w-5" />
              </a>
              <a 
                href="https://huggingface.co" 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="/" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Dashboard</a></li>
              <li><a href="/browse" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Browse Models</a></li>
              <li><a href="/playground" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Playground</a></li>
              <li><a href="/downloads" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Downloads</a></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://huggingface.co/docs/transformers" 
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Transformers Docs
                </a>
              </li>
              <li>
                <a 
                  href="https://huggingface.co/models" 
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Model Hub
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/huggingface/transformers" 
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </li>
              <li><a href="/settings" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Settings</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-600">
              © 2024 BERT Studio. Built with React, TypeScript, and Tailwind CSS.
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-4 md:mt-0">
              <span>Powered by</span>
              <a 
                href="https://huggingface.co" 
                className="text-blue-600 hover:text-blue-700 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Hugging Face
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
