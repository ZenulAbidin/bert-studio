
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          © 2024 BERT Studio - Developer Tools for Text Classification
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>Powered by Hugging Face Transformers</span>
        </div>
      </div>
    </footer>
  );
};
