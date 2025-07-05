import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { EmbeddingPlayground } from '../components/EmbeddingPlayground';
import apiClient from '@/lib/api';

const PlaygroundEmbedding = () => {
  const [loadedModels, setLoadedModels] = useState<string[]>([]);

  useEffect(() => {
    const fetchLoadedModels = async () => {
      try {
        const response = await apiClient.get<string[]>('/models/loaded');
        setLoadedModels(response.data);
      } catch (error) {
        setLoadedModels([]);
      }
    };
    fetchLoadedModels();
  }, []);

  return (
    <Layout>
      <EmbeddingPlayground loadedModels={loadedModels} />
    </Layout>
  );
};

export default PlaygroundEmbedding; 