import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { toast } from 'sonner';
import { Layout } from '../components/Layout';

interface ApiKey {
  id: string;
  created_at: string;
  last_used_at?: string;
  revoked?: boolean;
}

export const ApiKeysPage: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newKey, setNewKey] = useState<string | null>(null);

  const fetchApiKeys = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<{ api_keys: ApiKey[] }>('/api-keys');
      setApiKeys(res.data.api_keys);
    } catch (e) {
      toast.error('Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const handleCreate = async () => {
    try {
      const res = await apiClient.post<{ id: string; key: string }>('/api-keys');
      setNewKey(res.data.key);
      toast.success('API key created!');
      fetchApiKeys();
    } catch (e) {
      toast.error('Failed to create API key');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/api-keys/${id}`);
      toast.success('API key deleted');
      fetchApiKeys();
    } catch (e) {
      toast.error('Failed to delete API key');
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8">
        <h2 className="text-xl font-bold mb-4">API Key Management</h2>
        <button
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={handleCreate}
        >
          Generate New API Key
        </button>
        {newKey && (
          <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded">
            <div className="font-mono break-all">{newKey}</div>
            <div className="text-xs text-gray-600 mt-2">Copy this key now. You won't see it again!</div>
            <button className="mt-2 text-blue-600 underline" onClick={() => setNewKey(null)}>Hide</button>
          </div>
        )}
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <table className="w-full border mt-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">ID</th>
                <th className="p-2 text-left">Created</th>
                <th className="p-2 text-left">Last Used</th>
                <th className="p-2 text-left">Revoked</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map(key => (
                <tr key={key.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{key.id}</td>
                  <td className="p-2">{key.created_at ? new Date(key.created_at).toLocaleString() : '-'}</td>
                  <td className="p-2">{key.last_used_at ? new Date(key.last_used_at).toLocaleString() : '-'}</td>
                  <td className="p-2">{key.revoked ? 'Yes' : 'No'}</td>
                  <td className="p-2">
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => handleDelete(key.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
};

export default ApiKeysPage; 