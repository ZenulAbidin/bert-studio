
import React from 'react';
import { Layout } from '../components/Layout';
import { Download, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const Downloads = () => {
  const downloads = [
    {
      id: 1,
      name: 'BERT Base Uncased',
      modelId: 'bert-base-uncased',
      size: '440 MB',
      status: 'completed',
      progress: 100,
      downloadedAt: '2024-01-15 14:30'
    },
    {
      id: 2,
      name: 'DistilBERT Base Uncased',
      modelId: 'distilbert-base-uncased',
      size: '260 MB',
      status: 'downloading',
      progress: 65,
      downloadedAt: null
    },
    {
      id: 3,
      name: 'RoBERTa Base',
      modelId: 'roberta-base',
      size: '480 MB',
      status: 'failed',
      progress: 0,
      downloadedAt: null
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'downloading':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Downloaded Models
          </h2>
          
          <div className="space-y-4">
            {downloads.map((download) => (
              <div key={download.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{download.name}</h3>
                    <p className="text-sm text-gray-500">{download.modelId}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(download.status)}
                    <span className="text-sm text-gray-600">{download.size}</span>
                  </div>
                </div>
                
                {download.status === 'downloading' && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${download.progress}%` }}
                    ></div>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="capitalize">{download.status}</span>
                  {download.downloadedAt && (
                    <span>Downloaded: {download.downloadedAt}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Downloads;
